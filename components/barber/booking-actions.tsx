import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import type { BookingStatus, BookingWithDetails } from '@/lib/contracts'
import { actionsFor } from '@/lib/ui'

type Props = { booking: BookingWithDetails; updating: string | null; onChangeStatus: (id: string, status: BookingStatus) => void }

/** Botões de transição de status (Confirmar/Cancelar/etc.), usados na visão geral e na fila. */
export function BookingActions({ booking, updating, onChangeStatus }: Props) {
  const [confirmingCancel, setConfirmingCancel] = useState(false)

  return (
    <>
      {actionsFor(booking.status).map((action) =>
        action.to === 'cancelled' ? (
          <Button key={action.to} onClick={() => setConfirmingCancel(true)} disabled={updating === booking.id} variant="destructive" size="xs">
            {action.label}
          </Button>
        ) : (
          <button
            key={action.to}
            onClick={() => onChangeStatus(booking.id, action.to)}
            disabled={updating === booking.id}
            className="rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary transition-colors duration-200 hover:bg-primary/20 disabled:opacity-50"
          >
            {action.label}
          </button>
        ),
      )}

      <ConfirmDialog
        open={confirmingCancel}
        onOpenChange={setConfirmingCancel}
        title="Cancelar este agendamento?"
        description={`Avisa ${booking.clientName} e libera o horário. Essa ação não pode ser desfeita.`}
        confirmLabel="Cancelar agendamento"
        cancelLabel="Voltar"
        loading={updating === booking.id}
        onConfirm={() => { onChangeStatus(booking.id, 'cancelled'); setConfirmingCancel(false) }}
      />
    </>
  )
}
