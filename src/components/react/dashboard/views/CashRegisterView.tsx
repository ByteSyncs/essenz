import { useCallback, useEffect, useMemo, useRef, useState, type SyntheticEvent } from 'react'
import {
  ArrowDownLeft,
  ArrowDownToLine,
  ArrowUpRight,
  Banknote,
  Ban,
  Clock3,
  History,
  LoaderCircle,
  Plus,
  ReceiptText,
  RefreshCw,
  ShieldCheck,
  TriangleAlert,
  Wallet,
} from 'lucide-react'
import {
  buildCashFeed,
  cashDifference,
  formatCashAmount,
  formatCashDate,
  formatCashMoment,
  formatCashTime,
  parseCashInput,
  splitPaymentTotals,
  type CashFeedEntry,
} from '../../../../libs/cashRegister'
import type {
  CashMovementType,
  CashRegisterData,
  CashRegisterMovement,
  CashRegisterSession,
  CashRegisterSummary,
} from '../../../../types/cashRegister'

const ERROR_MESSAGES: Record<string, string> = {
  unauthorized: 'Tu sesión venció. Volvé a ingresar.',
  access_revoked: 'Ya no tenés acceso a esta sucursal.',
  cash_register_already_open: 'Ya hay una caja abierta en esta sucursal. Actualizá la pantalla.',
  cash_register_not_open: 'La caja ya se cerró. Actualizá la pantalla antes de continuar.',
  cash_register_movement_not_found: 'No encontramos ese movimiento. Actualizá la pantalla.',
  cash_register_already_closed: 'Esta caja ya fue cerrada. Revisá el historial.',
  cash_register_not_found: 'No encontramos esa caja en esta sucursal.',
  cash_difference_reason_required: 'Indicá el motivo de la diferencia para confirmar el cierre.',
  invalid_amount: 'Ingresá un importe válido, de hasta $100.000.000.',
  invalid_description: 'Escribí una descripción para el movimiento.',
  invalid_movement_type: 'Elegí un tipo de movimiento válido.',
  invalid_text: 'Revisá los campos de texto: alguno supera el límite permitido.',
  invalid_session: 'No pudimos identificar la caja. Actualizá la pantalla.',
  internal_server_error: 'No pudimos completar la operación. Intentá nuevamente.',
}

const EXPENSE_CATEGORIES: Record<string, string> = {
  supplies: 'Insumos',
  maintenance: 'Mantenimiento',
  utilities: 'Servicios',
  staff: 'Personal',
  other: 'Otros',
}

const PAYMENT_METHODS: Record<string, string> = {
  cash: 'Efectivo',
  debit: 'Débito',
  credit: 'Crédito',
  mercadopago: 'Mercado Pago',
  mp: 'Mercado Pago',
  virtual: 'Virtual',
  other: 'Otros',
}

const MOVEMENT_LABELS: Record<CashMovementType, string> = {
  cash_in: 'Ingreso de efectivo',
  cash_out: 'Egreso de efectivo',
  safe_drop: 'Retiro a caja fuerte',
}

function readErrorMessage(value: unknown) {
  if (!value || typeof value !== 'object' || !('error' in value)) {
    return ERROR_MESSAGES.internal_server_error
  }
  const code = String(value.error)
  return ERROR_MESSAGES[code] ?? ERROR_MESSAGES.internal_server_error
}

function friendlyErrorMessage(error: unknown) {
  if (error instanceof Error && Object.values(ERROR_MESSAGES).includes(error.message)) {
    return error.message
  }
  return 'No pudimos conectar con el servidor. Revisá tu conexión e intentá nuevamente.'
}

