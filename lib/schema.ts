import { relations, sql } from 'drizzle-orm'
import type { InferSelectModel } from 'drizzle-orm'
import { boolean, check, index, integer, json, pgTable, text, timestamp, uniqueIndex } from 'drizzle-orm/pg-core'

// =============================================================================
// Tabelas de autenticação (better-auth)
// -----------------------------------------------------------------------------
// Gerado/validado pela CLI do better-auth (`@better-auth/cli generate`).
// Não altere os nomes de coluna sem revalidar.
// =============================================================================

export const user = pgTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('email_verified').default(false).notNull(),
  image: text('image'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().$onUpdate(() => new Date()).notNull(),
  // ---- campos adicionais (perfil da Navalha) ----
  role: text('role').default('client').notNull(),
  phone: text('phone'),
  avatarUrl: text('avatar_url'),
  businessName: text('business_name'),
  city: text('city'),
  neighborhood: text('neighborhood'),
  theme: text('theme').default('dark'),
  notifications: boolean('notifications').default(true),
  isOnline: boolean('is_online').default(false),
  // Horário de funcionamento por dia da semana: { mon: { open, close, active }, ... }
  openingHours: json('opening_hours').$type<Record<string, { open: string; close: string; active: boolean }>>(),
})

export const session = pgTable(
  'session',
  {
    id: text('id').primaryKey(),
    expiresAt: timestamp('expires_at').notNull(),
    token: text('token').notNull().unique(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').$onUpdate(() => new Date()).notNull(),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  },
  (table) => [index('session_userId_idx').on(table.userId)],
)

export const account = pgTable(
  'account',
  {
    id: text('id').primaryKey(),
    accountId: text('account_id').notNull(),
    providerId: text('provider_id').notNull(),
    issuer: text('issuer').notNull().default('credential'),
    userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
    accessToken: text('access_token'),
    refreshToken: text('refresh_token'),
    idToken: text('id_token'),
    accessTokenExpiresAt: timestamp('access_token_expires_at'),
    refreshTokenExpiresAt: timestamp('refresh_token_expires_at'),
    scope: text('scope'),
    password: text('password'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').$onUpdate(() => new Date()).notNull(),
  },
  (table) => [index('account_userId_idx').on(table.userId)],
)

export const verification = pgTable(
  'verification',
  {
    id: text('id').primaryKey(),
    identifier: text('identifier').notNull(),
    value: text('value').notNull(),
    expiresAt: timestamp('expires_at').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().$onUpdate(() => new Date()).notNull(),
  },
  (table) => [index('verification_identifier_idx').on(table.identifier)],
)

export const userRelations = relations(user, ({ many }) => ({
  sessions: many(session),
  accounts: many(account),
}))

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, { fields: [session.userId], references: [user.id] }),
}))

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, { fields: [account.userId], references: [user.id] }),
}))

// =============================================================================
// Tabelas de domínio (Navalha)
// =============================================================================

export const barberService = pgTable('barber_service', {
  id: text('id').primaryKey(),
  barberId: text('barber_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  priceCents: integer('price_cents').notNull(),
  durationMinutes: integer('duration_minutes').notNull(),
  active: boolean('active').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export const booking = pgTable(
  'booking',
  {
    id: text('id').primaryKey(),
    clientId: text('client_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
    barberId: text('barber_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
    serviceId: text('service_id').notNull().references(() => barberService.id, { onDelete: 'cascade' }),
    scheduledAt: timestamp('scheduled_at').notNull(),
    status: text('status').notNull().default('requested'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    // Impede dois agendamentos ativos (não cancelados) do mesmo barbeiro no mesmo horário exato.
    uniqueIndex('booking_barber_slot_unique')
      .on(table.barberId, table.scheduledAt)
      .where(sql`${table.status} <> 'cancelled'`),
  ],
)

export const financialEntry = pgTable(
  'financial_entry',
  {
    id: text('id').primaryKey(),
    barberId: text('barber_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
    bookingId: text('booking_id').references(() => booking.id, { onDelete: 'set null' }),
    type: text('type').notNull(),
    category: text('category').notNull(),
    description: text('description').notNull(),
    amountCents: integer('amount_cents').notNull(),
    entryDate: timestamp('entry_date').notNull(),
    isRecurring: boolean('is_recurring').notNull().default(false),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    // Um agendamento nunca pode gerar mais de uma receita automática.
    uniqueIndex('financial_entry_booking_id_unique').on(table.bookingId).where(sql`${table.bookingId} is not null`),
    check('financial_entry_amount_positive', sql`${table.amountCents} > 0`),
  ],
)

// Objeto de schema usado pelo adapter do better-auth e pelo Drizzle.
export const schema = { user, session, account, verification, barberService, booking, financialEntry }

// Tipos derivados para uso nas rotas de API.
export type User = InferSelectModel<typeof user>
export type BarberService = InferSelectModel<typeof barberService>
export type Booking = InferSelectModel<typeof booking>
export type FinancialEntry = InferSelectModel<typeof financialEntry>
