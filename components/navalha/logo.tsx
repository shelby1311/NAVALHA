import { Scissors } from 'lucide-react'

const SIZES = {
  sm: { badge: 'size-8', icon: 15, text: 'text-base' },
  md: { badge: 'size-9', icon: 18, text: 'text-xl' },
  lg: { badge: 'size-10', icon: 19, text: 'text-2xl' },
} as const

export function Logo({ size = 'md' }: { size?: keyof typeof SIZES }) {
  const { badge, icon, text } = SIZES[size]
  return (
    <div className="flex items-center gap-2.5 font-serif font-semibold tracking-tight">
      <span className={`grid ${badge} shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground`}><Scissors size={icon} /></span>
      <span className={text}>navalha<span className="text-primary">.</span></span>
    </div>
  )
}
