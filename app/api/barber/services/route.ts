import { eq } from 'drizzle-orm'
import { NextResponse } from 'next/server'
import { isResponse, requireRole } from '@/lib/authz'
import { db } from '@/lib/db'
import { barberService } from '@/lib/schema'

function serialize(service: typeof barberService.$inferSelect) {
  return { id: service.id, name: service.name, priceCents: service.priceCents, durationMinutes: service.durationMinutes, active: service.active }
}

function isPositiveInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value > 0
}

export async function GET(request: Request) {
  const auth = await requireRole(request, 'barber')
  if (isResponse(auth)) return auth

  const rows = await db.select().from(barberService).where(eq(barberService.barberId, auth.user.id))
  return NextResponse.json(rows.map(serialize))
}

export async function POST(request: Request) {
  const auth = await requireRole(request, 'barber')
  if (isResponse(auth)) return auth

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null
  const valid = body && typeof body.name === 'string' && body.name.trim().length > 0 && body.name.length <= 120 && isPositiveInteger(body.priceCents) && isPositiveInteger(body.durationMinutes)
  if (!valid) return NextResponse.json({ error: 'Payload inválido' }, { status: 400 })

  const [row] = await db
    .insert(barberService)
    .values({
      id: crypto.randomUUID(),
      barberId: auth.user.id,
      name: (body.name as string).trim(),
      priceCents: body.priceCents as number,
      durationMinutes: body.durationMinutes as number,
      active: true,
    })
    .returning()

  return NextResponse.json(serialize(row), { status: 201 })
}
