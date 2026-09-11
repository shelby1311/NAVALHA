import { CalendarCheck, ChevronRight } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { Skeleton } from '@/components/ui/skeleton'
import type { BookingStatus, BookingWithDetails } from '@/lib/contracts'
import { initials, statusBadgeVariant, statusLabel } from '@/lib/ui'
import { BookingActions } from './booking-actions'

type Props = { todayBookings: BookingWithDetails[]; updating: string | null; onChangeStatus: (id: string, status: BookingStatus) => void; loading: boolean }

export function BarberOverview({ todayBookings, updating, onChangeStatus, loading }: Props) {
  const next = todayBookings.find((b) => b.status !== 'completed')

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold">Agenda de hoje</h2>
          <p className="mt-1 text-xs text-muted-foreground">Próximos atendimentos e status da operação.</p>
        </div>
      </div>

      {loading ? (
        <Skeleton className="mt-6 h-24 w-full" />
      ) : next ? (
        <Card className="mt-6 border-primary/30 bg-primary/5 p-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">Próximo atendimento</p>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <div className="grid size-11 place-items-center rounded-full bg-primary/15 text-sm font-semibold text-primary">{initials(next.clientName)}</div>
            <div className="min-w-0 flex-1">
              <p className="font-medium">{next.clientName}</p>
              <p className="text-sm text-muted-foreground">{next.serviceName}</p>
            </div>
            <span className="flex items-center gap-1 text-xl font-semibold tracking-tight">
              {new Date(next.scheduledAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        </Card>
      ) : null}

      <div className="mt-6 flex items-center gap-2 text-xs text-muted-foreground"><ChevronRight size={14} /> Agenda completa de hoje</div>
      <div className="mt-3 space-y-3">
        {loading ? (
          <>
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </>
        ) : todayBookings.length === 0 ? (
          <EmptyState icon={CalendarCheck} title="Nenhum agendamento para hoje." description="Sua agenda está livre — novos pedidos aparecem aqui em tempo real." />
        ) : (
          todayBookings.map((b) => (
            <div key={b.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-border p-4">
              <span className="w-16 text-sm font-semibold">{new Date(b.scheduledAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
              <div className="grid size-9 place-items-center rounded-full bg-primary/10 text-xs font-semibold text-primary">{initials(b.clientName)}</div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{b.clientName}</p>
                <p className="mt-1 text-xs text-muted-foreground">{b.serviceName}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={statusBadgeVariant(b.status)}>{statusLabel(b.status)}</Badge>
                <BookingActions booking={b} updating={updating} onChangeStatus={onChangeStatus} />
              </div>
            </div>
          ))
        )}
      </div>
    </>
  )
}
