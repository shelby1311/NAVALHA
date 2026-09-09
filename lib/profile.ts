import type { UserProfile } from './contracts'

// Formato mínimo de usuário aceito pelo `toProfile` (cobre tanto o usuário
// retornado pelo better-auth quanto a linha lida pelo Drizzle).
export type ProfileUser = {
  id: string
  name: string
  email: string
  role: string
  phone?: string | null
  avatarUrl?: string | null
  businessName?: string | null
  city?: string | null
  neighborhood?: string | null
  theme?: string | null
  notifications?: boolean | null
  isOnline?: boolean | null
  openingHours?: Record<string, { open: string; close: string; active: boolean }> | null
}

export function toProfile(user: ProfileUser): UserProfile {
  return {
    id: user.id,
    role: user.role === 'barber' ? 'barber' : 'client',
    name: user.name,
    email: user.email,
    phone: user.phone ?? '',
    avatarUrl: user.avatarUrl ?? null,
    businessName: user.businessName ?? null,
    city: user.city ?? '',
    neighborhood: user.neighborhood ?? '',
    theme: user.theme === 'light' || user.theme === 'system' ? user.theme : 'dark',
    notifications: user.notifications ?? true,
    isOnline: user.isOnline ?? false,
    openingHours: user.openingHours ?? null,
  }
}
