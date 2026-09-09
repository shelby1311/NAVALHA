import { describe, expect, it } from 'vitest'
import { dataNoFusoDoNegocio, inicioDoDiaNoFuso, partesNoFusoDoNegocio } from './timezone'

describe('partesNoFusoDoNegocio', () => {
  it('decompõe um instante UTC em dia-da-semana/hora/minuto no horário de Brasília (UTC-3)', () => {
    // 2024-01-01T21:05:00Z = 2024-01-01 18:05 em Brasília (segunda-feira, weekday=1).
    expect(partesNoFusoDoNegocio(new Date('2024-01-01T21:05:00.000Z'))).toEqual({ weekday: 1, hour: 18, minute: 5 })
  })

  it('vira o dia da semana quando UTC ainda está no dia anterior em Brasília', () => {
    // 2024-01-01T02:00:00Z = 2023-12-31 23:00 em Brasília (domingo, weekday=0), não segunda.
    expect(partesNoFusoDoNegocio(new Date('2024-01-01T02:00:00.000Z')).weekday).toBe(0)
  })
})

describe('dataNoFusoDoNegocio', () => {
  it('devolve ano/mês/dia no fuso do negócio, não em UTC', () => {
    expect(dataNoFusoDoNegocio(new Date('2024-01-01T02:00:00.000Z'))).toEqual({ year: 2023, month: 12, day: 31 })
  })
})

describe('inicioDoDiaNoFuso', () => {
  it('constrói o instante UTC da meia-noite de um dia no fuso do negócio', () => {
    // Meia-noite de 2024-01-01 em Brasília (UTC-3) = 2024-01-01T03:00:00Z.
    expect(inicioDoDiaNoFuso(2024, 1, 1).toISOString()).toBe('2024-01-01T03:00:00.000Z')
  })

  it('é o inverso de dataNoFusoDoNegocio para qualquer instante', () => {
    const original = new Date('2024-06-15T14:30:00.000Z')
    const { year, month, day } = dataNoFusoDoNegocio(original)
    const inicioDoDia = inicioDoDiaNoFuso(year, month, day)
    expect(original.getTime() - inicioDoDia.getTime()).toBeGreaterThanOrEqual(0)
    expect(original.getTime() - inicioDoDia.getTime()).toBeLessThan(24 * 60 * 60_000)
  })
})
