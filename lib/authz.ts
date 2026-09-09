import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'

type SessionUser = NonNullable<Awaited<ReturnType<typeof auth.api.getSession>>>['user']

// Autenticação: só confirma quem é o usuário. Não decide o que ele pode fazer.
export async function requireUser(request: Request): Promise<{ user: SessionUser } | NextResponse> {
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session?.user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  return { user: session.user }
}

export function isResponse(value: unknown): value is NextResponse {
  return value instanceof NextResponse
}

// Autorização: separada da autenticação — decide se o usuário autenticado
// pode acessar um recurso exclusivo de um papel (ex.: rotas de barbeiro).
export async function requireRole(request: Request, role: string): Promise<{ user: SessionUser } | NextResponse> {
  const result = await requireUser(request)
  if (isResponse(result)) return result
  if (result.user.role !== role) return NextResponse.json({ error: 'Acesso não autorizado para este papel.' }, { status: 403 })
  return result
}
