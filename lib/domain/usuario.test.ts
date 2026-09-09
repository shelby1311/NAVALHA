import { describe, expect, it } from 'vitest'
import { Barbeiro, Cliente, criarUsuario } from './usuario'

describe('Usuario / Cliente / Barbeiro', () => {
  it('Cliente só pode agendar e cancelar o próprio agendamento', () => {
    const cliente = new Cliente('u1', 'Ana')
    expect(cliente.pode('agendar')).toBe(true)
    expect(cliente.pode('gerenciar_servicos')).toBe(false)
  })

  it('Barbeiro tem permissões de gestão que Cliente não tem (polimorfismo de permissoes())', () => {
    const barbeiro = new Barbeiro('u2', 'João')
    expect(barbeiro.pode('gerenciar_servicos')).toBe(true)
    expect(barbeiro.pode('gerenciar_financeiro')).toBe(true)
    expect(barbeiro.pode('agendar')).toBe(false)
  })

  it('criarUsuario() escolhe a subclasse certa a partir do role do banco', () => {
    expect(criarUsuario({ id: '1', name: 'A', role: 'barber' })).toBeInstanceOf(Barbeiro)
    expect(criarUsuario({ id: '2', name: 'B', role: 'client' })).toBeInstanceOf(Cliente)
    expect(criarUsuario({ id: '3', name: 'C', role: 'anything-else' })).toBeInstanceOf(Cliente)
  })
})
