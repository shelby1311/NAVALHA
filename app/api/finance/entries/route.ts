import { desc, eq } from 'drizzle-orm'
import { NextResponse } from 'next/server'
import { isResponse, requireRole } from '@/lib/authz'
import { db } from '@/lib/db'
import { financialEntry } from '@/lib/schema'

const MAX_TEXT_LENGTH = 200

function serialize(entry: typeof financialEntry.$inferSelect) {
  return {
    id: entry.id,
    type: entry.type,
    category: entry.category,
    description: entry.description,
    amountCents: entry.amountCents,
    entryDate: entry.entryDate.toISOString(),
    isRecurring: entry.isRecurring,
  }
}

function isPositiveInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value > 0
}

export async function GET(request: Request) {
  const auth = await requireRole(request, 'barber')
  if (isResponse(auth)) return auth

  const entries = await db
    .select()
    .from(financialEntry)
    .where(eq(financialEntry.barberId, auth.user.id))
    .orderBy(desc(financialEntry.entryDate))

  return NextResponse.json(entries.map(serialize))
}

export async function POST(request: Request) {
  const auth = await requireRole(request, 'barber')
  if (isResponse(auth)) return auth

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null
  const validType = body && (body.type === 'income' || body.type === 'expense')
  if (!body || !validType || !isPositiveInteger(body.amountCents)) {
    return NextResponse.json({ error: 'Payload inválido' }, { status: 400 })
  }

  const category = typeof body.category === 'string' ? body.category.trim() : ''
  const description = typeof body.description === 'string' ? body.description.trim() : ''
  if (!category || category.length > MAX_TEXT_LENGTH || description.length > MAX_TEXT_LENGTH) {
    return NextResponse.json({ error: 'Categoria ou descrição inválida' }, { status: 400 })
  }

  let entryDate = new Date()
  if (typeof body.entryDate === 'string') {
    const parsed = new Date(body.entryDate)
    if (Number.isNaN(parsed.getTime())) return NextResponse.json({ error: 'Data inválida' }, { status: 400 })
    entryDate = parsed
  }

  const [entry] = await db
    .insert(financialEntry)
    .values({
      id: crypto.randomUUID(),
      barberId: auth.user.id,
      type: body.type as 'income' | 'expense',
      category,
      description,
      amountCents: body.amountCents,
      entryDate,
      isRecurring: body.isRecurring === true,
    })
    .returning()

  return NextResponse.json(serialize(entry), { status: 201 })
}
