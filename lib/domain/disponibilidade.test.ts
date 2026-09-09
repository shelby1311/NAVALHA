import { describe, expect, it } from 'vitest'
import { gerarHorariosDisponiveis } from './disponibilidade'

// Instantes fixos em UTC (não usa construtores de Date locais — o teste deve dar o
// mesmo resultado não importa o fuso horário da máquina que roda o vitest).
const DIA_INICIO_UTC = new Date(Date.UTC(2024, 0, 1, 0, 0))
const MIDNIGHT = DIA_INICIO_UTC

function at(hour: number, minute: number) {
  return new Date(DIA_INICIO_UTC.getTime() + (hour * 60 + minute) * 60_000)
}

describe('gerarHorariosDisponiveis', () => {
  it('gera slots de 15 em 15 min que cabem inteiros na janela', () => {
    const slots = gerarHorariosDisponiveis({ diaInicioUtc: DIA_INICIO_UTC, openingMinutes: 9 * 60, closingMinutes: 10 * 60, durationMinutes: 30, now: MIDNIGHT, ocupados: [] })
    expect(slots).toEqual([at(9, 0), at(9, 15), at(9, 30)])
  })

  it('não sobrepõe um agendamento existente, mas permite encaixar logo depois que ele termina', () => {
    const slots = gerarHorariosDisponiveis({
      diaInicioUtc: DIA_INICIO_UTC,
      openingMinutes: 9 * 60,
      closingMinutes: 10 * 60,
      durationMinutes: 30,
      now: MIDNIGHT,
      ocupados: [{ start: at(9, 0), end: at(9, 30) }],
    })
    expect(slots).toEqual([at(9, 30)])
  })

  it('não devolve horário igual ou anterior a "now" (não deixa marcar no passado)', () => {
    const slots = gerarHorariosDisponiveis({ diaInicioUtc: DIA_INICIO_UTC, openingMinutes: 9 * 60, closingMinutes: 10 * 60, durationMinutes: 30, now: at(9, 15), ocupados: [] })
    expect(slots).toEqual([at(9, 30)])
  })

  it('não devolve nenhum slot cujo fim ultrapasse o fechamento', () => {
    const slots = gerarHorariosDisponiveis({ diaInicioUtc: DIA_INICIO_UTC, openingMinutes: 9 * 60, closingMinutes: 9 * 60 + 40, durationMinutes: 30, now: MIDNIGHT, ocupados: [] })
    expect(slots).toEqual([at(9, 0)])
  })
})
