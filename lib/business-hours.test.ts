import { describe, expect, it } from 'vitest'
import { DEFAULT_OPENING_HOURS, estaDentroDoHorario, janelaDoDia, parseTimeToMinutes } from './business-hours'

// 2024-01-01 é uma segunda-feira; 2024-01-07 é o domingo seguinte.
const MONDAY = new Date(2024, 0, 1)
const SUNDAY = new Date(2024, 0, 7)

describe('parseTimeToMinutes', () => {
  it('converte HH:MM em minutos', () => {
    expect(parseTimeToMinutes('09:00')).toBe(540)
    expect(parseTimeToMinutes('23:59')).toBe(1439)
  })

  it('aceita hora com um só dígito', () => {
    expect(parseTimeToMinutes('9:00')).toBe(540)
  })

  it('rejeita formato ou valores inválidos', () => {
    expect(parseTimeToMinutes('24:00')).toBeNull()
    expect(parseTimeToMinutes('09:60')).toBeNull()
    expect(parseTimeToMinutes('abc')).toBeNull()
  })
})

describe('janelaDoDia', () => {
  it('retorna a janela em minutos para um dia ativo', () => {
    expect(janelaDoDia(DEFAULT_OPENING_HOURS, MONDAY)).toEqual({ open: 540, close: 1140 })
  })

  it('retorna null para um dia marcado como inativo', () => {
    expect(janelaDoDia(DEFAULT_OPENING_HOURS, SUNDAY)).toBeNull()
  })

  it('retorna null quando openingHours não tem entrada pro dia', () => {
    expect(janelaDoDia({}, MONDAY)).toBeNull()
  })
})

describe('estaDentroDoHorario', () => {
  it('é permissivo quando o barbeiro nunca configurou horário', () => {
    expect(estaDentroDoHorario(null, new Date(2024, 0, 1, 3, 0))).toBe(true)
  })

  it('aceita um horário dentro do expediente configurado', () => {
    expect(estaDentroDoHorario(DEFAULT_OPENING_HOURS, new Date(2024, 0, 1, 10, 0))).toBe(true)
  })

  it('rejeita um horário fora do expediente (antes de abrir)', () => {
    expect(estaDentroDoHorario(DEFAULT_OPENING_HOURS, new Date(2024, 0, 1, 7, 0))).toBe(false)
  })

  it('rejeita qualquer horário em um dia fechado', () => {
    expect(estaDentroDoHorario(DEFAULT_OPENING_HOURS, new Date(2024, 0, 7, 10, 0))).toBe(false)
  })
})
