import { eq } from 'drizzle-orm'
import { NextResponse } from 'next/server'
import { isResponse, requireUser } from '@/lib/authz'
import { db } from '@/lib/db'
import { toProfile } from '@/lib/profile'
import { user } from '@/lib/schema'

const MAX_NAME_LENGTH = 120
const MAX_SHORT_TEXT_LENGTH = 80

function isValidString(value: unknown, maxLength: number): value is string {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= maxLength
}

export async function GET(request: Request) {
  const auth = await requireUser(request)
  if (isResponse(auth)) return auth
  return NextResponse.json(toProfile(auth.user))
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

  const [updated] = await db
    .update(user)
    .set({
      name: isValidString(body.name, MAX_NAME_LENGTH) ? body.name.trim() : sessionUser.name,
      phone: typeof body.phone === 'string' ? body.phone.trim() : null,
      avatarUrl: typeof body.avatarUrl === 'string' ? body.avatarUrl : null,
      city: typeof body.city === 'string' ? body.city.trim() : null,
      neighborhood: typeof body.neighborhood === 'string' ? body.neighborhood.trim() : null,
      updatedAt: new Date(),
    })
    .where(eq(user.id, sessionUser.id))
    .returning()

  return NextResponse.json(toProfile(updated))
}
