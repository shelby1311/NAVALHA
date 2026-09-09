import { and, eq } from 'drizzle-orm'
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { barberService } from '@/lib/schema'

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const rows = await db.select().from(barberService).where(and(eq(barberService.barberId, id), eq(barberService.active, true)))
  return NextResponse.json(rows.map((s) => ({ id: s.id, name: s.name, priceCents: s.priceCents, durationMinutes: s.durationMinutes, active: s.active })))
}
