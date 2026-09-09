import { and, eq } from 'drizzle-orm'
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

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const auth = await requireRole(request, 'barber')
  if (isResponse(auth)) return auth

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null
  if (!body) return NextResponse.json({ error: 'Payload inválido' }, { status: 400 })

  const set: Record<string, unknown> = {}
  if (typeof body.name === 'string') {
    if (!body.name.trim() || body.name.length > 120) return NextResponse.json({ error: 'Nome inválido' }, { status: 400 })
    set.name = body.name.trim()
  }
  if (body.priceCents !== undefined) {
    if (!isPositiveInteger(body.priceCents)) return NextResponse.json({ error: 'Preço inválido' }, { status: 400 })
    set.priceCents = body.priceCents
  }
  if (body.durationMinutes !== undefined) {
    if (!isPositiveInteger(body.durationMinutes)) return NextResponse.json({ error: 'Duração inválida' }, { status: 400 })
    set.durationMinutes = body.durationMinutes
  }
  if (typeof body.active === 'boolean') set.active = body.active
  if (Object.keys(set).length === 0) return NextResponse.json({ error: 'Nada para atualizar' }, { status: 400 })

  const [row] = await db
    .update(barberService)
    .set(set)
    .where(and(eq(barberService.id, id), eq(barberService.barberId, auth.user.id)))
    .returning()

  if (!row) return NextResponse.json({ error: 'Serviço não encontrado' }, { status: 404 })
  return NextResponse.json(serialize(row))
}
