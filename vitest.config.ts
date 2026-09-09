import { defineConfig } from 'vitest/config'

// Testes de domínio (lógica pura, sem banco) — o que roda em `pnpm test` / CI.
// Testes de integração (precisam de Postgres real) ficam em tests/integration/
// e só rodam via `pnpm test:integration` (vitest.integration.config.ts).
export default defineConfig({
  test: {
    exclude: ['node_modules/**', 'tests/integration/**'],
  },
})
