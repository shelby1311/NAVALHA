'use client'

import * as React from 'react'
import { AlertDialog } from '@base-ui/react/alert-dialog'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  confirmLabel?: string
  cancelLabel?: string
  destructive?: boolean
  loading?: boolean
  onConfirm: () => void
}

/** Confirmação para ações destrutivas/irreversíveis (cancelar agendamento, etc.). */
function ConfirmDialog({ open, onOpenChange, title, description, confirmLabel = 'Confirmar', cancelLabel = 'Voltar', destructive = true, loading = false, onConfirm }: Props) {
  return (
    <AlertDialog.Root open={open} onOpenChange={onOpenChange}>
      <AlertDialog.Portal>
        <AlertDialog.Backdrop className="fixed inset-0 z-[60] bg-black/60 transition-opacity duration-200 data-[ending-style]:opacity-0 data-[starting-style]:opacity-0" />
        <div className="fixed inset-0 z-[60] grid place-items-center p-4">
          <AlertDialog.Popup className="w-full max-w-sm rounded-3xl border border-border bg-card p-6 shadow-2xl transition-all duration-200 data-[starting-style]:scale-95 data-[starting-style]:opacity-0 data-[ending-style]:scale-95 data-[ending-style]:opacity-0">
            <AlertDialog.Title className="text-lg font-semibold">{title}</AlertDialog.Title>
            {description && <AlertDialog.Description className="mt-2 text-sm text-muted-foreground">{description}</AlertDialog.Description>}
            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <AlertDialog.Close className={cn(buttonVariants({ variant: 'outline', size: 'lg' }), 'justify-center px-4 py-2.5')}>{cancelLabel}</AlertDialog.Close>
              <button
                type="button"
                onClick={onConfirm}
                disabled={loading}
                className={cn(buttonVariants({ variant: destructive ? 'destructive' : 'default', size: 'lg' }), 'justify-center px-4 py-2.5')}
              >
                {loading ? 'Aguarde...' : confirmLabel}
              </button>
            </div>
          </AlertDialog.Popup>
        </div>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  )
}

export { ConfirmDialog }
