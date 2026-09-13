'use client'

import { useEffect, useState } from 'react'
import { Check, ChevronLeft, MapPin } from 'lucide-react'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { EmptyState } from '@/components/ui/empty-state'
import { apiClient } from '@/lib/api-client'
import { centsToMoney, type BarberService } from '@/lib/contracts'
import { cn } from '@/lib/utils'

type Props = { barber: { id: string; name: string; place: string; online: boolean; distanceKm: number | null }; onClose: () => void }

// "profile" é a tela de apresentação do barbeiro (seção 9 do redesign); as
// quatro seguintes são o fluxo de agendamento numerado do brief (seção 10).
type Step = 'profile' | 'service' | 'date' | 'time' | 'confirm'
const BOOKING_STEPS: { id: Step; label: string }[] = [
  { id: 'service', label: 'Serviço' },
  { id: 'date', label: 'Data' },
  { id: 'time', label: 'Horário' },
  { id: 'confirm', label: 'Confirmação' },
]
const PREV_STEP: Record<Step, Step> = { profile: 'profile', service: 'profile', date: 'service', time: 'date', confirm: 'time' }

const DAYS_AHEAD = 14

function dateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function upcomingDays() {
  const now = new Date()
  return Array.from({ length: DAYS_AHEAD }, (_, i) => new Date(now.getFullYear(), now.getMonth(), now.getDate() + i))
}

function dayLabel(date: Date) {
  const now = new Date()
  if (dateKey(date) === dateKey(now)) return 'Hoje'
  const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
  if (dateKey(date) === dateKey(tomorrow)) return 'Amanhã'
  return date.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' })
}

