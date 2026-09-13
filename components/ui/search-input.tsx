import * as React from 'react'
import { Search, X, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

function SearchInput({ className, value, onChange, icon: Icon = Search, ...props }: React.ComponentProps<'input'> & { icon?: LucideIcon }) {
  return (
    <div className={cn('flex min-w-0 flex-1 items-center gap-3 rounded-lg px-4 ring-1 ring-transparent transition-all duration-200 focus-within:ring-primary/25', className)}>
      <Icon size={18} className="shrink-0 text-primary/80" />
      <input data-slot="search-input" value={value} onChange={onChange} className="w-full bg-transparent py-3.5 text-sm outline-none placeholder:text-muted-foreground" {...props} />
      {typeof value === 'string' && value.length > 0 && onChange && (
        <button
          type="button"
          aria-label="Limpar busca"
          onClick={() => onChange({ target: { value: '' } } as React.ChangeEvent<HTMLInputElement>)}
          className="shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:bg-elevated hover:text-foreground"
        >
          <X size={14} />
        </button>
      )}
    </div>
  )
}

export { SearchInput }
