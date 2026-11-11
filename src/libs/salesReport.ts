import type {
  SalesHourSummary,
  SalesPayment,
  SalesPaymentSummary,
  SalesProductLine,
  SalesProductSummary,
  SalesReport,
  SalesTicket,
} from '../types/sales'

const TIME_ZONE = 'America/Argentina/Buenos_Aires'

function toAmount(value: unknown): number {
  const amount = typeof value === 'string' || typeof value === 'number' ? Number(value) : NaN
  return Number.isFinite(amount) && amount >= 0 ? Math.round(amount * 100) / 100 : 0
}

function toString(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

function normalizeMethod(value: unknown): string | null {
  if (typeof value !== 'string' || value.trim() === '') return null
  const method = value.trim().toLowerCase().replaceAll(' ', '_')
  if (['mp', 'mercado_pago', 'mercado_pago_(mp)'].includes(method)) return 'mercadopago'
  return method
}

function normalizeItems(value: unknown): SalesProductLine[] {
  if (!Array.isArray(value)) return []

  return value.flatMap((item): SalesProductLine[] => {
    if (!item || typeof item !== 'object') return []
    const raw = item as Record<string, unknown>
    const name = toString(raw.name).trim()
    const qty = Number(raw.qty)
    if (!name || !Number.isInteger(qty) || qty < 1) return []
    const unitPrice = toAmount(raw.price)
    return [
      {
        id: typeof raw.id === 'string' ? raw.id : null,
        name,
        qty,
        unitPrice,
        lineTotal: Math.round(unitPrice * qty * 100) / 100,
      },
    ]
  })
}

function normalizePayments(value: unknown, totalPrice: number): SalesPayment[] {
  if (!Array.isArray(value)) return []
  const valid = value.flatMap((payment): SalesPayment[] => {
    if (!payment || typeof payment !== 'object') return []
    const raw = payment as Record<string, unknown>
    const method = normalizeMethod(raw.method)
    if (!method) return []
    return [{ method, amount: toAmount(raw.amount) }]
  })

  if (valid.length === 1 && valid[0].amount === 0) {
    valid[0].amount = totalPrice
  }
  return valid
}

function normalizeTicket(value: unknown): SalesTicket | null {
  if (!value || typeof value !== 'object') return null
  const raw = value as Record<string, unknown>
  const id = toString(raw.id)
  const createdAt = toString(raw.created_at)
  if (!id || !Number.isFinite(Date.parse(createdAt))) return null

  const totalPrice = toAmount(raw.total_price)
  const tipAmount = toAmount(raw.tip_amount)
  const tipPaymentMethod = normalizeMethod(raw.tip_payment_method)
  const tipIncludedInPayments = raw.tip_included_in_payments !== false
  const payments = normalizePayments(raw.payments, totalPrice)

  if (tipAmount > 0 && tipIncludedInPayments && payments.length === 1) {
    payments[0].amount = Math.round((payments[0].amount + tipAmount) * 100) / 100
  } else if (tipAmount > 0 && !tipIncludedInPayments && tipPaymentMethod) {
    const tipPayment = payments.find((payment) => payment.method === tipPaymentMethod)
    if (tipPayment) tipPayment.amount = Math.round((tipPayment.amount + tipAmount) * 100) / 100
    else payments.push({ method: tipPaymentMethod, amount: tipAmount })
  }

  return {
    id,
    createdAt,
    status: toString(raw.status),
    totalPrice,
    discountAmount: toAmount(raw.discount_amount),
    tipAmount,
    tipPaymentMethod,
    tipIncludedInPayments,
    payments,
    items: normalizeItems(raw.items),
  }
}

export function normalizeSalesReport(date: string, rows: unknown): SalesReport {
  const tickets = Array.isArray(rows)
    ? rows.map(normalizeTicket).filter((ticket): ticket is SalesTicket => ticket !== null)
    : []
  return { date, tickets }
}

export function getArgentinaDate(now = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now)
  const part = (type: string) => parts.find((value) => value.type === type)?.value ?? ''
  return `${part('year')}-${part('month')}-${part('day')}`
}

