import { useMemo, useState } from 'react'
import { ArrowDownRight, ArrowUpRight, Plus, Receipt, Scale, TrendingDown, TrendingUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { Input, Select } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsPanel, TabsTab } from '@/components/ui/tabs'
import { useToast } from '@/components/ui/toast'
import { apiClient } from '@/lib/api-client'
import { centsToMoney, type FinancialEntry } from '@/lib/contracts'
import { isCurrentMonth, isLast7Days, isToday } from '@/lib/ui'
import { cn } from '@/lib/utils'

type Props = { finances: FinancialEntry[]; onFinancesChange: React.Dispatch<React.SetStateAction<FinancialEntry[]>>; loading: boolean }

const PERIODS = [
  { key: 'today', label: 'Hoje' },
  { key: 'week', label: '7 dias' },
  { key: 'month', label: 'Mês' },
] as const

export function BarberFinance({ finances, onFinancesChange, loading }: Props) {
  const [financePeriod, setFinancePeriod] = useState<'today' | 'week' | 'month'>('month')
  const [entryType, setEntryType] = useState<'income' | 'expense'>('expense')
  const [entryCategory, setEntryCategory] = useState('')
  const [entryDescription, setEntryDescription] = useState('')
  const [entryAmount, setEntryAmount] = useState('')
  const [submittingEntry, setSubmittingEntry] = useState(false)
  const toast = useToast()

  const periodEntries = useMemo(() => {
    const periodFilter = financePeriod === 'today' ? isToday : financePeriod === 'week' ? isLast7Days : isCurrentMonth
    return finances.filter((e) => periodFilter(e.entryDate)).sort((a, b) => b.entryDate.localeCompare(a.entryDate))
  }, [finances, financePeriod])
  const periodIncome = periodEntries.filter((e) => e.type === 'income').reduce((acc, e) => acc + e.amountCents, 0)
  const periodExpense = periodEntries.filter((e) => e.type === 'expense').reduce((acc, e) => acc + e.amountCents, 0)

  async function addFinanceEntry(event: React.FormEvent) {
    event.preventDefault()
    if (submittingEntry) return
    const amountCents = Math.round(Number(entryAmount.replace(',', '.')) * 100)
    if (!entryCategory.trim() || Number.isNaN(amountCents) || amountCents <= 0) return
    setSubmittingEntry(true)
    const result = await apiClient.createFinanceEntry({ type: entryType, category: entryCategory.trim(), description: entryDescription.trim(), amountCents })
    setSubmittingEntry(false)
    if (result.data) { onFinancesChange((f) => [result.data as FinancialEntry, ...f]); setEntryCategory(''); setEntryDescription(''); setEntryAmount(''); toast.add({ type: 'success', title: 'Lançamento registrado' }) }
    else if (result.error) toast.add({ type: 'error', title: 'Não foi possível lançar', description: result.error })
  }

  return (
    <Tabs value={financePeriod} onValueChange={(v) => setFinancePeriod(v as typeof financePeriod)}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold">Financeiro</h2>
          <p className="mt-1 text-sm text-muted-foreground">Receitas (geradas automaticamente ao concluir um atendimento) e despesas.</p>
        </div>
        <TabsList>
          {PERIODS.map(({ key, label }) => <TabsTab key={key} value={key}>{label}</TabsTab>)}
        </TabsList>
      </div>

      <TabsPanel value={financePeriod}>
      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">Receitas</p>
            <span className="rounded-lg bg-emerald-500/10 p-2 text-emerald-400"><TrendingUp size={16} /></span>
          </div>
          <p className="mt-4 text-lg font-semibold text-emerald-400">{centsToMoney(periodIncome)}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">Despesas</p>
            <span className="rounded-lg bg-destructive/10 p-2 text-destructive"><TrendingDown size={16} /></span>
          </div>
          <p className="mt-4 text-lg font-semibold text-destructive">{centsToMoney(periodExpense)}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">Saldo</p>
            <span className="rounded-lg bg-primary/10 p-2 text-primary"><Scale size={16} /></span>
          </div>
          <p className="mt-4 text-lg font-semibold">{centsToMoney(periodIncome - periodExpense)}</p>
        </Card>
      </div>

      <form onSubmit={addFinanceEntry} className="mt-6 grid gap-3 rounded-xl border border-border bg-background p-4 sm:grid-cols-[110px_1fr_1fr_120px_auto]">
        <Select value={entryType} onChange={(e) => setEntryType(e.target.value as 'income' | 'expense')} aria-label="Tipo">
          <option value="expense">Despesa</option>
          <option value="income">Receita</option>
        </Select>
        <Input value={entryCategory} onChange={(e) => setEntryCategory(e.target.value)} placeholder="Categoria (ex.: Aluguel)" aria-label="Categoria" />
        <Input value={entryDescription} onChange={(e) => setEntryDescription(e.target.value)} placeholder="Descrição (opcional)" aria-label="Descrição" />
        <Input value={entryAmount} onChange={(e) => setEntryAmount(e.target.value)} placeholder="Valor (R$)" inputMode="decimal" aria-label="Valor" />
        <Button type="submit" disabled={submittingEntry} className="justify-center px-4 py-2.5"><Plus size={16} />{submittingEntry ? 'Lançando...' : 'Lançar'}</Button>
      </form>

      <div className="mt-6 divide-y divide-border">
        {loading ? (
          <div className="space-y-3 py-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : periodEntries.length === 0 ? (
          <div className="py-6">
            <EmptyState icon={Receipt} title="Nenhum lançamento neste período." description="Receitas de atendimentos concluídos e despesas manuais aparecem aqui." />
          </div>
        ) : (
          periodEntries.map((entry) => (
            <div key={entry.id} className="flex flex-wrap items-center gap-3 py-3">
              <span className={cn('grid size-8 shrink-0 place-items-center rounded-lg', entry.type === 'income' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-destructive/10 text-destructive')}>
                {entry.type === 'income' ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{entry.category}{entry.description ? ` · ${entry.description}` : ''}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{new Date(entry.entryDate).toLocaleDateString('pt-BR')}</p>
              </div>
              <span className={cn('text-sm font-semibold', entry.type === 'income' ? 'text-emerald-400' : 'text-destructive')}>{entry.type === 'income' ? '+' : '-'}{centsToMoney(entry.amountCents)}</span>
            </div>
          ))
        )}
      </div>
      </TabsPanel>
    </Tabs>
  )
}
