import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

// A cor nunca é o único sinal: cada variante também recebe um `dot` da cor
// correspondente, então o estado ainda é legível para quem não distingue cor.
const badgeVariants = cva('inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium', {
  variants: {
    variant: {
      neutral: 'bg-muted text-muted-foreground',
      primary: 'bg-primary/10 text-primary',
      success: 'bg-emerald-500/15 text-emerald-400',
      warning: 'bg-amber-500/15 text-amber-400',
      destructive: 'bg-destructive/10 text-destructive',
    },
  },
  defaultVariants: { variant: 'neutral' },
})

const dotClasses: Record<string, string> = {
  neutral: 'bg-muted-foreground',
  primary: 'bg-primary',
  success: 'bg-emerald-400',
  warning: 'bg-amber-400',
  destructive: 'bg-destructive',
}

type BadgeProps = React.ComponentProps<'span'> & VariantProps<typeof badgeVariants> & { dot?: boolean }

function Badge({ className, variant = 'neutral', dot = true, children, ...props }: BadgeProps) {
  return (
    <span data-slot="badge" className={cn(badgeVariants({ variant }), className)} {...props}>
      {dot && <span className={cn('size-1.5 shrink-0 rounded-full', dotClasses[variant ?? 'neutral'])} />}
      {children}
    </span>
  )
}

export { Badge, badgeVariants }
