import { useState } from 'react'
import { Plus, Scissors } from 'lucide-react'
import { EmptyState } from '@/components/ui/empty-state'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/components/ui/toast'
import { apiClient } from '@/lib/api-client'
import { centsToMoney, type BarberService } from '@/lib/contracts'

type Props = { services: BarberService[]; onServicesChange: React.Dispatch<React.SetStateAction<BarberService[]>>; loading: boolean }

export function BarberServices({ services, onServicesChange, loading }: Props) {
  const [name, setName] = useState('')
  const [price, setPrice] = useState('')
  const [duration, setDuration] = useState('')
  const [submittingService, setSubmittingService] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editPrice, setEditPrice] = useState('')
  const [editDuration, setEditDuration] = useState('')
  const toast = useToast()

  async function addService(event: React.FormEvent) {
    event.preventDefault()
    if (submittingService) return
    const priceCents = Math.round(Number(price.replace(',', '.')) * 100)
    const durationMinutes = Number(duration)
    if (!name.trim() || Number.isNaN(priceCents) || Number.isNaN(durationMinutes)) return
    setSubmittingService(true)
    const result = await apiClient.createService({ name: name.trim(), priceCents, durationMinutes })
    setSubmittingService(false)
    if (result.data) { onServicesChange((s) => [...s, result.data as BarberService]); setName(''); setPrice(''); setDuration(''); toast.add({ type: 'success', title: 'Serviço adicionado' }) }
    else if (result.error) toast.add({ type: 'error', title: 'Não foi possível adicionar o serviço', description: result.error })
  }

  async function toggleService(service: BarberService) {
    const result = await apiClient.updateService(service.id, { active: !service.active })
    if (result.data) onServicesChange((s) => s.map((x) => (x.id === service.id ? (result.data as BarberService) : x)))
    else if (result.error) toast.add({ type: 'error', title: 'Não foi possível atualizar o serviço', description: result.error })
  }

  function startEdit(service: BarberService) {
    setEditingId(service.id)
    setEditPrice((service.priceCents / 100).toFixed(2).replace('.', ','))
    setEditDuration(String(service.durationMinutes))
  }

  async function saveEdit(id: string) {
    const priceCents = Math.round(Number(editPrice.replace(',', '.')) * 100)
    const durationMinutes = Number(editDuration)
    if (Number.isNaN(priceCents) || priceCents <= 0 || Number.isNaN(durationMinutes) || durationMinutes <= 0) return
    const result = await apiClient.updateService(id, { priceCents, durationMinutes })
    if (result.data) { onServicesChange((s) => s.map((x) => (x.id === id ? (result.data as BarberService) : x))); setEditingId(null); toast.add({ type: 'success', title: 'Serviço atualizado' }) }
    else if (result.error) toast.add({ type: 'error', title: 'Não foi possível salvar', description: result.error })
  }

  return (
    <>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-semibold">Serviços e preços</h2>
          <p className="mt-1 text-sm text-muted-foreground">O cliente vê estes valores na sua página pública.</p>
        </div>
      </div>

      <form onSubmit={addService} className="mt-6 grid gap-3 rounded-xl border border-border bg-background p-4 sm:grid-cols-[1fr_120px_110px_auto]">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome do serviço" aria-label="Nome do serviço" className="rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring" />
        <input value={price} onChange={(e) => setPrice(e.target.value)} placeholder="Preço (R$)" inputMode="decimal" aria-label="Preço" className="rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring" />
        <input value={duration} onChange={(e) => setDuration(e.target.value)} placeholder="Minutos" inputMode="numeric" aria-label="Duração" className="rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring" />
        <button type="submit" disabled={submittingService} className="flex items-center justify-center gap-1.5 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50"><Plus size={16} />{submittingService ? 'Adicionando...' : 'Adicionar'}</button>
      </form>

      <div className="mt-6 divide-y divide-border">
        {loading ? (
          <div className="space-y-3 py-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : services.length === 0 ? (
          <div className="py-6">
            <EmptyState icon={Scissors} title="Nenhum serviço cadastrado ainda." description="Adicione seu primeiro serviço acima para começar a receber agendamentos." />
          </div>
        ) : (
          services.map((service) => (
            <div key={service.id} className="flex flex-wrap items-center gap-3 py-4">
              <Scissors size={16} className="text-primary" />
              <div className="min-w-0 flex-1">
                <p className={`text-sm font-medium ${service.active ? '' : 'text-muted-foreground line-through'}`}>{service.name}</p>
              </div>
              {editingId === service.id ? (
                <>
                  <input value={editPrice} onChange={(e) => setEditPrice(e.target.value)} placeholder="Preço (R$)" inputMode="decimal" aria-label="Editar preço" className="w-24 rounded-lg border border-input bg-background px-2 py-1.5 text-xs outline-none" />
                  <input value={editDuration} onChange={(e) => setEditDuration(e.target.value)} placeholder="Minutos" inputMode="numeric" aria-label="Editar duração" className="w-20 rounded-lg border border-input bg-background px-2 py-1.5 text-xs outline-none" />
                  <button onClick={() => saveEdit(service.id)} className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground">Salvar</button>
                  <button onClick={() => setEditingId(null)} className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium">Cancelar</button>
                </>
              ) : (
                <>
                  <button onClick={() => startEdit(service)} className="text-sm font-semibold hover:underline">{centsToMoney(service.priceCents)}</button>
                  <span className="text-xs text-muted-foreground">{service.durationMinutes} min</span>
                  <button onClick={() => toggleService(service)} className={`rounded-lg px-3 py-1.5 text-xs font-medium ${service.active ? 'bg-emerald-500/15 text-emerald-400' : 'bg-muted text-muted-foreground'}`}>
                    {service.active ? 'Ativo' : 'Pausado'}
                  </button>
                </>
              )}
            </div>
          ))
        )}
      </div>
    </>
  )
}
