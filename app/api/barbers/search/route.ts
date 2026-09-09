import { and, eq, ilike, or } from 'drizzle-orm'
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { haversineKm } from '@/lib/geocode'
import { user } from '@/lib/schema'

function parseCoordinate(value: string | null): number | null {
  if (value === null) return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

// Escapa metacaracteres do LIKE/ILIKE (%, _, \) para que sejam tratados como texto
// literal — sem isso, uma busca por "100%" ou "a_b" combinaria qualquer coisa.
function escapeLikePattern(value: string): string {
  return value.replace(/[\\%_]/g, (char) => `\\${char}`)
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q')?.trim()
  const onlyOnline = searchParams.get('onlyOnline') === 'true'
  const lat = parseCoordinate(searchParams.get('lat'))
  const lng = parseCoordinate(searchParams.get('lng'))

  const conditions = [eq(user.role, 'barber')]
  if (onlyOnline) conditions.push(eq(user.isOnline, true))
  if (q) {
    const pattern = `%${escapeLikePattern(q)}%`
    conditions.push(or(ilike(user.name, pattern), ilike(user.businessName, pattern), ilike(user.city, pattern), ilike(user.neighborhood, pattern))!)
  }

  const barbers = await db.select().from(user).where(and(...conditions)).limit(50)

  const results = barbers.map((b) => {
    const distanceKm = lat != null && lng != null && b.latitude != null && b.longitude != null ? haversineKm({ latitude: lat, longitude: lng }, { latitude: b.latitude, longitude: b.longitude }) : null
    return {
      id: b.id,
      name: b.name,
      businessName: b.businessName,
      city: b.city,
      neighborhood: b.neighborhood,
      isOnline: b.isOnline ?? false,
      distanceKm,
    }
  })

  // Com localização do cliente: mais perto primeiro (quem não tem coordenada vai pro fim, sem sumir da lista).
  if (lat != null && lng != null) {
    results.sort((a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity))
  }

  return NextResponse.json(results)
}
