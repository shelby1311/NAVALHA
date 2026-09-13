import { useEffect, useMemo, useRef, useState } from 'react'
import { AlertTriangle, ChevronRight, Clock3, MapPin, Radio, Scissors, SearchX, ShieldCheck, Zap } from 'lucide-react'
import { BookingModal } from '@/components/navalha/booking-modal'
import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Card, cardHoverClasses } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { SearchInput } from '@/components/ui/search-input'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsPanel, TabsTab } from '@/components/ui/tabs'
import { apiClient } from '@/lib/api-client'
import { centsToMoney, type UserProfile } from '@/lib/contracts'
import { cn } from '@/lib/utils'
import { MyBookings } from './my-bookings'

type Barber = {
  id: string
  name: string
  businessName: string | null
  place: string
  online: boolean
  distanceKm: number | null
  startingPriceCents: number | null
  cheapestService: { name: string; priceCents: number; durationMinutes: number } | null
  serviceTags: string[]
}

type SortKey = 'distance' | 'name'

const HIGHLIGHTS = [
  { Icon: ShieldCheck, label: 'Barbeiros verificados' },
  { Icon: Zap, label: 'Agendamento rápido' },
]

const MAX_DISTANCE_KM = 50

export function ClientHome({ profile }: { profile: UserProfile | null }) {
  const [section, setSection] = useState<'search' | 'bookings'>('search')
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [service, setService] = useState('')
  const [debouncedService, setDebouncedService] = useState('')
  const [online, setOnline] = useState(true)
  const [maxDistanceKm, setMaxDistanceKm] = useState(MAX_DISTANCE_KM)
  const [sortBy, setSortBy] = useState<SortKey>('distance')
  const [barbers, setBarbers] = useState<Barber[]>([])
  const [loading, setLoading] = useState(true)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [selected, setSelected] = useState<Barber | null>(null)
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null)
  const [retryTick, setRetryTick] = useState(0)
  const resultsRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedQuery(query.trim()), 300)
    return () => clearTimeout(timeout)
  }, [query])

  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedService(service.trim()), 300)
    return () => clearTimeout(timeout)
  }, [service])

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
    apiClient.searchBarbers({ q: debouncedQuery || undefined, service: debouncedService || undefined, onlyOnline: online, lat: coords?.lat, lng: coords?.lng }).then((res) => {
      if (!active) return
      setLoading(false)
      setSearchError(res.error)
      setBarbers((res.data ?? []).map((b) => ({
        id: b.id,
        name: b.businessName || b.name,
        businessName: b.businessName,
        place: [b.neighborhood, b.city].filter(Boolean).join(', ') || 'Local não informado',
        online: b.isOnline,
        distanceKm: b.distanceKm,
        startingPriceCents: b.startingPriceCents,
        cheapestService: b.cheapestService,
        serviceTags: b.serviceTags,
      })))
    })
    return () => { active = false }
  }, [online, debouncedQuery, debouncedService, coords, retryTick])

  // Filtro de distância roda no cliente (dado já veio da API): quem não tem
  // coordenada não é penalizado, só não dá pra saber se está dentro do raio.
  const filtered = useMemo(() => {
    const byDistance = barbers.filter((b) => b.distanceKm == null || b.distanceKm <= maxDistanceKm)
    return [...byDistance].sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name)
      return (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity)
    })
  }, [barbers, maxDistanceKm, sortBy])

  // Os três "fatos flutuantes" do hero — só existem quando há dado real por
  // trás: nada de barbeiro/preço/contagem inventados pra preencher a composição.
  const nearestBarber = !loading && !searchError ? (filtered[0] ?? null) : null
  const cheapestOffer = useMemo(() => {
    const withPrice = barbers.filter((b) => b.cheapestService != null)
    if (withPrice.length === 0) return null
    return withPrice.reduce((min, b) => (b.cheapestService!.priceCents < min.cheapestService!.priceCents ? b : min))
  }, [barbers])
  const onlineCount = !loading && !searchError ? barbers.filter((b) => b.online).length : null

  return (
    <div className="mx-auto max-w-6xl space-y-16 pb-10">
      <section className="relative grid gap-10 pt-2 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-8 lg:pt-6">
        <div className="relative animate-in fade-in-0 slide-in-from-bottom-2 duration-700 ease-[var(--ease-premium)]">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Cuidado, estilo e conveniência</p>
          <h1 className="mt-4 max-w-lg text-balance font-serif text-4xl font-semibold tracking-tight sm:text-6xl">
            <span className="block text-foreground">Seu próximo corte</span>
            <span className="block italic text-primary">começa aqui.</span>
          </h1>
          <p className="mt-5 max-w-sm text-sm leading-6 text-muted-foreground sm:text-base">Encontre os melhores barbeiros da sua região, agende seu horário e mantenha seu estilo em dia.</p>

          <div className="mt-8 flex flex-col overflow-hidden rounded-2xl border border-border/60 bg-elevated/60 shadow-elevated backdrop-blur-md sm:flex-row sm:items-stretch">
            <SearchInput icon={MapPin} value={query} onChange={(event) => setQuery(event.target.value)} aria-label="Sua localização: nome, cidade ou bairro" placeholder="Sua localização" className="sm:flex-1" />
            <div className="h-px bg-border/70 sm:h-auto sm:w-px" />
            <SearchInput icon={Scissors} value={service} onChange={(event) => setService(event.target.value)} aria-label="Serviço" placeholder="Serviço (ex.: corte, barba)" className="sm:flex-1" />
            <div className="p-2 sm:flex sm:items-center sm:p-2">
              <Button
                onClick={() => resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                size="lg"
                className="w-full justify-center px-7 py-3 sm:w-auto"
              >
                Buscar
              </Button>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-3">
            <button
              onClick={() => setOnline(!online)}
              aria-pressed={online}
              className={cn(
                'inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors duration-200',
                online ? 'border-primary/30 bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:text-foreground',
              )}
            >
              <span className={cn('size-1.5 rounded-full', online ? 'bg-emerald-400' : 'bg-muted-foreground')} />Online agora
            </button>
            {HIGHLIGHTS.map(({ Icon, label }) => (
              <span key={label} className="inline-flex items-center gap-1.5 text-xs text-muted-foreground"><Icon size={13} />{label}</span>
            ))}
          </div>
        </div>

        {/* Composição visual do hero: nenhuma foto de banco de imagens — formas
            abstratas + até três "fatos" reais do sistema flutuando por cima.
            Escondida no mobile/tablet (vira uma tira horizontal logo abaixo). */}
        {/* aria-hidden: eco visual dos mesmos dados já apresentados de forma acessível
            na lista de resultados logo abaixo (heading, texto real, sem duplicar pra leitor de tela). */}
        <div aria-hidden className="relative hidden h-[380px] lg:block">
          <div className="absolute right-[4%] top-0 size-44 rounded-full border border-primary/10" />
          <div className="absolute bottom-[6%] right-[34%] size-28 rotate-12 rounded-[2rem] border border-border/50" />
          <div className="absolute inset-0 -z-10 rounded-full bg-primary/5 blur-3xl" />

          {/* Um cluster só: principal + secundário levemente sobrepostos (camadas),
              e o selo pequeno ancorado no canto do principal — não três pontos soltos. */}
          <div className="absolute left-0 top-2 w-[19rem]">
            {/* Elemento principal: maior, mais peso — o barbeiro real mais próximo. */}
            {nearestBarber && (
              <div className="relative z-10 animate-in fade-in-0 slide-in-from-left-3 rounded-2xl border border-border/60 bg-card/95 p-5 shadow-elevated backdrop-blur-md duration-700 ease-[var(--ease-premium)] hover:-translate-y-0.5">
                <div className="flex items-center gap-3.5">
                  <Avatar name={nearestBarber.name} size="lg" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-base font-semibold">{nearestBarber.name}</p>
                    <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground"><MapPin size={11} /><span className="truncate">{nearestBarber.place}</span></p>
                  </div>
                </div>
                {nearestBarber.distanceKm != null && (
                  <p className="mt-4 border-t border-border/60 pt-3 text-xs text-muted-foreground">{nearestBarber.distanceKm < 1 ? `${Math.round(nearestBarber.distanceKm * 1000)} m` : `${nearestBarber.distanceKm.toFixed(1)} km`} da sua localização</p>
                )}
              </div>
            )}

            {/* Elemento pequeno: selo compacto ancorado no canto do card principal. */}
            {onlineCount != null && onlineCount > 0 && (
              <div className="relative z-20 -mt-4 ml-6 flex w-fit animate-in fade-in-0 slide-in-from-bottom-2 items-center gap-2 rounded-full border border-border/60 bg-card py-2 pl-2 pr-3.5 shadow-elevated backdrop-blur-md duration-700 ease-[var(--ease-premium)] [animation-delay:300ms] hover:-translate-y-0.5">
                <span className="grid size-6 shrink-0 place-items-center rounded-full bg-emerald-500/15 text-emerald-400"><Radio size={12} /></span>
                <p className="text-xs font-medium">{onlineCount} online agora</p>
              </div>
            )}
          </div>

          {/* Elemento secundário: um degrau menor, levemente sobreposto ao cluster principal. */}
          {cheapestOffer?.cheapestService && (
            <div className="absolute right-2 top-36 w-44 animate-in fade-in-0 slide-in-from-right-3 rounded-xl border border-border/60 bg-card/95 p-3.5 shadow-elevated backdrop-blur-md duration-700 ease-[var(--ease-premium)] [animation-delay:150ms] hover:-translate-y-0.5">
              <p className="text-sm font-semibold">{cheapestOffer.cheapestService.name}</p>
              <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground"><Clock3 size={11} />{cheapestOffer.cheapestService.durationMinutes} min</p>
              <p className="mt-2 text-sm text-muted-foreground">A partir de <strong className="font-semibold text-primary">{centsToMoney(cheapestOffer.cheapestService.priceCents)}</strong></p>
            </div>
          )}
        </div>

        {/* Mesmos fatos reais, versão compacta pro mobile/tablet — sem as formas decorativas. */}
        {(nearestBarber || cheapestOffer?.cheapestService || (onlineCount != null && onlineCount > 0)) && (
          <div aria-hidden className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-1 lg:hidden">
            {nearestBarber && (
              <div className="flex shrink-0 items-center gap-2.5 rounded-xl border border-border/60 bg-card px-3.5 py-2.5">
                <Avatar name={nearestBarber.name} size="sm" />
                <div className="min-w-0">
                  <p className="max-w-[9rem] truncate text-xs font-semibold">{nearestBarber.name}</p>
                  <p className="max-w-[9rem] truncate text-[0.7rem] text-muted-foreground">{nearestBarber.place}</p>
                </div>
              </div>
            )}
            {cheapestOffer?.cheapestService && (
              <div className="flex shrink-0 items-center gap-2.5 rounded-xl border border-border/60 bg-card px-3.5 py-2.5">
                <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary"><Scissors size={13} /></span>
                <div className="min-w-0">
                  <p className="text-xs font-semibold">{cheapestOffer.cheapestService.name}</p>
                  <p className="text-[0.7rem] text-muted-foreground">A partir de {centsToMoney(cheapestOffer.cheapestService.priceCents)}</p>
                </div>
              </div>
            )}
            {onlineCount != null && onlineCount > 0 && (
              <div className="flex shrink-0 items-center gap-2.5 rounded-xl border border-border/60 bg-card px-3.5 py-2.5">
                <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-emerald-500/15 text-emerald-400"><Radio size={13} /></span>
                <p className="text-xs font-semibold">{onlineCount} {onlineCount === 1 ? 'online' : 'online agora'}</p>
              </div>
            )}
          </div>
        )}
      </section>

      <div ref={resultsRef} className="scroll-mt-24">
        {profile ? (
          <Tabs value={section} onValueChange={(v) => setSection(v as typeof section)}>
            <TabsList className="w-full sm:w-fit">
              <TabsTab value="search">Buscar barbeiros</TabsTab>
              <TabsTab value="bookings">Meus agendamentos</TabsTab>
            </TabsList>
            <TabsPanel value="bookings" className="mt-6">
              <MyBookings onFindBarber={() => setSection('search')} />
            </TabsPanel>
            <TabsPanel value="search" className="mt-6">
              <SearchResults
                filtered={filtered}
                loading={loading}
                online={online}
                error={searchError}
                onSelect={setSelected}
                maxDistanceKm={maxDistanceKm}
                onMaxDistanceChange={setMaxDistanceKm}
                sortBy={sortBy}
                onSortChange={setSortBy}
                onRetry={() => setRetryTick((t) => t + 1)}
              />
            </TabsPanel>
          </Tabs>
        ) : (
          <SearchResults
            filtered={filtered}
            loading={loading}
            online={online}
            error={searchError}
            onSelect={setSelected}
            maxDistanceKm={maxDistanceKm}
            onMaxDistanceChange={setMaxDistanceKm}
            sortBy={sortBy}
            onSortChange={setSortBy}
            onRetry={() => setRetryTick((t) => t + 1)}
          />
        )}
      </div>

      {selected && <BookingModal barber={selected} onClose={() => setSelected(null)} />}
    </div>
  )
}

