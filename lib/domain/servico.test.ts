import { describe, expect, it } from 'vitest'
import { Servico, ServicoInvalidoError } from './servico'

describe('Servico', () => {
  it('cria um serviço válido', () => {
    const servico = new Servico('Corte', 3500, 30)
    expect(servico.priceCents).toBe(3500)
    expect(servico.durationMinutes).toBe(30)
    expect(servico.active).toBe(true)
  })

  it('rejeita preço zero, negativo ou fracionário', () => {
    expect(() => new Servico('Corte', 0, 30)).toThrow(ServicoInvalidoError)
    expect(() => new Servico('Corte', -100, 30)).toThrow(ServicoInvalidoError)
    expect(() => new Servico('Corte', 10.5, 30)).toThrow(ServicoInvalidoError)
  })

  it('rejeita duração zero, negativa ou fracionária', () => {
    expect(() => new Servico('Corte', 3500, 0)).toThrow(ServicoInvalidoError)
    expect(() => new Servico('Corte', 3500, -10)).toThrow(ServicoInvalidoError)
    expect(() => new Servico('Corte', 3500, 30.5)).toThrow(ServicoInvalidoError)
  })

  it('mantém o valor anterior quando o setter rejeita a nova atribuição', () => {
    const servico = new Servico('Corte', 3500, 30)
    expect(() => { servico.priceCents = -1 }).toThrow(ServicoInvalidoError)
    expect(servico.priceCents).toBe(3500)
  })
})
