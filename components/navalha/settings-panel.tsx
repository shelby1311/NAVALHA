'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Camera, Check, LogOut } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input, Label, Select } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsList, TabsPanel, TabsTab } from '@/components/ui/tabs'
import { useToast } from '@/components/ui/toast'
import type { UserProfile } from '@/lib/contracts'
import { apiClient } from '@/lib/api-client'
import { authApi } from '@/lib/auth-api'
import { DEFAULT_OPENING_HOURS } from '@/lib/business-hours'
import { applyTheme } from '@/lib/theme'

type Props = { profile: UserProfile; open: boolean; onClose: () => void; onSaved: (profile: UserProfile) => void }

const DAY_LABELS: Record<string, string> = { sun: 'Dom', mon: 'Seg', tue: 'Ter', wed: 'Qua', thu: 'Qui', fri: 'Sex', sat: 'Sáb' }
const DAY_ORDER = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const

export function SettingsPanel({ profile, open, onClose, onSaved }: Props) {
  const [draft, setDraft] = useState(profile)
  const [preview, setPreview] = useState(profile.avatarUrl)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)
  const toast = useToast()
  const router = useRouter()

  // Reinicia o rascunho ao reabrir — o Dialog fica montado entre aberturas (precisa
  // pra animação de fechar), então não dá pra resetar via `key` no lugar do effect.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { if (open) { setDraft(profile); setPreview(profile.avatarUrl); setAvatarFile(null) } }, [open, profile])

  function update<K extends keyof UserProfile>(key: K, value: UserProfile[K]) {
    setDraft((current) => ({ ...current, [key]: value }))
    // Preview ao vivo: o barbeiro/cliente vê o tema mudar antes de salvar.
    if (key === 'theme') applyTheme(value as UserProfile['theme'])
  }
  function updateDay(day: string, patch: Partial<{ open: string; close: string; active: boolean }>) {
    setDraft((current) => {
      const hours = { ...(current.openingHours ?? DEFAULT_OPENING_HOURS) }
      hours[day] = { ...hours[day], ...patch }
      return { ...current, openingHours: hours }
    })
  }
  function chooseAvatar(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    setAvatarFile(file)
    setPreview(URL.createObjectURL(file))
  }
  async function save() {
    setSaving(true)
    let avatarUrl = draft.avatarUrl
    if (avatarFile) {
      const uploaded = await apiClient.uploadAvatar(avatarFile)
      if (uploaded.error) { setSaving(false); toast.add({ type: 'error', title: 'Não foi possível enviar a foto', description: uploaded.error }); return }
      avatarUrl = uploaded.data?.avatarUrl ?? avatarUrl
    }
    const result = await apiClient.updateProfile({ ...draft, avatarUrl })
    setSaving(false)
    if (result.error) { toast.add({ type: 'error', title: 'Não foi possível salvar', description: result.error }); return }
    const next = result.data ?? { ...draft, avatarUrl }
    onSaved(next)
    toast.add({ type: 'success', title: 'Configurações salvas' })
    onClose()
  }
  // Tema é aplicado em preview ao vivo (`update`) — se fechar sem salvar (X, ESC,
  // clique fora ou Cancelar), volta pro tema realmente salvo.
  function handleOpenChange(next: boolean) {
    if (next) return
    applyTheme(profile.theme)
    onClose()
  }

  async function signOut() {
    onClose()
    await authApi.signOut()
    router.push('/')
    router.refresh()
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <p className="text-xs uppercase tracking-[0.2em] text-primary">Conta e espaço</p>
          <DialogTitle className="mt-2">Configurações</DialogTitle>
          <DialogDescription>Organize como clientes encontram você.</DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="perfil" className="mt-6">
          <TabsList className="w-full overflow-x-auto sm:w-fit">
            <TabsTab value="perfil">Perfil</TabsTab>
            {draft.role === 'barber' && <TabsTab value="agenda">Agenda</TabsTab>}
            <TabsTab value="aparencia">Aparência</TabsTab>
            <TabsTab value="notificacoes">Notificações</TabsTab>
            <TabsTab value="conta">Conta</TabsTab>
          </TabsList>

          <TabsPanel value="perfil" className="mt-6">
            <div className="grid gap-6 md:grid-cols-[140px_1fr]">
              <div className="flex flex-col items-center gap-3">
                <div className="relative grid size-28 place-items-center overflow-hidden rounded-3xl bg-primary/15 text-3xl font-semibold text-primary">
                  {preview ? <img src={preview} alt="Prévia da foto de perfil" className="size-full object-cover" /> : draft.name.split(' ').map((part) => part[0]).join('').slice(0, 2)}
                  <label className="absolute inset-x-2 bottom-2 flex cursor-pointer items-center justify-center gap-1 rounded-xl bg-background/90 py-2 text-xs font-medium">
                    <Camera size={14} /> Trocar
                    <input type="file" accept="image/*" className="sr-only" onChange={chooseAvatar} />
                  </label>
                </div>
                <p className="text-center text-xs text-muted-foreground">JPG ou PNG, até 5 MB</p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Label className="sm:col-span-2">Nome público<Input value={draft.name} onChange={(e) => update('name', e.target.value)} /></Label>
                <Label>Telefone<Input value={draft.phone} onChange={(e) => update('phone', e.target.value)} /></Label>
                <Label>Cidade<Input value={draft.city} onChange={(e) => update('city', e.target.value)} /></Label>
                <Label className="sm:col-span-2">Bairro<Input value={draft.neighborhood} onChange={(e) => update('neighborhood', e.target.value)} /></Label>
              </div>
            </div>
          </TabsPanel>

          {draft.role === 'barber' && (
            <TabsPanel value="agenda" className="mt-6">
              <p className="text-sm text-muted-foreground">Os clientes só verão horários disponíveis dentro dessa janela.</p>
              <div className="mt-4 grid gap-2">
                {DAY_ORDER.map((day) => {
                  const config = draft.openingHours?.[day] ?? DEFAULT_OPENING_HOURS[day]
                  return (
                    <div key={day} className="flex flex-wrap items-center gap-3 rounded-xl border border-border p-3 text-sm">
                      <label className="flex w-24 items-center gap-2 font-medium"><input type="checkbox" checked={config.active} onChange={(e) => updateDay(day, { active: e.target.checked })} />{DAY_LABELS[day]}</label>
                      <input type="time" value={config.open} disabled={!config.active} onChange={(e) => updateDay(day, { open: e.target.value })} className="rounded-lg border border-input bg-background px-2 py-1.5 text-xs outline-none focus:ring-2 focus:ring-ring disabled:opacity-40" />
                      <span className="text-xs text-muted-foreground">até</span>
                      <input type="time" value={config.close} disabled={!config.active} onChange={(e) => updateDay(day, { close: e.target.value })} className="rounded-lg border border-input bg-background px-2 py-1.5 text-xs outline-none focus:ring-2 focus:ring-ring disabled:opacity-40" />
                    </div>
                  )
                })}
              </div>
            </TabsPanel>
          )}

          <TabsPanel value="aparencia" className="mt-6">
            <div className="flex items-center justify-between gap-4 rounded-2xl border border-border p-4">
              <div>
                <p className="text-sm font-medium">Tema</p>
                <p className="text-xs text-muted-foreground">Escuro, claro ou seguindo o sistema.</p>
              </div>
              <Select value={draft.theme} onChange={(e) => update('theme', e.target.value as UserProfile['theme'])} className="w-36">
                <option value="dark">Escuro</option>
                <option value="light">Claro</option>
                <option value="system">Sistema</option>
              </Select>
            </div>
          </TabsPanel>

          <TabsPanel value="notificacoes" className="mt-6 grid gap-3">
            <div className="flex items-center justify-between gap-4 rounded-2xl border border-border p-4">
              <div>
                <p className="text-sm font-medium">Notificações</p>
                <p className="text-xs text-muted-foreground">Avisos de novos agendamentos.</p>
              </div>
              <Switch checked={draft.notifications} onCheckedChange={(checked) => update('notifications', checked)} />
            </div>
            {draft.role === 'barber' && (
              <div className="flex items-center justify-between gap-4 rounded-2xl border border-border p-4">
                <div>
                  <p className="text-sm font-medium">Disponível online</p>
                  <p className="text-xs text-muted-foreground">Aparecer na busca de clientes.</p>
                </div>
                <Switch checked={draft.isOnline} onCheckedChange={(checked) => update('isOnline', checked)} />
              </div>
            )}
          </TabsPanel>

          <TabsPanel value="conta" className="mt-6 grid gap-3">
            <div className="rounded-2xl border border-border p-4 text-sm">
              <p className="text-muted-foreground">E-mail</p>
              <p className="mt-1 font-medium">{draft.email}</p>
            </div>
            <div className="rounded-2xl border border-border p-4 text-sm">
              <p className="text-muted-foreground">Tipo de conta</p>
              <p className="mt-1 font-medium">{draft.role === 'barber' ? 'Barbeiro' : 'Cliente'}</p>
            </div>
            <button onClick={signOut} className="flex items-center justify-center gap-2 rounded-2xl border border-destructive/30 p-4 text-sm font-medium text-destructive hover:bg-destructive/10">
              <LogOut size={16} /> Sair da conta
            </button>
          </TabsPanel>
        </Tabs>

        <div className="mt-7 flex flex-col-reverse gap-3 border-t border-border pt-5 sm:flex-row sm:justify-end">
          <button onClick={() => handleOpenChange(false)} className="rounded-xl border border-border px-5 py-3 text-sm font-medium">Cancelar</button>
          <button onClick={save} disabled={saving} className="flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50">
            {saving ? 'Salvando...' : <><Check size={16} /> Salvar alterações</>}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
