// Testes de integração contra Postgres real — cobrem exatamente o que teste
// unitário NÃO consegue: se pg_advisory_xact_lock (POST /api/bookings) realmente
// impede duas requisições concorrentes de criar agendamentos sobrepostos.
//
// Como rodar:
//   docker compose up -d
//   DATABASE_URL=postgresql://navalha:navalha@localhost:5433/navalha_test pnpm db:migrate
//   DATABASE_URL=postgresql://navalha:navalha@localhost:5433/navalha_test pnpm test:integration
//
// Sem DATABASE_URL definido, este arquivo é pulado (não falha) — não faz parte de `pnpm test`.
import { and, eq } from 'drizzle-orm'
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'

const hasDatabase = Boolean(process.env.DATABASE_URL)

vi.mock('@/lib/authz', () => ({
  requireUser: vi.fn(async (request: Request) => {
    const clientId = request.headers.get('x-test-client-id')
    return { user: { id: clientId, name: 'Cliente de teste', email: `${clientId}@teste.local`, role: 'client' } }
  }),
  isResponse: (value: unknown) => value instanceof Response,
}))

describe.skipIf(!hasDatabase)('POST /api/bookings — concorrência contra Postgres real', () => {
  let db: typeof import('@/lib/db').db
  let pool: typeof import('@/lib/db').pool
  let schema: typeof import('@/lib/schema')
  let createBooking: typeof import('@/app/api/bookings/route').POST

  const barberId = crypto.randomUUID()
  const serviceId = crypto.randomUUID()
  const clientAId = crypto.randomUUID()
  const clientBId = crypto.randomUUID()

  beforeEach(async () => {
    ;({ db, pool } = await import('@/lib/db'))
    schema = await import('@/lib/schema')
    ;({ POST: createBooking } = await import('@/app/api/bookings/route'))

    await db.delete(schema.booking).where(eq(schema.booking.barberId, barberId))
    await db.delete(schema.barberService).where(eq(schema.barberService.id, serviceId))
    await db.delete(schema.user).where(eq(schema.user.id, barberId))
    await db.delete(schema.user).where(eq(schema.user.id, clientAId))
    await db.delete(schema.user).where(eq(schema.user.id, clientBId))

    await db.insert(schema.user).values([
      { id: barberId, name: 'Barbeiro Teste', email: `${barberId}@teste.local`, role: 'barber' },
      { id: clientAId, name: 'Cliente A', email: `${clientAId}@teste.local`, role: 'client' },
      { id: clientBId, name: 'Cliente B', email: `${clientBId}@teste.local`, role: 'client' },
    ])
    await db.insert(schema.barberService).values({ id: serviceId, barberId, name: 'Corte', priceCents: 3000, durationMinutes: 30, active: true })
  })

  afterAll(async () => {
    if (!hasDatabase) return
    await pool.end()
  })

  function bookingRequest(clientId: string, scheduledAt: string) {
    return new Request('http://localhost/api/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-test-client-id': clientId },
      body: JSON.stringify({ barberId, serviceId, scheduledAt }),
    })
  }

  it('duas requisições concorrentes para horários que se sobrepõem: só uma cria o agendamento', async () => {
    const baseTime = Date.now() + 24 * 60 * 60_000 // amanhã, sempre no futuro
    const startA = new Date(baseTime)
    const startB = new Date(baseTime + 10 * 60_000) // 10 min depois — sobrepõe (serviço dura 30min)

    const [responseA, responseB] = await Promise.all([
      createBooking(bookingRequest(clientAId, startA.toISOString())),
      createBooking(bookingRequest(clientBId, startB.toISOString())),
    ])

    const statuses = [responseA.status, responseB.status].sort()
    expect(statuses).toEqual([201, 409])

    const activeBookings = await db.select().from(schema.booking).where(and(eq(schema.booking.barberId, barberId), eq(schema.booking.status, 'requested')))
    expect(activeBookings).toHaveLength(1)
  })

  it('cancelar um agendamento libera o horário para um novo agendamento', async () => {
    const scheduledAt = new Date(Date.now() + 25 * 60 * 60_000).toISOString()

    const first = await createBooking(bookingRequest(clientAId, scheduledAt))
    expect(first.status).toBe(201)
    const { id: firstBookingId } = (await first.json()) as { id: string }

    await db.update(schema.booking).set({ status: 'cancelled' }).where(eq(schema.booking.id, firstBookingId))

    const second = await createBooking(bookingRequest(clientBId, scheduledAt))
    expect(second.status).toBe(201)
  })
})
