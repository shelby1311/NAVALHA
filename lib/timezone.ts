// Fuso único do negócio: a Navalha é um produto para barbearias no Brasil (todo o
// texto da UI é pt-BR). Desde 2019 nenhum estado brasileiro observa mais horário de
// verão, então um offset fixo é exato hoje. Se a lei mudar de novo, este é o único
// lugar a ajustar (ou trocar por uma tabela de regras por data, se isso um dia
// importar de verdade).
export const BUSINESS_UTC_OFFSET_MINUTES = -180

const OFFSET_MS = BUSINESS_UTC_OFFSET_MINUTES * 60_000

/**
 * Decompõe um instante em dia-da-semana/hora/minuto no fuso do negócio,
 * independentemente do fuso configurado no processo Node que executa o servidor
 * (em produção o runtime frequentemente roda em UTC).
 */
export function partesNoFusoDoNegocio(date: Date): { weekday: number; hour: number; minute: number } {
  const shifted = new Date(date.getTime() + OFFSET_MS)
  return { weekday: shifted.getUTCDay(), hour: shifted.getUTCHours(), minute: shifted.getUTCMinutes() }
}

/** Ano/mês(1-based)/dia no fuso do negócio, a partir de um instante UTC. */
export function dataNoFusoDoNegocio(date: Date): { year: number; month: number; day: number } {
  const shifted = new Date(date.getTime() + OFFSET_MS)
  return { year: shifted.getUTCFullYear(), month: shifted.getUTCMonth() + 1, day: shifted.getUTCDate() }
}

/** Instante UTC correspondente à meia-noite de um dia (ano/mês 1-based/dia) no fuso do negócio. */
export function inicioDoDiaNoFuso(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0) - OFFSET_MS)
}
