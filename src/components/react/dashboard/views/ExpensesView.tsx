import { useState, useEffect } from 'react'
import {
  Plus,
  Trash2,
  ArrowDownCircle,
  AlertCircle,
  CheckCircle2,
  ShoppingBag,
  PenTool,
  Lightbulb,
  Users,
  HelpCircle,
  Loader2,
  Info,
} from 'lucide-react'
import type { Expense } from '../../../../types/expenses'

const CASH_REGISTER_CLOSED_MESSAGE =
  'No hay una caja abierta. Abrí la caja o desmarcá que el gasto usa efectivo de caja.'
const EXPENSE_SUBMIT_ERROR = 'No pudimos registrar el gasto. Revisá los datos e intentá nuevamente.'

const CATEGORIES = [
  {
    id: 'supplies' as const,
    label: 'Insumos',
    icon: <ShoppingBag size={16} />,
    color: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  },
  {
    id: 'maintenance' as const,
    label: 'Mantenimiento',
    icon: <PenTool size={16} />,
    color: 'bg-amber-50 text-amber-700 border-amber-100',
  },
  {
    id: 'utilities' as const,
    label: 'Servicios',
    icon: <Lightbulb size={16} />,
    color: 'bg-blue-50 text-blue-700 border-blue-100',
  },
  {
    id: 'staff' as const,
    label: 'Personal',
    icon: <Users size={16} />,
    color: 'bg-indigo-50 text-indigo-700 border-indigo-100',
  },
  {
    id: 'other' as const,
    label: 'Otros',
    icon: <HelpCircle size={16} />,
    color: 'bg-gray-50 text-gray-700 border-gray-100',
  },
]