export function BookingModal({ barber, onClose }: Props) {
  const [step, setStep] = useState<Step>('profile')
  const [services, setServices] = useState<BarberService[]>([])
  const [serviceId, setServiceId] = useState<string | null>(null)
  const [selectedDay, setSelectedDay] = useState(() => dateKey(new Date()))
  const [slots, setSlots] = useState<string[]>([])
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [scheduledAt, setScheduledAt] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [servicesError, setServicesError] = useState<string | null>(null)
  const [slotsError, setSlotsError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  const days = upcomingDays()
  const selectedService = services.find((s) => s.id === serviceId) ?? null
  const bookingStepIndex = BOOKING_STEPS.findIndex((s) => s.id === step)

  useEffect(() => {
    let active = true
    apiClient.listBarberServices(barber.id).then((res) => { if (active) { setServices(res.data ?? []); setServicesError(res.error) } })
    return () => { active = false }
  }, [barber.id])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset de horários ao trocar/limpar o serviço selecionado, não um loop.
    if (!serviceId) { setSlots([]); return }
    let active = true
    setLoadingSlots(true)
    setScheduledAt(null)
    apiClient.listAvailability(barber.id, serviceId, selectedDay).then((res) => {
      if (!active) return
      setLoadingSlots(false)
      setSlots(res.data?.slots ?? [])
      setSlotsError(res.error)
    })
    return () => { active = false }
  }, [barber.id, serviceId, selectedDay])

  async function submit() {
    if (!serviceId || !scheduledAt) return
    setSubmitting(true)
    setError(null)
    const result = await apiClient.createBooking({ barberId: barber.id, serviceId, scheduledAt })
    setSubmitting(false)
    if (result.error) setError(result.error)
    else setDone(true)
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent showClose={!done}>
        {done ? (
          <div className="py-2 text-center">
            <div className="mx-auto grid size-12 place-items-center rounded-full bg-emerald-500/15 text-emerald-400"><Check size={22} /></div>
            <h2 className="mt-4 text-xl font-semibold">Agendamento enviado!</h2>
            <p className="mt-2 text-sm text-muted-foreground">O barbeiro vai confirmar seu horário. Acompanhe pela sua conta.</p>
            <Button onClick={onClose} className="mt-6 w-full justify-center py-3" size="lg">Fechar</Button>
          </div>
        ) : (
          <>
            {bookingStepIndex >= 0 && (
              <div className="mb-5 flex items-center gap-1.5" aria-hidden>
                {BOOKING_STEPS.map((s, i) => (
                  <span key={s.id} className={cn('h-1 flex-1 rounded-full transition-colors duration-200', i <= bookingStepIndex ? 'bg-primary' : 'bg-muted')} />
                ))}
              </div>
            )}

            {step !== 'profile' && (
              <button type="button" onClick={() => setStep(PREV_STEP[step])} className="mb-3 flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground">
                <ChevronLeft size={14} /> Voltar
              </button>
            )}

            <div key={step} className="animate-in fade-in-0 slide-in-from-right-2 duration-200">
              {step === 'profile' && (
                <div>
                  <div className="flex items-center gap-4">
                    <Avatar name={barber.name} size="lg" />
                    <div className="min-w-0">
                      <h2 className="truncate text-xl font-semibold">{barber.name}</h2>
                      <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                        <MapPin size={12} />{barber.place}
                        {barber.distanceKm != null && ` · ${barber.distanceKm < 1 ? `${Math.round(barber.distanceKm * 1000)} m` : `${barber.distanceKm.toFixed(1)} km`}`}
                      </p>
                    </div>
                  </div>

                  <Badge variant={barber.online ? 'success' : 'neutral'} className="mt-4">{barber.online ? 'Livre agora' : 'Indisponível agora'}</Badge>

                  <div className="mt-6">
                    <p className="text-sm font-medium">Serviços</p>
                    {services.length === 0 ? (
                      <p className="mt-2 text-sm text-muted-foreground">{servicesError ? 'Não foi possível carregar os serviços.' : 'Este barbeiro ainda não cadastrou serviços.'}</p>
                    ) : (
                      <ul className="mt-3 space-y-2">
                        {services.map((service) => (
                          <li key={service.id} className="flex items-center justify-between gap-3 rounded-xl border border-border p-3 text-sm">
                            <span className="font-medium">{service.name}</span>
                            <span className="text-xs text-muted-foreground">{centsToMoney(service.priceCents)} · {service.durationMinutes} min</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <Button onClick={() => setStep('service')} className="mt-6 w-full justify-center py-3" size="lg" disabled={services.length === 0}>
                    Ver horários e agendar
                  </Button>
                </div>
              )}

              {step === 'service' && (
                <div>
                  <DialogHeader>
                    <p className="text-xs uppercase tracking-widest text-primary">Passo 1 de 4</p>
                    <DialogTitle className="mt-2">Escolha o serviço</DialogTitle>
                  </DialogHeader>
                  <div className="mt-5 grid gap-2">
                    {services.length === 0 && (
                      <EmptyState title={servicesError ? 'Não foi possível carregar os serviços.' : 'Este barbeiro ainda não cadastrou serviços.'} description={servicesError ?? undefined} />
                    )}
                    {services.map((service) => (
                      <button key={service.id} type="button" onClick={() => setServiceId(service.id)} className={cn('flex items-center justify-between gap-2 rounded-xl border p-3 text-left text-sm transition-colors', serviceId === service.id ? 'border-primary bg-primary/10 ring-1 ring-primary' : 'border-border hover:border-primary/50')}>
                        <span className="font-medium">{service.name}</span>
                        <span className="text-xs text-muted-foreground">{centsToMoney(service.priceCents)} · {service.durationMinutes} min</span>
                      </button>
                    ))}
                  </div>
                  <Button onClick={() => setStep('date')} disabled={!serviceId} className="mt-6 w-full justify-center py-3" size="lg">Continuar</Button>
                </div>
              )}

              {step === 'date' && (
                <div>
                  <DialogHeader>
                    <p className="text-xs uppercase tracking-widest text-primary">Passo 2 de 4</p>
                    <DialogTitle className="mt-2">Escolha o dia</DialogTitle>
                  </DialogHeader>
                  <div className="mt-5 flex gap-2 overflow-x-auto pb-1">
                    {days.map((day) => {
                      const key = dateKey(day)
                      return (
                        <button key={key} type="button" onClick={() => setSelectedDay(key)} className={cn('shrink-0 rounded-xl border px-3.5 py-2.5 text-xs transition-colors', selectedDay === key ? 'border-primary bg-primary/10 text-primary' : 'border-border hover:border-primary/50')}>
                          {dayLabel(day)}
                        </button>
                      )
                    })}
                  </div>
                  <Button onClick={() => setStep('time')} className="mt-6 w-full justify-center py-3" size="lg">Continuar</Button>
                </div>
              )}

              {step === 'time' && (
                <div>
                  <DialogHeader>
                    <p className="text-xs uppercase tracking-widest text-primary">Passo 3 de 4</p>
                    <DialogTitle className="mt-2">Escolha o horário</DialogTitle>
                  </DialogHeader>
                  <div className="mt-5">
                    {loadingSlots && <p className="rounded-xl border border-dashed border-border p-4 text-center text-sm text-muted-foreground">Carregando horários...</p>}
                    {!loadingSlots && slots.length === 0 && (
                      <p className="rounded-xl border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
                        {slotsError ? `Não foi possível carregar os horários: ${slotsError}` : 'Nenhum horário disponível neste dia.'}
                      </p>
                    )}
                    {!loadingSlots && slots.length > 0 && (
                      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                        {slots.map((slot) => (
                          <button key={slot} type="button" onClick={() => setScheduledAt(slot)} className={cn('rounded-xl border px-3 py-3 text-xs transition-colors', scheduledAt === slot ? 'border-primary bg-primary/10 text-primary' : 'border-border hover:border-primary/50')}>
                            {new Date(slot).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <Button onClick={() => setStep('confirm')} disabled={!scheduledAt} className="mt-6 w-full justify-center py-3" size="lg">Continuar</Button>
                </div>
              )}

              {step === 'confirm' && (
                <div>
                  <DialogHeader>
                    <p className="text-xs uppercase tracking-widest text-primary">Passo 4 de 4</p>
                    <DialogTitle className="mt-2">Confirme seu agendamento</DialogTitle>
                    <DialogDescription>Revise os detalhes antes de enviar</DialogDescription>
                  </DialogHeader>

                  {selectedService && scheduledAt && (
                    <div className="mt-5 rounded-xl border border-border bg-background p-4 text-sm">
                      <p className="font-medium">{barber.name}</p>
                      <p className="mt-2 text-muted-foreground">
                        {selectedService.name} · {selectedService.durationMinutes} min · {centsToMoney(selectedService.priceCents)}
                        <br />
                        {new Date(scheduledAt).toLocaleString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  )}

                  {error && <p className="mt-4 rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</p>}

                  <Button onClick={submit} disabled={!serviceId || !scheduledAt || submitting} className="mt-6 w-full justify-center py-3" size="lg">
                    {submitting ? 'Enviando...' : 'Confirmar agendamento'}
                  </Button>
                </div>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
