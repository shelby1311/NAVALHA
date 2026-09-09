import { eq } from 'drizzle-orm'
import { NextResponse } from 'next/server'
import { isResponse, requireUser } from '@/lib/authz'
import { db } from '@/lib/db'
import { toProfile } from '@/lib/profile'
import { user } from '@/lib/schema'

const VALID_THEMES = ['dark', 'light', 'system'] as const

export async function PATCH(request: Request) {
  const auth = await requireUser(request)
  if (isResponse(auth)) return auth
  const { user: sessionUser } = auth

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null
  if (!body) return NextResponse.json({ error: 'Payload inválido' }, { status: 400 })

  if (body.theme !== undefined && !(VALID_THEMES as readonly string[]).includes(body.theme as string)) {
    return NextResponse.json({ error: 'Tema inválido' }, { status: 400 })
  }

  const set: Record<string, unknown> = { updatedAt: new Date() }
  if (typeof body.theme === 'string') set.theme = body.theme
  if (typeof body.notifications === 'boolean') set.notifications = body.notifications
  if (typeof body.isOnline === 'boolean') set.isOnline = body.isOnline

  if (Object.keys(set).length === 1) return NextResponse.json({ error: 'Nada para atualizar' }, { status: 400 })

  const [updated] = await db.update(user).set(set).where(eq(user.id, sessionUser.id)).returning()
  return NextResponse.json(toProfile(updated))
}
