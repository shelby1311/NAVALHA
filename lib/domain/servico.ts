export class ServicoInvalidoError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ServicoInvalidoError'
  }
}

function isPositiveInteger(value: number): boolean {
  return Number.isInteger(value) && value > 0
}

// Encapsulamento: preço e duração só mudam por setters que validam — nunca
// existe um Servico com valor zero, negativo ou fracionário de centavo/minuto.
export class Servico {
  #priceCents = 0
  #durationMinutes = 0

  constructor(
    public readonly name: string,
    priceCents: number,
    durationMinutes: number,
    public active = true,
  ) {
    this.priceCents = priceCents
    this.durationMinutes = durationMinutes
  }

  get priceCents(): number {
    return this.#priceCents
  }

  set priceCents(value: number) {
    if (!isPositiveInteger(value)) throw new ServicoInvalidoError('Preço deve ser um valor inteiro positivo, em centavos.')
    this.#priceCents = value
  }

  get durationMinutes(): number {
    return this.#durationMinutes
  }

  set durationMinutes(value: number) {
    if (!isPositiveInteger(value)) throw new ServicoInvalidoError('Duração deve ser um valor inteiro positivo, em minutos.')
    this.#durationMinutes = value
  }
}
