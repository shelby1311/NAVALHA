// Abstração + herança + polimorfismo: cada papel decide suas próprias permissões
// (método abstrato sobrescrito de forma diferente em cada subclasse), em vez de
// espalhar `if (role === 'barber')` pelo código.
export abstract class Usuario {
  constructor(
    public readonly id: string,
    public readonly nome: string,
  ) {}

  abstract permissoes(): string[]

  pode(permissao: string): boolean {
    return this.permissoes().includes(permissao)
  }
}

export class Cliente extends Usuario {
  permissoes(): string[] {
    return ['agendar', 'cancelar_proprio_agendamento']
  }
}

export class Barbeiro extends Usuario {
  permissoes(): string[] {
    return ['gerenciar_servicos', 'gerenciar_financeiro', 'gerenciar_agenda', 'gerenciar_fila']
  }
}

export function criarUsuario(row: { id: string; name: string; role: string }): Usuario {
  return row.role === 'barber' ? new Barbeiro(row.id, row.name) : new Cliente(row.id, row.name)
}
