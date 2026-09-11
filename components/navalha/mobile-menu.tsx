'use client'

import { Drawer } from '@base-ui/react/drawer'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { LogOut, Settings2, UserRound, X } from 'lucide-react'
import type { UserProfile } from '@/lib/contracts'
import { authApi } from '@/lib/auth-api'
import { Logo } from './logo'

type Props = { open: boolean; onOpenChange: (open: boolean) => void; profile: UserProfile | null; onOpenSettings: () => void }

/** Menu de conta pro mobile: o hamburger só existe pra abrir isto (antes não fazia nada). */
export function MobileMenu({ open, onOpenChange, profile, onOpenSettings }: Props) {
  const router = useRouter()

  async function signOut() {
    onOpenChange(false)
    await authApi.signOut()
    router.push('/')
    router.refresh()
  }

  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange}>
      <Drawer.Portal>
        <Drawer.Backdrop className="fixed inset-0 z-50 bg-black/60 transition-opacity duration-200 data-[ending-style]:opacity-0 data-[starting-style]:opacity-0" />
        <Drawer.Popup className="fixed inset-x-0 bottom-0 z-50 rounded-t-3xl border border-border bg-card p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-2xl transition-transform duration-200 data-[ending-style]:translate-y-full data-[starting-style]:translate-y-full">
          <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-muted" />
          <div className="flex items-center justify-between">
            <Logo size="sm" />
            <Drawer.Close aria-label="Fechar menu" className="rounded-lg p-2 text-muted-foreground hover:bg-muted"><X size={18} /></Drawer.Close>
          </div>

          <div className="mt-5 grid gap-2">
            {profile ? (
              <>
                <div className="flex items-center gap-3 rounded-xl border border-border p-3">
                  <div className="grid size-10 shrink-0 place-items-center rounded-full bg-primary/15 text-sm font-semibold text-primary"><UserRound size={18} /></div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{profile.name}</p>
                    <p className="text-xs text-muted-foreground">{profile.role === 'barber' ? 'Conta de barbeiro' : 'Conta de cliente'}</p>
                  </div>
                </div>
                <button
                  onClick={() => { onOpenChange(false); onOpenSettings() }}
                  className="flex items-center gap-3 rounded-xl border border-border px-4 py-3 text-left text-sm text-foreground"
                >
                  <Settings2 size={17} className="text-muted-foreground" /> Configurações
                </button>
                <button onClick={signOut} className="flex items-center gap-3 rounded-xl px-4 py-3 text-left text-sm text-destructive">
                  <LogOut size={17} /> Sair da conta
                </button>
              </>
            ) : (
              <>
                <Link href="/entrar" onClick={() => onOpenChange(false)} className="rounded-xl bg-primary px-4 py-3 text-center text-sm font-semibold text-primary-foreground">Entrar</Link>
                <Link href="/cadastro" onClick={() => onOpenChange(false)} className="rounded-xl border border-border px-4 py-3 text-center text-sm font-medium">Criar conta</Link>
              </>
            )}
          </div>
        </Drawer.Popup>
      </Drawer.Portal>
    </Drawer.Root>
  )
}
