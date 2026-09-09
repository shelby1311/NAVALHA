import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { db } from '@/lib/db'
import { schema } from '@/lib/schema'

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: 'pg', schema }),
  baseURL: process.env.BETTER_AUTH_URL ?? (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : process.env.V0_RUNTIME_URL),
  emailAndPassword: { enabled: true, autoSignIn: true },
  user: {
    additionalFields: {
      // input:false — nunca setável pelo próprio usuário via sign-up/update-user do
      // better-auth (que não distingue "criar" de "atualizar" para esse gate). Sem
      // isso, qualquer client autenticado poderia virar barbeiro com um
      // POST /api/auth/update-user { role: "barber" }. Só é definido pela nossa
      // própria rota de cadastro (app/api/auth/signup/route.ts), com uma escrita
      // direta no banco fora do alcance do better-auth.
      role: {
        type: 'string',
        required: true,
        defaultValue: 'client',
        input: false,
      },
      phone: {
        type: 'string',
        input: true,
      },
      avatarUrl: {
        type: 'string',
      },
      businessName: {
        type: 'string',
        input: true,
      },
      city: {
        type: 'string',
        input: true,
      },
      neighborhood: {
        type: 'string',
        input: true,
      },
      theme: {
        type: 'string',
        defaultValue: 'dark',
      },
      notifications: {
        type: 'boolean',
        defaultValue: true,
      },
      isOnline: {
        type: 'boolean',
        defaultValue: false,
      },
    },
  },
  trustedOrigins: [
    ...(process.env.NODE_ENV === 'development' ? ['http://localhost:3000', process.env.V0_RUNTIME_URL, process.env.V0_DEV_APP_URL, process.env.V0_BUILD_URL, process.env.V0_SANDBOX_URL].filter(Boolean) : []),
    ...(process.env.NODE_ENV === 'production'
      ? [
          process.env.BETTER_AUTH_URL,
          process.env.VERCEL_URL && `https://${process.env.VERCEL_URL}`,
        ].filter(Boolean)
      : []),
  ] as string[],
  ...(process.env.NODE_ENV === 'development' ? { advanced: { defaultCookieAttributes: { sameSite: 'none' as const, secure: true } } } : {}),
})
