import { describe, expect, it } from 'vitest'
import { DEFAULT_OPENING_HOURS, estaDentroDoHorario, janelaDoDia, parseTimeToMinutes, terminaDentroDoHorario } from './business-hours'

// Constrói o instante UTC que corresponde a h:mi do dia d/m/y no horário de Brasília
// (fixo em UTC-3, ver lib/timezone.ts) — não usa construtores de Date locais, então
// o teste dá o mesmo resultado não importa o fuso horário de quem roda o vitest.
function brt(year: number, month: number, day: number, hour = 12, minute = 0) {
  return new Date(Date.UTC(year, month - 1, day, hour, minute) + 3 * 60 * 60_000)
}

// 2024-01-01 é uma segunda-feira; 2024-01-07 é o domingo seguinte (ambos em horário de Brasília).
const MONDAY = brt(2024, 1, 1)
const SUNDAY = brt(2024, 1, 7)

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
    expect(estaDentroDoHorario(null, brt(2024, 1, 1, 3, 0))).toBe(true)
  })

  it('aceita um horário dentro do expediente configurado (horário de Brasília, não do servidor)', () => {
    expect(estaDentroDoHorario(DEFAULT_OPENING_HOURS, brt(2024, 1, 1, 10, 0))).toBe(true)
  })

  it('rejeita um horário fora do expediente (antes de abrir)', () => {
    expect(estaDentroDoHorario(DEFAULT_OPENING_HOURS, brt(2024, 1, 1, 7, 0))).toBe(false)
  })

  it('rejeita qualquer horário em um dia fechado', () => {
    expect(estaDentroDoHorario(DEFAULT_OPENING_HOURS, brt(2024, 1, 7, 10, 0))).toBe(false)
  })

  it('usa o fuso do negócio, não o fuso do processo: 21h UTC de um dia é ainda 18h em Brasília (dentro do expediente)', () => {
    // 2024-01-01T21:00:00Z = 2024-01-01 18:00 em Brasília (UTC-3) — mesmo dia, dentro de 09:00–19:00.
    expect(estaDentroDoHorario(DEFAULT_OPENING_HOURS, new Date('2024-01-01T21:00:00.000Z'))).toBe(true)
    // 2024-01-01T02:00:00Z = 2023-12-31 23:00 em Brasília — domingo (fechado no DEFAULT_OPENING_HOURS).
    expect(estaDentroDoHorario(DEFAULT_OPENING_HOURS, new Date('2024-01-01T02:00:00.000Z'))).toBe(false)
  })
})

describe('terminaDentroDoHorario', () => {
  it('aceita um serviço que termina exatamente no fechamento', () => {
    expect(terminaDentroDoHorario(DEFAULT_OPENING_HOURS, brt(2024, 1, 1, 18, 0), 60)).toBe(true)
  })

  it('rejeita um serviço que começa antes do fechamento mas termina depois', () => {
    // Segunda, fecha 19:00: início 18:45 + 60min termina 19:45 — não cabe.
    expect(terminaDentroDoHorario(DEFAULT_OPENING_HOURS, brt(2024, 1, 1, 18, 45), 60)).toBe(false)
  })

  it('é permissivo quando o barbeiro não configurou horário', () => {
    expect(terminaDentroDoHorario(null, brt(2024, 1, 1, 18, 45), 600)).toBe(true)
  })
})
