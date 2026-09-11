import { useEffect } from 'react'
import type { BookingStatus } from './contracts'

export function initials(name: string) {
  return name.split(' ').filter(Boolean).map((part) => part[0]).join('').slice(0, 2).toUpperCase()
}

export function isToday(dateStr: string) {
  const date = new Date(dateStr)
  const now = new Date()
  return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth() && date.getDate() === now.getDate()
}

export function isCurrentMonth(dateStr: string) {
  const date = new Date(dateStr)
  const now = new Date()
  return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth()
}

export function isLast7Days(dateStr: string) {
  const date = new Date(dateStr).getTime()
  return date >= Date.now() - 7 * 24 * 60 * 60_000 && date <= Date.now()
}

const STATUS_LABELS: Record<string, string> = {
  requested: 'Pendente',
  confirmed: 'Confirmado',
  waiting: 'Aguardando',
  in_service: 'Em atendimento',
  completed: 'Concluído',
  cancelled: 'Cancelado',
}

export function statusLabel(status: string) {
  return STATUS_LABELS[status] ?? status
}

const STATUS_BADGE_VARIANT: Record<string, 'primary' | 'success' | 'warning' | 'destructive' | 'neutral'> = {
  requested: 'warning',
  confirmed: 'primary',
  waiting: 'warning',
  in_service: 'primary',
  completed: 'success',
  cancelled: 'neutral',
}

export function statusBadgeVariant(status: string) {
  return STATUS_BADGE_VARIANT[status] ?? 'neutral'
}

export function actionsFor(status: string): { label: string; to: BookingStatus }[] {
  switch (status) {
    case 'requested':
      return [
        { label: 'Confirmar', to: 'confirmed' },
        { label: 'Cancelar', to: 'cancelled' },
      ]
    case 'confirmed':
      return [
        { label: 'Colocar na fila', to: 'waiting' },
        { label: 'Cancelar', to: 'cancelled' },
      ]
    case 'waiting':
      return [
        { label: 'Iniciar', to: 'in_service' },
        { label: 'Cancelar', to: 'cancelled' },
      ]
    case 'in_service':
      return [{ label: 'Concluir', to: 'completed' }]
    default:
      return []
  }
}

/** Chama `load` de novo a cada `intervalMs`, pausando quando a aba fica invisível. */
export function usePolling(load: () => void, intervalMs: number) {
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null
    function start() { if (!interval) interval = setInterval(load, intervalMs) }
    function stop() { if (interval) { clearInterval(interval); interval = null } }
    function onVisibilityChange() { if (document.hidden) stop(); else { load(); start() } }
    if (!document.hidden) start()
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => { stop(); document.removeEventListener('visibilitychange', onVisibilityChange) }
  }, [load, intervalMs])
}

export const POLL_INTERVAL_MS = 5000
