import { eq } from 'drizzle-orm'
import { NextResponse } from 'next/server'
import { isResponse, requireRole } from '@/lib/authz'
import type { BookingStatus } from '@/lib/contracts'
import { Agendamento, TransicaoInvalidaError } from '@/lib/domain/agendamento'
import { Financeiro } from '@/lib/domain/financeiro'
import { db } from '@/lib/db'
import { barberService, booking } from '@/lib/schema'

const VALID_STATUS = ['requested', 'confirmed', 'waiting', 'in_service', 'completed', 'cancelled'] as const
const UNIQUE_VIOLATION = '23505'

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const auth = await requireRole(request, 'barber')
  if (isResponse(auth)) return auth
  const { user: sessionUser } = auth

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null
  if (!body || typeof body.status !== 'string' || !(VALID_STATUS as readonly string[]).includes(body.status)) {
    return NextResponse.json({ error: 'Status inválido' }, { status: 400 })
  }

  const newStatus = body.status as BookingStatus

  try {
    const result = await db.transaction(async (tx) => {
      const [existing] = await tx.select().from(booking).where(eq(booking.id, id))
      if (!existing || existing.barberId !== sessionUser.id) return { error: 'Agendamento não encontrado', status: 404 } as const

      const atual = new Agendamento(existing.status as BookingStatus)
      try {
        atual.transicionar(newStatus)
      } catch (err) {
        if (err instanceof TransicaoInvalidaError) return { error: err.message, status: 409 } as const
        throw err
      }

      if (atual.geraReceita(newStatus)) {
        const [service] = await tx.select().from(barberService).where(eq(barberService.id, existing.serviceId))
        if (service) {
          await Financeiro.registrarReceita(tx, { barberId: existing.barberId, bookingId: existing.id, category: 'Serviço', description: service.name, amountCents: service.priceCents })
        }
      } else if (atual.estornaReceita(newStatus)) {
        await Financeiro.estornar(tx, existing.id)
      }

      const [row] = await tx.update(booking).set({ status: newStatus }).where(eq(booking.id, id)).returning()
      return { row } as const
    })

    if ('error' in result) return NextResponse.json({ error: result.error }, { status: result.status })
    return NextResponse.json({ id: result.row.id, status: result.row.status })
  } catch (err) {
    if (err && typeof err === 'object' && 'code' in err && (err as { code?: string }).code === UNIQUE_VIOLATION) {
      return NextResponse.json({ error: 'Este agendamento já foi concluído em outra requisição.' }, { status: 409 })
    }
    throw err
  }
}