export default function ExpensesView({ slug }: { slug: string }) {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]['id']>('supplies')
  const [usesCash, setUsesCash] = useState(true)

  useEffect(() => {
    async function fetchExpenses() {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(`/api/organizations/${slug}/expenses`, {
          credentials: 'include',
        })
        if (!res.ok) throw new Error('Error al cargar gastos')
        const json = await res.json()
        setExpenses(Array.isArray(json.data) ? json.data : [])
      } catch (err: any) {
        setError('No pudimos cargar los gastos. Por favor, reintentá.')
        setExpenses([])
      } finally {
        setLoading(false)
      }
    }
    fetchExpenses()
  }, [slug])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!description.trim() || !amount || parseFloat(amount) <= 0) return

    setSubmitting(true)
    setError(null)
    setSuccessMsg(null)

    try {
      const res = await fetch(`/api/organizations/${slug}/expenses`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: description.trim(),
          amount: parseFloat(amount),
          category,
          usesCash,
        }),
      })

      const json = await res.json()
      if (!res.ok) {
        if (json.error === 'cash_register_closed') {
          throw new Error(CASH_REGISTER_CLOSED_MESSAGE)
        }
        throw new Error(EXPENSE_SUBMIT_ERROR)
      }

      setExpenses((prev) => [json.data, ...prev])
      setDescription('')
      setAmount('')
      setCategory('supplies')
      setUsesCash(true)
      setSuccessMsg(
        usesCash
          ? 'Gasto registrado y descontado del efectivo de caja.'
          : 'Gasto registrado sin modificar el efectivo de caja.',
      )
      setTimeout(() => setSuccessMsg(null), 3000)
    } catch (err: unknown) {
      setError(
        err instanceof Error && err.message === CASH_REGISTER_CLOSED_MESSAGE
          ? CASH_REGISTER_CLOSED_MESSAGE
          : EXPENSE_SUBMIT_ERROR,
      )
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar este gasto?')) return

    try {
      const res = await fetch(`/api/organizations/${slug}/expenses?id=${id}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      if (!res.ok) throw new Error()
      setExpenses((prev) => prev.filter((item) => item.id !== id))
    } catch {
      setError('No se pudo eliminar el registro. Solo los administradores tienen permiso.')
      setTimeout(() => setError(null), 4000)
    }
  }

  return (
    <div className="p-6 space-y-8">
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.25em] text-(--clr-accent) mb-1">
          Finanzas
        </p>
        <h1 className="text-2xl font-bold text-(--clr-ink)">Gastos del Local</h1>
        <p className="text-sm text-gray-500 mt-1">
          Registrá y administrá egresos e insumos al instante.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-start">
        <div className="lg:col-span-2 bg-white border border-gray-100 p-6 shadow-xs sticky top-4">
          <div className="flex items-center gap-2 mb-6">
            <ArrowDownCircle className="text-red-500 w-5 h-5" />
            <h2 className="text-sm font-bold uppercase tracking-widest text-(--clr-ink)">
              Nuevo Gasto
            </h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="flex items-center gap-2 text-xs bg-red-50 text-red-600 p-3 border border-red-100">
                <AlertCircle size={16} className="shrink-0" />
                <span>{error}</span>
              </div>
            )}
            {successMsg && (
              <div className="flex items-center gap-2 text-xs bg-emerald-50 text-emerald-600 p-3 border border-emerald-100">
                <CheckCircle2 size={16} className="shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                Descripción
              </label>
              <input
                type="text"
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ej. Compra urgente 3L de Leche"
                className="w-full text-sm border border-gray-200 p-3 focus:outline-none focus:border-(--clr-accent) transition-colors text-(--clr-ink)"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                Monto ($)
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full text-sm border border-gray-200 p-3 focus:outline-none focus:border-(--clr-accent) transition-colors text-(--clr-ink)"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                Categoría
              </label>
              <div className="grid grid-cols-2 gap-2">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCategory(cat.id)}
                    className={`flex items-center gap-2 p-2.5 text-xs font-semibold border transition-all text-left ${
                      category === cat.id
                        ? 'border-(--clr-ink) bg-(--clr-ink) text-white'
                        : 'border-gray-200 hover:bg-gray-50 text-gray-600'
                    }`}
                  >
                    {cat.icon}
                    <span>{cat.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-start gap-3 border-y border-gray-100 py-4">
              <input
                id="expense-uses-cash"
                type="checkbox"
                checked={usesCash}
                onChange={(event) => setUsesCash(event.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 accent-(--clr-ink) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--clr-ink)"
              />
              <div className="min-w-0 flex-1">
                <label
                  htmlFor="expense-uses-cash"
                  className="cursor-pointer text-sm font-medium text-gray-900"
                >
                  ¿Se usa dinero de la caja?
                </label>
                <p className="mt-1 text-xs leading-5 text-gray-600">
                  Sí, descontar del efectivo esperado al cierre.
                </p>
              </div>
              <span className="group relative inline-flex shrink-0">
                <button
                  type="button"
                  aria-label="Más información sobre gastos de caja"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full text-gray-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--clr-ink)"
                >
                  <Info size={16} aria-hidden="true" />
                </button>
                <span
                  role="tooltip"
                  className="pointer-events-none absolute bottom-full right-0 z-10 mb-2 w-64 border border-gray-200 bg-white p-3 text-xs leading-5 text-gray-700 opacity-0 shadow-md transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
                >
                  Esta opción se usa para calcular el efectivo que debería quedar al cierre. Si se
                  pagó por transferencia o tarjeta, desmarcala: el gasto se registra, pero no resta
                  efectivo.
                </span>
              </span>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-(--clr-ink) text-white hover:bg-(--clr-accent) py-3.5 text-xs font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Procesando...
                </>
              ) : (
                <>
                  <Plus size={16} />
                  Registrar Egreso
                </>
              )}
            </button>
          </form>
        </div>

        <div className="lg:col-span-3 bg-white border border-gray-100 p-6 shadow-xs">
          <h2 className="text-sm font-bold uppercase tracking-widest text-gray-400 mb-6">
            Gastos Recientes
          </h2>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-(--clr-accent)" />
              <span className="text-xs text-gray-400 uppercase tracking-wider">
                Cargando historial...
              </span>
            </div>
          ) : expenses.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-gray-200">
              <p className="text-sm text-gray-400">No hay gastos registrados todavía.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {expenses.map((exp) => {
                const catDetails = CATEGORIES.find((c) => c.id === exp.category) ?? CATEGORIES[4]
                return (
                  <div
                    key={exp.id}
                    className="flex items-center justify-between py-4 first:pt-0 last:pb-0 hover:bg-gray-50/50 transition-colors group px-2"
                  >
                    <div className="flex items-center gap-4 min-w-0 pr-4">
                      <div className={`p-2 border shrink-0 ${catDetails.color}`}>
                        {catDetails.icon}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-(--clr-ink) truncate">
                          {exp.description}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] text-gray-400">
                            {new Date(exp.created_at).toLocaleDateString('es-AR', {
                              day: '2-digit',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                          <span className="text-[10px] text-gray-300">•</span>
                          <span className="text-[10px] text-gray-400 uppercase font-bold">
                            {catDetails.label}
                          </span>
                          <span className="text-[10px] text-gray-300">•</span>
                          <span className="text-[10px] text-gray-500">
                            {exp.uses_cash ? 'Pagado desde caja' : 'No afecta caja'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 shrink-0">
                      <span className="text-base font-bold text-red-500">
                        -${exp.amount.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                      </span>
                      <button
                        onClick={() => handleDelete(exp.id)}
                        className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all"
                        title="Eliminar gasto"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
