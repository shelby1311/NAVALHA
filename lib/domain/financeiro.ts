import { eq } from 'drizzle-orm'
import type { db as Database } from '@/lib/db'
import { financialEntry } from '@/lib/schema'

type Executor = Pick<typeof Database, 'insert' | 'delete'>

// Regras financeiras vinculadas a um agendamento, isoladas da rota HTTP:
// gerar a receita ao concluir e estorná-la se o atendimento for desfeito.
export class Financeiro {
  static async registrarReceita(tx: Executor, params: { barberId: string; bookingId: string; category: string; description: string; amountCents: number }) {
    if (params.amountCents <= 0) return
    await tx.insert(financialEntry).values({
      id: crypto.randomUUID(),
      barberId: params.barberId,
      bookingId: params.bookingId,
      type: 'income',
      category: params.category,
      description: params.description,
      amountCents: params.amountCents,
      entryDate: new Date(),
      isRecurring: false,
    })
  }

  static async estornar(tx: Executor, bookingId: string) {
    await tx.delete(financialEntry).where(eq(financialEntry.bookingId, bookingId))
  }
}
