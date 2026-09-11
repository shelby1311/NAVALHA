import { Clock3 } from 'lucide-react'
import type { BookingStatus, BookingWithDetails } from '@/lib/contracts'
import { BookingActions } from './booking-actions'

type Props = { queue: BookingWithDetails[]; updating: string | null; onChangeStatus: (id: string, status: BookingStatus) => void }

export function BarberQueue({ queue, updating, onChangeStatus }: Props) {
  return (
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
              <BookingActions booking={b} updating={updating} onChangeStatus={onChangeStatus} />
            </div>
          </div>
        ))}
      </div>
    </>
  )
}
