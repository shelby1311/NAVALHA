'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Check, Scissors, UserRound } from 'lucide-react'
import { Logo } from '@/components/navalha/logo'
import { authApi } from '@/lib/auth-api'

const roles = {
  client: {
    label: 'Cliente',
    description: 'Encontre barbeiros online na sua região e agende seu próximo corte.',
    points: ['Busca por cidade e bairro', 'Agendamentos gratuitos', 'Perfis e horários disponíveis'],
  },
  barber: {
    label: 'Barbeiro',
    description: 'Tenha todas as ferramentas para administrar sua barbearia.',
    points: ['Perfil público e agenda', 'Controle financeiro completo', 'Configurações e presença online'],
  },
} as const

export default function CadastroPage() {
  const router = useRouter()
  const [role, setRole] = useState<'client' | 'barber'>('client')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [businessName, setBusinessName] = useState('')
  const [cityNeighborhood, setCityNeighborhood] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const selected = roles[role]

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault()
    setError(null)
    setLoading(true)

    const [city, neighborhood] = cityNeighborhood.split(',').map((part) => part.trim())

    const { error } = await authApi.signUpEmail({
      name,
      email,
      password,
      role,
      businessName: role === 'barber' ? businessName : undefined,
      city: role === 'barber' ? city : undefined,
      neighborhood: role === 'barber' ? neighborhood || undefined : undefined,
    })

    setLoading(false)
    if (error) {
      setError(error)
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
          <div className="mb-8"><Logo size="lg" /></div>
          <p className="text-xs uppercase tracking-[0.2em] text-primary">Comece agora</p>
          <h1 className="mt-3 text-balance font-serif text-4xl font-semibold tracking-tight sm:text-5xl">Qual experiência combina com você?</h1>
          <p className="mt-5 max-w-lg text-base leading-7 text-muted-foreground">Escolha seu tipo de conta. Essa escolha define os recursos disponíveis para manter cada experiência simples e segura.</p>
        </section>

        <section className="w-full max-w-xl rounded-3xl border border-border bg-card p-5 shadow-2xl shadow-black/20 sm:p-7">
          <form onSubmit={onSubmit}>
            <div className="grid gap-3 sm:grid-cols-2">
              {(Object.keys(roles) as Array<'client' | 'barber'>).map((item) => {
                const isSelected = role === item
                const Icon = item === 'client' ? UserRound : Scissors
                return <button key={item} type="button" onClick={() => setRole(item)} aria-pressed={isSelected} className={`rounded-2xl border p-5 text-left transition ${isSelected ? 'border-primary bg-primary/10 ring-1 ring-primary' : 'border-border hover:border-primary/50'}`}><div className="flex items-center justify-between"><span className={`grid size-10 place-items-center rounded-xl ${isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}><Icon size={19} /></span>{isSelected && <span className="grid size-6 place-items-center rounded-full bg-primary text-primary-foreground"><Check size={14} /></span>}</div><p className="mt-5 font-semibold">{roles[item].label}</p><p className="mt-2 text-sm leading-6 text-muted-foreground">{roles[item].description}</p></button>
              })}
            </div>
            <div className="mt-6 rounded-2xl bg-muted/60 p-5"><p className="text-sm font-semibold">Sua conta inclui</p><ul className="mt-4 grid gap-3">{selected.points.map((point) => <li key={point} className="flex items-center gap-3 text-sm text-muted-foreground"><span className="grid size-5 place-items-center rounded-full bg-primary/15 text-primary"><Check size={12} /></span>{point}</li>)}</ul></div>
            {role === 'barber' && <div className="mt-5 grid gap-3 sm:grid-cols-2"><input required value={businessName} onChange={(e) => setBusinessName(e.target.value)} placeholder="Nome da barbearia" aria-label="Nome da barbearia" className="rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-primary" /><input required value={cityNeighborhood} onChange={(e) => setCityNeighborhood(e.target.value)} placeholder="Cidade e bairro (ex.: São Paulo, Pinheiros)" aria-label="Cidade e bairro" className="rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-primary" /></div>}
            <div className="mt-5 grid gap-3 sm:grid-cols-2"><input required type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Seu nome" aria-label="Seu nome" className="rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-primary" /><input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Seu melhor email" aria-label="Seu melhor email" className="rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-primary sm:col-span-1" /></div>
            <input required type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Crie uma senha segura" aria-label="Crie uma senha segura" className="mt-3 w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-primary" />
            {error && <p className="mt-4 rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</p>}
            <button type="submit" disabled={loading} className="mt-5 w-full rounded-xl bg-primary px-5 py-3.5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50">
              {loading ? 'Criando conta...' : `Criar conta de ${selected.label.toLowerCase()}`}
            </button>
          </form>
          <p className="mt-4 text-center text-xs text-muted-foreground">Já tem uma conta? <Link href="/entrar" className="font-medium text-primary hover:underline">Entrar</Link></p>
        </section>
      </div>
    </main>
  )
}
