import { eq } from 'drizzle-orm'
import { NextResponse } from 'next/server'
import { isResponse, requireUser } from '@/lib/authz'
import { WEEKDAY_KEYS, parseTimeToMinutes } from '@/lib/business-hours'
import { db } from '@/lib/db'
import { toProfile } from '@/lib/profile'
import { user } from '@/lib/schema'

const MAX_NAME_LENGTH = 120
const MAX_SHORT_TEXT_LENGTH = 80

function isValidString(value: unknown, maxLength: number): value is string {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= maxLength
}

function isValidOpeningHours(value: unknown): value is Record<string, { open: string; close: string; active: boolean }> {
  if (!value || typeof value !== 'object') return false
  return Object.entries(value as Record<string, unknown>).every(([day, config]) => {
    if (!(WEEKDAY_KEYS as readonly string[]).includes(day)) return false
    if (!config || typeof config !== 'object') return false
    const { open, close, active } = config as Record<string, unknown>
    if (typeof active !== 'boolean') return false
    if (!active) return true
    return typeof open === 'string' && typeof close === 'string' && parseTimeToMinutes(open) != null && parseTimeToMinutes(close) != null && parseTimeToMinutes(open)! < parseTimeToMinutes(close)!
  })
}

export async function GET(request: Request) {
  const auth = await requireUser(request)
  if (isResponse(auth)) return auth
  // Lê direto do banco (em vez de confiar em `session.user`) para não depender de
  // todo campo de domínio estar espelhado em `additionalFields` do better-auth.
  const [row] = await db.select().from(user).where(eq(user.id, auth.user.id))
  if (!row) return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })
  return NextResponse.json(toProfile(row))
}

export async function PATCH(request: Request) {
  const auth = await requireUser(request)
  if (isResponse(auth)) return auth
  const { user: sessionUser } = auth

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null
  if (!body) return NextResponse.json({ error: 'Payload inválido' }, { status: 400 })

  if (body.name !== undefined && !isValidString(body.name, MAX_NAME_LENGTH)) {
    return NextResponse.json({ error: 'Nome inválido' }, { status: 400 })
  }
  for (const field of ['phone', 'city', 'neighborhood'] as const) {
    if (body[field] !== undefined && body[field] !== null && !isValidString(body[field], MAX_SHORT_TEXT_LENGTH)) {
      return NextResponse.json({ error: 'Dado inválido' }, { status: 400 })
    }
  }
  if (body.openingHours !== undefined && body.openingHours !== null && !isValidOpeningHours(body.openingHours)) {
    return NextResponse.json({ error: 'Horário de funcionamento inválido' }, { status: 400 })
  }

  const [current] = await db.select().from(user).where(eq(user.id, sessionUser.id))
  if (!current) return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })

  const [updated] = await db
    .update(user)
    .set({
      name: isValidString(body.name, MAX_NAME_LENGTH) ? body.name.trim() : current.name,
      phone: typeof body.phone === 'string' ? body.phone.trim() : current.phone,
      avatarUrl: typeof body.avatarUrl === 'string' ? body.avatarUrl : current.avatarUrl,
      city: typeof body.city === 'string' ? body.city.trim() : current.city,
      neighborhood: typeof body.neighborhood === 'string' ? body.neighborhood.trim() : current.neighborhood,
      openingHours: body.openingHours !== undefined ? (body.openingHours as typeof current.openingHours) : current.openingHours,
      updatedAt: new Date(),
    })
    .where(eq(user.id, sessionUser.id))
    .returning()

  return NextResponse.json(toProfile(updated))
}
