import type { BookingStatus } from '@/lib/contracts'

// Máquina de estados do agendamento — única fonte de verdade da sequência
// Solicitado → Confirmado → Aguardando → Em atendimento → Concluído.
// `completed -> cancelled` existe apenas para permitir estornar um atendimento
// concluído por engano (a receita gerada é removida nesse caso).
const TRANSITIONS: Record<BookingStatus, readonly BookingStatus[]> = {
  requested: ['confirmed', 'cancelled'],
  confirmed: ['waiting', 'cancelled'],
  waiting: ['in_service', 'cancelled'],
  in_service: ['completed', 'cancelled'],
  completed: ['cancelled'],
  cancelled: [],
}

export class TransicaoInvalidaError extends Error {
  constructor(de: BookingStatus, para: BookingStatus) {
    super(`Não é possível mudar o status de "${de}" para "${para}".`)
    this.name = 'TransicaoInvalidaError'
  }
}

export class Agendamento {
  constructor(public readonly status: BookingStatus) {}

  podeTransicionarPara(novoStatus: BookingStatus): boolean {
    return TRANSITIONS[this.status].includes(novoStatus)
  }

  transicionar(novoStatus: BookingStatus): Agendamento {
    if (!this.podeTransicionarPara(novoStatus)) throw new TransicaoInvalidaError(this.status, novoStatus)
    return new Agendamento(novoStatus)
  }

  /** A transição gera receita nova (entrada em "completed" vindo de outro status). */
  geraReceita(novoStatus: BookingStatus): boolean {
    return novoStatus === 'completed' && this.status !== 'completed'
  }

  /** A transição desfaz uma receita já gerada (saída de "completed" para "cancelled"). */
  estornaReceita(novoStatus: BookingStatus): boolean {
    return this.status === 'completed' && novoStatus === 'cancelled'
  }
}
