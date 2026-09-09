import { and, eq } from 'drizzle-orm'
import { NextResponse } from 'next/server'
import { isResponse, requireRole } from '@/lib/authz'
import { Servico, ServicoInvalidoError } from '@/lib/domain/servico'
import { db } from '@/lib/db'
import { barberService } from '@/lib/schema'

function serialize(service: typeof barberService.$inferSelect) {
  return { id: service.id, name: service.name, priceCents: service.priceCents, durationMinutes: service.durationMinutes, active: service.active }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const auth = await requireRole(request, 'barber')
  if (isResponse(auth)) return auth

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null
  if (!body) return NextResponse.json({ error: 'Payload inválido' }, { status: 400 })
  if (typeof body.name === 'string' && (!body.name.trim() || body.name.length > 120)) {
    return NextResponse.json({ error: 'Nome inválido' }, { status: 400 })
  }

  const [current] = await db.select().from(barberService).where(and(eq(barberService.id, id), eq(barberService.barberId, auth.user.id)))
  if (!current) return NextResponse.json({ error: 'Serviço não encontrado' }, { status: 404 })

  let servico: Servico
  try {
    servico = new Servico(
      typeof body.name === 'string' ? body.name.trim() : current.name,
      body.priceCents !== undefined ? (body.priceCents as number) : current.priceCents,
      body.durationMinutes !== undefined ? (body.durationMinutes as number) : current.durationMinutes,
      typeof body.active === 'boolean' ? body.active : current.active,
    )
  } catch (err) {
    if (err instanceof ServicoInvalidoError) return NextResponse.json({ error: err.message }, { status: 400 })
    throw err
  }

  const [row] = await db
    .update(barberService)
    .set({ name: servico.name, priceCents: servico.priceCents, durationMinutes: servico.durationMinutes, active: servico.active })
    .where(and(eq(barberService.id, id), eq(barberService.barberId, auth.user.id)))
    .returning()

  return NextResponse.json(serialize(row))
}
