import * as React from 'react'
import { cn } from '@/lib/utils'

const fieldClasses = 'w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50'

function Input({ className, ...props }: React.ComponentProps<'input'>) {
  return <input data-slot="input" className={cn(fieldClasses, className)} {...props} />
}

function Textarea({ className, ...props }: React.ComponentProps<'textarea'>) {
  return <textarea data-slot="textarea" className={cn(fieldClasses, 'min-h-24 resize-y', className)} {...props} />
}

function Select({ className, ...props }: React.ComponentProps<'select'>) {
  return <select data-slot="select" className={cn(fieldClasses, 'appearance-none bg-[right_0.75rem_center] bg-no-repeat pr-9', className)} {...props} />
}

function Label({ className, ...props }: React.ComponentProps<'label'>) {
  return <label data-slot="label" className={cn('grid gap-2 text-sm', className)} {...props} />
}

export { Input, Textarea, Select, Label, fieldClasses }
