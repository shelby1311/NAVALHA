'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Menu, Settings2 } from 'lucide-react'
import { BarberHome } from '@/components/barber/barber-home'
import { ClientHome } from '@/components/client/client-home'
import { Logo } from '@/components/navalha/logo'
import { MobileMenu } from '@/components/navalha/mobile-menu'
import { SettingsPanel } from '@/components/navalha/settings-panel'
import type { UserProfile } from '@/lib/contracts'
import { applyTheme } from '@/lib/theme'

type ViewMode = 'client' | 'barber'

export default function Page() {
  const [mode, setMode] = useState<ViewMode>('client')
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loadingProfile, setLoadingProfile] = useState(true)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    let active = true
    fetch('/api/profile')
      .then(async (res) => {
        if (!active) return
        if (!res.ok) { setProfile(null); return }
        const data = await res.json()
        setProfile(data)
        // Sincroniza com o tema salvo na conta (fonte de verdade), ex.: primeiro
        // acesso neste dispositivo ou tema trocado em outro.
        applyTheme(data.theme)
      })
      .catch(() => { if (active) setProfile(null) })
      .finally(() => { if (active) setLoadingProfile(false) })
    return () => { active = false }
  }, [])

  const isBarber = profile?.role === 'barber'

  // Um cliente autenticado (ou visitante) não tem painel de barbearia — evita
  // que a UI ofereça uma aba que só devolveria 403 nas chamadas de API. Derivado
  // no render (não via effect+setState) para não disparar uma renderização extra.
  const effectiveMode = isBarber ? mode : 'client'

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border/60 bg-background/90 px-4 py-4 backdrop-blur sm:px-6 lg:px-10">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3">
          <Logo />
          <div className="order-3 flex w-full items-center gap-1 overflow-x-auto rounded-xl border border-border bg-card p-1 md:order-none md:w-auto">
            <button onClick={() => setMode('client')} aria-current={effectiveMode === 'client' ? 'page' : undefined} className={`whitespace-nowrap rounded-lg px-4 py-2 text-xs font-medium ${effectiveMode === 'client' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}>Encontrar barbeiro</button>
            {isBarber && <button onClick={() => setMode('barber')} aria-current={effectiveMode === 'barber' ? 'page' : undefined} className={`whitespace-nowrap rounded-lg px-4 py-2 text-xs font-medium ${effectiveMode === 'barber' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}>Minha barbearia</button>}
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden text-xs text-muted-foreground sm:inline">{effectiveMode === 'client' ? 'Acesso gratuito' : 'Painel profissional'}</span>
            {profile ? (
              <button onClick={() => setSettingsOpen(true)} aria-label="Abrir configurações" className="grid size-10 place-items-center rounded-xl border border-border bg-card text-muted-foreground hover:text-foreground"><Settings2 size={17} /></button>
            ) : !loadingProfile && (
              <Link href="/entrar" className="whitespace-nowrap rounded-xl border border-border bg-card px-4 py-2.5 text-xs font-medium text-muted-foreground hover:text-foreground">Entrar</Link>
            )}
            <button onClick={() => setMobileMenuOpen(true)} aria-label="Abrir menu" className="rounded-lg p-2 text-muted-foreground hover:text-foreground md:hidden"><Menu size={19} /></button>
          </div>
        </div>
      </header>
      <div className="px-4 py-6 sm:px-6 lg:px-10 lg:py-10">
        {effectiveMode === 'client' ? <ClientHome profile={profile} /> : profile && <BarberHome onSettings={() => setSettingsOpen(true)} profile={profile} />}
      </div>
      {profile && <SettingsPanel profile={profile} open={settingsOpen} onClose={() => setSettingsOpen(false)} onSaved={(next) => { setProfile(next); setSettingsOpen(false) }} />}
      <MobileMenu open={mobileMenuOpen} onOpenChange={setMobileMenuOpen} profile={profile} onOpenSettings={() => setSettingsOpen(true)} />
    </main>
  )
}
