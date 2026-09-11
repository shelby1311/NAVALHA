import * as React from 'react'
import { Switch as SwitchPrimitive } from '@base-ui/react/switch'
import { cn } from '@/lib/utils'

function Switch({ className, ...props }: SwitchPrimitive.Root.Props) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        'relative inline-flex h-6 w-10 shrink-0 items-center rounded-full bg-muted transition-colors data-[checked]:bg-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50',
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb className="block size-4.5 translate-x-1 rounded-full bg-background shadow transition-transform data-[checked]:translate-x-[1.15rem]" />
    </SwitchPrimitive.Root>
  )
}

export { Switch }
