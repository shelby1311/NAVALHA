'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { CalendarDays, Check, ChevronRight, Clock3, DollarSign, MapPin, Menu, Plus, Scissors, Search, Settings2, Users, Wallet, X, type LucideIcon } from 'lucide-react'
import { BookingModal } from '@/components/navalha/booking-modal'
import { SettingsPanel } from '@/components/navalha/settings-panel'
import { apiClient } from '@/lib/api-client'
import { centsToMoney, type BarberService, type BookingStatus, type BookingWithDetails, type MyBooking, type UserProfile } from '@/lib/contracts'

type ViewMode = 'client' | 'barber'
const POLL_INTERVAL_MS = 5000
type Barber = { id: string; name: string; place: string; online: boolean; avatar: string }

function initials(name: string) {
  return name.split(' ').filter(Boolean).map((part) => part[0]).join('').slice(0, 2).toUpperCase()
}

function isToday(dateStr: string) {
  const date = new Date(dateStr)
  const now = new Date()
  return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth() && date.getDate() === now.getDate()
}

function isCurrentMonth(dateStr: string) {
  const date = new Date(dateStr)
  const now = new Date()
  return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth()
}

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    requested: 'Pendente',
    confirmed: 'Confirmado',
    waiting: 'Aguardando',
    in_service: 'Em atendimento',
    completed: 'Concluído',
    cancelled: 'Cancelado',
  }
  return labels[status] ?? status
}

function actionsFor(status: string): { label: string; to: BookingStatus }[] {
  switch (status) {
    case 'requested':
      return [
        { label: 'Confirmar', to: 'confirmed' },
        { label: 'Cancelar', to: 'cancelled' },
      ]
    case 'confirmed':
      return [
        { label: 'Colocar na fila', to: 'waiting' },
        { label: 'Cancelar', to: 'cancelled' },
      ]
    case 'waiting':
      return [
        { label: 'Iniciar', to: 'in_service' },
        { label: 'Cancelar', to: 'cancelled' },
      ]
    case 'in_service':
      return [{ label: 'Concluir', to: 'completed' }]
    default:
      return []
  }
}

/** Chama `load` de novo a cada `intervalMs`, pausando quando a aba fica invisível. */
function usePolling(load: () => void, intervalMs: number) {
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null
    function start() { if (!interval) interval = setInterval(load, intervalMs) }
    function stop() { if (interval) { clearInterval(interval); interval = null } }
    function onVisibilityChange() { if (document.hidden) stop(); else { load(); start() } }
    if (!document.hidden) start()
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => { stop(); document.removeEventListener('visibilitychange', onVisibilityChange) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [load, intervalMs])
}

function Logo() {
  return (
    <div className="flex items-center gap-2.5 font-semibold tracking-tight">
      <span className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground"><Scissors size={18} /></span>
      <span className="text-xl">navalha<span className="text-primary">.</span></span>
    </div>
  )
}

