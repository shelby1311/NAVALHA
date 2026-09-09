import { eq } from 'drizzle-orm'
import { NextResponse } from 'next/server'
import { isResponse, requireUser } from '@/lib/authz'
import { db } from '@/lib/db'
import { booking } from '@/lib/schema'

const MIN_HOURS_BEFORE_CANCEL = 1
const CANCELLABLE_STATUSES = ['requested', 'confirmed'] as const

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const auth = await requireUser(request)
  if (isResponse(auth)) return auth

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null
  if (!body || body.status !== 'cancelled') return NextResponse.json({ error: 'O cliente só pode cancelar um agendamento.' }, { status: 400 })

  const [existing] = await db.select().from(booking).where(eq(booking.id, id))
  if (!existing || existing.clientId !== auth.user.id) return NextResponse.json({ error: 'Agendamento não encontrado.' }, { status: 404 })

  if (!(CANCELLABLE_STATUSES as readonly string[]).includes(existing.status)) {
    return NextResponse.json({ error: 'Este agendamento não pode mais ser cancelado pelo cliente.' }, { status: 409 })
  }

  const hoursUntil = (existing.scheduledAt.getTime() - Date.now()) / (60 * 60_000)
  if (hoursUntil < MIN_HOURS_BEFORE_CANCEL) {
    return NextResponse.json({ error: `Cancele com pelo menos ${MIN_HOURS_BEFORE_CANCEL}h de antecedência.` }, { status: 409 })
  }

  const [row] = await db.update(booking).set({ status: 'cancelled' }).where(eq(booking.id, id)).returning()
  return NextResponse.json({ id: row.id, status: row.status })
}
