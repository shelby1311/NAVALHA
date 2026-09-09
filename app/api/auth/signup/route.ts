import { eq } from 'drizzle-orm'
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { user } from '@/lib/schema'

const MAX_TEXT_LENGTH = 120

function isValidString(value: unknown, maxLength = MAX_TEXT_LENGTH): value is string {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= maxLength
}

// Wrapper sobre o /sign-up/email do better-auth: cria a conta primeiro (sem `role`,
// que tem input:false — ver lib/auth.ts) e, só então, grava role/dados de barbeiro
// com uma escrita direta no banco. Isso existe porque o better-auth não tem como
// aceitar um campo apenas na criação e recusá-lo depois em updates — a única forma seria
// aceitá-lo sempre, o que reabriria a escalação de privilégio.
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null
  if (!body || !isValidString(body.name) || typeof body.email !== 'string' || typeof body.password !== 'string') {
    return NextResponse.json({ error: 'Payload inválido' }, { status: 400 })
  }

  const role = body.role === 'barber' ? 'barber' : 'client'

  let response: Response
  try {
    response = await auth.api.signUpEmail({
      // phone/avatarUrl/businessName/city/neighborhood são sobrescritos logo abaixo
      // (ou zerados para role 'client') — os valores aqui não importam, só satisfazem
      // o tipo desses additionalFields.
      body: { name: (body.name as string).trim(), email: body.email, password: body.password, phone: '', avatarUrl: '', businessName: '', city: '', neighborhood: '' },
      headers: request.headers,
      asResponse: true,
    })
  } catch {
    return NextResponse.json({ error: 'Não foi possível criar a conta.' }, { status: 500 })
  }

  if (!response.ok) return response

  const responseBody = (await response.json().catch(() => null)) as { user?: { id?: string } } | null
  const newUserId = responseBody?.user?.id

  if (newUserId) {
    await db
      .update(user)
      .set({
        role,
        businessName: role === 'barber' && isValidString(body.businessName) ? (body.businessName as string).trim() : null,
        city: role === 'barber' && isValidString(body.city) ? (body.city as string).trim() : null,
        neighborhood: role === 'barber' && isValidString(body.neighborhood) ? (body.neighborhood as string).trim() : null,
      })
      .where(eq(user.id, newUserId))
  }

  return new NextResponse(JSON.stringify(responseBody), { status: response.status, headers: response.headers })
}
