'use client'

import { useEffect, useMemo, useState } from 'react'
import { Check, X } from 'lucide-react'
import { apiClient } from '@/lib/api-client'
import { centsToMoney, type BarberService } from '@/lib/contracts'

type Props = { barber: { id: string; name: string }; onClose: () => void }

function upcomingSlots() {
  const now = new Date()
  const slots: Date[] = []
  const candidates: Array<[number, number]> = [
    [0, 9], [0, 10], [0, 11], [0, 14], [0, 15], [0, 16], [0, 17], [0, 18],
    [1, 9], [1, 10], [1, 11], [1, 14], [1, 15], [1, 16], [1, 17], [1, 18],
  ]
  for (const [dayOffset, hour] of candidates) {
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() + dayOffset, hour, 0, 0)
    if (date > now) slots.push(date)
  }
  return slots
}

function slotLabel(date: Date) {
  const now = new Date()
  const sameDay = date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth() && date.getDate() === now.getDate()
  const time = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  return sameDay ? `Hoje ${time}` : `Amanhã ${time}`
}

export function BookingModal({ barber, onClose }: Props) {
  const [services, setServices] = useState<BarberService[]>([])
  const [serviceId, setServiceId] = useState<string | null>(null)
  const [scheduledAt, setScheduledAt] = useState<Date | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  const slots = useMemo(() => upcomingSlots(), [])

  useEffect(() => {
    let active = true
    apiClient.listBarberServices(barber.id).then((res) => { if (active) setServices(res.data ?? []) })
    return () => { active = false }
  }, [barber.id])

  async function submit() {
    if (!serviceId || !scheduledAt) return
    setSubmitting(true)
    setError(null)
    const result = await apiClient.createBooking({ barberId: barber.id, serviceId, scheduledAt: scheduledAt.toISOString() })
    setSubmitting(false)
    if (result.error) setError(result.error)
    else setDone(true)
  }

  if (done) {
    return (
      <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4">
        <div className="w-full max-w-md rounded-3xl border border-border bg-card p-7 text-center">
          <div className="mx-auto grid size-12 place-items-center rounded-full bg-emerald-500/15 text-emerald-400"><Check size={22} /></div>
          <h2 className="mt-4 text-xl font-semibold">Agendamento enviado!</h2>
          <p className="mt-2 text-sm text-muted-foreground">O barbeiro vai confirmar seu horário. Acompanhe pela sua conta.</p>
          <button onClick={onClose} className="mt-6 w-full rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground">Fechar</button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-end bg-black/60 p-0 sm:place-items-center sm:p-4" role="dialog" aria-modal="true">
      <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-3xl border border-border bg-card p-6 sm:rounded-3xl">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs uppercase tracking-widest text-primary">Agendamento gratuito</p>
            <h2 className="mt-2 text-xl font-semibold">{barber.name}</h2>
            <p className="mt-1 text-sm text-muted-foreground">Escolha um serviço e um horário disponível</p>
          </div>
          <button onClick={onClose} aria-label="Fechar agendamento" className="rounded-lg p-2 text-muted-foreground hover:bg-muted"><X size={18} /></button>
        </div>

        <div className="mt-6">
          <p className="text-sm font-medium">Serviço</p>
          <div className="mt-3 grid gap-2">
            {services.length === 0 && <p className="rounded-xl border border-dashed border-border p-4 text-center text-sm text-muted-foreground">Este barbeiro ainda não cadastrou serviços.</p>}
            {services.map((service) => (
              <button key={service.id} type="button" onClick={() => setServiceId(service.id)} className={`flex items-center justify-between gap-2 rounded-xl border p-3 text-left text-sm ${serviceId === service.id ? 'border-primary bg-primary/10 ring-1 ring-primary' : 'border-border hover:border-primary/50'}`}>
                <span className="font-medium">{service.name}</span>
                <span className="text-xs text-muted-foreground">{centsToMoney(service.priceCents)} · {service.durationMinutes} min</span>
              </button>
            ))}
          </div>
        </div>

        <div className="mt-6">
          <p className="text-sm font-medium">Horário</p>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {slots.map((slot) => (
              <button key={slot.toISOString()} type="button" onClick={() => setScheduledAt(slot)} className={`rounded-xl border px-3 py-2.5 text-xs ${scheduledAt?.getTime() === slot.getTime() ? 'border-primary bg-primary/10 text-primary' : 'border-border hover:border-primary/50'}`}>
                {slotLabel(slot)}
              </button>
            ))}
          </div>
        </div>

        {error && <p className="mt-4 rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</p>}

        <button type="button" onClick={submit} disabled={!serviceId || !scheduledAt || submitting} className="mt-6 w-full rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50">
          {submitting ? 'Enviando...' : 'Confirmar agendamento'}
        </button>
      </div>
    </div>
  )
}
