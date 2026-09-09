import { desc, eq, inArray } from 'drizzle-orm'
import { NextResponse } from 'next/server'
import { isResponse, requireRole } from '@/lib/authz'
import { db } from '@/lib/db'
import { barberService, booking, user } from '@/lib/schema'

export async function GET(request: Request) {
  const auth = await requireRole(request, 'barber')
  if (isResponse(auth)) return auth

  const bookings = await db.select().from(booking).where(eq(booking.barberId, auth.user.id)).orderBy(desc(booking.scheduledAt))

  const serviceIds = [...new Set(bookings.map((b) => b.serviceId))]
  const clientIds = [...new Set(bookings.map((b) => b.clientId))]

  const services = serviceIds.length ? await db.select({ id: barberService.id, name: barberService.name }).from(barberService).where(inArray(barberService.id, serviceIds)) : []
  const clients = clientIds.length ? await db.select({ id: user.id, name: user.name }).from(user).where(inArray(user.id, clientIds)) : []

  const serviceName = new Map(services.map((s) => [s.id, s.name]))
  const clientName = new Map(clients.map((c) => [c.id, c.name]))

  return NextResponse.json(
    bookings.map((b) => ({
      id: b.id,
      clientName: clientName.get(b.clientId) ?? 'Cliente',
      serviceName: serviceName.get(b.serviceId) ?? 'Serviço',
      scheduledAt: b.scheduledAt.toISOString(),
      status: b.status,
    })),
  )
}
