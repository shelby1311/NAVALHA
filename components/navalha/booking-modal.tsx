'use client'

import { useEffect, useState } from 'react'
import { Check } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { EmptyState } from '@/components/ui/empty-state'
import { apiClient } from '@/lib/api-client'
import { centsToMoney, type BarberService } from '@/lib/contracts'

type Props = { barber: { id: string; name: string }; onClose: () => void }

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
  const [services, setServices] = useState<BarberService[]>([])
  const [serviceId, setServiceId] = useState<string | null>(null)
  const [selectedDay, setSelectedDay] = useState(() => dateKey(new Date()))
  const [slots, setSlots] = useState<string[]>([])
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [scheduledAt, setScheduledAt] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  const days = upcomingDays()
  const selectedService = services.find((s) => s.id === serviceId) ?? null

  useEffect(() => {
    let active = true
    apiClient.listBarberServices(barber.id).then((res) => { if (active) setServices(res.data ?? []) })
    return () => { active = false }
  }, [barber.id])

  useEffect(() => {
    if (!serviceId) { setSlots([]); return }
    let active = true
    setLoadingSlots(true)
    setScheduledAt(null)
    apiClient.listAvailability(barber.id, serviceId, selectedDay).then((res) => {
      if (!active) return
      setLoadingSlots(false)
      setSlots(res.data?.slots ?? [])
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
            <button onClick={onClose} className="mt-6 w-full rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground">Fechar</button>
          </div>
        ) : (
          <>
            <DialogHeader>
              <p className="text-xs uppercase tracking-widest text-primary">Agendamento gratuito</p>
              <DialogTitle className="mt-2">{barber.name}</DialogTitle>
              <DialogDescription>Escolha um serviço e um horário disponível</DialogDescription>
            </DialogHeader>

            <div className="mt-6">
              <p className="text-sm font-medium">Serviço</p>
              <div className="mt-3 grid gap-2">
                {services.length === 0 && <EmptyState title="Este barbeiro ainda não cadastrou serviços." />}
                {services.map((service) => (
                  <button key={service.id} type="button" onClick={() => setServiceId(service.id)} className={`flex items-center justify-between gap-2 rounded-xl border p-3 text-left text-sm ${serviceId === service.id ? 'border-primary bg-primary/10 ring-1 ring-primary' : 'border-border hover:border-primary/50'}`}>
                    <span className="font-medium">{service.name}</span>
                    <span className="text-xs text-muted-foreground">{centsToMoney(service.priceCents)} · {service.durationMinutes} min</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-6">
              <p className="text-sm font-medium">Dia</p>
              <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                {days.map((day) => {
                  const key = dateKey(day)
                  return (
                    <button key={key} type="button" onClick={() => setSelectedDay(key)} className={`shrink-0 rounded-xl border px-3.5 py-2.5 text-xs ${selectedDay === key ? 'border-primary bg-primary/10 text-primary' : 'border-border hover:border-primary/50'}`}>
                      {dayLabel(day)}
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="mt-6">
              <p className="text-sm font-medium">Horário</p>
              {!serviceId && <p className="mt-3 rounded-xl border border-dashed border-border p-4 text-center text-sm text-muted-foreground">Escolha um serviço para ver os horários.</p>}
              {serviceId && loadingSlots && <p className="mt-3 rounded-xl border border-dashed border-border p-4 text-center text-sm text-muted-foreground">Carregando horários...</p>}
              {serviceId && !loadingSlots && slots.length === 0 && <p className="mt-3 rounded-xl border border-dashed border-border p-4 text-center text-sm text-muted-foreground">Nenhum horário disponível neste dia.</p>}
              {serviceId && !loadingSlots && slots.length > 0 && (
                <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {slots.map((slot) => (
                    <button key={slot} type="button" onClick={() => setScheduledAt(slot)} className={`rounded-xl border px-3 py-3 text-xs ${scheduledAt === slot ? 'border-primary bg-primary/10 text-primary' : 'border-border hover:border-primary/50'}`}>
                      {new Date(slot).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {selectedService && scheduledAt && (
              <div className="mt-6 rounded-xl border border-border bg-background p-4 text-sm">
                <p className="font-medium">Resumo</p>
                <p className="mt-2 text-muted-foreground">
                  {selectedService.name} · {selectedService.durationMinutes} min · {centsToMoney(selectedService.priceCents)}
                  <br />
                  {new Date(scheduledAt).toLocaleString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            )}

            {error && <p className="mt-4 rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</p>}

            <button type="button" onClick={submit} disabled={!serviceId || !scheduledAt || submitting} className="mt-6 w-full rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50">
              {submitting ? 'Enviando...' : 'Confirmar agendamento'}
            </button>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
