import { defineConfig } from 'vitest/config'

// Testes de integração: batem num Postgres real (ver docker-compose.yml).
// Rodar com `pnpm test:integration` (requer DATABASE_URL apontando pro banco de teste).
export default defineConfig({
  test: {
    include: ['tests/integration/**/*.test.ts'],
    exclude: ['node_modules/**'],
    testTimeout: 20_000,
    // Um teste roda `db.transaction` + `pg_advisory_xact_lock` concorrente por
    // requisição real ao Postgres — arquivos em paralelo demais competem pela
    // mesma conexão/pool e deixam os testes instáveis (flaky) sem ganhar nada.
    fileParallelism: false,
  },
})
