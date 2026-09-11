import { useEffect, useState } from 'react'
import { ChevronRight, MapPin, Search } from 'lucide-react'
import { BookingModal } from '@/components/navalha/booking-modal'
import { apiClient } from '@/lib/api-client'
import type { UserProfile } from '@/lib/contracts'
import { initials } from '@/lib/ui'
import { MyBookings } from './my-bookings'

type Barber = { id: string; name: string; place: string; online: boolean; avatar: string; distanceKm: number | null }

export function ClientHome({ profile }: { profile: UserProfile | null }) {
  const [section, setSection] = useState<'search' | 'bookings'>('search')
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [online, setOnline] = useState(true)
  const [barbers, setBarbers] = useState<Barber[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Barber | null>(null)
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null)

  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedQuery(query.trim()), 300)
    return () => clearTimeout(timeout)
  }, [query])

  useEffect(() => {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(
      (position) => setCoords({ lat: position.coords.latitude, lng: position.coords.longitude }),
      () => {}, // permissão negada ou indisponível: segue sem localização
      { maximumAge: 5 * 60_000, timeout: 8000 },
    )
  }, [])

  useEffect(() => {
    let active = true
    setLoading(true)
    apiClient.searchBarbers({ q: debouncedQuery || undefined, onlyOnline: online, lat: coords?.lat, lng: coords?.lng }).then((res) => {
      if (!active) return
      setLoading(false)
      setBarbers((res.data ?? []).map((b) => ({
        id: b.id,
        name: b.businessName || b.name,
        place: [b.neighborhood, b.city].filter(Boolean).join(', ') || 'Local não informado',
        online: b.isOnline,
        avatar: initials(b.businessName || b.name),
        distanceKm: b.distanceKm,
      })))
    })
    return () => { active = false }
  }, [online, debouncedQuery, coords])

  const filtered = barbers

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-10">
      <section className="rounded-3xl border border-border bg-card p-5 sm:p-8">
        <div className="flex flex-wrap items-end justify-between gap-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Navalha para clientes</p>
            <h1 className="mt-3 max-w-2xl text-balance text-3xl font-semibold tracking-tight sm:text-5xl">Seu próximo corte está a poucos minutos.</h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">Encontre barbearias online perto de você e agende sem pagar nada.</p>
          </div>
          <div className="hidden rounded-2xl bg-primary/10 p-4 text-primary sm:block"><MapPin size={26} /></div>
        </div>
        <div className="mt-7 flex flex-col gap-3 rounded-2xl border border-border bg-background p-3 md:flex-row">
          <div className="flex min-w-0 flex-1 items-center gap-3 rounded-xl bg-muted px-4">
            <Search size={18} className="shrink-0 text-muted-foreground" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} aria-label="Buscar por nome, cidade ou bairro" placeholder="Digite nome, cidade ou bairro" className="w-full bg-transparent py-3 text-sm outline-none" />
          </div>
          <button onClick={() => setOnline(!online)} className={`flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-medium ${online ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
            <span className={`size-2 rounded-full ${online ? 'bg-emerald-300' : 'bg-muted-foreground'}`} />Online agora
          </button>
        </div>
      </section>

      {profile && (
        <div className="flex w-full items-center gap-1 overflow-x-auto rounded-xl border border-border bg-card p-1 sm:w-fit">
          <button onClick={() => setSection('search')} className={`whitespace-nowrap rounded-lg px-4 py-2 text-xs font-medium ${section === 'search' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}>Buscar barbeiros</button>
          <button onClick={() => setSection('bookings')} className={`whitespace-nowrap rounded-lg px-4 py-2 text-xs font-medium ${section === 'bookings' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}>Meus agendamentos</button>
        </div>
      )}

      {section === 'bookings' && profile ? (
        <MyBookings />
      ) : (
        <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold">Barbeiros perto de você</h2>
          <p className="mt-1 text-xs text-muted-foreground">{filtered.length} resultado(s)</p>
        </div>
      </div>

      <section className="grid gap-4 lg:grid-cols-2">
        {filtered.map((barber) => (
          <article key={barber.id} className="rounded-2xl border border-border bg-card p-4 sm:p-5">
            <div className="flex gap-4">
              <div className="grid size-14 shrink-0 place-items-center rounded-2xl bg-primary/15 font-semibold text-primary">{barber.avatar}</div>
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold">{barber.name}</h3>
                <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground"><MapPin size={12} />{barber.place}{barber.distanceKm != null && ` · ${barber.distanceKm < 1 ? `${Math.round(barber.distanceKm * 1000)} m` : `${barber.distanceKm.toFixed(1)} km`}`}</p>
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                  <span className={`flex items-center gap-2 text-xs ${barber.online ? 'text-emerald-400' : 'text-muted-foreground'}`}>
                    <span className="size-2 rounded-full bg-current" />{barber.online ? 'Livre agora' : 'Indisponível'}
                  </span>
                  <button onClick={() => setSelected(barber)} className="flex items-center gap-1 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground">Ver horários <ChevronRight size={14} /></button>
                </div>
              </div>
            </div>
          </article>
        ))}
      </section>

      {loading && <div className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">Carregando barbeiros...</div>}
      {!loading && filtered.length === 0 && <div className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">Nenhum barbeiro online encontrado nessa região.</div>}
        </>
      )}

      {selected && <BookingModal barber={selected} onClose={() => setSelected(null)} />}
    </div>
  )
}
