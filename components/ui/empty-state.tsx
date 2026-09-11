import * as React from 'react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

type Props = {
  icon?: LucideIcon
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
}

// Nunca só "Nenhum resultado.": título explica o que aconteceu, description
// explica o porquê, action (opcional) diz o que fazer a respeito.
function EmptyState({ icon: Icon, title, description, action, className }: Props) {
  return (
    <div className={cn('rounded-2xl border border-dashed border-border p-8 text-center', className)}>
      {Icon && <Icon className="mx-auto mb-3 text-muted-foreground" size={22} />}
      <p className="text-sm font-medium">{title}</p>
      {description && <p className="mx-auto mt-1 max-w-xs text-xs text-muted-foreground">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

export { EmptyState }
