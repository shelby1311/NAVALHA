import * as React from 'react'
import { cn } from '@/lib/utils'

// ponytail: sem sub-componentes (CardHeader/CardContent/...) — nenhum uso no app
// hoje compõe um Card por partes, todos passam o próprio padding via `className`.
// Adicionar se um card com layout de header/footer fixo aparecer de verdade.
function Card({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="card" className={cn('rounded-2xl border border-border bg-card', className)} {...props} />
}

export { Card }
