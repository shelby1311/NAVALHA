import { useEffect, useState } from 'react'
import { AlertTriangle, ChevronRight, Clock, MapPin, Scissors, SearchX } from 'lucide-react'
import { BookingModal } from '@/components/navalha/booking-modal'
import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Card, cardHoverClasses } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { SearchInput } from '@/components/ui/search-input'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsPanel, TabsTab } from '@/components/ui/tabs'
import { apiClient } from '@/lib/api-client'
import { cn } from '@/lib/utils'
import type { UserProfile } from '@/lib/contracts'
import { MyBookings } from './my-bookings'

type Barber = { id: string; name: string; place: string; online: boolean; distanceKm: number | null }

export function ClientHome({ profile }: { profile: UserProfile | null }) {
  const [section, setSection] = useState<'search' | 'bookings'>('search')
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [online, setOnline] = useState(true)
  const [barbers, setBarbers] = useState<Barber[]>([])
  const [loading, setLoading] = useState(true)
  const [searchError, setSearchError] = useState<string | null>(null)
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
    // eslint-disable-next-line react-hooks/set-state-in-effect -- flag de loading do próprio fetch abaixo, não deriva de outro estado.
    setLoading(true)
    apiClient.searchBarbers({ q: debouncedQuery || undefined, onlyOnline: online, lat: coords?.lat, lng: coords?.lng }).then((res) => {
      if (!active) return
      setLoading(false)
      setSearchError(res.error)
      setBarbers((res.data ?? []).map((b) => ({
        id: b.id,
        name: b.businessName || b.name,
        place: [b.neighborhood, b.city].filter(Boolean).join(', ') || 'Local não informado',
        online: b.isOnline,
        distanceKm: b.distanceKm,
      })))
    })
    return () => { active = false }
  }, [online, debouncedQuery, coords])

  const filtered = barbers

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-10">
      <section className="relative overflow-hidden rounded-3xl border border-border bg-card p-5 shadow-soft sm:p-8">
        {/* Camada decorativa: formas abstratas só de composição, sem dados reais — escondida de leitores de tela. */}
        <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -right-24 -top-24 size-72 rounded-full bg-primary/10 blur-3xl" />
          <div className="absolute -bottom-16 left-1/3 size-56 rounded-full bg-primary/5 blur-3xl" />
        </div>

        <div className="relative flex flex-wrap items-end justify-between gap-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Navalha para clientes</p>
            <h1 className="mt-3 max-w-2xl text-balance font-serif text-3xl font-semibold tracking-tight sm:text-5xl">Seu próximo corte começa aqui.</h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">Encontre barbearias online perto de você e agende sem pagar nada.</p>
          </div>

          {/* Decorativo — cluster "floating UI" sem dado real, só reforça o contexto do produto. */}
          <div aria-hidden className="hidden shrink-0 flex-col items-end gap-3 sm:flex">
            <div className="flex items-center gap-2 rounded-2xl border border-border bg-elevated/80 px-3 py-2 shadow-elevated backdrop-blur-sm">
              <Clock size={14} className="text-primary" />
              <span className="text-xs font-medium text-muted-foreground">Agenda em tempo real</span>
            </div>
            <div className="ml-6 flex items-center gap-2 rounded-2xl border border-border bg-elevated/80 px-3 py-2 shadow-elevated backdrop-blur-sm">
              <Scissors size={14} className="text-primary" />
              <span className="text-xs font-medium text-muted-foreground">Serviços e preços claros</span>
            </div>
          </div>
        </div>

        <div className="relative mt-7 filter-row rounded-2xl border border-border bg-background p-3">
          <SearchInput value={query} onChange={(event) => setQuery(event.target.value)} aria-label="Buscar por nome, cidade ou bairro" placeholder="Digite nome, cidade ou bairro" />
          <Button
            onClick={() => setOnline(!online)}
            aria-pressed={online}
            variant={online ? 'default' : 'outline'}
            className="justify-center px-4 py-3"
            size="lg"
          >
            <span className={cn('size-2 rounded-full', online ? 'bg-emerald-300' : 'bg-muted-foreground')} />Online agora
          </Button>
        </div>
      </section>

      {profile ? (
        <Tabs value={section} onValueChange={(v) => setSection(v as typeof section)}>
          <TabsList className="w-full sm:w-fit">
            <TabsTab value="search">Buscar barbeiros</TabsTab>
            <TabsTab value="bookings">Meus agendamentos</TabsTab>
          </TabsList>
          <TabsPanel value="bookings" className="mt-6">
            <MyBookings />
          </TabsPanel>
          <TabsPanel value="search" className="mt-6 space-y-6">
            <SearchResults filtered={filtered} loading={loading} online={online} error={searchError} onSelect={setSelected} />
          </TabsPanel>
        </Tabs>
      ) : (
        <div className="space-y-6">
          <SearchResults filtered={filtered} loading={loading} online={online} error={searchError} onSelect={setSelected} />
        </div>
      )}

      {selected && <BookingModal barber={selected} onClose={() => setSelected(null)} />}
    </div>
  )
}

function SearchResults({ filtered, loading, online, error, onSelect }: { filtered: Barber[]; loading: boolean; online: boolean; error: string | null; onSelect: (barber: Barber) => void }) {
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold">Barbeiros perto de você</h2>
          <p className="mt-1 text-xs text-muted-foreground">{filtered.length} resultado(s)</p>
        </div>
      </div>

      {loading ? (
        <section className="results-grid">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </section>
      ) : error ? (
        <EmptyState icon={AlertTriangle} title="Não foi possível buscar barbeiros agora." description={error} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={SearchX}
          title="Nenhum barbeiro encontrado nessa região."
          description={online ? 'Tente desativar o filtro "Online agora" ou busque por outra cidade/bairro.' : 'Tente buscar por outro nome, cidade ou bairro.'}
        />
      ) : (
        <section className="results-grid">
          {filtered.map((barber) => (
            <Card key={barber.id} className={cn('p-4 sm:p-5', cardHoverClasses)}>
              <div className="flex gap-4">
                <Avatar name={barber.name} size="lg" />
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold">{barber.name}</h3>
                  <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground"><MapPin size={12} />{barber.place}{barber.distanceKm != null && ` · ${barber.distanceKm < 1 ? `${Math.round(barber.distanceKm * 1000)} m` : `${barber.distanceKm.toFixed(1)} km`}`}</p>
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                    <span className={cn('flex items-center gap-2 text-xs', barber.online ? 'text-emerald-400' : 'text-muted-foreground')}>
                      <span className="size-2 rounded-full bg-current" />{barber.online ? 'Livre agora' : 'Indisponível'}
                    </span>
                    <Button onClick={() => onSelect(barber)} size="sm">Ver horários <ChevronRight size={14} /></Button>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </section>
      )}
    </>
  )
}
