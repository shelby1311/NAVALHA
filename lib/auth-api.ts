// Chamadas de autenticação via REST do better-auth (sem dependência de
// inferência de tipos do client). Os endpoints são atendidos pela rota
// catch-all `/api/auth/[...all]`.

export type AuthResult = { error: string | null }

async function post(path: string, body: unknown): Promise<AuthResult> {
  try {
    const res = await fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => null)
      const message = data && typeof data.message === 'string' ? data.message : null
      return { error: message || 'Não foi possível concluir a operação.' }
    }
    return { error: null }
  } catch {
    return { error: 'Serviço temporariamente indisponível.' }
  }
}

export const authApi = {
  signUpEmail: (payload: {
    name: string
    email: string
    password: string
    role: string
    businessName?: string
    city?: string
    neighborhood?: string
  }) => post('/api/auth/sign-up/email', payload),

  signInEmail: (payload: { email: string; password: string }) => post('/api/auth/sign-in/email', payload),
}
