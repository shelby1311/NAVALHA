import { describe, expect, it } from 'vitest'
import { gerarHorariosDisponiveis } from './disponibilidade'

const DAY = new Date(2024, 0, 1) // segunda-feira
const MIDNIGHT = new Date(2024, 0, 1, 0, 0)

function at(hour: number, minute: number) {
  return new Date(2024, 0, 1, hour, minute)
}

describe('gerarHorariosDisponiveis', () => {
  it('gera slots de 15 em 15 min que cabem inteiros na janela', () => {
    const slots = gerarHorariosDisponiveis({ day: DAY, openingMinutes: 9 * 60, closingMinutes: 10 * 60, durationMinutes: 30, now: MIDNIGHT, ocupados: [] })
    expect(slots).toEqual([at(9, 0), at(9, 15), at(9, 30)])
  })

  it('não sobrepõe um agendamento existente, mas permite encaixar logo depois que ele termina', () => {
    const slots = gerarHorariosDisponiveis({
      day: DAY,
      openingMinutes: 9 * 60,
      closingMinutes: 10 * 60,
      durationMinutes: 30,
      now: MIDNIGHT,
      ocupados: [{ start: at(9, 0), end: at(9, 30) }],
    })
    expect(slots).toEqual([at(9, 30)])
  })

  it('não devolve horário igual ou anterior a "now" (não deixa marcar no passado)', () => {
    const slots = gerarHorariosDisponiveis({ day: DAY, openingMinutes: 9 * 60, closingMinutes: 10 * 60, durationMinutes: 30, now: at(9, 15), ocupados: [] })
    expect(slots).toEqual([at(9, 30)])
  })

  it('não devolve nenhum slot cujo fim ultrapasse o fechamento', () => {
    const slots = gerarHorariosDisponiveis({ day: DAY, openingMinutes: 9 * 60, closingMinutes: 9 * 60 + 40, durationMinutes: 30, now: MIDNIGHT, ocupados: [] })
    expect(slots).toEqual([at(9, 0)])
  })
})
