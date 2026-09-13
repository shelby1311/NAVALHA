'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Menu, Settings2 } from 'lucide-react'
import { BarberHome } from '@/components/barber/barber-home'
import { ClientHome } from '@/components/client/client-home'
import { Button } from '@/components/ui/button'
import { AmbientBackground } from '@/components/navalha/ambient-background'
import { Logo } from '@/components/navalha/logo'
import { MobileMenu } from '@/components/navalha/mobile-menu'
import { SettingsPanel } from '@/components/navalha/settings-panel'
import { Tabs, TabsList, TabsTab } from '@/components/ui/tabs'
import type { UserProfile } from '@/lib/contracts'
import { applyTheme } from '@/lib/theme'
import { cn } from '@/lib/utils'

type ViewMode = 'client' | 'barber'

export default function Page() {
  const [mode, setMode] = useState<ViewMode>('client')
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loadingProfile, setLoadingProfile] = useState(true)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  // Header nasce transparente (a página "respira" por baixo dele) e só ganha
  // superfície própria depois de rolar — puro efeito de composição, sem dado.
  useEffect(() => {
    function onScroll() { setScrolled(window.scrollY > 8) }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

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
      <AmbientBackground />
      <header
        className={cn(
          'sticky top-0 z-40 border-b px-4 py-4 transition-all duration-300 ease-[var(--ease-premium)] sm:px-6 lg:px-10',
          scrolled ? 'border-border/60 bg-background/85 shadow-soft backdrop-blur-md' : 'border-transparent bg-transparent',
        )}
      >
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3">
          <Logo />
          {/* Só existe algo pra alternar quando a conta é de barbeiro (2 abas) —
              pra cliente/visitante uma TabsList com uma aba só não tem função. */}
          {isBarber && (
            <Tabs value={effectiveMode} onValueChange={(v) => setMode(v as ViewMode)} className="order-3 w-full md:order-none md:w-auto">
              <TabsList className="w-full md:w-auto">
                <TabsTab value="client">Encontrar barbeiro</TabsTab>
                <TabsTab value="barber">Minha barbearia</TabsTab>
              </TabsList>
            </Tabs>
          )}
          <div className="flex items-center gap-2">
            <span className="hidden text-xs text-muted-foreground sm:inline">{effectiveMode === 'client' ? 'Acesso gratuito' : 'Painel profissional'}</span>
            {profile ? (
              <Button onClick={() => setSettingsOpen(true)} aria-label="Abrir configurações" variant="outline" size="icon" className="size-10"><Settings2 size={17} /></Button>
            ) : !loadingProfile && (
              <>
                <Link href="/entrar" className="whitespace-nowrap rounded-xl border border-border/70 px-4 py-2.5 text-xs font-medium text-muted-foreground transition-all duration-200 hover:-translate-y-px hover:border-border hover:text-foreground">Entrar</Link>
                <Link href="/cadastro" className="hidden whitespace-nowrap rounded-xl bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground shadow-soft transition-all duration-200 hover:-translate-y-px hover:bg-primary-hover sm:inline-block">Cadastrar</Link>
              </>
            )}
            <Button onClick={() => setMobileMenuOpen(true)} aria-label="Abrir menu" variant="ghost" size="icon" className="md:hidden"><Menu size={19} /></Button>
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
