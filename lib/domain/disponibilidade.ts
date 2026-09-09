const SLOT_STEP_MINUTES = 15

export type Intervalo = { start: Date; end: Date }

/**
 * Gera os horários de início possíveis (grade de 15 em 15 min) que cabem
 * inteiros dentro do expediente, não começam no passado e não se sobrepõem
 * a nenhum intervalo já ocupado.
 */
export function gerarHorariosDisponiveis(params: {
  day: Date
  openingMinutes: number
  closingMinutes: number
  durationMinutes: number
  now: Date
  ocupados: Intervalo[]
}): Date[] {
  const { day, openingMinutes, closingMinutes, durationMinutes, now, ocupados } = params
  const slots: Date[] = []

  for (let start = openingMinutes; start + durationMinutes <= closingMinutes; start += SLOT_STEP_MINUTES) {
    const slot = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 0, start, 0)
    if (slot <= now) continue

    const end = new Date(slot.getTime() + durationMinutes * 60_000)
    const ocupado = ocupados.some((b) => slot < b.end && b.start < end)
    if (!ocupado) slots.push(slot)
  }

  return slots
}
