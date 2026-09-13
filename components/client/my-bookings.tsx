import { useCallback, useEffect, useMemo, useState } from 'react'
import { AlertTriangle, CalendarX2, CheckCircle2, X, XCircle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { EmptyState } from '@/components/ui/empty-state'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/components/ui/toast'
import { apiClient } from '@/lib/api-client'
import { centsToMoney, type MyBooking } from '@/lib/contracts'
import { POLL_INTERVAL_MS, statusBadgeVariant, statusLabel, usePolling } from '@/lib/ui'
import { cn } from '@/lib/utils'

// Card com destaque visual maior — só para o próximo agendamento (seção 11
// do redesign: "o próximo agendamento deve receber destaque visual").
function NextBookingCard({ booking, onCancel, cancelling }: { booking: MyBooking; onCancel?: () => void; cancelling?: boolean }) {
  const date = new Date(booking.scheduledAt)
  return (
    <Card className="border-primary/30 bg-primary/5 p-5 shadow-elevated">
      <div className="flex items-center gap-4">
        <div className="grid shrink-0 place-items-center rounded-2xl bg-primary/15 px-4 py-3 text-center text-primary">
          <span className="text-2xl font-semibold leading-none">{date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
          <span className="mt-1 text-[0.65rem] uppercase tracking-wide text-primary/80">{date.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' })}</span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold">{booking.barberName}</p>
          <p className="mt-1 text-sm text-muted-foreground">{booking.serviceName} · {centsToMoney(booking.priceCents)}</p>
          <Badge variant={statusBadgeVariant(booking.status)} className="mt-2">{statusLabel(booking.status)}</Badge>
        </div>
      </div>
      {onCancel && (
        <Button onClick={onCancel} disabled={cancelling} variant="destructive" size="sm" className="mt-4 w-full justify-center">
          <X size={12} />Cancelar agendamento
        </Button>
      )}
    </Card>
  )
}

function BookingRow({ booking, onCancel, cancelling }: { booking: MyBooking; onCancel?: (id: string) => void; cancelling?: boolean }) {
  return (
    <Card className={cn('p-4', booking.status === 'cancelled' && 'opacity-70')}>
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">{booking.barberName} · {booking.serviceName}</p>
          <p className="mt-1 text-xs text-muted-foreground">{new Date(booking.scheduledAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })} · {centsToMoney(booking.priceCents)}</p>
        </div>
        <Badge variant={statusBadgeVariant(booking.status)}>{statusLabel(booking.status)}</Badge>
        {onCancel && (
          <Button onClick={() => onCancel(booking.id)} disabled={cancelling} variant="destructive" size="xs">
            <X size={12} />Cancelar
          </Button>
        )}
      </div>
    </Card>
  )
}

export function MyBookings({ onFindBarber }: { onFindBarber?: () => void }) {
  const [bookings, setBookings] = useState<MyBooking[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [cancelling, setCancelling] = useState<string | null>(null)
  const [confirmingId, setConfirmingId] = useState<string | null>(null)
  const toast = useToast()

  const load = useCallback(() => {
    apiClient.listMyBookings().then((r) => {
      setLoading(false)
      setLoadError(r.error)
      if (r.data) setBookings(r.data)
    })
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

  if (loadError && bookings.length === 0) {
    return <EmptyState icon={AlertTriangle} title="Não foi possível carregar seus agendamentos." description={loadError} action={<Button onClick={load} size="sm">Tentar novamente</Button>} />
  }

  return (
    <div className="space-y-8">
      <section>
        <h2 className="font-semibold">Próximos agendamentos</h2>
        <div className="mt-4 space-y-3">
          {upcoming.length === 0 && (
            <EmptyState
              icon={CalendarX2}
              title="Você não tem agendamentos futuros."
              description="Busque um barbeiro online perto de você para marcar um horário."
              action={onFindBarber && <Button onClick={onFindBarber} size="sm">Encontrar barbeiro</Button>}
            />
          )}
          {next && (
            <NextBookingCard
              booking={next}
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