function toUtcForArgentina(date: string, hour = 0): Date {
  const [year, month, day] = date.split('-').map(Number)
  const target = Date.UTC(year, month - 1, day, hour)
  let timestamp = target
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  })

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const parts = formatter.formatToParts(new Date(timestamp))
    const part = (type: string) => Number(parts.find((value) => value.type === type)?.value)
    const represented = Date.UTC(
      part('year'),
      part('month') - 1,
      part('day'),
      part('hour'),
      part('minute'),
    )
    const adjustment = target - represented
    timestamp += adjustment
    if (adjustment === 0) break
  }

  return new Date(timestamp)
}

export function getArgentinaDayBounds(date: string) {
  const [year, month, day] = date.split('-').map(Number)
  const nextDate = new Date(Date.UTC(year, month - 1, day + 1)).toISOString().slice(0, 10)
  return {
    start: toUtcForArgentina(date).toISOString(),
    end: toUtcForArgentina(nextDate).toISOString(),
  }
}

export function getArgentinaHourBounds(date: string, fromHour: number, throughHour: number) {
  const dayStart = getArgentinaDayBounds(date).start
  const nextDay = getArgentinaDayBounds(date).end
  return {
    start: fromHour === 0 ? dayStart : toUtcForArgentina(date, fromHour).toISOString(),
    end: throughHour === 23 ? nextDay : toUtcForArgentina(date, throughHour + 1).toISOString(),
  }
}

export function isValidSalesDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const [year, month, day] = value.split('-').map(Number)
  const parsed = new Date(Date.UTC(year, month - 1, day))
  return (
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day
  )
}

export function summarizeSales(tickets: SalesTicket[]) {
  let units = 0
  let sales = 0
  let tips = 0
  const products = new Map<string, SalesProductSummary>()
  const hours = new Map<number, SalesHourSummary>()
  const paymentMethods = new Map<string, { amount: number; tickets: Set<string> }>()

  for (const ticket of tickets) {
    sales += ticket.totalPrice
    tips += ticket.tipAmount
    const hour = Number(
      new Intl.DateTimeFormat('en-US', {
        timeZone: TIME_ZONE,
        hour: '2-digit',
        hourCycle: 'h23',
      }).format(new Date(ticket.createdAt)),
    )
    const hourSummary = hours.get(hour) ?? { hour, units: 0, sales: 0, tickets: 0 }
    hourSummary.sales += ticket.totalPrice
    hourSummary.tickets += 1

    for (const item of ticket.items) {
      units += item.qty
      hourSummary.units += item.qty
      const key = item.id ?? item.name.toLocaleLowerCase()
      const product = products.get(key) ?? {
        key,
        name: item.name,
        units: 0,
        amount: 0,
        tickets: 0,
        paymentMethods: [],
      }
      product.units += item.qty
      product.amount += item.lineTotal
      product.tickets += 1
      for (const payment of ticket.payments) {
        if (!product.paymentMethods.includes(payment.method)) {
          product.paymentMethods.push(payment.method)
        }
      }
      products.set(key, product)
    }

    for (const payment of ticket.payments) {
      const paymentSummary = paymentMethods.get(payment.method) ?? {
        amount: 0,
        tickets: new Set<string>(),
      }
      paymentSummary.amount += payment.amount
      paymentSummary.tickets.add(ticket.id)
      paymentMethods.set(payment.method, paymentSummary)
    }
    hours.set(hour, hourSummary)
  }

  const hourly: SalesHourSummary[] = Array.from({ length: 24 }, (_, hour) => ({
    hour,
    units: hours.get(hour)?.units ?? 0,
    sales: hours.get(hour)?.sales ?? 0,
    tickets: hours.get(hour)?.tickets ?? 0,
  }))

  const methods: SalesPaymentSummary[] = [...paymentMethods].map(([method, summary]) => ({
    method,
    amount: Math.round(summary.amount * 100) / 100,
    tickets: summary.tickets.size,
  }))

  return {
    tickets: tickets.length,
    units,
    sales: Math.round(sales * 100) / 100,
    tips: Math.round(tips * 100) / 100,
    products: [...products.values()].sort((a, b) => b.units - a.units || b.amount - a.amount),
    hourly,
    paymentMethods: methods.sort((a, b) => b.amount - a.amount),
  }
}
