import { config } from 'dotenv'
import { defineConfig } from 'drizzle-kit'

// Carrega as variáveis do .env.local (padrão do Next.js) e do .env.
config({ path: '.env.local' })
config({ path: '.env' })

export default defineConfig({
  schema: './lib/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL ?? '',
  },
})