function SearchResults({
  filtered, loading, online, error, onSelect, maxDistanceKm, onMaxDistanceChange, sortBy, onSortChange, onRetry,
}: {
  filtered: Barber[]
  loading: boolean
  online: boolean
  error: string | null
  onSelect: (barber: Barber) => void
  maxDistanceKm: number
  onMaxDistanceChange: (value: number) => void
  sortBy: SortKey
  onSortChange: (value: SortKey) => void
  onRetry: () => void
}) {
  return (
    <div className="grid gap-10 lg:grid-cols-[220px_1fr]">
      <aside className="h-fit lg:sticky lg:top-24">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Filtros</p>
        <div className="mt-5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-foreground">Distância</span>
            <span className="text-muted-foreground">{maxDistanceKm >= MAX_DISTANCE_KM ? 'Sem limite' : `Até ${maxDistanceKm} km`}</span>
          </div>
          <input
            type="range"
            min={1}
            max={MAX_DISTANCE_KM}
            value={maxDistanceKm}
            onChange={(event) => onMaxDistanceChange(Number(event.target.value))}
            aria-label="Distância máxima em quilômetros"
            className="mt-3 w-full accent-primary"
          />
        </div>
        <div className="mt-7 border-t border-border/60 pt-5">
          <span className="text-xs font-medium text-foreground">Ordenar por</span>
          <div className="mt-3 flex flex-col items-start gap-1">
            {([['distance', 'Mais próximos'], ['name', 'Nome']] as const).map(([key, label]) => (
              <button
                key={key}
                onClick={() => onSortChange(key)}
                aria-pressed={sortBy === key}
                className={cn('rounded-md px-2 py-1 text-sm transition-colors', sortBy === key ? 'font-semibold text-primary' : 'text-muted-foreground hover:text-foreground')}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </aside>

      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold">Barbeiros perto de você</h2>
            <p className="mt-1 text-xs text-muted-foreground">{filtered.length} resultado(s)</p>
          </div>
        </div>

        {loading ? (
          <section className="grid gap-4">
            <Skeleton className="h-36 w-full" />
            <Skeleton className="h-36 w-full" />
          </section>
        ) : error ? (
          <EmptyState
            icon={AlertTriangle}
            title="Não foi possível carregar os barbeiros."
            description={error}
            action={<Button onClick={onRetry} size="sm">Tentar novamente</Button>}
          />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={SearchX}
            title="Nenhum barbeiro encontrado nessa região."
            description={online ? 'Tente desativar o filtro "Online agora", aumentar a distância ou buscar por outra cidade/bairro.' : 'Tente buscar por outro nome, cidade ou bairro.'}
          />
        ) : (
          <section className="grid gap-4">
            {filtered.map((barber, index) => (
              <Card
                key={barber.id}
                style={{ animationDelay: `${Math.min(index, 6) * 60}ms` }}
                className={cn('animate-in fade-in-0 slide-in-from-bottom-1 p-4 duration-500 ease-[var(--ease-premium)] sm:p-5', cardHoverClasses, 'hover:-translate-y-0.5')}
              >
                <div className="flex gap-4">
                  <Avatar name={barber.name} size="lg" className="shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <h3 className="font-semibold">{barber.name}</h3>
                      <span className={cn('inline-flex shrink-0 items-center gap-1.5 text-xs', barber.online ? 'text-emerald-400' : 'text-muted-foreground')}>
                        <span className="size-1.5 rounded-full bg-current" />{barber.online ? 'Livre agora' : 'Indisponível'}
                      </span>
                    </div>
                    <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground"><MapPin size={12} />{barber.place}{barber.distanceKm != null && ` · ${barber.distanceKm < 1 ? `${Math.round(barber.distanceKm * 1000)} m` : `${barber.distanceKm.toFixed(1)} km`}`}</p>
                    {barber.serviceTags.length > 0 && (
                      <p className="mt-2 text-xs text-muted-foreground">{barber.serviceTags.join('  ·  ')}</p>
                    )}
                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                      {barber.startingPriceCents != null ? (
                        <p className="text-sm text-muted-foreground">A partir de <span className="font-semibold text-foreground">{centsToMoney(barber.startingPriceCents)}</span></p>
                      ) : <span />}
                      <Button onClick={() => onSelect(barber)} size="sm">Ver perfil <ChevronRight size={14} /></Button>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </section>
        )}
      </div>
    </div>
  )
}
