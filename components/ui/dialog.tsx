import * as React from 'react'
import { Dialog as DialogPrimitive } from '@base-ui/react/dialog'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

function Dialog(props: DialogPrimitive.Root.Props) {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />
}

function DialogTrigger(props: DialogPrimitive.Trigger.Props) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />
}

/** Popup padrão da Navalha: bottom-sheet no mobile, card centralizado a partir de `sm`. */
function DialogContent({ className, children, showClose = true, ...props }: DialogPrimitive.Popup.Props & { showClose?: boolean }) {
  return (
    <DialogPrimitive.Portal data-slot="dialog-portal">
      <DialogPrimitive.Backdrop
        data-slot="dialog-backdrop"
        className="fixed inset-0 z-50 bg-black/60 transition-opacity duration-200 data-[ending-style]:opacity-0 data-[starting-style]:opacity-0"
      />
      <div className="fixed inset-0 z-50 grid place-items-end p-0 sm:place-items-center sm:p-4">
        <DialogPrimitive.Popup
          data-slot="dialog-content"
          className={cn(
            'max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-3xl border border-border bg-card p-6 shadow-2xl transition-all duration-200 sm:rounded-3xl',
            'data-[starting-style]:translate-y-4 data-[starting-style]:opacity-0 data-[ending-style]:translate-y-4 data-[ending-style]:opacity-0',
            className,
          )}
          {...props}
        >
          {showClose && (
            <DialogPrimitive.Close
              aria-label="Fechar"
              className="absolute right-5 top-5 rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <X size={18} />
            </DialogPrimitive.Close>
          )}
          {children}
        </DialogPrimitive.Popup>
      </div>
    </DialogPrimitive.Portal>
  )
}

function DialogHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="dialog-header" className={cn('pr-8', className)} {...props} />
}

function DialogTitle({ className, ...props }: DialogPrimitive.Title.Props) {
  return <DialogPrimitive.Title data-slot="dialog-title" className={cn('text-xl font-semibold', className)} {...props} />
}

function DialogDescription({ className, ...props }: DialogPrimitive.Description.Props) {
  return <DialogPrimitive.Description data-slot="dialog-description" className={cn('mt-1 text-sm text-muted-foreground', className)} {...props} />
}

function DialogClose(props: DialogPrimitive.Close.Props) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />
}

export { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose }
