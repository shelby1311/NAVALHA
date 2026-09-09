import { eq } from 'drizzle-orm'
import { NextResponse } from 'next/server'
import { isResponse, requireRole } from '@/lib/authz'
import { Servico, ServicoInvalidoError } from '@/lib/domain/servico'
import { db } from '@/lib/db'
import { barberService } from '@/lib/schema'

function serialize(service: typeof barberService.$inferSelect) {
  return { id: service.id, name: service.name, priceCents: service.priceCents, durationMinutes: service.durationMinutes, active: service.active }
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
  const validName = body && typeof body.name === 'string' && body.name.trim().length > 0 && body.name.length <= 120
  if (!validName) return NextResponse.json({ error: 'Payload inválido' }, { status: 400 })

  let servico: Servico
  try {
    servico = new Servico((body!.name as string).trim(), body!.priceCents as number, body!.durationMinutes as number)
  } catch (err) {
    if (err instanceof ServicoInvalidoError) return NextResponse.json({ error: err.message }, { status: 400 })
    throw err
  }

  const [row] = await db
    .insert(barberService)
    .values({
      id: crypto.randomUUID(),
      barberId: auth.user.id,
      name: servico.name,
      priceCents: servico.priceCents,
      durationMinutes: servico.durationMinutes,
      active: servico.active,
    })
    .returning()

  return NextResponse.json(serialize(row), { status: 201 })
}
