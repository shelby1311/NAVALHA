import { and, eq, ne } from 'drizzle-orm'
import { NextResponse } from 'next/server'
import { isResponse, requireUser } from '@/lib/authz'
import { estaDentroDoHorario } from '@/lib/business-hours'
import { db } from '@/lib/db'
import { barberService, booking, user } from '@/lib/schema'

const UNIQUE_VIOLATION = '23505'

export async function POST(request: Request) {
  const auth = await requireUser(request)
  if (isResponse(auth)) return auth
  const { user: sessionUser } = auth

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null
  const valid = body && typeof body.barberId === 'string' && typeof body.serviceId === 'string' && typeof body.scheduledAt === 'string'
  if (!valid) return NextResponse.json({ error: 'Payload inválido' }, { status: 400 })

  const scheduledAt = new Date(body.scheduledAt as string)
  if (Number.isNaN(scheduledAt.getTime())) return NextResponse.json({ error: 'Data inválida' }, { status: 400 })
  if (scheduledAt.getTime() <= Date.now()) return NextResponse.json({ error: 'Escolha um horário no futuro.' }, { status: 400 })

  const barberId = body.barberId as string
  const serviceId = body.serviceId as string

  try {
    const result = await db.transaction(async (tx) => {
      const [barber] = await tx.select().from(user).where(and(eq(user.id, barberId), eq(user.role, 'barber')))
      if (!barber) return { error: 'Barbeiro não encontrado.', status: 404 } as const

      const [service] = await tx.select().from(barberService).where(and(eq(barberService.id, serviceId), eq(barberService.barberId, barberId)))
      if (!service) return { error: 'Este serviço não pertence a este barbeiro.', status: 404 } as const
      if (!service.active) return { error: 'Este serviço não está mais disponível.', status: 400 } as const

      if (!estaDentroDoHorario(barber.openingHours, scheduledAt)) {
        return { error: 'Horário fora do funcionamento da barbearia.', status: 400 } as const
      }

      const end = new Date(scheduledAt.getTime() + service.durationMinutes * 60_000)
      const dayStart = new Date(scheduledAt.getFullYear(), scheduledAt.getMonth(), scheduledAt.getDate())
      const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60_000)

      const sameDayBookings = await tx
        .select({ scheduledAt: booking.scheduledAt, serviceId: booking.serviceId })
        .from(booking)
        .where(and(eq(booking.barberId, barberId), ne(booking.status, 'cancelled')))

      const durationsById = new Map<string, number>([[service.id, service.durationMinutes]])
      const otherServiceIds = [...new Set(sameDayBookings.map((b) => b.serviceId))].filter((id) => id !== service.id)
      if (otherServiceIds.length) {
        const otherServices = await tx.select({ id: barberService.id, durationMinutes: barberService.durationMinutes }).from(barberService)
        for (const s of otherServices) durationsById.set(s.id, s.durationMinutes)
      }

      const overlaps = sameDayBookings.some((existing) => {
        if (existing.scheduledAt < dayStart || existing.scheduledAt >= dayEnd) return false
        const existingDuration = durationsById.get(existing.serviceId) ?? 0
        const existingEnd = new Date(existing.scheduledAt.getTime() + existingDuration * 60_000)
        return scheduledAt < existingEnd && existing.scheduledAt < end
      })
      if (overlaps) return { error: 'Este horário já está ocupado.', status: 409 } as const

      const [row] = await tx
        .insert(booking)
        .values({
          id: crypto.randomUUID(),
          clientId: sessionUser.id,
          barberId,
          serviceId,
          scheduledAt,
          status: 'requested',
        })
        .returning()

      return { row } as const
    })

    if ('error' in result) return NextResponse.json({ error: result.error }, { status: result.status })

    const { row } = result
    return NextResponse.json(
      { id: row.id, clientId: row.clientId, barberId: row.barberId, serviceId: row.serviceId, scheduledAt: row.scheduledAt.toISOString(), status: row.status },
      { status: 201 },
    )
  } catch (err) {
    if (err && typeof err === 'object' && 'code' in err && (err as { code?: string }).code === UNIQUE_VIOLATION) {
      return NextResponse.json({ error: 'Este horário já está ocupado.' }, { status: 409 })
    }
    throw err
  }
}
