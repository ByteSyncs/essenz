import { Fragment, useCallback, useEffect, useMemo, useState } from 'react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { CalendarDays, Clock3, Package, RefreshCw, Search, ShoppingBag } from 'lucide-react'
import { getArgentinaDate, summarizeSales } from '../../../../libs/salesReport'
import type { SalesReport, SalesTicket } from '../../../../types/sales'

const PAYMENT_LABELS: Record<string, string> = {
  cash: 'Efectivo',
  debit: 'Débito',
  credit: 'Crédito',
  mercadopago: 'Mercado Pago',
  virtual: 'Virtual',
  other: 'Otros',
}

const ERROR_MESSAGES: Record<string, string> = {
  unauthorized: 'Tu sesión venció. Volvé a ingresar.',
  access_revoked: 'Ya no tenés acceso a esta sucursal.',
  invalid_date: 'Elegí una fecha válida.',
  invalid_hour_range: 'Revisá el horario: la hora inicial debe ser anterior a la hora final.',
  report_too_large:
    'El período tiene demasiados pedidos para mostrar. Elegí un horario más acotado.',
  internal_server_error: 'No pudimos cargar las ventas. Intentá nuevamente.',
}

const HOURS = Array.from({ length: 24 }, (_, hour) => hour)

function formatAmount(amount: number) {
  return `$ ${amount.toLocaleString('es-AR', { maximumFractionDigits: 2 })}`
}

