'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Scissors } from 'lucide-react'
import { authApi } from '@/lib/auth-api'

export default function EntrarPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault()
    setError(null)
    setLoading(true)
    const { error } = await authApi.signInEmail({ email, password })
    setLoading(false)
    if (error) {
      setError(error || 'Email ou senha inválidos.')
      return
    }
    router.push('/')
    router.refresh()
  }

  return (
    <main className="min-h-screen bg-background px-4 py-8 text-foreground sm:px-6 lg:px-10">
      <div className="mx-auto flex max-w-6xl flex-col gap-10 lg:flex-row lg:items-center lg:py-10">
        <section className="max-w-xl flex-1">
          <Link href="/" className="mb-12 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft size={16} /> Voltar para a Navalha
          </Link>
          <div className="mb-8 flex items-center gap-3"><span className="grid size-10 place-items-center rounded-xl bg-primary text-primary-foreground"><Scissors size={19} /></span><span className="text-2xl font-semibold">navalha<span className="text-primary">.</span></span></div>
          <p className="text-xs uppercase tracking-[0.2em] text-primary">Bem-vindo de volta</p>
          <h1 className="mt-3 text-balance text-4xl font-semibold tracking-tight sm:text-5xl">Entre na sua conta.</h1>
          <p className="mt-5 max-w-lg text-base leading-7 text-muted-foreground">Acesse sua barbearia ou encontre barbeiros perto de você.</p>
        </section>

        <section className="w-full max-w-xl rounded-3xl border border-border bg-card p-5 shadow-2xl shadow-black/20 sm:p-7">
          <form onSubmit={onSubmit} className="grid gap-3">
            <label className="grid gap-2 text-sm">Email
              <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="seu@email.com" aria-label="Email" className="rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-primary" />
            </label>
            <label className="grid gap-2 text-sm">Senha
              <input required type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Sua senha" aria-label="Senha" className="rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-primary" />
            </label>
            {error && <p className="rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</p>}
            <button type="submit" disabled={loading} className="mt-4 w-full rounded-xl bg-primary px-5 py-3.5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50">
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>
          <p className="mt-4 text-center text-xs text-muted-foreground">Ainda não tem conta? <Link href="/cadastro" className="font-medium text-primary hover:underline">Criar conta</Link></p>
        </section>
      </div>
    </main>
  )
}
