export type UserRole = 'barber' | 'client'

export type UserProfile = {
  id: string
  role: UserRole
  name: string
  email: string
  phone: string
  avatarUrl: string | null
  city: string
  neighborhood: string
  businessName: string | null
  theme: 'dark' | 'light' | 'system'
  notifications: boolean
  isOnline: boolean
}

export type UpdateProfilePayload = Partial<Omit<UserProfile, 'id' | 'role' | 'email'>>

export type BarberService = {
  id: string
  name: string
  priceCents: number
  durationMinutes: number
  active: boolean
}

export type ServicePayload = {
  name: string
  priceCents: number
  durationMinutes: number
  active?: boolean
}

export type BookingStatus = 'requested' | 'confirmed' | 'waiting' | 'in_service' | 'completed' | 'cancelled'

export type Booking = {
  id: string
  clientId: string
  barberId: string
  serviceId: string
  scheduledAt: string
  status: BookingStatus
}

export type BookingWithDetails = {
  id: string
  clientName: string
  serviceName: string
  scheduledAt: string
  status: BookingStatus
}

export type BookingPayload = {
  barberId: string
  serviceId: string
  scheduledAt: string
}

export type BarberQueueItem = {
  id: string
  clientName: string
  serviceName: string
  position: number
  joinedAt: string
  status: 'waiting' | 'in_service' | 'completed'
}

export type BarberIdentitySettings = {
  cpf: string
  birthDate: string
  phone: string
  email: string
  cep: string
  street: string
  number: string
  complement: string
  city: string
  neighborhood: string
  businessName: string
  cnpj?: string
  openingHours: Record<string, { open: string; close: string; active: boolean }>
  cancellationPolicy: string
  termsAccepted: boolean
  privacyAccepted: boolean
}

export type FinancialEntry = {
  id: string
  type: 'income' | 'expense'
  category: string
  description: string
  amountCents: number
  entryDate: string
  isRecurring: boolean
}

export type BarberSearchFilters = {
  city: string
  neighborhood?: string
  onlyOnline: boolean
}

export type ApiResult<T> = { data: T | null; error: string | null }

export const API_ENDPOINTS = {
  profile: '/api/profile',
  preferences: '/api/profile/preferences',
  finances: '/api/finance/entries',
  discovery: '/api/barbers/search',
  services: '/api/barber/services',
  bookings: '/api/barber/bookings',
  createBooking: '/api/bookings',
} as const

export function centsToMoney(value: number) {
  return (value / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function profilePayload(profile: UserProfile): UpdateProfilePayload {
  const { id: _id, role: _role, email: _email, ...payload } = profile
  return payload
}