function formatHour(hour: number) {
  return `${String(hour).padStart(2, '0')}:00`
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('es-AR', {
    timeZone: 'America/Argentina/Buenos_Aires',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(new Date(value))
}

function ticketPayments(ticket: SalesTicket) {
  return ticket.payments.map((payment) => ({
    ...payment,
    label: PAYMENT_LABELS[payment.method] ?? payment.method,
  }))
}

function SummaryValue({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="min-w-0 border-b border-gray-200 pb-4 sm:border-b-0 sm:pb-0">
      <dt className="text-sm text-gray-600">{label}</dt>
      <dd className="mt-1 break-words text-2xl font-semibold leading-tight tracking-[-0.03em] tabular-nums text-gray-950">
        {value}
      </dd>
      <p className="mt-1 text-xs leading-5 text-gray-600">{detail}</p>
    </div>
  )
}

function LoadingReport() {
  return (
    <div className="animate-pulse space-y-8 p-5 sm:p-8" aria-label="Cargando ventas" role="status">
      <div className="h-8 w-40 bg-gray-200" />
      <div className="grid gap-6 border-y border-gray-200 py-6 sm:grid-cols-4">
        {[0, 1, 2, 3].map((item) => (
          <div key={item} className="space-y-3">
            <div className="h-4 w-24 bg-gray-200" />
            <div className="h-8 w-32 bg-gray-200" />
          </div>
        ))}
      </div>
      <div className="h-72 bg-gray-100" />
      <div className="h-64 bg-gray-100" />
      <span className="sr-only">Cargando ventas...</span>
    </div>
  )
}

export default function SalesView({ slug }: { slug: string; isOwner: boolean }) {
  const [date, setDate] = useState(getArgentinaDate)
  const [fromHour, setFromHour] = useState('0')
  const [throughHour, setThroughHour] = useState('23')
  const [search, setSearch] = useState('')
  const [report, setReport] = useState<SalesReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshVersion, setRefreshVersion] = useState(0)

  const retry = useCallback(() => setRefreshVersion((version) => version + 1), [])

  useEffect(() => {
    const controller = new AbortController()
    const from = Number(fromHour)
    const through = Number(throughHour)

    if (from > through) {
      setLoading(false)
      setError(ERROR_MESSAGES.invalid_hour_range)
      return () => controller.abort()
    }

    async function loadSales() {
      setLoading(true)
      setError(null)
      setReport(null)

      try {
        const query = new URLSearchParams({
          date,
          from: fromHour,
          to: throughHour,
        })
        const response = await fetch(`/api/organizations/${slug}/sales?${query}`, {
          credentials: 'include',
          signal: controller.signal,
        })
        const result: unknown = await response.json().catch(() => null)

        if (!result || typeof result !== 'object' || !('success' in result)) {
          throw new Error(ERROR_MESSAGES.internal_server_error)
        }

        const body = result as { success: boolean; data?: SalesReport; error?: string }
        if (!response.ok || !body.success || !body.data) {
          throw new Error(ERROR_MESSAGES[body.error ?? ''] ?? ERROR_MESSAGES.internal_server_error)
        }
        setReport(body.data)
      } catch (reason) {
        if (controller.signal.aborted) return
        setError(
          reason instanceof Error && Object.values(ERROR_MESSAGES).includes(reason.message)
            ? reason.message
            : 'No pudimos conectar con el servidor. Revisá tu conexión e intentá nuevamente.',
        )
        setReport(null)
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }

    void loadSales()
    return () => controller.abort()
  }, [slug, date, fromHour, throughHour, refreshVersion])

  const filteredTickets = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('es-AR')
    return (report?.tickets ?? [])
      .map((ticket) => ({
        ...ticket,
        items: query
          ? ticket.items.filter((item) => item.name.toLocaleLowerCase('es-AR').includes(query))
          : ticket.items,
      }))
      .filter((ticket) => ticket.items.length > 0)
  }, [report, search])

  const summary = useMemo(() => summarizeSales(filteredTickets), [filteredTickets])
  const productAmount = summary.products.reduce((total, product) => total + product.amount, 0)
  const paymentMethods = summary.paymentMethods
  const maxPaymentAmount = Math.max(1, ...paymentMethods.map((payment) => payment.amount))
  const hasSales = filteredTickets.length > 0

  if (loading && !report) return <LoadingReport />

  return (
    <div className="min-h-full space-y-8 p-5 sm:p-8">
      <header className="flex flex-col gap-5 border-b border-gray-200 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-[-0.03em] text-gray-950">Ventas</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-600">
            Productos vendidos, horarios y cobros de esta sucursal.
          </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <label htmlFor="sales-date" className="sr-only">
            Día de ventas
          </label>
          <div className="relative min-w-0">
            <CalendarDays
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500"
              aria-hidden="true"
            />
            <input
              id="sales-date"
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
              className="min-h-11 border border-gray-300 bg-white py-2 pl-9 pr-3 text-sm font-medium text-gray-900 focus:border-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900/15"
            />
          </div>
          <button
            type="button"
            onClick={retry}
            disabled={loading}
            className="inline-flex min-h-11 min-w-11 items-center justify-center border border-gray-300 bg-white text-gray-700 transition-colors hover:bg-gray-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-900 disabled:cursor-wait disabled:opacity-50"
            aria-label="Actualizar ventas"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" />
          </button>
        </div>
      </header>

      <section
        className="flex flex-col gap-4 border-b border-gray-200 pb-6 md:flex-row md:items-end md:justify-between"
        aria-label="Filtros de ventas"
      >
        <div className="flex flex-wrap items-end gap-3">
          <label className="grid gap-1.5 text-xs font-semibold text-gray-700">
            Desde
            <select
              value={fromHour}
              onChange={(event) => setFromHour(event.target.value)}
              className="min-h-11 min-w-28 border border-gray-300 bg-white px-3 text-sm text-gray-900 focus:border-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900/15"
            >
              {HOURS.map((hour) => (
                <option key={hour} value={hour}>
                  {formatHour(hour)}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1.5 text-xs font-semibold text-gray-700">
            Hasta
            <select
              value={throughHour}
              onChange={(event) => setThroughHour(event.target.value)}
              className="min-h-11 min-w-28 border border-gray-300 bg-white px-3 text-sm text-gray-900 focus:border-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900/15"
            >
              {HOURS.map((hour) => (
                <option key={hour} value={hour}>
                  {formatHour(hour)}
                </option>
              ))}
            </select>
          </label>
          <p className="pb-3 text-xs leading-5 text-gray-600">
            La hora final incluye esa hora completa.
          </p>
        </div>
        <label className="relative block w-full md:max-w-sm">
          <span className="sr-only">Buscar producto</span>
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500"
            aria-hidden="true"
          />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar un producto"
            className="min-h-11 w-full border border-gray-300 bg-white py-2 pl-9 pr-3 text-sm text-gray-900 placeholder:text-gray-500 focus:border-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900/15"
          />
        </label>
      </section>

      {error && (
        <div
          role="alert"
          className="flex flex-col gap-3 border border-red-200 bg-red-50 p-4 text-sm text-red-900 sm:flex-row sm:items-center sm:justify-between"
        >
          <p>{error}</p>
          <button
            type="button"
            onClick={retry}
            className="min-h-10 self-start border border-red-300 bg-white px-4 font-semibold text-red-900 hover:bg-red-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-900"
          >
            Reintentar
          </button>
        </div>
      )}

      {loading && report && (
        <p role="status" className="text-sm text-gray-600">
          Actualizando el reporte...
        </p>
      )}

      {!error && (
        <>
          <dl className="grid gap-5 border-y border-gray-200 py-5 sm:grid-cols-2 sm:gap-6 lg:grid-cols-4">
            <SummaryValue
              label="Unidades vendidas"
              value={summary.units.toLocaleString('es-AR')}
              detail={`${summary.products.length} productos distintos`}
            />
            <SummaryValue
              label="Importe en productos"
              value={formatAmount(productAmount)}
              detail="Antes de descuentos generales del ticket"
            />
            <SummaryValue
              label="Venta neta"
              value={formatAmount(summary.sales)}
              detail="Total de tickets que contienen los productos filtrados"
            />
            <SummaryValue
              label="Tickets"
              value={summary.tickets.toLocaleString('es-AR')}
              detail="Pedidos con productos en el filtro"
            />
          </dl>

          {!hasSales ? (
            <section className="flex min-h-64 flex-col items-center justify-center border border-dashed border-gray-300 px-5 py-12 text-center">
              <ShoppingBag className="h-8 w-8 text-gray-400" aria-hidden="true" />
              <h2 className="mt-4 text-base font-semibold text-gray-900">
                {search ? 'No encontramos ese producto' : 'No hay ventas en este horario'}
              </h2>
              <p className="mt-2 max-w-md text-sm leading-6 text-gray-600">
                {search
                  ? 'Probá con otro nombre o limpiá la búsqueda para volver a ver todos los productos.'
                  : 'Elegí otro día u horario para consultar los tickets registrados en esta sucursal.'}
              </p>
            </section>
          ) : (
            <>
              <section className="grid min-w-0 gap-8 xl:grid-cols-[minmax(0,1.35fr)_minmax(18rem,0.65fr)]">
                <div className="min-w-0 border-b border-gray-200 pb-6 xl:border-b-0 xl:border-r xl:pb-0 xl:pr-8">
                  <div className="mb-5 flex items-start gap-3">
                    <Clock3
                      className="mt-0.5 h-5 w-5 shrink-0 text-(--clr-ink)"
                      aria-hidden="true"
                    />
                    <div>
                      <h2 className="text-base font-semibold text-gray-950">Unidades por hora</h2>
                      <p className="mt-1 text-sm leading-5 text-gray-600">
                        Cantidad de productos en tickets no anulados.
                      </p>
                    </div>
                  </div>
                  <div className="lg:hidden">
                    <div className="mb-2 grid grid-cols-[1fr_auto] gap-4 border-b border-gray-200 pb-2 text-xs font-medium text-gray-600">
                      <span>Horario</span>
                      <span>Unidades</span>
                    </div>
                    <ul className="divide-y divide-gray-100">
                      {summary.hourly
                        .filter((entry) => entry.units > 0)
                        .map((entry) => (
                          <li
                            key={entry.hour}
                            className="grid min-h-11 grid-cols-[1fr_auto] items-center gap-4 py-2 text-sm"
                          >
                            <span className="font-medium tabular-nums text-gray-800">
                              {formatHour(entry.hour)}–{formatHour((entry.hour + 1) % 24)}
                            </span>
                            <span className="tabular-nums text-gray-900">
                              {entry.units.toLocaleString('es-AR')}
                            </span>
                          </li>
                        ))}
                    </ul>
                    <p className="mt-3 text-xs leading-5 text-gray-600">
                      Se muestran las horas que registraron ventas.
                    </p>
                  </div>
                  <div
                    className="hidden h-64 w-full min-w-0 lg:block"
                    role="img"
                    aria-label="Gráfico de unidades vendidas por hora"
                  >
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={summary.hourly}
                        margin={{ top: 8, right: 8, left: -22, bottom: 0 }}
                      >
                        <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis
                          dataKey="hour"
                          tickFormatter={(hour: number) => `${String(hour).padStart(2, '0')} h`}
                          interval={2}
                          axisLine={false}
                          tickLine={false}
                          tick={{ fontSize: 11, fill: '#4b5563' }}
                          tickMargin={10}
                        />
                        <YAxis
                          allowDecimals={false}
                          axisLine={false}
                          tickLine={false}
                          tick={{ fontSize: 11, fill: '#4b5563' }}
                        />
                        <Tooltip
                          labelFormatter={(hour) =>
                            `${formatHour(Number(hour))}–${formatHour((Number(hour) + 1) % 24)}`
                          }
                          formatter={(value) => [
                            Number(value ?? 0).toLocaleString('es-AR'),
                            'Unidades',
                          ]}
                          contentStyle={{ border: '1px solid #d1d5db', borderRadius: 0 }}
                        />
                        <Bar
                          dataKey="units"
                          name="Unidades"
                          fill="var(--clr-accent)"
                          maxBarSize={28}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="min-w-0">
                  <div className="mb-5 flex items-start gap-3">
                    <Package
                      className="mt-0.5 h-5 w-5 shrink-0 text-(--clr-ink)"
                      aria-hidden="true"
                    />
                    <div>
                      <h2 className="text-base font-semibold text-gray-950">Medios de pago</h2>
                      <p className="mt-1 text-sm leading-5 text-gray-600">
                        Importes registrados para cada medio a nivel de ticket.
                      </p>
                    </div>
                  </div>
                  {paymentMethods.length === 0 ? (
                    <p className="py-6 text-sm text-gray-600">No hay medios de pago registrados.</p>
                  ) : (
                    <ul className="space-y-5">
                      {paymentMethods.map((payment) => (
                        <li key={payment.method} className="min-w-0">
                          <div className="flex items-baseline justify-between gap-3">
                            <span className="truncate text-sm font-medium text-gray-800">
                              {PAYMENT_LABELS[payment.method] ?? payment.method}
                            </span>
                            <span className="shrink-0 text-sm font-semibold tabular-nums text-gray-950">
                              {formatAmount(payment.amount)}
                            </span>
                          </div>
                          <div
                            className="mt-2 h-2 overflow-hidden bg-gray-100"
                            role="img"
                            aria-label={`${PAYMENT_LABELS[payment.method] ?? payment.method}: ${formatAmount(payment.amount)}`}
                          >
                            <div
                              className="h-full bg-(--clr-accent)"
                              style={{
                                width: `${Math.max(0, (payment.amount / maxPaymentAmount) * 100)}%`,
                              }}
                            />
                          </div>
                          <p className="mt-1 text-xs tabular-nums text-gray-600">
                            {payment.tickets.toLocaleString('es-AR')}{' '}
                            {payment.tickets === 1 ? 'ticket' : 'tickets'}
                          </p>
                        </li>
                      ))}
                    </ul>
                  )}
                  <p className="mt-6 border-t border-gray-200 pt-4 text-xs leading-5 text-gray-600">
                    Si un ticket se pagó con varios medios, estos importes corresponden al ticket
                    completo, no a un producto individual.
                  </p>
                </div>
              </section>

              <section>
                <div className="mb-4 flex items-end justify-between gap-3 border-b border-gray-200 pb-3">
                  <div>
                    <h2 className="text-base font-semibold text-gray-950">Productos vendidos</h2>
                    <p className="mt-1 text-sm leading-5 text-gray-600">
                      Importe por producto calculado con su precio registrado y cantidad.
                    </p>
                  </div>
                  <span className="shrink-0 text-sm tabular-nums text-gray-600">
                    {summary.products.length.toLocaleString('es-AR')} productos
                  </span>
                </div>
                <ul className="divide-y divide-gray-100 lg:hidden">
                  {summary.products.map((product) => (
                    <li key={product.key} className="py-3">
                      <div className="flex min-w-0 items-baseline justify-between gap-3">
                        <h3 className="min-w-0 break-words text-sm font-medium text-gray-900">
                          {product.name}
                        </h3>
                        <p className="shrink-0 text-sm font-medium tabular-nums text-gray-900">
                          {formatAmount(product.amount)}
                        </p>
                      </div>
                      <dl className="mt-2 grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1 text-xs leading-5">
                        <dt className="text-gray-600">Unidades</dt>
                        <dd className="tabular-nums text-gray-800">
                          {product.units.toLocaleString('es-AR')}
                        </dd>
                        <dt className="text-gray-600">Medios de pago</dt>
                        <dd className="break-words text-gray-800">
                          {product.paymentMethods.length > 0
                            ? product.paymentMethods
                                .map((method) => PAYMENT_LABELS[method] ?? method)
                                .join(', ')
                            : 'Sin registrar'}
                        </dd>
                      </dl>
                    </li>
                  ))}
                </ul>
                <div className="hidden overflow-x-auto lg:block">
                  <table className="w-full min-w-[40rem] border-collapse text-left text-sm">
                    <thead>
                      <tr className="border-b border-gray-200 text-xs font-semibold text-gray-600">
                        <th scope="col" className="py-3 pr-4">
                          Producto
                        </th>
                        <th scope="col" className="py-3 pr-4 text-right">
                          Unidades
                        </th>
                        <th scope="col" className="py-3 pr-4 text-right">
                          Medios de pago
                        </th>
                        <th scope="col" className="py-3 text-right">
                          Importe
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {summary.products.map((product) => (
                        <tr key={product.key} className="border-b border-gray-100">
                          <th
                            scope="row"
                            className="max-w-64 truncate py-3 pr-4 font-medium text-gray-900"
                          >
                            {product.name}
                          </th>
                          <td className="py-3 pr-4 text-right tabular-nums text-gray-800">
                            {product.units.toLocaleString('es-AR')}
                          </td>
                          <td className="py-3 pr-4 text-right text-gray-600">
                            {product.paymentMethods.length > 0
                              ? product.paymentMethods
                                  .map((method) => PAYMENT_LABELS[method] ?? method)
                                  .join(', ')
                              : 'Sin registrar'}
                          </td>
                          <td className="py-3 text-right font-medium tabular-nums text-gray-900">
                            {formatAmount(product.amount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="mt-3 text-xs leading-5 text-gray-600">
                  Los medios corresponden a los tickets que incluyen cada producto; en pagos
                  divididos no se asigna un importe por producto. Los importes tampoco distribuyen
                  descuentos generales del ticket.
                </p>
              </section>

              <section>
                <div className="mb-4 flex flex-wrap items-baseline justify-between gap-3 border-b border-gray-200 pb-3">
                  <div>
                    <h2 className="text-base font-semibold text-gray-950">Detalle de tickets</h2>
                    <p className="mt-1 text-sm leading-5 text-gray-600">
                      Horario, productos, precios y medios de pago.
                    </p>
                  </div>
                  <span className="text-sm tabular-nums text-gray-600">
                    {filteredTickets.length.toLocaleString('es-AR')} tickets
                  </span>
                </div>
                <ul className="divide-y divide-gray-200">
                  {filteredTickets.map((ticket) => (
                    <li key={ticket.id} className="py-5">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold tabular-nums text-gray-950">
                            {formatDateTime(ticket.createdAt)} · Ticket {ticket.id.slice(0, 8)}
                          </p>
                          <ul className="mt-3 space-y-2">
                            {ticket.items.map((item, index) => (
                              <li
                                key={`${ticket.id}-${item.id ?? item.name}-${index}`}
                                className="flex min-w-0 flex-wrap items-baseline justify-between gap-x-4 gap-y-1 text-sm"
                              >
                                <span className="min-w-0 text-gray-800">
                                  <span className="font-medium">{item.name}</span>
                                  <span className="ml-2 text-gray-600">
                                    {item.qty} × {formatAmount(item.unitPrice)}
                                  </span>
                                </span>
                                <span className="shrink-0 font-medium tabular-nums text-gray-900">
                                  {formatAmount(item.lineTotal)}
                                </span>
                              </li>
                            ))}
                          </ul>
                          {ticket.discountAmount > 0 && (
                            <p className="mt-2 text-xs text-gray-600">
                              Descuento general del ticket: −{formatAmount(ticket.discountAmount)}
                            </p>
                          )}
                        </div>
                        <dl className="grid min-w-48 shrink-0 grid-cols-[1fr_auto] gap-x-4 gap-y-2 text-sm sm:text-right">
                          <dt className="text-gray-600">Venta</dt>
                          <dd className="font-medium tabular-nums text-gray-900">
                            {formatAmount(ticket.totalPrice)}
                          </dd>
                          {ticket.tipAmount > 0 && (
                            <>
                              <dt className="text-gray-600">
                                Propina
                                {ticket.tipPaymentMethod
                                  ? ` (${PAYMENT_LABELS[ticket.tipPaymentMethod] ?? ticket.tipPaymentMethod})`
                                  : ticket.tipIncludedInPayments && ticket.payments.length === 1
                                    ? ` (${PAYMENT_LABELS[ticket.payments[0].method] ?? ticket.payments[0].method})`
                                    : ''}
                              </dt>
                              <dd className="font-medium tabular-nums text-gray-900">
                                {formatAmount(ticket.tipAmount)}
                              </dd>
                            </>
                          )}
                          {ticketPayments(ticket).map((payment, index) => (
                            <Fragment key={`${ticket.id}-${payment.method}-${index}`}>
                              <dt className="border-t border-gray-100 pt-2 text-xs text-gray-600">
                                {payment.label}
                              </dt>
                              <dd className="border-t border-gray-100 pt-2 text-right text-xs font-medium tabular-nums text-gray-800">
                                {formatAmount(payment.amount)}
                              </dd>
                            </Fragment>
                          ))}
                        </dl>
                      </div>
                      {ticket.tipAmount > 0 &&
                        ticket.tipIncludedInPayments &&
                        ticket.payments.length > 1 &&
                        !ticket.tipPaymentMethod && (
                          <p
                            role="note"
                            className="mt-4 text-center text-xs leading-5 text-amber-800"
                          >
                            Medio de la propina sin identificar en este pago dividido.
                          </p>
                        )}
                    </li>
                  ))}
                </ul>
              </section>
            </>
          )}
        </>
      )}
    </div>
  )
}
