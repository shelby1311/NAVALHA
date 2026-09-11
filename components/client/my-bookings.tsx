import { useCallback, useEffect, useMemo, useState } from 'react'
import { X } from 'lucide-react'
import { apiClient } from '@/lib/api-client'
import { centsToMoney, type MyBooking } from '@/lib/contracts'
import { POLL_INTERVAL_MS, statusLabel, usePolling } from '@/lib/ui'

export function MyBookings() {
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
