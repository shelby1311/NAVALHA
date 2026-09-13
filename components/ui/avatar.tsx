import * as React from 'react'
import { cn } from '@/lib/utils'
import { initials } from '@/lib/ui'

const sizeClasses = {
  sm: 'size-9 text-xs',
  default: 'size-11 text-sm',
  lg: 'size-14 text-base',
}

function Avatar({ name, size = 'default', className, ...props }: React.ComponentProps<'div'> & { name: string; size?: keyof typeof sizeClasses }) {
  return (
    <div
      data-slot="avatar"
      className={cn('grid shrink-0 place-items-center rounded-2xl bg-primary/15 font-semibold text-primary', sizeClasses[size], className)}
      {...props}
    >
      {initials(name)}
    </div>
  )
}

export { Avatar }
