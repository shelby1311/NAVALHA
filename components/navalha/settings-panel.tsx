'use client'

import { useEffect, useState } from 'react'
import { Camera, Check, Globe2, Bell, X } from 'lucide-react'
import type { UserProfile } from '@/lib/contracts'
import { apiClient } from '@/lib/api-client'
import { DEFAULT_OPENING_HOURS } from '@/lib/business-hours'

type Props = { profile: UserProfile; open: boolean; onClose: () => void; onSaved: (profile: UserProfile) => void }

const DAY_LABELS: Record<string, string> = { sun: 'Dom', mon: 'Seg', tue: 'Ter', wed: 'Qua', thu: 'Qui', fri: 'Sex', sat: 'Sáb' }
const DAY_ORDER = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const

export function SettingsPanel({ profile, open, onClose, onSaved }: Props) {
  const [draft, setDraft] = useState(profile)
  const [preview, setPreview] = useState(profile.avatarUrl)
  const [saved, setSaved] = useState(false)

  useEffect(() => { if (open) { setDraft(profile); setPreview(profile.avatarUrl); setSaved(false) } }, [open, profile])
  if (!open) return null

  function update<K extends keyof UserProfile>(key: K, value: UserProfile[K]) { setDraft((current) => ({ ...current, [key]: value })) }
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
    setPreview(URL.createObjectURL(file))
  }
  async function save() {
    const result = await apiClient.updateProfile({ ...draft, avatarUrl: preview })
    const next = result.data ?? { ...draft, avatarUrl: preview }
    onSaved(next); setSaved(true); setTimeout(onClose, 700)
  }

  return <div className="fixed inset-0 z-50 flex items-end justify-center bg-background/80 p-0 backdrop-blur-sm sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-labelledby="settings-title">
    <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-3xl border border-border bg-card p-5 shadow-2xl sm:rounded-3xl sm:p-7">
      <div className="flex items-start justify-between gap-4"><div><p className="text-xs uppercase tracking-[0.2em] text-primary">Conta e espaço</p><h2 id="settings-title" className="mt-2 text-2xl font-semibold">Configurações do perfil</h2><p className="mt-1 text-sm text-muted-foreground">Organize como clientes encontram você.</p></div><button onClick={onClose} className="rounded-xl p-2 text-muted-foreground hover:bg-muted" aria-label="Fechar configurações"><X size={19} /></button></div>
      <div className="mt-7 grid gap-6 md:grid-cols-[180px_1fr]">
        <div className="flex flex-col items-center gap-3"><div className="relative grid size-32 place-items-center overflow-hidden rounded-3xl bg-primary/15 text-3xl font-semibold text-primary">{preview ? <img src={preview} alt="Prévia da foto de perfil" className="size-full object-cover" /> : draft.name.split(' ').map((part) => part[0]).join('').slice(0, 2)}<label className="absolute inset-x-2 bottom-2 flex cursor-pointer items-center justify-center gap-1 rounded-xl bg-background/90 py-2 text-xs font-medium"><Camera size={14} /> Trocar foto<input type="file" accept="image/*" className="sr-only" onChange={chooseAvatar} /></label></div><p className="text-center text-xs text-muted-foreground">JPG ou PNG, até 5 MB</p></div>
        <div className="grid gap-4 sm:grid-cols-2"><label className="grid gap-2 text-sm sm:col-span-2">Nome público<input value={draft.name} onChange={(e) => update('name', e.target.value)} className="rounded-xl border border-input bg-background px-3 py-3 outline-none focus:ring-2 focus:ring-ring" /></label><label className="grid gap-2 text-sm">Telefone<input value={draft.phone} onChange={(e) => update('phone', e.target.value)} className="rounded-xl border border-input bg-background px-3 py-3 outline-none focus:ring-2 focus:ring-ring" /></label><label className="grid gap-2 text-sm">Cidade<input value={draft.city} onChange={(e) => update('city', e.target.value)} className="rounded-xl border border-input bg-background px-3 py-3 outline-none focus:ring-2 focus:ring-ring" /></label><label className="grid gap-2 text-sm sm:col-span-2">Bairro<input value={draft.neighborhood} onChange={(e) => update('neighborhood', e.target.value)} className="rounded-xl border border-input bg-background px-3 py-3 outline-none focus:ring-2 focus:ring-ring" /></label></div>
      </div>
      {draft.role === 'barber' && (
        <div className="mt-7 border-t border-border pt-6">
          <b className="text-sm">Horário de funcionamento</b>
          <p className="mt-1 text-xs text-muted-foreground">Os clientes só verão horários disponíveis dentro dessa janela.</p>
          <div className="mt-4 grid gap-2">
            {DAY_ORDER.map((day) => {
              const config = draft.openingHours?.[day] ?? DEFAULT_OPENING_HOURS[day]
              return (
                <div key={day} className="flex flex-wrap items-center gap-3 rounded-xl border border-border p-3 text-sm">
                  <label className="flex w-24 items-center gap-2 font-medium"><input type="checkbox" checked={config.active} onChange={(e) => updateDay(day, { active: e.target.checked })} />{DAY_LABELS[day]}</label>
                  <input type="time" value={config.open} disabled={!config.active} onChange={(e) => updateDay(day, { open: e.target.value })} className="rounded-lg border border-input bg-background px-2 py-1.5 text-xs outline-none disabled:opacity-40" />
                  <span className="text-xs text-muted-foreground">até</span>
                  <input type="time" value={config.close} disabled={!config.active} onChange={(e) => updateDay(day, { close: e.target.value })} className="rounded-lg border border-input bg-background px-2 py-1.5 text-xs outline-none disabled:opacity-40" />
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div className="mt-7 grid gap-3 border-t border-border pt-6 sm:grid-cols-3"><button onClick={() => update('isOnline', !draft.isOnline)} className={`flex items-center gap-3 rounded-2xl border p-4 text-left ${draft.isOnline ? 'border-primary/50 bg-primary/10' : 'border-border'}`}><Globe2 size={18} className="text-primary" /><span className="flex-1"><b className="block text-sm">Disponível online</b><small className="text-xs text-muted-foreground">Aparecer na busca</small></span><span className={`size-2 rounded-full ${draft.isOnline ? 'bg-emerald-400' : 'bg-muted-foreground'}`} /></button><button onClick={() => update('notifications', !draft.notifications)} className="flex items-center gap-3 rounded-2xl border border-border p-4 text-left"><Bell size={18} className="text-primary" /><span className="flex-1"><b className="block text-sm">Notificações</b><small className="text-xs text-muted-foreground">Novos agendamentos</small></span><span className={`size-5 rounded-md border ${draft.notifications ? 'border-primary bg-primary text-primary-foreground' : 'border-input'}`}>{draft.notifications && <Check size={14} />}</span></button><label className="grid gap-2 rounded-2xl border border-border p-4 text-sm">Tema<select value={draft.theme} onChange={(e) => update('theme', e.target.value as UserProfile['theme'])} className="bg-transparent text-xs outline-none"><option value="dark">Escuro</option><option value="light">Claro</option><option value="system">Sistema</option></select></label></div>
      <div className="mt-7 flex flex-col-reverse gap-3 border-t border-border pt-5 sm:flex-row sm:justify-end"><button onClick={onClose} className="rounded-xl border border-border px-5 py-3 text-sm font-medium">Cancelar</button><button onClick={save} className="flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground">{saved ? <><Check size={16} /> Salvo</> : 'Salvar alterações'}</button></div>
    </div>
  </div>
}
