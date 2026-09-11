'use client'

import * as React from 'react'
import { Toast as ToastPrimitive } from '@base-ui/react/toast'
import { CheckCircle2, Info, X, XCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

const ToastProvider = ToastPrimitive.Provider
const useToast = ToastPrimitive.useToastManager

const iconByType: Record<string, React.ReactNode> = {
  success: <CheckCircle2 size={18} className="shrink-0 text-emerald-400" />,
  error: <XCircle size={18} className="shrink-0 text-destructive" />,
  info: <Info size={18} className="shrink-0 text-primary" />,
}

/** Fica montado uma vez perto da raiz do app; lê a fila do ToastProvider. */
function Toaster() {
  const { toasts } = useToast()
  return (
    <ToastPrimitive.Portal>
      <ToastPrimitive.Viewport className="fixed inset-x-0 bottom-0 z-[70] flex flex-col items-center gap-2 p-4 sm:inset-x-auto sm:right-4 sm:items-end">
        {toasts.map((toast) => (
          <ToastPrimitive.Root
            key={toast.id}
            toast={toast}
            className={cn(
              'flex w-full max-w-sm items-start gap-2.5 rounded-2xl border border-border bg-card p-4 shadow-2xl transition-all duration-200',
              'data-[starting-style]:translate-y-2 data-[starting-style]:opacity-0 data-[ending-style]:translate-y-2 data-[ending-style]:opacity-0',
            )}
          >
            {iconByType[toast.type ?? 'info']}
            <div className="min-w-0 flex-1">
              {toast.title && <ToastPrimitive.Title className="text-sm font-medium" />}
              {toast.description && <ToastPrimitive.Description className="mt-0.5 text-xs text-muted-foreground" />}
            </div>
            <ToastPrimitive.Close aria-label="Fechar aviso" className="rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground">
              <X size={14} />
            </ToastPrimitive.Close>
          </ToastPrimitive.Root>
        ))}
      </ToastPrimitive.Viewport>
    </ToastPrimitive.Portal>
  )
}

export { ToastProvider, Toaster, useToast }
