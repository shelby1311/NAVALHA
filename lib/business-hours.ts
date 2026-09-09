import { dataNoFusoDoNegocio, inicioDoDiaNoFuso, partesNoFusoDoNegocio } from './timezone'

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

/** Janela de funcionamento (em minutos desde a meia-noite, no fuso do negócio) do dia de `date`, ou `null` se fechado. */
export function janelaDoDia(openingHours: OpeningHours | null | undefined, date: Date): { open: number; close: number } | null {
  const day = WEEKDAY_KEYS[partesNoFusoDoNegocio(date).weekday]
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

  const { weekday, hour, minute } = partesNoFusoDoNegocio(date)
  const day = WEEKDAY_KEYS[weekday]
  const config = openingHours[day]
  if (!config) return false
  if (!config.active) return false

  const open = parseTimeToMinutes(config.open)
  const close = parseTimeToMinutes(config.close)
  if (open == null || close == null) return true

  const minutesOfDay = hour * 60 + minute
  return minutesOfDay >= open && minutesOfDay < close
}

/**
 * Verifica se um serviço de `durationMinutes` iniciado em `scheduledAt` termina
 * antes do fechamento do expediente daquele dia. `estaDentroDoHorario` só garante
 * que o INÍCIO cai dentro do expediente — sem esta checagem, um serviço longo
 * poderia começar minutos antes de fechar e terminar bem depois.
 * Sem `openingHours` configurado para o dia, é permissiva (mesma filosofia de
 * `estaDentroDoHorario`).
 */
export function terminaDentroDoHorario(openingHours: OpeningHours | null | undefined, scheduledAt: Date, durationMinutes: number): boolean {
  const janela = janelaDoDia(openingHours, scheduledAt)
  if (!janela) return true

  const { year, month, day } = dataNoFusoDoNegocio(scheduledAt)
  const dayStart = inicioDoDiaNoFuso(year, month, day)
  const end = new Date(scheduledAt.getTime() + durationMinutes * 60_000)
  const endMinutesFromDayStart = (end.getTime() - dayStart.getTime()) / 60_000
  return endMinutesFromDayStart <= janela.close
}
