import { and, eq, ilike, inArray, or } from 'drizzle-orm'
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { haversineKm } from '@/lib/geocode'
import { barberService, user } from '@/lib/schema'

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
  const service = searchParams.get('service')?.trim()
  const onlyOnline = searchParams.get('onlyOnline') === 'true'
  const lat = parseCoordinate(searchParams.get('lat'))
  const lng = parseCoordinate(searchParams.get('lng'))

  const conditions = [eq(user.role, 'barber')]
  if (onlyOnline) conditions.push(eq(user.isOnline, true))
  if (q) {
    const pattern = `%${escapeLikePattern(q)}%`
    conditions.push(or(ilike(user.name, pattern), ilike(user.businessName, pattern), ilike(user.city, pattern), ilike(user.neighborhood, pattern))!)
  }
  if (service) {
    const pattern = `%${escapeLikePattern(service)}%`
    const matches = await db.selectDistinct({ barberId: barberService.barberId }).from(barberService).where(and(eq(barberService.active, true), ilike(barberService.name, pattern)))
    const ids = matches.map((m) => m.barberId)
    // Lista vazia faria o `inArray` virar "sempre falso" (comportamento correto: nenhum
    // barbeiro oferece esse serviço), então não precisa de tratamento especial aqui.
    conditions.push(inArray(user.id, ids))
  }

  const barbers = await db.select().from(user).where(and(...conditions)).limit(50)

  // Preço "a partir de" e algumas tags de serviço por barbeiro — vem de dados reais
  // (barber_service), nunca inventado, então barbeiros sem serviço ativo ficam sem os dois.
  const barberIds = barbers.map((b) => b.id)
  const services = barberIds.length > 0 ? await db.select().from(barberService).where(and(eq(barberService.active, true), inArray(barberService.barberId, barberIds))) : []
  const servicesByBarber = new Map<string, { priceCents: number; name: string; durationMinutes: number }[]>()
  for (const s of services) {
    const list = servicesByBarber.get(s.barberId) ?? []
    list.push({ priceCents: s.priceCents, name: s.name, durationMinutes: s.durationMinutes })
    servicesByBarber.set(s.barberId, list)
  }

  const results = barbers.map((b) => {
    const distanceKm = lat != null && lng != null && b.latitude != null && b.longitude != null ? haversineKm({ latitude: lat, longitude: lng }, { latitude: b.latitude, longitude: b.longitude }) : null
    const barberServices = servicesByBarber.get(b.id) ?? []
    const cheapestService = barberServices.length > 0 ? barberServices.reduce((min, s) => (s.priceCents < min.priceCents ? s : min)) : null
    const serviceTags = [...new Set(barberServices.map((s) => s.name))].slice(0, 3)
    return {
      id: b.id,
      name: b.name,
      businessName: b.businessName,
      city: b.city,
      neighborhood: b.neighborhood,
      isOnline: b.isOnline ?? false,
      distanceKm,
      startingPriceCents: cheapestService?.priceCents ?? null,
      cheapestService,
      serviceTags,
    }
  })

  // Com localização do cliente: mais perto primeiro (quem não tem coordenada vai pro fim, sem sumir da lista).
  if (lat != null && lng != null) {
    results.sort((a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity))
  }

  return NextResponse.json(results)
}
