import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { CalendarDays, Check, DollarSign, Settings2, Users, Wallet, type LucideIcon } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { useToast } from '@/components/ui/toast'
import { apiClient } from '@/lib/api-client'
import { centsToMoney, type BarberService, type BookingStatus, type BookingWithDetails, type FinancialEntry, type UserProfile } from '@/lib/contracts'
import { isCurrentMonth, isToday, POLL_INTERVAL_MS, usePolling } from '@/lib/ui'
import { BarberOverview } from './barber-overview'
import { BarberQueue } from './barber-queue'
import { BarberServices } from './barber-services'
import { BarberFinance } from './barber-finance'

type Section = 'overview' | 'queue' | 'services' | 'finance'

export function BarberHome({ onSettings, profile }: { onSettings: () => void; profile: UserProfile }) {
  const [section, setSection] = useState<Section>('overview')
  const [services, setServices] = useState<BarberService[]>([])
  const [bookings, setBookings] = useState<BookingWithDetails[]>([])
  const [finances, setFinances] = useState<FinancialEntry[]>([])
  const [updating, setUpdating] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const isFirstLoad = useRef(true)
  const toast = useToast()

  const load = useCallback(() => {
    Promise.all([
      apiClient.listServices().then((r) => { if (r.data) setServices(r.data); return r.error }),
      apiClient.listBookings().then((r) => { if (r.data) setBookings(r.data); return r.error }),
      apiClient.listFinances().then((r) => { if (r.data) setFinances(r.data); return r.error }),
    ]).then((errors) => {
      // Só avisa na primeira carga: falhas de poll seguintes ficam silenciosas
      // enquanto ainda houver dado bom na tela (evita spam de toast a cada 5s).
      if (isFirstLoad.current) {
        const firstError = errors.find((e) => e != null)
        if (firstError) toast.add({ type: 'error', title: 'Não foi possível carregar seu painel', description: firstError })
        isFirstLoad.current = false
      }
    }).finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  async function changeStatus(id: string, status: BookingStatus) {
    setUpdating(id)
    const result = await apiClient.updateBookingStatus(id, status)
    setUpdating(null)
    if (result.data) {
      const nextStatus = result.data.status
      setBookings((bs) => bs.map((b) => (b.id === id ? { ...b, status: nextStatus } : b)))
    } else if (result.error) {
      toast.add({ type: 'error', title: 'Não foi possível atualizar o agendamento', description: result.error })
    }
  }

  const monthRevenue = useMemo(() => finances.filter((e) => e.type === 'income' && isCurrentMonth(e.entryDate)).reduce((acc, e) => acc + e.amountCents, 0), [finances])

  const stats: { label: string; value: string; detail: string; Icon: LucideIcon }[] = [
    { label: 'Hoje', value: String(todayBookings.length), detail: 'agendamentos', Icon: CalendarDays },
    { label: 'Fila agora', value: String(queue.length), detail: 'clientes aguardando', Icon: Users },
    { label: 'Receita do mês', value: centsToMoney(monthRevenue), detail: 'entradas no mês', Icon: Wallet },
    { label: 'Online', value: profile.isOnline ? 'Ativo' : 'Inativo', detail: 'visível para clientes', Icon: Check },
  ]

  const nav: { key: Section; label: string; icon: LucideIcon }[] = [
    { key: 'overview', label: 'Visão geral', icon: CalendarDays },
    { key: 'queue', label: 'Fila ao vivo', icon: Users },
    { key: 'services', label: 'Serviços e preços', icon: DollarSign },
    { key: 'finance', label: 'Financeiro', icon: Wallet },
  ]

  return (
    <div className="mx-auto max-w-7xl pb-10">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Painel da barbearia</p>
          <h1 className="mt-2 font-serif text-3xl font-semibold tracking-tight sm:text-4xl">Bom dia, {profile.name.split(' ')[0]}.</h1>
          <p className="mt-2 text-sm text-muted-foreground">Sua operação em um só lugar.</p>
        </div>
        <button onClick={onSettings} className="flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-3 text-sm"><Settings2 size={16} /> Configurações</button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map(({ label, value, detail, Icon }) => (
          <Card key={label} className="p-5">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">{label}</p>
              <span className="rounded-lg bg-primary/10 p-2 text-primary"><Icon size={16} /></span>
            </div>
            <p className="mt-5 text-2xl font-semibold tracking-tight">{value}</p>
            <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
          </Card>
        ))}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[220px_1fr]">
        <aside className="flex gap-2 overflow-x-auto lg:flex-col">
          {nav.map(({ key, label, icon: Icon }) => (
            <button key={key} onClick={() => setSection(key)} aria-current={section === key ? 'page' : undefined} className={`flex shrink-0 items-center gap-3 rounded-xl px-4 py-3 text-left text-sm ${section === key ? 'bg-primary text-primary-foreground' : 'border border-border bg-card text-muted-foreground'}`}>
              <Icon size={17} />{label}
            </button>
          ))}
          <button onClick={onSettings} className="flex shrink-0 items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 text-left text-sm text-muted-foreground"><Settings2 size={17} />Configurações</button>
        </aside>

        <section className="rounded-2xl border border-border bg-card p-5 sm:p-6">
          {section === 'overview' && <BarberOverview todayBookings={todayBookings} updating={updating} onChangeStatus={changeStatus} loading={loading} />}
          {section === 'queue' && <BarberQueue queue={queue} updating={updating} onChangeStatus={changeStatus} loading={loading} />}
          {section === 'services' && <BarberServices services={services} onServicesChange={setServices} loading={loading} />}
          {section === 'finance' && <BarberFinance finances={finances} onFinancesChange={setFinances} loading={loading} />}
        </section>
      </div>
    </div>
  )
}
