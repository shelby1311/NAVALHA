import * as React from 'react'
import { Tabs as TabsPrimitive } from '@base-ui/react/tabs'
import { cn } from '@/lib/utils'

function Tabs({ className, ...props }: TabsPrimitive.Root.Props) {
  return <TabsPrimitive.Root data-slot="tabs" className={cn(className)} {...props} />
}

function TabsList({ className, ...props }: TabsPrimitive.List.Props) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      className={cn('flex w-full items-center gap-1 overflow-x-auto rounded-xl border border-border bg-card p-1 sm:w-fit', className)}
      {...props}
    />
  )
}

function TabsTab({ className, ...props }: TabsPrimitive.Tab.Props) {
  return (
    <TabsPrimitive.Tab
      data-slot="tabs-tab"
      className={cn(
        'whitespace-nowrap rounded-lg px-4 py-2 text-xs font-medium text-muted-foreground outline-none data-[selected]:bg-primary data-[selected]:text-primary-foreground',
        className,
      )}
      {...props}
    />
  )
}

function TabsPanel({ className, ...props }: TabsPrimitive.Panel.Props) {
  return <TabsPrimitive.Panel data-slot="tabs-panel" className={cn('outline-none', className)} {...props} />
}

export { Tabs, TabsList, TabsTab, TabsPanel }
