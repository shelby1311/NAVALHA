import { describe, expect, it } from 'vitest'
import { Agendamento, TransicaoInvalidaError } from './agendamento'

describe('Agendamento', () => {
  it('segue a sequência requested -> confirmed -> waiting -> in_service -> completed', () => {
    let atual = new Agendamento('requested')
    atual = atual.transicionar('confirmed')
    atual = atual.transicionar('waiting')
    atual = atual.transicionar('in_service')
    atual = atual.transicionar('completed')
    expect(atual.status).toBe('completed')
  })

  it('permite cancelar a partir de qualquer status não-terminal', () => {
    for (const status of ['requested', 'confirmed', 'waiting', 'in_service'] as const) {
      expect(new Agendamento(status).podeTransicionarPara('cancelled')).toBe(true)
    }
  })

  it('rejeita pular etapas (ex.: requested -> in_service)', () => {
    const atual = new Agendamento('requested')
    expect(atual.podeTransicionarPara('in_service')).toBe(false)
    expect(() => atual.transicionar('in_service')).toThrow(TransicaoInvalidaError)
  })

  it('não permite nenhuma transição a partir de "cancelled" (estado terminal)', () => {
    const atual = new Agendamento('cancelled')
    expect(atual.podeTransicionarPara('requested')).toBe(false)
    expect(atual.podeTransicionarPara('confirmed')).toBe(false)
  })

  it('gera receita só ao entrar em "completed" vindo de outro status', () => {
    expect(new Agendamento('in_service').geraReceita('completed')).toBe(true)
    expect(new Agendamento('completed').geraReceita('cancelled')).toBe(false)
  })

  it('estorna receita só ao sair de "completed" para "cancelled"', () => {
    expect(new Agendamento('completed').estornaReceita('cancelled')).toBe(true)
    expect(new Agendamento('waiting').estornaReceita('cancelled')).toBe(false)
  })
})
