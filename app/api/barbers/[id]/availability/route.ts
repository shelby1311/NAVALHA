import { and, eq, ne } from 'drizzle-orm'
import { NextResponse } from 'next/server'
import { DEFAULT_OPENING_HOURS, janelaDoDia } from '@/lib/business-hours'
import { gerarHorariosDisponiveis } from '@/lib/domain/disponibilidade'
import { db } from '@/lib/db'
import { barberService, booking, user } from '@/lib/schema'

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: barberId } = await params
  const { searchParams } = new URL(request.url)
  const serviceId = searchParams.get('serviceId')
  const dateParam = searchParams.get('date')

  if (!serviceId || !dateParam || !DATE_PATTERN.test(dateParam)) {
    return NextResponse.json({ error: 'Informe serviceId e date (YYYY-MM-DD).' }, { status: 400 })
  }

  const [year, month, dayOfMonth] = dateParam.split('-').map(Number)
  const day = new Date(year, month - 1, dayOfMonth)
  if (Number.isNaN(day.getTime())) return NextResponse.json({ error: 'Data inválida.' }, { status: 400 })

  const [barber] = await db.select().from(user).where(and(eq(user.id, barberId), eq(user.role, 'barber')))
  if (!barber) return NextResponse.json({ error: 'Barbeiro não encontrado.' }, { status: 404 })

  const [service] = await db.select().from(barberService).where(and(eq(barberService.id, serviceId), eq(barberService.barberId, barberId)))
  if (!service || !service.active) return NextResponse.json({ error: 'Serviço indisponível.' }, { status: 404 })

  const janela = janelaDoDia(barber.openingHours ?? DEFAULT_OPENING_HOURS, day)
  if (!janela) return NextResponse.json({ slots: [] })

  const dayStart = new Date(day.getFullYear(), day.getMonth(), day.getDate())
  const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60_000)

  const dayBookings = await db
    .select({ scheduledAt: booking.scheduledAt, serviceId: booking.serviceId })
    .from(booking)
    .where(and(eq(booking.barberId, barberId), ne(booking.status, 'cancelled')))

  const activeServices = await db.select({ id: barberService.id, durationMinutes: barberService.durationMinutes }).from(barberService).where(eq(barberService.barberId, barberId))
  const durationsById = new Map(activeServices.map((s) => [s.id, s.durationMinutes]))

  const busy = dayBookings
    .filter((b) => b.scheduledAt >= dayStart && b.scheduledAt < dayEnd)
    .map((b) => {
      const duration = durationsById.get(b.serviceId) ?? 0
      return { start: b.scheduledAt, end: new Date(b.scheduledAt.getTime() + duration * 60_000) }
    })

  const free = gerarHorariosDisponiveis({
    day,
    openingMinutes: janela.open,
    closingMinutes: janela.close,
    durationMinutes: service.durationMinutes,
    now: new Date(),
    ocupados: busy,
  })

  return NextResponse.json({ slots: free.map((s) => s.toISOString()) })
}