function MyBookings() {
  const [bookings, setBookings] = useState<MyBooking[]>([])
  const [loading, setLoading] = useState(true)
  const [cancelling, setCancelling] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(() => {
    apiClient.listMyBookings().then((r) => { setLoading(false); if (r.data) setBookings(r.data) })
  }, [])

  useEffect(() => { load() }, [load])
  usePolling(load, POLL_INTERVAL_MS)

  async function cancel(id: string) {
    setCancelling(id)
    setError(null)
    const result = await apiClient.cancelMyBooking(id)
    setCancelling(null)
    if (result.error) setError(result.error)
    else load()
  }

  const upcoming = useMemo(() => bookings.filter((b) => b.status !== 'cancelled' && b.status !== 'completed').sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt)), [bookings])
  const history = useMemo(() => bookings.filter((b) => b.status === 'cancelled' || b.status === 'completed'), [bookings])

  if (loading) return <div className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">Carregando agendamentos...</div>

  return (
    <div className="space-y-8">
      {error && <p className="rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</p>}
      <section>
        <h2 className="font-semibold">Próximos agendamentos</h2>
        <div className="mt-4 space-y-3">
          {upcoming.length === 0 && <p className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">Você não tem agendamentos futuros.</p>}
          {upcoming.map((b) => (
            <div key={b.id} className="flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-card p-4">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{b.barberName} · {b.serviceName}</p>
                <p className="mt-1 text-xs text-muted-foreground">{new Date(b.scheduledAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })} · {centsToMoney(b.priceCents)}</p>
              </div>
              <span className="rounded-lg bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">{statusLabel(b.status)}</span>
              {(b.status === 'requested' || b.status === 'confirmed') && (
                <button onClick={() => cancel(b.id)} disabled={cancelling === b.id} className="flex items-center gap-1 rounded-lg bg-destructive/10 px-3 py-1.5 text-xs font-medium text-destructive disabled:opacity-50"><X size={12} />Cancelar</button>
              )}
            </div>
          ))}
        </div>
      </section>
      <section>
        <h2 className="font-semibold">Histórico</h2>
        <div className="mt-4 space-y-3">
          {history.length === 0 && <p className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">Nenhum atendimento no histórico ainda.</p>}
          {history.map((b) => (
            <div key={b.id} className="flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-card p-4 opacity-80">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{b.barberName} · {b.serviceName}</p>
                <p className="mt-1 text-xs text-muted-foreground">{new Date(b.scheduledAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })} · {centsToMoney(b.priceCents)}</p>
              </div>
              <span className={`rounded-lg px-2.5 py-1 text-xs font-medium ${b.status === 'completed' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-muted text-muted-foreground'}`}>{statusLabel(b.status)}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

function ClientHome({ profile }: { profile: UserProfile | null }) {
  const [section, setSection] = useState<'search' | 'bookings'>('search')
  const [query, setQuery] = useState('')
  const [online, setOnline] = useState(true)
  const [barbers, setBarbers] = useState<Barber[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Barber | null>(null)

  useEffect(() => {
    let active = true
    setLoading(true)
    apiClient.searchBarbers({ city: '', onlyOnline: online }).then((res) => {
      if (!active) return
      setLoading(false)
      setBarbers((res.data ?? []).map((b) => ({
        id: b.id,
        name: b.businessName || b.name,
        place: [b.neighborhood, b.city].filter(Boolean).join(', ') || 'Local não informado',
        online: b.isOnline,
        avatar: initials(b.businessName || b.name),
      })))
    })
    return () => { active = false }
  }, [online])

  const filtered = useMemo(() => barbers.filter((b) => `${b.name} ${b.place}`.toLowerCase().includes(query.toLowerCase())), [query, barbers])

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-10">
      <section className="rounded-3xl border border-border bg-card p-5 sm:p-8">
        <div className="flex flex-wrap items-end justify-between gap-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Navalha para clientes</p>
            <h1 className="mt-3 max-w-2xl text-balance text-3xl font-semibold tracking-tight sm:text-5xl">Seu próximo corte está a poucos minutos.</h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">Encontre barbearias online perto de você e agende sem pagar nada.</p>
          </div>
          <div className="hidden rounded-2xl bg-primary/10 p-4 text-primary sm:block"><MapPin size={26} /></div>
        </div>
        <div className="mt-7 flex flex-col gap-3 rounded-2xl border border-border bg-background p-3 md:flex-row">
          <div className="flex min-w-0 flex-1 items-center gap-3 rounded-xl bg-muted px-4">
            <Search size={18} className="shrink-0 text-muted-foreground" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} aria-label="Buscar por cidade ou bairro" placeholder="Digite cidade, bairro ou barbearia" className="w-full bg-transparent py-3 text-sm outline-none" />
          </div>
          <button onClick={() => setOnline(!online)} className={`flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-medium ${online ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
            <span className={`size-2 rounded-full ${online ? 'bg-emerald-300' : 'bg-muted-foreground'}`} />Online agora
          </button>
        </div>
      </section>

      {profile && (
        <div className="flex w-full items-center gap-1 overflow-x-auto rounded-xl border border-border bg-card p-1 sm:w-fit">
          <button onClick={() => setSection('search')} className={`whitespace-nowrap rounded-lg px-4 py-2 text-xs font-medium ${section === 'search' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}>Buscar barbeiros</button>
          <button onClick={() => setSection('bookings')} className={`whitespace-nowrap rounded-lg px-4 py-2 text-xs font-medium ${section === 'bookings' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}>Meus agendamentos</button>
        </div>
      )}

      {section === 'bookings' && profile ? (
        <MyBookings />
      ) : (
        <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold">Barbeiros perto de você</h2>
          <p className="mt-1 text-xs text-muted-foreground">{filtered.length} resultado(s)</p>
        </div>
      </div>

      <section className="grid gap-4 lg:grid-cols-2">
        {filtered.map((barber) => (
          <article key={barber.id} className="rounded-2xl border border-border bg-card p-4 sm:p-5">
            <div className="flex gap-4">
              <div className="grid size-14 shrink-0 place-items-center rounded-2xl bg-primary/15 font-semibold text-primary">{barber.avatar}</div>
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold">{barber.name}</h3>
                <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground"><MapPin size={12} />{barber.place}</p>
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                  <span className={`flex items-center gap-2 text-xs ${barber.online ? 'text-emerald-400' : 'text-muted-foreground'}`}>
                    <span className="size-2 rounded-full bg-current" />{barber.online ? 'Livre agora' : 'Indisponível'}
                  </span>
                  <button onClick={() => setSelected(barber)} className="flex items-center gap-1 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground">Ver horários <ChevronRight size={14} /></button>
                </div>
              </div>
            </div>
          </article>
        ))}
      </section>

      {loading && <div className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">Carregando barbeiros...</div>}
      {!loading && filtered.length === 0 && <div className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">Nenhum barbeiro online encontrado nessa região.</div>}
        </>
      )}

      {selected && <BookingModal barber={selected} onClose={() => setSelected(null)} />}
    </div>
  )
}

function BarberHome({ onSettings, profile }: { onSettings: () => void; profile: UserProfile }) {
  const [section, setSection] = useState<'overview' | 'queue' | 'services'>('overview')
  const [services, setServices] = useState<BarberService[]>([])
  const [bookings, setBookings] = useState<BookingWithDetails[]>([])
  const [revenue, setRevenue] = useState(0)
  const [name, setName] = useState('')
  const [price, setPrice] = useState('')
  const [duration, setDuration] = useState('')
  const [updating, setUpdating] = useState<string | null>(null)

  const load = useCallback(() => {
    apiClient.listServices().then((r) => r.data && setServices(r.data))
    apiClient.listBookings().then((r) => r.data && setBookings(r.data))
    apiClient.listFinances().then((r) => {
      if (!r.data) return
      setRevenue(r.data.filter((e) => e.type === 'income' && isCurrentMonth(e.entryDate)).reduce((acc, e) => acc + e.amountCents, 0))
    })
  }, [])

  useEffect(() => { load() }, [load])
  usePolling(load, POLL_INTERVAL_MS)

  const todayBookings = useMemo(
    () => bookings.filter((b) => isToday(b.scheduledAt) && b.status !== 'cancelled').sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt)),
    [bookings],
  )
  const queue = useMemo(
    () => bookings.filter((b) => b.status === 'waiting' || b.status === 'in_service').sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt)),
    [bookings],
  )

  async function addService(event: React.FormEvent) {
    event.preventDefault()
    const priceCents = Math.round(Number(price.replace(',', '.')) * 100)
    const durationMinutes = Number(duration)
    if (!name.trim() || Number.isNaN(priceCents) || Number.isNaN(durationMinutes)) return
    const result = await apiClient.createService({ name: name.trim(), priceCents, durationMinutes })
    if (result.data) { setServices((s) => [...s, result.data as BarberService]); setName(''); setPrice(''); setDuration('') }
  }

  async function toggleService(service: BarberService) {
    const result = await apiClient.updateService(service.id, { active: !service.active })
    if (result.data) setServices((s) => s.map((x) => (x.id === service.id ? (result.data as BarberService) : x)))
  }

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editPrice, setEditPrice] = useState('')
  const [editDuration, setEditDuration] = useState('')

  function startEdit(service: BarberService) {
    setEditingId(service.id)
    setEditPrice((service.priceCents / 100).toFixed(2).replace('.', ','))
    setEditDuration(String(service.durationMinutes))
  }

  async function saveEdit(id: string) {
    const priceCents = Math.round(Number(editPrice.replace(',', '.')) * 100)
    const durationMinutes = Number(editDuration)
    if (Number.isNaN(priceCents) || priceCents <= 0 || Number.isNaN(durationMinutes) || durationMinutes <= 0) return
    const result = await apiClient.updateService(id, { priceCents, durationMinutes })
    if (result.data) { setServices((s) => s.map((x) => (x.id === id ? (result.data as BarberService) : x))); setEditingId(null) }
  }

  async function changeStatus(id: string, status: BookingStatus) {
    setUpdating(id)
    const result = await apiClient.updateBookingStatus(id, status)
    setUpdating(null)
    if (result.data) {
      const nextStatus = result.data.status
      setBookings((bs) => bs.map((b) => (b.id === id ? { ...b, status: nextStatus } : b)))
    }
  }

  function bookingActions(b: BookingWithDetails) {
    return actionsFor(b.status).map((action) => (
      <button key={action.to} onClick={() => changeStatus(b.id, action.to)} disabled={updating === b.id} className={`rounded-lg px-3 py-1.5 text-xs font-medium disabled:opacity-50 ${action.to === 'cancelled' ? 'bg-destructive/10 text-destructive' : 'bg-primary/10 text-primary'}`}>
        {action.label}
      </button>
    ))
  }

  const stats: { label: string; value: string; detail: string; Icon: LucideIcon }[] = [
    { label: 'Hoje', value: String(todayBookings.length), detail: 'agendamentos', Icon: CalendarDays },
    { label: 'Fila agora', value: String(queue.length), detail: 'clientes aguardando', Icon: Users },
    { label: 'Receita do mês', value: centsToMoney(revenue), detail: 'entradas no mês', Icon: Wallet },
    { label: 'Online', value: profile.isOnline ? 'Ativo' : 'Inativo', detail: 'visível para clientes', Icon: Check },
  ]

  const nav: { key: 'overview' | 'queue' | 'services'; label: string; icon: LucideIcon }[] = [
    { key: 'overview', label: 'Visão geral', icon: CalendarDays },
    { key: 'queue', label: 'Fila ao vivo', icon: Users },
    { key: 'services', label: 'Serviços e preços', icon: DollarSign },
  ]

  return (
    <div className="mx-auto max-w-7xl pb-10">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Painel da barbearia</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Bom dia, {profile.name.split(' ')[0]}.</h1>
          <p className="mt-2 text-sm text-muted-foreground">Sua operação em um só lugar.</p>
        </div>
        <button onClick={onSettings} className="flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-3 text-sm"><Settings2 size={16} /> Configurações</button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map(({ label, value, detail, Icon }) => (
          <article key={label} className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">{label}</p>
              <span className="rounded-lg bg-primary/10 p-2 text-primary"><Icon size={16} /></span>
            </div>
            <p className="mt-5 text-2xl font-semibold tracking-tight">{value}</p>
            <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
          </article>
        ))}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[220px_1fr]">
        <aside className="flex gap-2 overflow-x-auto lg:flex-col">
          {nav.map(({ key, label, icon: Icon }) => (
            <button key={key} onClick={() => setSection(key)} className={`flex shrink-0 items-center gap-3 rounded-xl px-4 py-3 text-left text-sm ${section === key ? 'bg-primary text-primary-foreground' : 'border border-border bg-card text-muted-foreground'}`}>
              <Icon size={17} />{label}
            </button>
          ))}
          <button onClick={onSettings} className="flex shrink-0 items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 text-left text-sm text-muted-foreground"><Settings2 size={17} />Configurações</button>
        </aside>

        <section className="rounded-2xl border border-border bg-card p-5 sm:p-6">
          {section === 'overview' && (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="font-semibold">Agenda de hoje</h2>
                  <p className="mt-1 text-xs text-muted-foreground">Próximos atendimentos e status da operação.</p>
                </div>
              </div>
              <div className="mt-6 space-y-3">
                {todayBookings.length === 0 && <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">Nenhum agendamento para hoje.</p>}
                {todayBookings.map((b) => (
                  <div key={b.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-border p-4">
                    <span className="w-16 text-sm font-semibold">{new Date(b.scheduledAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                    <div className="grid size-9 place-items-center rounded-full bg-primary/10 text-xs font-semibold text-primary">{initials(b.clientName)}</div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{b.clientName}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{b.serviceName}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs text-emerald-400">{statusLabel(b.status)}</span>
                      {bookingActions(b)}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {section === 'queue' && (
            <>
              <h2 className="font-semibold">Fila em tempo real</h2>
              <p className="mt-1 text-sm text-muted-foreground">Controle quem está aguardando e em atendimento.</p>
              <div className="mt-6 grid gap-3">
                {queue.length === 0 && <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">Ninguém na fila agora.</p>}
                {queue.map((b, index) => (
                  <div key={b.id} className="flex items-center gap-3 rounded-xl bg-muted/60 p-4">
                    <span className="grid size-8 place-items-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">{index + 1}</span>
                    <div className="flex-1">
                      <p className="text-sm">{b.clientName}</p>
                      <p className="text-xs text-muted-foreground">{b.serviceName}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="flex items-center gap-1 text-xs text-muted-foreground"><Clock3 size={13} />{b.status === 'in_service' ? 'Em atendimento' : 'Aguardando'}</span>
                      {bookingActions(b)}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {section === 'services' && (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-semibold">Serviços e preços</h2>
                  <p className="mt-1 text-sm text-muted-foreground">O cliente vê estes valores na sua página pública.</p>
                </div>
              </div>

              <form onSubmit={addService} className="mt-6 grid gap-3 rounded-xl border border-border bg-background p-4 sm:grid-cols-[1fr_120px_110px_auto]">
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome do serviço" aria-label="Nome do serviço" className="rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring" />
                <input value={price} onChange={(e) => setPrice(e.target.value)} placeholder="Preço (R$)" inputMode="decimal" aria-label="Preço" className="rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring" />
                <input value={duration} onChange={(e) => setDuration(e.target.value)} placeholder="Minutos" inputMode="numeric" aria-label="Duração" className="rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring" />
                <button type="submit" className="flex items-center justify-center gap-1.5 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground"><Plus size={16} />Adicionar</button>
              </form>

              <div className="mt-6 divide-y divide-border">
                {services.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">Nenhum serviço cadastrado ainda.</p>}
                {services.map((service) => (
                  <div key={service.id} className="flex flex-wrap items-center gap-3 py-4">
                    <Scissors size={16} className="text-primary" />
                    <div className="min-w-0 flex-1">
                      <p className={`text-sm font-medium ${service.active ? '' : 'text-muted-foreground line-through'}`}>{service.name}</p>
                    </div>
                    {editingId === service.id ? (
                      <>
                        <input value={editPrice} onChange={(e) => setEditPrice(e.target.value)} placeholder="Preço (R$)" inputMode="decimal" aria-label="Editar preço" className="w-24 rounded-lg border border-input bg-background px-2 py-1.5 text-xs outline-none" />
                        <input value={editDuration} onChange={(e) => setEditDuration(e.target.value)} placeholder="Minutos" inputMode="numeric" aria-label="Editar duração" className="w-20 rounded-lg border border-input bg-background px-2 py-1.5 text-xs outline-none" />
                        <button onClick={() => saveEdit(service.id)} className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground">Salvar</button>
                        <button onClick={() => setEditingId(null)} className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium">Cancelar</button>
                      </>
                    ) : (
                      <>
                        <button onClick={() => startEdit(service)} className="text-sm font-semibold hover:underline">{centsToMoney(service.priceCents)}</button>
                        <span className="text-xs text-muted-foreground">{service.durationMinutes} min</span>
                        <button onClick={() => toggleService(service)} className={`rounded-lg px-3 py-1.5 text-xs font-medium ${service.active ? 'bg-emerald-500/15 text-emerald-400' : 'bg-muted text-muted-foreground'}`}>
                          {service.active ? 'Ativo' : 'Pausado'}
                        </button>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  )
}

export default function Page() {
  const [mode, setMode] = useState<ViewMode>('client')
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loadingProfile, setLoadingProfile] = useState(true)
  const [settingsOpen, setSettingsOpen] = useState(false)

  useEffect(() => {
    let active = true
    fetch('/api/profile')
      .then(async (res) => {
        if (!active) return
        if (!res.ok) { setProfile(null); return }
        const data = await res.json()
        setProfile(data)
      })
      .catch(() => { if (active) setProfile(null) })
      .finally(() => { if (active) setLoadingProfile(false) })
    return () => { active = false }
  }, [])

  const isBarber = profile?.role === 'barber'

  // Um cliente autenticado (ou visitante) não tem painel de barbearia — evita
  // que a UI ofereça uma aba que só devolveria 403 nas chamadas de API.
  useEffect(() => {
    if (!isBarber && mode === 'barber') setMode('client')
  }, [isBarber, mode])

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border/60 bg-background/90 px-4 py-4 backdrop-blur sm:px-6 lg:px-10">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3">
          <Logo />
          <div className="order-3 flex w-full items-center gap-1 overflow-x-auto rounded-xl border border-border bg-card p-1 md:order-none md:w-auto">
            <button onClick={() => setMode('client')} className={`whitespace-nowrap rounded-lg px-4 py-2 text-xs font-medium ${mode === 'client' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}>Encontrar barbeiro</button>
            {isBarber && <button onClick={() => setMode('barber')} className={`whitespace-nowrap rounded-lg px-4 py-2 text-xs font-medium ${mode === 'barber' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}>Minha barbearia</button>}
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden text-xs text-muted-foreground sm:inline">{mode === 'client' ? 'Acesso gratuito' : 'Painel profissional'}</span>
            {profile ? (
              <button onClick={() => setSettingsOpen(true)} aria-label="Abrir configurações" className="grid size-10 place-items-center rounded-xl border border-border bg-card text-muted-foreground hover:text-foreground"><Settings2 size={17} /></button>
            ) : !loadingProfile && (
              <Link href="/entrar" className="whitespace-nowrap rounded-xl border border-border bg-card px-4 py-2.5 text-xs font-medium text-muted-foreground hover:text-foreground">Entrar</Link>
            )}
            <button aria-label="Abrir menu" className="rounded-lg p-2 md:hidden"><Menu size={19} /></button>
          </div>
        </div>
      </header>
      <div className="px-4 py-6 sm:px-6 lg:px-10 lg:py-10">
        {mode === 'client' ? <ClientHome profile={profile} /> : isBarber && profile && <BarberHome onSettings={() => setSettingsOpen(true)} profile={profile} />}
      </div>
      {profile && <SettingsPanel profile={profile} open={settingsOpen} onClose={() => setSettingsOpen(false)} onSaved={(next) => { setProfile(next); setSettingsOpen(false) }} />}
    </main>
  )
}
