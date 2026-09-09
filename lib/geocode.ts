const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search'
const EARTH_RADIUS_KM = 6371

/** Geocodifica "bairro, cidade" via Nominatim (OpenStreetMap). Retorna `null` em qualquer falha. */
export async function geocodeAddress(city: string, neighborhood: string): Promise<{ latitude: number; longitude: number } | null> {
  const query = [neighborhood, city, 'Brasil'].filter(Boolean).join(', ')
  if (!query.trim()) return null

  try {
    const url = `${NOMINATIM_URL}?${new URLSearchParams({ q: query, format: 'json', limit: '1' })}`
    const response = await fetch(url, { headers: { 'User-Agent': 'navalha-app (contato: sallesn91@gmail.com)' } })
    if (!response.ok) return null

    const results = (await response.json()) as Array<{ lat: string; lon: string }>
    const [first] = results
    if (!first) return null

    const latitude = Number(first.lat)
    const longitude = Number(first.lon)
    if (Number.isNaN(latitude) || Number.isNaN(longitude)) return null
    return { latitude, longitude }
  } catch {
    return null
  }
}

function toRadians(degrees: number) {
  return (degrees * Math.PI) / 180
}

/** Distância em km entre duas coordenadas (fórmula de Haversine). */
export function haversineKm(a: { latitude: number; longitude: number }, b: { latitude: number; longitude: number }) {
  const dLat = toRadians(b.latitude - a.latitude)
  const dLon = toRadians(b.longitude - a.longitude)
  const lat1 = toRadians(a.latitude)
  const lat2 = toRadians(b.latitude)

  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h))
}
