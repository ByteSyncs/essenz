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

import {
  TrendingUp,
  DollarSign,
  CreditCard,
  Heart,
  Package,
  Clock,
  BarChart3,
  Grid2X2,
} from 'lucide-react'

import type { StatsData } from '../../../../types/stats'

export default function StatisticsView({ slug }: { slug: string }) {
  const [range, setRange] = useState<'today' | '7d' | '30d'>('7d')

  const [data, setData] = useState<StatsData | null>(null)

  const [loading, setLoading] = useState(true)

  const [error, setError] = useState<string | null>(null)
  const [hourView, setHourView] = useState<'bars' | 'heatmap'>('bars')

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

  const hourlyData = Array.from({ length: 24 }, (_, hour) => {
    const start = String(hour).padStart(2, '0')
    const end = String((hour + 1) % 24).padStart(2, '0')
    const matchingHours = (data.hourlyDistribution ?? []).filter((item) => {
      const match = item.hourRange.match(/(\d{1,2})(?::\d{2})?/)
      return match ? Number(match[1]) % 24 === hour : false
    })

    return {
      hour,
      hourLabel: `${start} h`,
      hourRange: `${start}:00–${end}:00`,
      count: matchingHours.reduce((total, item) => total + item.count, 0),
    }
  })

  const maxHourlyCount = Math.max(1, ...hourlyData.map((item) => item.count))
  const peakHour = hourlyData.reduce(
    (peak, item) => (item.count > peak.count ? item : peak),
    hourlyData[0],
  )
  const hasHourlyOrders = hourlyData.some((item) => item.count > 0)

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

        <div className="bg-white border border-gray-100 p-5 sm:p-6 shadow-sm min-w-0">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
            <div className="flex items-center gap-2">
              <Clock size={18} className="text-gray-400 shrink-0" />
              <div>
                <h3 className="text-sm font-bold uppercase tracking-widest text-gray-400">
                  Horarios Pico
                </h3>
                <p className="text-xs text-gray-400 mt-1">Distribución de pedidos por hora</p>
              </div>
            </div>
            <div
              className="inline-flex self-start rounded-lg border border-gray-200 bg-gray-50 p-1 gap-1"
              role="group"
              aria-label="Tipo de gráfico de horarios pico"
            >
              <button
                type="button"
                onClick={() => setHourView('bars')}
                aria-pressed={hourView === 'bars'}
                className={`inline-flex items-center justify-center gap-1.5 rounded-md px-3 py-2 text-xs font-semibold transition-colors ${hourView === 'bars' ? 'bg-white text-(--clr-ink) shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                <BarChart3 size={15} />
                <span>Barras</span>
              </button>
              <button
                type="button"
                onClick={() => setHourView('heatmap')}
                aria-pressed={hourView === 'heatmap'}
                className={`inline-flex items-center justify-center gap-1.5 rounded-md px-3 py-2 text-xs font-semibold transition-colors ${hourView === 'heatmap' ? 'bg-white text-(--clr-ink) shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                <Grid2X2 size={15} />
                <span>Mapa</span>
              </button>
            </div>
          </div>

          {!hasHourlyOrders ? (
            <div className="flex min-h-56 flex-col items-center justify-center gap-2 text-center">
              <Clock size={24} className="text-gray-300" />
              <p className="text-sm font-medium text-gray-500">
                Sin pedidos registrados en este período.
              </p>
              <p className="text-xs text-gray-400">
                Cuando haya actividad, vas a poder ver los horarios de mayor demanda.
              </p>
            </div>
          ) : (
            <>
              {hourView === 'bars' ? (
                <div className="h-64 w-full min-w-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={hourlyData}
                      margin={{ top: 12, right: 4, left: -22, bottom: 0 }}
                    >
                      <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#edf0ed" />
                      <XAxis
                        dataKey="hourLabel"
                        interval={2}
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 10, fill: '#8b948d' }}
                        tickMargin={10}
                      />
                      <YAxis
                        allowDecimals={false}
                        width={34}
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 10, fill: '#8b948d' }}
                      />
                      <Tooltip
                        cursor={{ fill: 'rgba(57, 116, 90, 0.06)' }}
                        content={({ active, payload }) => {
                          if (!active || !payload?.length) return null
                          const point = payload[0].payload as (typeof hourlyData)[number]
                          return (
                            <div className="rounded-xl border border-gray-100 bg-white px-3 py-2.5 shadow-lg">
                              <p className="text-xs font-semibold text-gray-500">
                                {point.hourRange}
                              </p>
                              <p className="mt-1 text-sm font-bold text-(--clr-ink)">
                                {point.count.toLocaleString('es-AR')}{' '}
                                {point.count === 1 ? 'pedido' : 'pedidos'}
                              </p>
                            </div>
                          )
                        }}
                      />
                      <Bar dataKey="count" name="Pedidos" radius={[5, 5, 0, 0]} maxBarSize={22}>
                        {hourlyData.map((item) => (
                          <Cell
                            key={item.hour}
                            fill={
                              item.hour === peakHour.hour && item.count > 0
                                ? 'var(--clr-accent)'
                                : '#b8cfc0'
                            }
                            fillOpacity={item.count === 0 ? 0.28 : 1}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                    {hourlyData.map((item) => {
                      const intensity =
                        item.count === 0
                          ? 0
                          : Math.max(1, Math.ceil((item.count / maxHourlyCount) * 4))
                      const cellColors = ['#f3f5f2', '#e1ebe3', '#c4d9c9', '#8fb79b', '#39745a']
                      const isPeak = item.hour === peakHour.hour && item.count > 0

                      return (
                        <div
                          key={item.hour}
                          tabIndex={0}
                          title={`${item.hourRange}: ${item.count} ${item.count === 1 ? 'pedido' : 'pedidos'}`}
                          aria-label={`${item.hourRange}: ${item.count} ${item.count === 1 ? 'pedido' : 'pedidos'}`}
                          className="group relative min-w-0 outline-none"
                        >
                          <div
                            className={`flex min-h-14.5 flex-col items-center justify-center gap-1 rounded-lg border px-1 py-2 transition-all group-hover:scale-[1.03] group-focus-visible:ring-2 group-focus-visible:ring-(--clr-accent) group-focus-visible:ring-offset-2 ${isPeak ? 'border-(--clr-accent) ring-1 ring-(--clr-accent)/20' : 'border-transparent'}`}
                            style={{ backgroundColor: cellColors[intensity] }}
                          >
                            <span
                              className={`text-[11px] font-semibold ${intensity >= 3 ? 'text-white' : 'text-gray-500'}`}
                            >
                              {item.hourLabel}
                            </span>
                            <span
                              className={`text-sm font-bold tabular-nums ${intensity >= 3 ? 'text-white' : 'text-gray-800'}`}
                            >
                              {item.count}
                            </span>
                          </div>
                          <div className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 hidden w-max -translate-x-1/2 rounded-lg bg-gray-900 px-3 py-2 text-left text-white shadow-lg group-hover:block group-focus:block">
                            <p className="text-[11px] font-medium text-gray-300">
                              {item.hourRange}
                            </p>
                            <p className="text-xs font-semibold">
                              {item.count.toLocaleString('es-AR')}{' '}
                              {item.count === 1 ? 'pedido' : 'pedidos'}
                            </p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 pt-4">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-gray-400">Menos actividad</span>
                      <div className="flex items-center gap-1">
                        {['#f3f5f2', '#e1ebe3', '#c4d9c9', '#8fb79b', '#39745a'].map((color) => (
                          <span
                            key={color}
                            className="h-3 w-3 rounded-sm"
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </div>
                      <span className="text-[11px] text-gray-400">Más</span>
                    </div>
                    <p className="text-xs text-gray-500">
                      Pico:{' '}
                      <span className="font-semibold text-(--clr-ink)">{peakHour.hourRange}</span>
                      <span className="ml-1 text-gray-400">
                        ({peakHour.count} {peakHour.count === 1 ? 'pedido' : 'pedidos'})
                      </span>
                    </p>
                  </div>
                </div>
              )}
            </>
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
