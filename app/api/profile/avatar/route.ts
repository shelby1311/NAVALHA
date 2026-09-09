import { put } from '@vercel/blob'
import { eq } from 'drizzle-orm'
import { NextResponse } from 'next/server'
import { isResponse, requireUser } from '@/lib/authz'
import { db } from '@/lib/db'
import { toProfile } from '@/lib/profile'
import { user } from '@/lib/schema'

const MAX_SIZE_BYTES = 5 * 1024 * 1024
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']

export async function POST(request: Request) {
  const auth = await requireUser(request)
  if (isResponse(auth)) return auth

  const form = await request.formData().catch(() => null)
  const file = form?.get('file')
  if (!(file instanceof File)) return NextResponse.json({ error: 'Envie um arquivo de imagem.' }, { status: 400 })
  if (!ALLOWED_TYPES.includes(file.type)) return NextResponse.json({ error: 'Formato inválido. Use JPG, PNG ou WEBP.' }, { status: 400 })
  if (file.size > MAX_SIZE_BYTES) return NextResponse.json({ error: 'A imagem deve ter até 5MB.' }, { status: 400 })

  const extension = file.type.split('/')[1]
  const blob = await put(`avatars/${auth.user.id}-${Date.now()}.${extension}`, file, { access: 'public', addRandomSuffix: false })

  const [updated] = await db.update(user).set({ avatarUrl: blob.url, updatedAt: new Date() }).where(eq(user.id, auth.user.id)).returning()
  return NextResponse.json(toProfile(updated))
}
