export type OpeningHours = Record<string, { open: string; close: string; active: boolean }>

const WEEKDAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const

/** Converte "HH:MM" em minutos desde a meia-noite. */
function parseTimeToMinutes(value: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value)
  if (!match) return null
  const hours = Number(match[1])
  const minutes = Number(match[2])
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null
  return hours * 60 + minutes
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