async function postJson(url: string, payload: Record<string, unknown>) {
  const response = await fetch(url, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const result: unknown = await response.json().catch(() => null)

  if (!response.ok || !result || typeof result !== 'object' || !('success' in result)) {
    throw new Error(readErrorMessage(result))
  }
  if (result.success !== true) throw new Error(readErrorMessage(result))
  return result
}

async function deleteJson(url: string) {
  const response = await fetch(url, { method: 'DELETE', credentials: 'include' })
  const result: unknown = await response.json().catch(() => null)

  if (!response.ok || !result || typeof result !== 'object' || !('success' in result)) {
    throw new Error(readErrorMessage(result))
  }
  if (result.success !== true) throw new Error(readErrorMessage(result))
  return result
}

function amountDifferenceLabel(value: number) {
  if (value === 0) return 'Caja cuadrada'
  return value > 0 ? 'Sobrante' : 'Faltante'
}

function differenceTone(value: number) {
  if (value === 0) return 'text-emerald-800'
  return value > 0 ? 'text-amber-800' : 'text-rose-800'
}

function cashMovementSign(movement: CashRegisterMovement) {
  return movement.type === 'cash_in' ? 1 : -1
}

function LoadingView() {
  return (
    <div className="space-y-8 px-5 py-7 sm:px-8 sm:py-9" role="status" aria-label="Cargando caja">
      <div className="h-9 w-48 animate-pulse bg-gray-100" />
      <div className="h-52 animate-pulse bg-gray-100" />
      <div className="grid gap-6 md:grid-cols-2">
        <div className="h-60 animate-pulse bg-gray-100" />
        <div className="h-60 animate-pulse bg-gray-100" />
      </div>
    </div>
  )
}

function AmountInput({
  id,
  label,
  value,
  onChange,
  required = false,
  help,
}: {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  required?: boolean
  help?: string
}) {
  return (
    <label htmlFor={id} className="block min-w-0 text-sm font-medium text-gray-800">
      {label}
      <span className="mt-1.5 flex min-h-12 items-center border border-gray-300 bg-white px-3 focus-within:border-(--clr-ink) focus-within:ring-2 focus-within:ring-(--clr-ink)/15">
        <span className="mr-2 shrink-0 text-gray-500">$</span>
        <input
          id={id}
          type="text"
          inputMode="decimal"
          required={required}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="min-w-0 flex-1 border-0 bg-transparent text-base tabular-nums text-gray-950 outline-none placeholder:text-gray-500"
          placeholder="0,00"
        />
      </span>
      {help && (
        <span className="mt-1 block text-xs font-normal leading-5 text-gray-600">{help}</span>
      )}
    </label>
  )
}

function NameInput({
  id,
  value,
  onChange,
  label = 'Nombre (opcional)',
}: {
  id: string
  value: string
  onChange: (value: string) => void
  label?: string
}) {
  return (
    <label htmlFor={id} className="block min-w-0 text-sm font-medium text-gray-800">
      {label}
      <input
        id={id}
        type="text"
        autoComplete="name"
        maxLength={80}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1.5 min-h-12 w-full min-w-0 border border-gray-300 bg-white px-3 text-base text-gray-950 outline-none placeholder:text-gray-500 focus:border-(--clr-ink) focus:ring-2 focus:ring-(--clr-ink)/15"
        placeholder="Quién realiza la operación"
      />
    </label>
  )
}

function TextArea({
  id,
  label,
  value,
  onChange,
  maxLength = 500,
  required = false,
}: {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  maxLength?: number
  required?: boolean
}) {
  return (
    <label htmlFor={id} className="block min-w-0 text-sm font-medium text-gray-800">
      {label}
      <textarea
        id={id}
        rows={3}
        maxLength={maxLength}
        required={required}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1.5 min-h-20 w-full min-w-0 resize-y border border-gray-300 bg-white px-3 py-2.5 text-base leading-6 text-gray-950 outline-none placeholder:text-gray-500 focus:border-(--clr-ink) focus:ring-2 focus:ring-(--clr-ink)/15"
        placeholder="Agregá un detalle para el historial"
      />
    </label>
  )
}

function SectionTitle({
  icon,
  title,
  detail,
}: {
  icon: React.ReactNode
  title: string
  detail?: string
}) {
  return (
    <div className="mb-5 flex min-w-0 items-start gap-3">
      <span className="mt-0.5 shrink-0 text-(--clr-ink)" aria-hidden="true">
        {icon}
      </span>
      <div className="min-w-0">
        <h2 className="text-lg font-semibold leading-6 tracking-[-0.01em] text-gray-950">
          {title}
        </h2>
        {detail && <p className="mt-1 text-sm leading-5 text-gray-600">{detail}</p>}
      </div>
    </div>
  )
}

function CashHero({
  summary,
  openingAmount,
}: {
  summary: CashRegisterSummary
  openingAmount: number
}) {
  const cashSales = summary.paymentMethods.find((payment) => payment.method === 'cash')?.amount ?? 0
  const averageTicket =
    summary.ticketCount > 0 ? Math.round(summary.netSales / summary.ticketCount) : 0
  const ledger = [
    { label: 'Fondo inicial', value: openingAmount, sign: 1 },
    { label: 'Ventas en efectivo', value: cashSales, sign: 1 },
    { label: 'Ingresos manuales', value: summary.movements.cashIn, sign: 1 },
    { label: 'Egresos', value: summary.movements.cashOut, sign: -1 },
    { label: 'Retiros a caja fuerte', value: summary.movements.safeDrop, sign: -1 },
    { label: 'Gastos pagados desde caja', value: summary.cashExpenses, sign: -1 },
  ]
  const stats = [
    { label: 'Ventas netas', value: formatCashAmount(summary.netSales), strong: true },
    { label: 'Ventas brutas', value: formatCashAmount(summary.grossSales) },
    {
      label: 'Tickets',
      value: summary.ticketCount.toLocaleString('es-AR'),
      detail:
        summary.cancelledTicketCount > 0
          ? `${summary.cancelledTicketCount.toLocaleString('es-AR')} ${
              summary.cancelledTicketCount === 1 ? 'anulado' : 'anulados'
            }`
          : undefined,
    },
    { label: 'Ticket promedio', value: formatCashAmount(averageTicket) },
    { label: 'Descuentos', value: formatCashAmount(summary.discounts) },
    { label: 'Propinas', value: formatCashAmount(summary.tips) },
  ]

  return (
    <>
      <section
        aria-label="Resumen de la caja"
        className="grid min-w-0 gap-6 border border-gray-200 bg-white p-5 sm:p-7 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]"
      >
        <div className="min-w-0 border-b border-gray-200 pb-5 lg:border-b-0 lg:border-r lg:pb-0 lg:pr-7">
          <div className="flex items-start gap-3">
            <Wallet className="mt-1 h-5 w-5 shrink-0 text-(--clr-ink)" aria-hidden="true" />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-700">Efectivo esperado en caja</p>
              <p className="mt-2 [overflow-wrap:anywhere] text-4xl font-semibold leading-tight tracking-[-0.03em] tabular-nums text-gray-950 sm:text-5xl">
                {formatCashAmount(summary.cashExpected)}
              </p>
            </div>
          </div>
          <dl className="mt-6 grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-2.5 text-sm sm:max-w-lg">
            {ledger.map((row) => (
              <div key={row.label} className="col-span-2 grid grid-cols-subgrid">
                <dt className={`min-w-0 ${row.value === 0 ? 'text-gray-500' : 'text-gray-700'}`}>
                  {row.label}
                </dt>
                <dd
                  className={`text-right font-medium tabular-nums ${
                    row.value === 0 ? 'text-gray-500' : 'text-gray-950'
                  }`}
                >
                  {row.value === 0 ? '' : row.sign > 0 ? '+' : '−'}
                  {formatCashAmount(row.value)}
                </dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="grid min-w-0 grid-cols-2 content-start gap-x-4 gap-y-6">
          {stats.map((stat) => (
            <div key={stat.label} className="min-w-0">
              <p className="text-sm text-gray-600">{stat.label}</p>
              <p
                className={`mt-1 [overflow-wrap:anywhere] font-semibold tabular-nums text-gray-950 ${
                  stat.strong ? 'text-xl' : 'text-base'
                }`}
              >
                {stat.value}
              </p>
              {stat.detail && <p className="mt-0.5 text-xs text-gray-600">{stat.detail}</p>}
            </div>
          ))}
          <p className="col-span-2 text-xs leading-5 text-gray-600">
            Las propinas van al medio de pago elegido en el pedido (efectivo si no se indicó) y no
            se suman a las ventas netas.
          </p>
        </div>
      </section>

      {summary.cashTipAmbiguity > 0 && (
        <p
          role="note"
          className="flex min-w-0 items-start gap-3 border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950"
        >
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span className="min-w-0">
            Hay {formatCashAmount(summary.cashTipAmbiguity)} en propinas de pedidos con pago
            dividido que incluyen efectivo. El sistema no permite atribuirlas a un medio; revisá
            este dato al comparar el efectivo físico.
          </span>
        </p>
      )}
    </>
  )
}

function PaymentsCard({ summary }: { summary: CashRegisterSummary }) {
  const { cash, electronic } = splitPaymentTotals(summary.paymentMethods)
  const payments = useMemo(() => {
    const maxAmount = Math.max(...summary.paymentMethods.map((payment) => payment.amount), 1)

    return [...summary.paymentMethods]
      .sort((a, b) => b.amount - a.amount)
      .map((payment) => ({
        ...payment,
        label: PAYMENT_METHODS[payment.method] ?? payment.method,
        barWidth: Math.max(0, (payment.amount / maxAmount) * 100),
      }))
  }, [summary.paymentMethods])

  return (
    <section className="min-w-0 border border-gray-200 bg-white p-5 sm:p-6">
      <SectionTitle
        icon={<ReceiptText className="h-5 w-5" />}
        title="Cobrado por medio de pago"
        detail="Importes del turno, con las propinas asignadas incluidas."
      />
      <dl className="grid grid-cols-2 gap-4 border-b border-gray-200 pb-5">
        <div className="min-w-0">
          <dt className="flex items-center gap-2 text-sm text-gray-600">
            <span className="h-2 w-2 shrink-0 bg-(--clr-ink)" aria-hidden="true" />
            Efectivo físico
          </dt>
          <dd className="mt-1 [overflow-wrap:anywhere] text-xl font-semibold tabular-nums text-gray-950">
            {formatCashAmount(cash)}
          </dd>
        </div>
        <div className="min-w-0">
          <dt className="flex items-center gap-2 text-sm text-gray-600">
            <span className="h-2 w-2 shrink-0 bg-(--clr-accent)" aria-hidden="true" />
            Electrónico
          </dt>
          <dd className="mt-1 [overflow-wrap:anywhere] text-xl font-semibold tabular-nums text-gray-950">
            {formatCashAmount(electronic)}
          </dd>
        </div>
      </dl>
      {payments.length === 0 ? (
        <p className="py-5 text-sm text-gray-600">Todavía no hay pagos en este turno.</p>
      ) : (
        <ul className="mt-5 space-y-5">
          {payments.map((payment) => (
            <li key={payment.method} className="min-w-0">
              <div className="flex min-w-0 items-baseline justify-between gap-3">
                <span className="min-w-0 truncate text-sm font-medium text-gray-800">
                  {payment.label}
                </span>
                <span className="shrink-0 text-sm font-semibold tabular-nums text-gray-950">
                  {formatCashAmount(payment.amount)}
                </span>
              </div>
              <div
                className="mt-2 h-2 overflow-hidden bg-gray-100"
                role="img"
                aria-label={`${payment.label}: ${formatCashAmount(payment.amount)}`}
              >
                <div
                  className={`h-full ${payment.method === 'cash' ? 'bg-(--clr-ink)' : 'bg-(--clr-accent)'}`}
                  style={{ width: `${payment.barWidth}%` }}
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
      {summary.paymentMethods.some((payment) => payment.method === 'virtual') && (
        <p className="mt-5 border-t border-gray-200 pt-4 text-xs leading-5 text-gray-600">
          “Virtual” es la categoría que guarda el sistema hoy; no permite distinguir transferencias
          de pagos QR.
        </p>
      )}
    </section>
  )
}

const FEED_VISIBLE = 6

function CashFeed({
  entries,
  onVoid,
  voidingMovementId,
  isBusy = false,
  emptyMessage,
  limit = FEED_VISIBLE,
}: {
  entries: CashFeedEntry[]
  onVoid?: (movementId: string) => Promise<boolean>
  voidingMovementId?: string | null
  isBusy?: boolean
  emptyMessage: string
  limit?: number
}) {
  const [confirmingMovementId, setConfirmingMovementId] = useState<string | null>(null)
  const [expanded, setExpanded] = useState(false)

  if (entries.length === 0) {
    return <p className="py-4 text-sm leading-6 text-gray-600">{emptyMessage}</p>
  }

  const visible = expanded ? entries : entries.slice(0, limit)
  const hidden = entries.length - visible.length

  return (
    <>
      <ul className="divide-y divide-gray-200">
        {visible.map((entry) => {
          if (entry.kind === 'expense') {
            const { expense } = entry
            return (
              <li
                key={entry.id}
                className="flex min-w-0 flex-wrap items-start gap-x-3 gap-y-1 py-3.5 first:pt-1"
              >
                <span
                  className="flex h-8 w-8 items-center justify-center bg-amber-50 text-amber-900"
                  aria-hidden="true"
                >
                  <ReceiptText className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1 basis-40">
                  <p className="[overflow-wrap:anywhere] text-sm font-medium text-gray-900">
                    {expense.description}
                  </p>
                  <p className="mt-0.5 [overflow-wrap:anywhere] text-xs leading-5 text-gray-600">
                    Gasto · {EXPENSE_CATEGORIES[expense.category] ?? 'Otros'} ·{' '}
                    {formatCashMoment(expense.createdAt)}
                  </p>
                </div>
                <span className="ml-auto pl-2 text-right text-sm font-semibold tabular-nums text-gray-950">
                  −{formatCashAmount(expense.amount)}
                </span>
              </li>
            )
          }

          const { movement } = entry
          const sign = cashMovementSign(movement)
          const Icon =
            movement.type === 'safe_drop'
              ? ArrowDownToLine
              : sign > 0
                ? ArrowDownLeft
                : ArrowUpRight
          const label = MOVEMENT_LABELS[movement.type]
          const showLabel = movement.description.trim().toLowerCase() !== label.toLowerCase()
          const voided = Boolean(movement.voidedAt)
          const canVoid = Boolean(onVoid) && !voided

          return (
            <li
              key={entry.id}
              className="flex min-w-0 flex-wrap items-start gap-x-3 gap-y-1 py-3.5 first:pt-1"
            >
              <span
                className={`flex h-8 w-8 items-center justify-center ${
                  voided
                    ? 'bg-gray-100 text-gray-500'
                    : sign > 0
                      ? 'bg-emerald-50 text-emerald-900'
                      : 'bg-gray-100 text-gray-800'
                }`}
                aria-hidden="true"
              >
                <Icon className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1 basis-40">
                <p
                  className={`[overflow-wrap:anywhere] text-sm font-medium ${voided ? 'text-gray-500' : 'text-gray-900'}`}
                >
                  {movement.description}
                </p>
                <p className="mt-0.5 [overflow-wrap:anywhere] text-xs leading-5 text-gray-600">
                  {showLabel ? `${label} · ` : ''}
                  {formatCashMoment(movement.createdAt)}
                  {movement.createdByName ? ` · ${movement.createdByName}` : ''}
                  {canVoid && confirmingMovementId !== movement.id && (
                    <>
                      {' · '}
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => setConfirmingMovementId(movement.id)}
                        className="-my-2.5 inline-flex min-h-9 items-center gap-1 px-1.5 -mx-1.5 align-middle font-medium text-gray-700 underline underline-offset-4 hover:text-rose-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--clr-ink) disabled:opacity-60"
                        aria-label={`Anular ${label.toLowerCase()} de ${formatCashAmount(movement.amount)}: ${movement.description}`}
                      >
                        <Ban className="h-3 w-3" aria-hidden="true" />
                        Anular
                      </button>
                    </>
                  )}
                </p>
                {voided && movement.voidedAt && (
                  <p className="mt-0.5 text-xs font-medium text-rose-800">
                    Anulado · {formatCashMoment(movement.voidedAt)}
                  </p>
                )}
                {movement.note && (
                  <p className="mt-1 [overflow-wrap:anywhere] text-xs leading-5 text-gray-600">
                    {movement.note}
                  </p>
                )}
                {canVoid && confirmingMovementId === movement.id && (
                  <div className="mt-2 flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2">
                    <p className="w-full text-xs leading-5 text-gray-700">
                      Se excluirá del efectivo esperado y quedará marcado en el historial.
                    </p>
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={async () => {
                        if (onVoid && (await onVoid(movement.id))) setConfirmingMovementId(null)
                      }}
                      className="inline-flex min-h-11 items-center gap-2 border border-rose-300 px-3 text-xs font-semibold text-rose-900 hover:bg-rose-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-800 disabled:cursor-not-allowed disabled:opacity-60 active:scale-[0.98]"
                    >
                      {voidingMovementId === movement.id && (
                        <LoaderCircle className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                      )}
                      Confirmar anulación
                    </button>
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => setConfirmingMovementId(null)}
                      className="min-h-11 px-2 text-xs font-medium text-gray-700 underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--clr-ink)"
                    >
                      Cancelar
                    </button>
                  </div>
                )}
              </div>
              <span
                className={`ml-auto pl-2 text-right text-sm font-semibold tabular-nums ${
                  voided ? 'text-gray-500 line-through' : 'text-gray-950'
                }`}
              >
                {sign > 0 ? '+' : '−'}
                {formatCashAmount(movement.amount)}
              </span>
            </li>
          )
        })}
      </ul>
      {entries.length > limit && (
        <button
          type="button"
          aria-expanded={expanded}
          onClick={() => setExpanded((value) => !value)}
          className="mt-2 min-h-11 w-full border-t border-gray-200 pt-2 text-sm font-medium text-gray-800 underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--clr-ink)"
        >
          {expanded ? 'Ver menos' : `Ver ${hidden} más`}
        </button>
      )}
    </>
  )
}

function HistoryList({ sessions }: { sessions: CashRegisterSession[] }) {
  if (sessions.length === 0) {
    return (
      <div className="border border-dashed border-gray-300 px-5 py-8 text-center">
        <History className="mx-auto h-5 w-5 text-gray-500" aria-hidden="true" />
        <p className="mt-3 text-sm font-medium text-gray-800">Todavía no hay cierres guardados</p>
        <p className="mt-1 text-sm leading-6 text-gray-600">
          Cuando cierres una caja, vas a poder consultar acá sus importes y diferencias.
        </p>
      </div>
    )
  }

  return (
    <div className="divide-y divide-gray-200 border-y border-gray-200">
      {sessions.map((session) => {
        const difference = session.difference ?? 0
        const feed = buildCashFeed(session.movements, session.expenses ?? [])
        return (
          <details key={session.id} className="group min-w-0 py-4">
            <summary className="grid min-w-0 cursor-pointer list-none gap-3 rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-(--clr-ink) sm:grid-cols-[minmax(0,1.4fr)_repeat(3,minmax(0,1fr))] sm:items-center">
              <span className="min-w-0">
                <span className="block [overflow-wrap:anywhere] text-sm font-semibold text-gray-900">
                  {formatCashMoment(session.openedAt)}
                </span>
                <span className="mt-1 block [overflow-wrap:anywhere] text-xs text-gray-600">
                  Abrió: {session.openedByName || 'Sin nombre'} · Cerró:{' '}
                  {session.closedByName || 'Sin nombre'} ·{' '}
                  {session.closedAt ? formatCashMoment(session.closedAt) : 'Abierta'}
                </span>
              </span>
              <span className="flex min-w-0 justify-between gap-2 text-sm sm:block">
                <span className="text-gray-600 sm:block sm:text-xs">Ventas</span>
                <span className="font-medium tabular-nums text-gray-900">
                  {formatCashAmount(session.summary?.netSales ?? 0)}
                </span>
              </span>
              <span className="flex min-w-0 justify-between gap-2 text-sm sm:block">
                <span className="text-gray-600 sm:block sm:text-xs">Efectivo contado</span>
                <span className="font-medium tabular-nums text-gray-900">
                  {formatCashAmount(session.cashCounted ?? 0)}
                </span>
              </span>
              <span className="flex min-w-0 justify-between gap-2 text-sm sm:block">
                <span className="text-gray-600 sm:block sm:text-xs">Diferencia</span>
                <span
                  className={`min-w-0 text-right [overflow-wrap:anywhere] font-semibold tabular-nums sm:text-left ${differenceTone(difference)}`}
                >
                  {difference > 0 ? '+' : ''}
                  {formatCashAmount(difference)}
                  <span className="ml-2 text-xs font-medium">
                    {amountDifferenceLabel(difference)}
                  </span>
                </span>
              </span>
            </summary>
            <div className="mt-4 grid min-w-0 gap-5 border-t border-gray-100 pt-4 md:grid-cols-2">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-800">Medios de pago</p>
                <ul className="mt-2 space-y-2">
                  {(session.summary?.paymentMethods ?? []).map((payment) => (
                    <li key={payment.method} className="flex min-w-0 justify-between gap-3 text-sm">
                      <span className="truncate text-gray-600">
                        {PAYMENT_METHODS[payment.method] ?? payment.method}
                      </span>
                      <span className="shrink-0 font-medium tabular-nums text-gray-900">
                        {formatCashAmount(payment.amount)}
                      </span>
                    </li>
                  ))}
                </ul>
                {session.differenceReason && (
                  <p className="mt-4 [overflow-wrap:anywhere] text-sm leading-6 text-gray-700">
                    <span className="font-medium">Motivo de diferencia:</span>{' '}
                    {session.differenceReason}
                  </p>
                )}
                {session.openingNote && (
                  <p className="mt-2 [overflow-wrap:anywhere] text-sm leading-6 text-gray-700">
                    <span className="font-medium">Observación de apertura:</span>{' '}
                    {session.openingNote}
                  </p>
                )}
                {session.closingNote && (
                  <p className="mt-2 [overflow-wrap:anywhere] text-sm leading-6 text-gray-700">
                    <span className="font-medium">Observación:</span> {session.closingNote}
                  </p>
                )}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-800">Resumen del turno</p>
                <dl className="mt-2 space-y-2 text-sm">
                  <div className="flex justify-between gap-3">
                    <dt className="text-gray-600">Tickets</dt>
                    <dd className="font-medium tabular-nums text-gray-900">
                      {(session.summary?.ticketCount ?? 0).toLocaleString('es-AR')}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-gray-600">Efectivo esperado</dt>
                    <dd className="font-medium tabular-nums text-gray-900">
                      {formatCashAmount(session.cashExpected ?? 0)}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-gray-600">Gastos desde caja</dt>
                    <dd className="font-medium tabular-nums text-gray-900">
                      {formatCashAmount(session.summary?.cashExpenses ?? 0)}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-gray-600">Propinas</dt>
                    <dd className="font-medium tabular-nums text-gray-900">
                      {formatCashAmount(session.summary?.tips ?? 0)}
                    </dd>
                  </div>
                </dl>
              </div>
              {feed.length > 0 && (
                <div className="min-w-0 border-t border-gray-100 pt-4 md:col-span-2">
                  <p className="mb-3 text-sm font-semibold text-gray-800">
                    Movimientos y gastos de caja
                  </p>
                  <CashFeed entries={feed} limit={8} emptyMessage="" />
                </div>
              )}
            </div>
          </details>
        )
      })}
    </div>
  )
}

export default function CashRegisterView({ slug }: { slug: string; isOwner: boolean }) {
  const [data, setData] = useState<CashRegisterData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [showMovementForm, setShowMovementForm] = useState(false)
  const [showCloseForm, setShowCloseForm] = useState(false)
  const [showCloseConfirmation, setShowCloseConfirmation] = useState(false)
  const [voidingMovementId, setVoidingMovementId] = useState<string | null>(null)
  const movementFormRef = useRef<HTMLFormElement>(null)
  const closeFormRef = useRef<HTMLFormElement>(null)
  const closeConfirmationRef = useRef<HTMLDialogElement>(null)
  const [openingAmount, setOpeningAmount] = useState('')
  const [openedByName, setOpenedByName] = useState('')
  const [openingNote, setOpeningNote] = useState('')
  const [movementType, setMovementType] = useState<CashMovementType>('cash_in')
  const [movementAmount, setMovementAmount] = useState('')
  const [movementDescription, setMovementDescription] = useState('')
  const [movementNote, setMovementNote] = useState('')
  const [movementName, setMovementName] = useState('')
  const [cashCounted, setCashCounted] = useState('')
  const [closedByName, setClosedByName] = useState('')
  const [differenceReason, setDifferenceReason] = useState('')
  const [closingNote, setClosingNote] = useState('')
  const [updatedAt, setUpdatedAt] = useState<string | null>(null)

  const loadData = useCallback(
    async (quiet = false) => {
      if (quiet) setIsRefreshing(true)
      else setIsLoading(true)
      try {
        const response = await fetch(
          `/api/organizations/${encodeURIComponent(slug)}/cash-register`,
          {
            credentials: 'include',
            cache: 'no-store',
          },
        )
        const result: unknown = await response.json().catch(() => null)
        if (
          !response.ok ||
          !result ||
          typeof result !== 'object' ||
          !('success' in result) ||
          result.success !== true ||
          !('data' in result)
        ) {
          throw new Error(readErrorMessage(result))
        }
        setData(result.data as CashRegisterData)
        setUpdatedAt(new Date().toISOString())
        setError(null)
      } catch (loadError) {
        setError(friendlyErrorMessage(loadError))
      } finally {
        setIsLoading(false)
        setIsRefreshing(false)
      }
    },
    [slug],
  )

  useEffect(() => {
    void loadData()
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') void loadData(true)
    }, 30_000)
    return () => window.clearInterval(timer)
  }, [loadData])

  useEffect(() => {
    const target = showMovementForm
      ? movementFormRef.current
      : showCloseForm
        ? closeFormRef.current
        : null
    if (!target) return

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    target.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center' })
  }, [showMovementForm, showCloseForm])

  useEffect(() => {
    const dialog = closeConfirmationRef.current
    if (!dialog) return
    if (showCloseConfirmation && !dialog.open) dialog.showModal()
    if (!showCloseConfirmation && dialog.open) dialog.close()
  }, [showCloseConfirmation])

  const active = data?.active ?? null
  const summary = active?.summary ?? null
  const counted = parseCashInput(cashCounted)
  const previewDifference =
    counted !== null && summary ? cashDifference(summary.cashExpected, counted) : null

  const runOperation = async (
    endpoint: string,
    body: Record<string, unknown>,
    successMessage: string,
  ): Promise<boolean> => {
    if (busy) return false
    setBusy(true)
    setError(null)
    setSuccess(null)

    try {
      await postJson(endpoint, body)
      setSuccess(successMessage)
      await loadData(true)
      return true
    } catch (submitError) {
      setError(friendlyErrorMessage(submitError))
      return false
    } finally {
      setBusy(false)
    }
  }

  const submit = async (
    event: SyntheticEvent<HTMLFormElement>,
    endpoint: string,
    body: Record<string, unknown>,
    successMessage: string,
  ) => {
    event.preventDefault()
    return runOperation(endpoint, body, successMessage)
  }

  const submitOpening = (event: SyntheticEvent<HTMLFormElement>) =>
    submit(
      event,
      `/api/organizations/${encodeURIComponent(slug)}/cash-register`,
      { openingAmount: parseCashInput(openingAmount), openedByName, openingNote },
      'Caja abierta. Las ventas nuevas quedarán asociadas a este turno.',
    )

  const submitMovement = (event: SyntheticEvent<HTMLFormElement>) => {
    if (!active) return
    return submit(
      event,
      `/api/organizations/${encodeURIComponent(slug)}/cash-register/movements`,
      {
        sessionId: active.id,
        type: movementType,
        amount: parseCashInput(movementAmount),
        description: movementDescription,
        note: movementNote,
        createdByName: movementName,
      },
      'Movimiento registrado en la caja.',
    ).then((saved) => {
      if (saved) {
        setMovementAmount('')
        setMovementDescription('')
        setMovementNote('')
        setShowMovementForm(false)
      }
    })
  }

  const submitClosing = (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!active || busy) return
    setShowCloseConfirmation(true)
  }

  const voidMovement = async (movementId: string) => {
    if (busy || voidingMovementId) return false
    setVoidingMovementId(movementId)
    setBusy(true)
    setError(null)
    setSuccess(null)

    try {
      await deleteJson(
        `/api/organizations/${encodeURIComponent(slug)}/cash-register/movements?id=${encodeURIComponent(movementId)}`,
      )
      setSuccess('Movimiento anulado. Ya no cuenta para el efectivo esperado.')
      await loadData(true)
      return true
    } catch (voidError) {
      setError(friendlyErrorMessage(voidError))
      return false
    } finally {
      setVoidingMovementId(null)
      setBusy(false)
    }
  }

  const confirmClosing = async () => {
    if (!active || counted === null) return

    const closed = await runOperation(
      `/api/organizations/${encodeURIComponent(slug)}/cash-register/close`,
      {
        sessionId: active.id,
        cashCounted: counted,
        closedByName,
        differenceReason,
        closingNote,
      },
      'Caja cerrada. El resumen quedó guardado en el historial.',
    )
    if (closed) {
      setCashCounted('')
      setClosedByName('')
      setDifferenceReason('')
      setClosingNote('')
      setShowCloseForm(false)
      setShowCloseConfirmation(false)
    }
  }

  useEffect(() => {
    if (!success) return
    const timer = window.setTimeout(() => setSuccess(null), 6000)
    return () => window.clearTimeout(timer)
  }, [success])

  const lastUpdated = isRefreshing
    ? 'Actualizando…'
    : updatedAt
      ? `Actualizado ${formatCashTime(updatedAt)}`
      : ''

  const feed = useMemo(
    () => buildCashFeed(active?.movements ?? [], active?.expenses ?? []),
    [active],
  )

  const actionButtons = (
    <>
      <button
        type="button"
        onClick={() => {
          setShowMovementForm((value) => !value)
          setShowCloseForm(false)
          setError(null)
        }}
        aria-expanded={showMovementForm}
        aria-controls={showMovementForm ? 'cash-movement-form' : undefined}
        className="inline-flex min-h-11 items-center justify-center gap-2 border border-gray-300 px-4 text-sm font-semibold text-gray-800 transition-colors hover:bg-gray-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--clr-ink) active:scale-[0.98]"
      >
        <Plus className="h-4 w-4" aria-hidden="true" />
        Movimiento
      </button>
      <button
        type="button"
        onClick={() => {
          setShowCloseForm((value) => !value)
          setShowMovementForm(false)
          setCashCounted('')
          setError(null)
        }}
        aria-expanded={showCloseForm}
        aria-controls={showCloseForm ? 'cash-close-form' : undefined}
        disabled={!summary}
        className="inline-flex min-h-11 items-center justify-center gap-2 bg-(--clr-ink) px-4 text-sm font-semibold text-white transition-colors hover:bg-(--clr-ink-dark) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--clr-ink) active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
      >
        <Banknote className="h-4 w-4" aria-hidden="true" />
        Cerrar caja
      </button>
    </>
  )

  if (isLoading) return <LoadingView />

  if (!data) {
    return (
      <div className="space-y-6 px-5 py-7 sm:px-8 sm:py-9">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-[-0.02em] text-gray-950">Caja</h1>
            <p className="mt-1 [overflow-wrap:anywhere] text-sm text-gray-600">Sucursal: {slug}</p>
          </div>
          <button
            type="button"
            onClick={() => void loadData()}
            className="inline-flex min-h-11 items-center gap-2 border border-gray-300 px-4 text-sm font-semibold text-gray-800 transition-colors hover:bg-gray-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--clr-ink) active:scale-[0.98]"
          >
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            Reintentar
          </button>
        </div>
        <p
          role="alert"
          className="border border-rose-200 bg-rose-50 p-4 text-sm leading-6 text-rose-900"
        >
          {error ?? 'No pudimos cargar la caja. Intentá nuevamente.'}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-9 px-5 py-7 sm:px-8 sm:py-9">
      <header className="flex min-w-0 flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-[-0.02em] text-gray-950 sm:text-3xl">
            Caja
          </h1>
          <p className="mt-1 [overflow-wrap:anywhere] text-sm leading-6 text-gray-600">
            Sucursal: {slug}
          </p>
        </div>
        <div className="flex min-w-0 items-center gap-2">
          <span
            className="inline-flex items-center gap-1.5 text-xs tabular-nums text-gray-600"
            aria-live="polite"
          >
            {isRefreshing ? (
              <LoaderCircle className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
            ) : (
              <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />
            )}
            {lastUpdated}
          </span>
          <button
            type="button"
            onClick={() => void loadData(true)}
            disabled={isRefreshing || busy}
            aria-label="Actualizar"
            className="inline-flex min-h-11 min-w-11 items-center justify-center gap-2 border border-gray-300 px-3 text-sm font-medium text-gray-800 transition-colors hover:bg-gray-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--clr-ink) active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw
              className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`}
              aria-hidden="true"
            />
            <span className="hidden sm:inline">Actualizar</span>
          </button>
        </div>
      </header>

      {error && (
        <p
          role="alert"
          className="border border-rose-200 bg-rose-50 p-4 text-sm leading-6 text-rose-900"
        >
          {error}
        </p>
      )}
      {success && (
        <p
          role="status"
          className="border border-emerald-200 bg-emerald-50 p-4 text-sm leading-6 text-emerald-900"
        >
          {success}
        </p>
      )}

      {active ? (
        <section aria-labelledby="active-register-heading" className="space-y-7">
          <div className="flex min-w-0 flex-wrap items-start justify-between gap-4 border-b border-gray-200 pb-5">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                <h2 id="active-register-heading" className="text-lg font-semibold text-gray-950">
                  Caja abierta
                </h2>
                <span className="inline-flex items-center gap-2 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-900">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-700" aria-hidden="true" />
                  En curso
                </span>
              </div>
              <p className="mt-1 [overflow-wrap:anywhere] text-sm leading-6 text-gray-600">
                Desde {formatCashDate(active.openedAt)}
                {active.openedByName ? ` · ${active.openedByName}` : ''}
              </p>
              {active.openingNote && (
                <p className="mt-1 [overflow-wrap:anywhere] text-sm leading-6 text-gray-600">
                  {active.openingNote}
                </p>
              )}
            </div>
            <div className="hidden gap-2 sm:flex">{actionButtons}</div>
          </div>

          {summary ? (
            <>
              <CashHero summary={summary} openingAmount={active.openingAmount} />
              <div className="grid min-w-0 gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-start">
                <div className="order-2 min-w-0 lg:order-1">
                  <PaymentsCard summary={summary} />
                </div>
                <div className="order-1 min-w-0 space-y-5 lg:order-2">
                  {showMovementForm && (
                    <form
                      ref={movementFormRef}
                      id="cash-movement-form"
                      onSubmit={submitMovement}
                      className="scroll-mt-8 space-y-5 border border-gray-300 bg-gray-50 p-5 sm:p-6"
                    >
                      <div>
                        <h3 className="text-base font-semibold text-gray-950">
                          Registrar movimiento
                        </h3>
                        <p className="mt-1 text-sm leading-5 text-gray-600">
                          Los retiros a caja fuerte reducen el efectivo esperado, pero no son un
                          gasto.
                        </p>
                      </div>
                      <label className="block text-sm font-medium text-gray-800">
                        Tipo de movimiento
                        <select
                          value={movementType}
                          onChange={(event) =>
                            setMovementType(event.target.value as CashMovementType)
                          }
                          className="mt-1.5 min-h-12 w-full border border-gray-300 bg-white px-3 text-base text-gray-950 outline-none focus:border-(--clr-ink) focus:ring-2 focus:ring-(--clr-ink)/15"
                        >
                          <option value="cash_in">Ingreso de efectivo</option>
                          <option value="cash_out">Egreso de efectivo</option>
                          <option value="safe_drop">Retiro a caja fuerte</option>
                        </select>
                      </label>
                      <AmountInput
                        id="movement-amount"
                        label="Importe"
                        value={movementAmount}
                        onChange={setMovementAmount}
                        required
                      />
                      <label className="block text-sm font-medium text-gray-800">
                        Descripción
                        <input
                          type="text"
                          required
                          maxLength={120}
                          value={movementDescription}
                          onChange={(event) => setMovementDescription(event.target.value)}
                          className="mt-1.5 min-h-12 w-full border border-gray-300 bg-white px-3 text-base text-gray-950 outline-none placeholder:text-gray-500 focus:border-(--clr-ink) focus:ring-2 focus:ring-(--clr-ink)/15"
                          placeholder="Por ejemplo: pago de proveedor"
                        />
                      </label>
                      <NameInput
                        id="movement-name"
                        value={movementName}
                        onChange={setMovementName}
                      />
                      <TextArea
                        id="movement-note"
                        label="Observación (opcional)"
                        value={movementNote}
                        onChange={setMovementNote}
                      />
                      <div className="flex flex-wrap gap-3">
                        <button
                          type="submit"
                          disabled={busy}
                          className="inline-flex min-h-11 items-center justify-center gap-2 bg-(--clr-ink) px-4 text-sm font-semibold text-white transition-colors hover:bg-(--clr-ink-dark) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--clr-ink) active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {busy && (
                            <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
                          )}
                          Guardar movimiento
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowMovementForm(false)}
                          className="min-h-11 px-3 text-sm font-medium text-gray-700 underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--clr-ink)"
                        >
                          Cancelar
                        </button>
                      </div>
                    </form>
                  )}

                  {showCloseForm && (
                    <form
                      ref={closeFormRef}
                      id="cash-close-form"
                      onSubmit={submitClosing}
                      className="scroll-mt-8 space-y-5 border border-gray-300 bg-gray-50 p-5 sm:p-6"
                    >
                      <div>
                        <h3 className="text-base font-semibold text-gray-950">Arqueo y cierre</h3>
                        <p className="mt-1 text-sm leading-5 text-gray-600">
                          Contá el efectivo físico. El sistema lo compara con el saldo esperado.
                        </p>
                      </div>
                      <AmountInput
                        id="cash-counted"
                        label="Efectivo contado"
                        value={cashCounted}
                        onChange={setCashCounted}
                        required
                      />
                      {previewDifference !== null && (
                        <div
                          className={`flex min-w-0 items-start gap-3 border border-gray-200 bg-white p-4 ${differenceTone(previewDifference)}`}
                          aria-live="polite"
                        >
                          {previewDifference === 0 ? (
                            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
                          ) : (
                            <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
                          )}
                          <div className="min-w-0">
                            <p className="text-sm font-semibold">
                              {amountDifferenceLabel(previewDifference)}
                            </p>
                            <p className="mt-1 [overflow-wrap:anywhere] text-lg font-semibold tabular-nums">
                              {previewDifference > 0 ? '+' : ''}
                              {formatCashAmount(previewDifference)}
                            </p>
                          </div>
                        </div>
                      )}
                      {previewDifference !== null && previewDifference !== 0 && (
                        <TextArea
                          id="difference-reason"
                          label="Motivo de la diferencia (obligatorio)"
                          value={differenceReason}
                          onChange={setDifferenceReason}
                          maxLength={300}
                          required
                        />
                      )}
                      <NameInput
                        id="closing-name"
                        value={closedByName}
                        onChange={setClosedByName}
                      />
                      <TextArea
                        id="closing-note"
                        label="Observación del cierre (opcional)"
                        value={closingNote}
                        onChange={setClosingNote}
                      />
                      <p className="text-xs leading-5 text-gray-600">
                        El cierre guarda una copia del resumen y no se puede editar después.
                      </p>
                      <div className="flex flex-wrap gap-3">
                        <button
                          type="submit"
                          disabled={
                            busy ||
                            counted === null ||
                            (previewDifference !== null &&
                              previewDifference !== 0 &&
                              !differenceReason.trim())
                          }
                          className="inline-flex min-h-11 items-center justify-center gap-2 bg-(--clr-ink) px-4 text-sm font-semibold text-white transition-colors hover:bg-(--clr-ink-dark) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--clr-ink) active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {busy && (
                            <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
                          )}
                          Revisar y confirmar cierre
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowCloseForm(false)}
                          className="min-h-11 px-3 text-sm font-medium text-gray-700 underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--clr-ink)"
                        >
                          Cancelar
                        </button>
                      </div>
                    </form>
                  )}
                  <section
                    aria-labelledby="cash-feed-heading"
                    className="min-w-0 border border-gray-200 bg-white p-5 sm:p-6"
                  >
                    <SectionTitle
                      icon={<History className="h-5 w-5" />}
                      title="Movimientos recientes"
                      detail="Incluye los gastos pagados desde caja. El fondo de apertura no cuenta como venta."
                    />
                    <CashFeed
                      entries={feed}
                      onVoid={voidMovement}
                      voidingMovementId={voidingMovementId}
                      isBusy={busy}
                      emptyMessage="Todavía no hay movimientos ni gastos de caja en este turno. Las ventas en efectivo ya están incluidas en el resumen."
                    />
                  </section>
                </div>
              </div>
            </>
          ) : (
            <p
              role="alert"
              className="border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950"
            >
              No pudimos calcular el resumen de esta caja. Actualizá la pantalla antes de registrar
              movimientos o cerrar.
            </p>
          )}
        </section>
      ) : (
        <section className="grid min-w-0 gap-8 border border-gray-200 bg-white p-5 sm:p-7 lg:grid-cols-[minmax(0,1fr)_minmax(16rem,0.7fr)]">
          <div className="min-w-0">
            <div className="flex items-start gap-3">
              <Wallet className="mt-1 h-5 w-5 shrink-0 text-(--clr-ink)" aria-hidden="true" />
              <div className="min-w-0">
                <h2 className="text-lg font-semibold text-gray-950">
                  Abrí la caja para iniciar el turno
                </h2>
                <p className="mt-2 max-w-prose text-sm leading-6 text-gray-600">
                  Registrá el fondo inicial en efectivo. No se suma a las ventas; las operaciones
                  nuevas quedarán asociadas a esta caja hasta el cierre. Sin una caja abierta, las
                  ventas no pueden incluirse en un cierre de turno.
                </p>
              </div>
            </div>
            <form onSubmit={submitOpening} className="mt-6 grid min-w-0 gap-5 sm:grid-cols-2">
              <AmountInput
                id="opening-amount"
                label="Fondo inicial en efectivo"
                value={openingAmount}
                onChange={setOpeningAmount}
                required
              />
              <NameInput id="opening-name" value={openedByName} onChange={setOpenedByName} />
              <div className="sm:col-span-2">
                <TextArea
                  id="opening-note"
                  label="Observación de apertura (opcional)"
                  value={openingNote}
                  onChange={setOpeningNote}
                />
              </div>
              <div className="sm:col-span-2">
                <button
                  type="submit"
                  disabled={busy || parseCashInput(openingAmount) === null}
                  className="inline-flex min-h-11 w-full items-center justify-center gap-2 bg-(--clr-ink) px-5 text-sm font-semibold text-white transition-colors hover:bg-(--clr-ink-dark) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--clr-ink) active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                >
                  {busy ? (
                    <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
                  ) : (
                    <Plus className="h-4 w-4" aria-hidden="true" />
                  )}
                  Abrir caja
                </button>
              </div>
            </form>
          </div>
          <aside className="min-w-0 border-t border-gray-200 pt-6 lg:border-l lg:border-t-0 lg:pl-7 lg:pt-0">
            <p className="text-sm font-semibold text-gray-900">Antes de empezar</p>
            <ul className="mt-3 space-y-3 text-sm leading-6 text-gray-700">
              <li className="flex gap-2">
                <ShieldCheck
                  className="mt-1 h-4 w-4 shrink-0 text-(--clr-ink)"
                  aria-hidden="true"
                />
                El fondo inicial no cuenta como venta.
              </li>
              <li className="flex gap-2">
                <ReceiptText
                  className="mt-1 h-4 w-4 shrink-0 text-(--clr-ink)"
                  aria-hidden="true"
                />
                Los pagos quedan asociados a esta caja mientras esté abierta.
              </li>
              <li className="flex gap-2">
                <History className="mt-1 h-4 w-4 shrink-0 text-(--clr-ink)" aria-hidden="true" />
                El resumen del cierre se conserva en el historial.
              </li>
            </ul>
            {data.history.length > 0 && (
              <p className="mt-5 border-t border-gray-200 pt-4 text-sm leading-6 text-amber-900">
                La caja anterior ya se cerró. Abrí una nueva para poder registrar más pedidos.
              </p>
            )}
          </aside>
        </section>
      )}

      <section aria-labelledby="cash-register-history-heading" className="min-w-0">
        <div className="mb-4 flex min-w-0 items-center gap-3">
          <History className="h-5 w-5 shrink-0 text-(--clr-ink)" aria-hidden="true" />
          <div className="min-w-0">
            <h2 id="cash-register-history-heading" className="text-lg font-semibold text-gray-950">
              Historial de cierres
            </h2>
            <p className="mt-1 text-sm leading-5 text-gray-600">
              {data.history.length > 0
                ? `Mostrando los últimos ${data.history.length} cierres de esta sucursal.`
                : 'Los cierres de esta sucursal van a aparecer acá.'}
            </p>
          </div>
        </div>
        <HistoryList sessions={data.history} />
      </section>

      {active && summary && (
        <div className="sticky bottom-0 z-20 -mx-5 -mb-7 flex gap-2 border-t border-gray-200 bg-white/95 px-5 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] backdrop-blur sm:hidden [&>button]:flex-1">
          {actionButtons}
        </div>
      )}

      <dialog
        ref={closeConfirmationRef}
        aria-labelledby="cash-close-confirmation-title"
        aria-describedby="cash-close-confirmation-description"
        onCancel={(event) => {
          event.preventDefault()
          setShowCloseConfirmation(false)
        }}
        onClose={() => setShowCloseConfirmation(false)}
        className="m-auto w-[calc(100%-2rem)] max-w-lg border border-gray-300 bg-white p-0 text-gray-950 shadow-xl backdrop:bg-gray-950/45"
      >
        <div className="space-y-5 p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <Banknote className="mt-0.5 h-5 w-5 shrink-0 text-(--clr-ink)" aria-hidden="true" />
            <div className="min-w-0">
              <h2
                id="cash-close-confirmation-title"
                className="text-lg font-semibold text-gray-950"
              >
                Confirmar cierre definitivo
              </h2>
              <p
                id="cash-close-confirmation-description"
                className="mt-1 text-sm leading-6 text-gray-600"
              >
                Al confirmar, esta caja quedará cerrada y el resumen no se podrá modificar.
              </p>
            </div>
          </div>
          {summary && counted !== null && (
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 border-y border-gray-200 py-4 text-sm">
              <dt className="text-gray-600">Efectivo esperado</dt>
              <dd className="text-right font-medium tabular-nums text-gray-950">
                {formatCashAmount(summary.cashExpected)}
              </dd>
              <dt className="text-gray-600">Efectivo contado</dt>
              <dd className="text-right font-medium tabular-nums text-gray-950">
                {formatCashAmount(counted)}
              </dd>
              <dt className="font-semibold text-gray-800">Diferencia</dt>
              <dd
                className={`text-right font-semibold tabular-nums ${differenceTone(previewDifference ?? 0)}`}
              >
                {(previewDifference ?? 0) > 0 ? '+' : ''}
                {formatCashAmount(previewDifference ?? 0)}
              </dd>
            </dl>
          )}
          {error && (
            <p
              role="alert"
              className="border border-rose-200 bg-rose-50 p-3 text-sm leading-5 text-rose-900"
            >
              {error}
            </p>
          )}
          <div className="flex flex-wrap justify-end gap-3">
            <button
              type="button"
              onClick={() => setShowCloseConfirmation(false)}
              disabled={busy}
              className="min-h-11 px-3 text-sm font-medium text-gray-700 underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--clr-ink) disabled:cursor-not-allowed disabled:opacity-60"
            >
              Volver al arqueo
            </button>
            <button
              type="button"
              onClick={() => void confirmClosing()}
              disabled={busy || counted === null}
              className="inline-flex min-h-11 items-center justify-center gap-2 bg-(--clr-ink) px-4 text-sm font-semibold text-white transition-colors hover:bg-(--clr-ink-dark) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--clr-ink) active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {busy && <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />}
              Cerrar caja definitivamente
            </button>
          </div>
        </div>
      </dialog>
    </div>
  )
}
