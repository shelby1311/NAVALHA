import type { ApiResult, AvailabilityResponse, BarberSearchFilters, BarberSearchResult, BarberService, Booking, BookingPayload, BookingStatus, BookingWithDetails, FinancialEntry, MyBooking, ServicePayload, UpdateProfilePayload, UserProfile } from './contracts'
import { API_ENDPOINTS } from './contracts'

async function request<T>(url: string, init?: RequestInit): Promise<ApiResult<T>> {
  try {
    // FormData define seu próprio Content-Type (com boundary) — não sobrescrever.
    const headers = init?.body instanceof FormData ? init.headers : { 'Content-Type': 'application/json', ...init?.headers }
    const response = await fetch(url, { ...init, headers })
    if (!response.ok) {
      const body = await response.json().catch(() => null)
      const message = body && (typeof body.error === 'string' ? body.error : typeof body.message === 'string' ? body.message : null)
      return { data: null, error: message || (response.status === 401 ? 'Entre para continuar.' : 'Não foi possível concluir a operação.') }
    }
    return { data: await response.json() as T, error: null }
  } catch {
    return { data: null, error: 'Serviço temporariamente indisponível.' }
  }
}

export const apiClient = {
  updateProfile: (payload: UpdateProfilePayload) => request<UserProfile>(API_ENDPOINTS.profile, { method: 'PATCH', body: JSON.stringify(payload) }),
  uploadAvatar: (file: File) => { const form = new FormData(); form.set('file', file); return request<UserProfile>(`${API_ENDPOINTS.profile}/avatar`, { method: 'POST', body: form }) },
  updatePreferences: (payload: Pick<UserProfile, 'theme' | 'notifications' | 'isOnline'>) => request<UserProfile>(API_ENDPOINTS.preferences, { method: 'PATCH', body: JSON.stringify(payload) }),
  searchBarbers: (filters: BarberSearchFilters) => {
    const params = new URLSearchParams({ onlyOnline: String(filters.onlyOnline) })
    if (filters.q) params.set('q', filters.q)
    if (filters.lat != null) params.set('lat', String(filters.lat))
    if (filters.lng != null) params.set('lng', String(filters.lng))
    return request<BarberSearchResult[]>(`${API_ENDPOINTS.discovery}?${params}`)
  },
  listServices: () => request<BarberService[]>(API_ENDPOINTS.services),
  createService: (payload: ServicePayload) => request<BarberService>(API_ENDPOINTS.services, { method: 'POST', body: JSON.stringify(payload) }),
  updateService: (id: string, payload: Partial<ServicePayload>) => request<BarberService>(`${API_ENDPOINTS.services}/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  listBookings: () => request<BookingWithDetails[]>(API_ENDPOINTS.bookings),
  listFinances: () => request<FinancialEntry[]>(API_ENDPOINTS.finances),
  createFinanceEntry: (payload: { type: 'income' | 'expense'; category: string; description: string; amountCents: number }) =>
    request<FinancialEntry>(API_ENDPOINTS.finances, { method: 'POST', body: JSON.stringify(payload) }),
  listBarberServices: (barberId: string) => request<BarberService[]>(`/api/barbers/${barberId}/services`),
  listAvailability: (barberId: string, serviceId: string, date: string) => request<AvailabilityResponse>(`/api/barbers/${barberId}/availability?${new URLSearchParams({ serviceId, date })}`),
  createBooking: (payload: BookingPayload) => request<Booking>(API_ENDPOINTS.createBooking, { method: 'POST', body: JSON.stringify(payload) }),
  updateBookingStatus: (id: string, status: BookingStatus) => request<{ id: string; status: BookingStatus }>(`${API_ENDPOINTS.bookings}/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  listMyBookings: () => request<MyBooking[]>(API_ENDPOINTS.myBookings),
  cancelMyBooking: (id: string) => request<{ id: string; status: BookingStatus }>(`${API_ENDPOINTS.myBookings}/${id}`, { method: 'PATCH', body: JSON.stringify({ status: 'cancelled' }) }),
}
