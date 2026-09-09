export type OpeningHours = Record<string, { open: string; close: string; active: boolean }>

export const WEEKDAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const

/** Usado quando o barbeiro ainda não configurou `openingHours` (ex.: geração de horários disponíveis). */
export const DEFAULT_OPENING_HOURS: OpeningHours = {
  sun: { open: '09:00', close: '13:00', active: false },
  mon: { open: '09:00', close: '19:00', active: true },
  tue: { open: '09:00', close: '19:00', active: true },
  wed: { open: '09:00', close: '19:00', active: true },
  thu: { open: '09:00', close: '19:00', active: true },
  fri: { open: '09:00', close: '19:00', active: true },
  sat: { open: '09:00', close: '13:00', active: true },
}

/** Converte "HH:MM" em minutos desde a meia-noite. */
export function parseTimeToMinutes(value: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value)
  if (!match) return null
  const hours = Number(match[1])
  const minutes = Number(match[2])
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null
  return hours * 60 + minutes
}

/** Janela de funcionamento (em minutos desde a meia-noite) do dia de `date`, ou `null` se fechado. */
export function janelaDoDia(openingHours: OpeningHours | null | undefined, date: Date): { open: number; close: number } | null {
  const day = WEEKDAY_KEYS[date.getDay()]
  const config = openingHours?.[day]
  if (!config || !config.active) return null

  const open = parseTimeToMinutes(config.open)
  const close = parseTimeToMinutes(config.close)
  if (open == null || close == null || open >= close) return null
  return { open, close }
}

/**
 * Verifica se `date` cai dentro do horário de funcionamento configurado pelo barbeiro.
 * Se o barbeiro nunca configurou horário (`openingHours` ausente), a checagem é
 * permissiva para não quebrar barbeiros já cadastrados sem essa preferência.
 */
export function estaDentroDoHorario(openingHours: OpeningHours | null | undefined, date: Date): boolean {
  if (!openingHours) return true

  const day = WEEKDAY_KEYS[date.getDay()]
  const config = openingHours[day]
  if (!config) return false
  if (!config.active) return false

  const open = parseTimeToMinutes(config.open)
  const close = parseTimeToMinutes(config.close)
  if (open == null || close == null) return true

  const minutesOfDay = date.getHours() * 60 + date.getMinutes()
  return minutesOfDay >= open && minutesOfDay < close
}
