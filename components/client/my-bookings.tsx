import { useCallback, useEffect, useMemo, useState } from 'react'
import { CalendarX2, CheckCircle2, X, XCircle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { EmptyState } from '@/components/ui/empty-state'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/components/ui/toast'
import { apiClient } from '@/lib/api-client'
import { centsToMoney, type MyBooking } from '@/lib/contracts'
import { POLL_INTERVAL_MS, statusBadgeVariant, statusLabel, usePolling } from '@/lib/ui'

function BookingRow({ booking, onCancel, cancelling, highlight }: { booking: MyBooking; onCancel?: (id: string) => void; cancelling?: boolean; highlight?: boolean }) {
  return (
    <Card className={highlight ? 'border-primary/30 bg-primary/5' : booking.status === 'cancelled' ? 'opacity-70' : undefined}>
      <div className="flex flex-wrap items-center gap-3 p-4">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">{booking.barberName} · {booking.serviceName}</p>
          <p className="mt-1 text-xs text-muted-foreground">{new Date(booking.scheduledAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })} · {centsToMoney(booking.priceCents)}</p>
        </div>
        <Badge variant={statusBadgeVariant(booking.status)}>{statusLabel(booking.status)}</Badge>
        {onCancel && (
          <button onClick={() => onCancel(booking.id)} disabled={cancelling} className="flex items-center gap-1 rounded-lg bg-destructive/10 px-3 py-1.5 text-xs font-medium text-destructive disabled:opacity-50">
            <X size={12} />Cancelar
          </button>
        )}
      </div>
    </Card>
  )
}

export function MyBookings() {
  const [bookings, setBookings] = useState<MyBooking[]>([])
  const [loading, setLoading] = useState(true)
  const [cancelling, setCancelling] = useState<string | null>(null)
  const [confirmingId, setConfirmingId] = useState<string | null>(null)
  const toast = useToast()

  const load = useCallback(() => {
    apiClient.listMyBookings().then((r) => { setLoading(false); if (r.data) setBookings(r.data) })
  }, [])

  useEffect(() => { load() }, [load])
  usePolling(load, POLL_INTERVAL_MS)

  async function confirmCancel() {
    if (!confirmingId) return
    const id = confirmingId
    setCancelling(id)
    const result = await apiClient.cancelMyBooking(id)
    setCancelling(null)
    setConfirmingId(null)
    if (result.error) toast.add({ type: 'error', title: 'Não foi possível cancelar', description: result.error })
    else { toast.add({ type: 'success', title: 'Agendamento cancelado' }); load() }
  }

  const upcoming = useMemo(() => bookings.filter((b) => b.status !== 'cancelled' && b.status !== 'completed').sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt)), [bookings])
  const completed = useMemo(() => bookings.filter((b) => b.status === 'completed').sort((a, b) => b.scheduledAt.localeCompare(a.scheduledAt)), [bookings])
  const cancelled = useMemo(() => bookings.filter((b) => b.status === 'cancelled').sort((a, b) => b.scheduledAt.localeCompare(a.scheduledAt)), [bookings])
  const [next, ...rest] = upcoming

  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <section>
        <h2 className="font-semibold">Próximos agendamentos</h2>
        <div className="mt-4 space-y-3">
          {upcoming.length === 0 && (
            <EmptyState icon={CalendarX2} title="Você não tem agendamentos futuros." description="Busque um barbeiro online perto de você para marcar um horário." />
          )}
          {next && (
            <BookingRow
              booking={next}
              highlight
              cancelling={cancelling === next.id}
              onCancel={next.status === 'requested' || next.status === 'confirmed' ? () => setConfirmingId(next.id) : undefined}
            />
          )}
          {rest.map((b) => (
            <BookingRow
              key={b.id}
              booking={b}
              cancelling={cancelling === b.id}
              onCancel={b.status === 'requested' || b.status === 'confirmed' ? () => setConfirmingId(b.id) : undefined}
            />
          ))}
        </div>
      </section>
      <section>
        <h2 className="font-semibold">Concluídos</h2>
        <div className="mt-4 space-y-3">
          {completed.length === 0 && <EmptyState icon={CheckCircle2} title="Nenhum corte concluído ainda." description="Atendimentos finalizados aparecem aqui, com o valor que você realmente pagou." />}
          {completed.map((b) => <BookingRow key={b.id} booking={b} />)}
        </div>
      </section>
      <section>
        <h2 className="font-semibold">Cancelados</h2>
        <div className="mt-4 space-y-3">
          {cancelled.length === 0 && <EmptyState icon={XCircle} title="Nenhum agendamento cancelado." description="Fica registrado aqui se você ou o barbeiro cancelarem um horário." />}
          {cancelled.map((b) => <BookingRow key={b.id} booking={b} />)}
        </div>
      </section>

      <ConfirmDialog
        open={confirmingId != null}
        onOpenChange={(open) => !open && setConfirmingId(null)}
        title="Cancelar este agendamento?"
        description="O horário volta a ficar disponível para outros clientes. Essa ação não pode ser desfeita."
        confirmLabel="Cancelar agendamento"
        cancelLabel="Voltar"
        loading={cancelling != null}
        onConfirm={confirmCancel}
      />
    </div>
  )
}
