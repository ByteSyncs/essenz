import { useState, useEffect } from 'react'
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  Cell,
  PieChart,
  Pie,
  BarChart,
  Bar,
} from 'recharts'
import { TrendingUp, DollarSign, CreditCard, Heart, Package, Clock } from 'lucide-react'
import type { StatsData } from '../../../../types/stats'

export default function StatisticsView({ slug }: { slug: string }) {
  const [range, setRange] = useState<'today' | '7d' | '30d'>('7d')
  const [data, setData] = useState<StatsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchStats() {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(`/api/organizations/${slug}/stats?range=${range}`, {
          credentials: 'include',
        })
        if (!res.ok) throw new Error(`Error ${res.status}`)
        const json = await res.json()
        if (!json.success) throw new Error(json.error || 'Error desconocido')
        setData(json.stats)
      } catch (err: any) {
        setError(err.message || 'No se pudieron cargar los datos')
      } finally {
        setLoading(false)
      }
    }
    fetchStats()
  }, [slug, range])

  if (loading) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-100 text-gray-500 gap-2">
        <div className="w-6 h-6 border-2 border-gray-300 border-t-(--clr-accent) rounded-full animate-spin" />
        <p className="text-sm font-medium">Cargando estadísticas...</p>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="p-6 text-center text-red-500 min-h-100 flex items-center justify-center">
        <p className="font-medium">Error: {error || 'No se pudieron cargar los datos'}</p>
      </div>
    )
  }

  const maxProductQty =
    data.topProducts?.length > 0 ? Math.max(...data.topProducts.map((p) => p.qty)) : 1

  const activeHours = (data.hourlyDistribution ?? []).filter((h) => h.count > 0)

  return (
    <div className="p-6 space-y-8 min-h-screen">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.25em] text-(--clr-accent) mb-1">
            Análisis
          </p>
          <h1 className="text-2xl font-bold text-(--clr-ink)">Estadísticas</h1>
          <p className="text-sm text-gray-500">Rendimiento de {slug}</p>
        </div>

        <div className="flex bg-gray-100 p-1 self-start">
          {(['today', '7d', '30d'] as const).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-4 py-1.5 text-xs font-bold uppercase tracking-wider transition-all ${
                range === r
                  ? 'bg-white text-(--clr-ink) shadow-sm'
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              {r === 'today' ? 'Hoy' : r === '7d' ? '7 Días' : '30 Días'}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard
          label="Ingresos"
          value={`$${data.summary.totalRevenue.toLocaleString('es-AR')}`}
          icon={<DollarSign size={20} />}
        />
        <StatCard
          label="Gastos"
          value={`$${data.summary.totalExpenses.toLocaleString('es-AR')}`}
          icon={<TrendingUp size={20} className="rotate-180 text-red-500" />}
        />
        <StatCard
          label="Beneficio Neto"
          value={`$${data.summary.netProfit.toLocaleString('es-AR')}`}
          icon={<TrendingUp size={20} />}
        />
        <StatCard
          label="Propinas"
          value={`$${data.summary.totalTips.toLocaleString('es-AR')}`}
          icon={<Heart size={20} className="text-emerald-600" />}
        />
        <StatCard
          label="Pedidos"
          value={data.summary.orderCount.toString()}
          icon={<CreditCard size={20} />}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white border border-gray-100 p-6 shadow-sm">
          <h3 className="text-sm font-bold uppercase tracking-widest text-gray-400 mb-6">
            Flujo de Caja
          </h3>
          <div className="h-75 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.revenueHistory ?? []}>
                <defs>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--clr-accent)" stopOpacity={0.1} />
                    <stop offset="95%" stopColor="var(--clr-accent)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis
                  dataKey="date"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: '#999' }}
                />
                <YAxis hide />
                <Tooltip
                  contentStyle={{
                    borderRadius: '0px',
                    border: 'none',
                    boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                  }}
                  formatter={(value, name) => [
                    `$${Number(value ?? 0).toLocaleString('es-AR')}`,
                    name as string,
                  ]}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  name="Ingresos"
                  stroke="var(--clr-accent)"
                  fillOpacity={1}
                  fill="url(#colorRev)"
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="expenses"
                  name="Gastos"
                  stroke="#ef4444"
                  fill="transparent"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white border border-gray-100 p-6 shadow-sm">
          <h3 className="text-sm font-bold uppercase tracking-widest text-gray-400 mb-6">
            Métodos de Pago
          </h3>
          {data.paymentMethods?.length === 0 ? (
            <div className="flex items-center justify-center h-55 text-xs text-gray-400 italic">
              Sin pagos en este período.
            </div>
          ) : (
            <>
              <div className="h-55 relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data.paymentMethods}
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {data.paymentMethods.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [`${value ?? 0}%`, '']} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-2xl font-bold text-(--clr-ink)">100%</span>
                  <span className="text-[10px] uppercase text-gray-400">Total</span>
                </div>
              </div>
              <div className="mt-4 space-y-2">
                {data.paymentMethods.map((m) => (
                  <div key={m.name} className="flex justify-between items-center text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: m.color }} />
                      <span className="text-gray-600">{m.name}</span>
                    </div>
                    <span className="font-bold">{m.value}%</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-gray-100 p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-6">
            <Package size={18} className="text-gray-400" />
            <h3 className="text-sm font-bold uppercase tracking-widest text-gray-400">
              Productos Más Vendidos
            </h3>
          </div>
          {data.topProducts?.length === 0 ? (
            <p className="text-xs text-gray-400 italic py-4 text-center">
              No hay órdenes despachadas en este rango.
            </p>
          ) : (
            <div className="space-y-5">
              {data.topProducts.slice(0, 6).map((product) => (
                <div key={product.name} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium text-gray-700 truncate pr-2">{product.name}</span>
                    <span className="font-bold text-(--clr-ink) shrink-0">{product.qty} u.</span>
                  </div>
                  <div className="w-full bg-gray-100 h-2 overflow-hidden">
                    <div
                      className="bg-(--clr-accent) h-full transition-all duration-500"
                      style={{ width: `${(product.qty / maxProductQty) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white border border-gray-100 p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-6">
            <Clock size={18} className="text-gray-400" />
            <h3 className="text-sm font-bold uppercase tracking-widest text-gray-400">
              Horarios Pico
            </h3>
          </div>
          {activeHours.length === 0 ? (
            <p className="text-xs text-gray-400 italic py-4 text-center">
              Sin pedidos registrados en este período.
            </p>
          ) : (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={activeHours} margin={{ top: 10, right: 10, left: -10, bottom: 15 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f5f5f5" />
                  <XAxis
                    dataKey="hourRange"
                    tick={{ fontSize: 9, fill: '#666' }}
                    axisLine={false}
                    tickLine={false}
                    interval={0}
                    angle={-15}
                    textAnchor="end"
                  />
                  <YAxis tick={{ fontSize: 10, fill: '#666' }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ background: '#fff', border: '1px solid #f0f0f0' }}
                    formatter={(value) => [value ?? 0, 'Pedidos']}
                  />
                  <Bar
                    dataKey="count"
                    name="Pedidos"
                    fill="var(--clr-accent)"
                    radius={[2, 2, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white border border-gray-100 p-6 shadow-sm">
        <h3 className="text-sm font-bold uppercase tracking-widest text-gray-400 mb-6">
          Desglose de Gastos por Categoría
        </h3>
        {data.topExpenses?.length === 0 ? (
          <p className="text-xs text-gray-400 italic text-center py-4">
            Sin gastos registrados en este período.
          </p>
        ) : (
          <div className="space-y-6">
            {data.topExpenses.map((exp) => (
              <div key={exp.category} className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="font-medium text-gray-700">{exp.category}</span>
                  <span className="font-bold text-(--clr-ink)">
                    ${exp.amount.toLocaleString('es-AR')}
                  </span>
                </div>
                <div className="w-full bg-gray-100 h-1.5 overflow-hidden">
                  <div
                    className="bg-red-400 h-full transition-all duration-700"
                    style={{
                      width: `${
                        data.summary.totalExpenses
                          ? (exp.amount / data.summary.totalExpenses) * 100
                          : 0
                      }%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function StatCard({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="bg-white p-5 border border-gray-100 shadow-sm hover:border-(--clr-accent) transition-colors group">
      <div className="flex justify-between items-start mb-4">
        <div className="p-2 bg-gray-50 text-gray-400 group-hover:text-(--clr-accent) transition-colors">
          {icon}
        </div>
      </div>
      <div>
        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">
          {label}
        </p>
        <p className="text-xl font-bold text-(--clr-ink)">{value}</p>
      </div>
    </div>
  )
}
