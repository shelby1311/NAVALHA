import * as React from 'react'
import { cn } from '@/lib/utils'

// ponytail: sem sub-componentes (CardHeader/CardContent/...) — nenhum uso no app
// hoje compõe um Card por partes, todos passam o próprio padding via `className`.
// Adicionar se um card com layout de header/footer fixo aparecer de verdade.
function Card({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="card" className={cn('rounded-xl border border-border bg-card shadow-soft', className)} {...props} />
}

// Aplicar só em cards clicáveis/navegáveis via cn(cardHoverClasses, ...) — não
// faz sentido em cards estáticos (ex: resumo dentro de um modal).
const cardHoverClasses = 'transition-shadow duration-200 ease-[var(--ease-premium)] hover:shadow-elevated hover:border-primary/20'

export { Card, cardHoverClasses }
