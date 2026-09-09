import { and, eq } from 'drizzle-orm'
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { toProfile } from '@/lib/profile'
import { user } from '@/lib/schema'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const city = searchParams.get('city')
  const neighborhood = searchParams.get('neighborhood')
  const onlyOnline = searchParams.get('onlyOnline') === 'true'

  const conditions = [eq(user.role, 'barber')]
  if (city) conditions.push(eq(user.city, city))
  if (neighborhood) conditions.push(eq(user.neighborhood, neighborhood))
  if (onlyOnline) conditions.push(eq(user.isOnline, true))

  const barbers = await db.select().from(user).where(and(...conditions)).limit(50)
  return NextResponse.json(barbers.map(toProfile))
}
