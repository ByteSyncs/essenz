import type { Order, OrderItem } from '../../types/orders'

export const MAX_ITEMS = 50
export const MAX_QTY = 99
export const MAX_AMOUNT = 10_000_000
export const MAX_CUSTOMER_NAME = 80
export const MAX_TABLE_NUMBER = 20

export type DiscountType = 'percentage' | 'fixed'

export interface DraftDiscount {
  type: DiscountType
  value: number
  reason: string
}

export interface DraftInput {
  customerName: string
  tableNumber: string
  items: OrderItem[]
  discount: DraftDiscount | null
  tipAmount: number
  tipPaymentMethod: string
  paymentMethod: string
  secondPaymentMethod: string | null
  splitAmounts: [number, number]
  cashGiven: number | null
}

export const DRAFT_MESSAGES = {
  customerName: 'Ingresá el nombre del cliente.',
  customerNameLength: 'El nombre del cliente es demasiado largo.',
  noItems: 'Agregá al menos un producto.',
  tooManyItems: `Una comanda admite hasta ${MAX_ITEMS} productos distintos.`,
  tooManyUnits: `Hasta ${MAX_QTY} unidades por producto.`,
  discount: 'El descuento no es válido.',
  tip: 'La propina no es válida.',
  sameMethod: 'Revisá los métodos de pago. No podés repetir el mismo método.',
  amounts: 'Revisá los montos de pago.',
  mismatch: 'Los montos de pago no suman el total de la venta.',
  cashInvalid: 'El efectivo recibido no es válido.',
  cashInsufficient: 'El efectivo recibido no alcanza para cubrir el pago.',
} as const

export const round2 = (value: number) => Math.round(value * 100) / 100

function isMoney(value: number) {
  return Number.isFinite(value) && value >= 0 && value <= MAX_AMOUNT
}

export function computeTotals(
  items: OrderItem[],
  discount: DraftDiscount | null,
  tipAmount: number,
) {
  const subtotal = round2(items.reduce((sum, item) => sum + item.price * item.qty, 0))
  let discountAmount = 0

  if (discount && Number.isFinite(discount.value) && discount.value > 0) {
    discountAmount =
      discount.type === 'percentage'
        ? round2((subtotal * discount.value) / 100)
        : round2(Math.min(discount.value, subtotal))
  }

  const total = round2(Math.max(0, subtotal - discountAmount))
  const charged = round2(total + (Number.isFinite(tipAmount) ? tipAmount : 0))
  return { subtotal, discountAmount, total, charged }
}

export function validateDraft(input: DraftInput): string | null {
  const name = input.customerName.trim()
  if (name.length === 0) return DRAFT_MESSAGES.customerName
  if (name.length > MAX_CUSTOMER_NAME) return DRAFT_MESSAGES.customerNameLength

  if (input.items.length === 0) return DRAFT_MESSAGES.noItems
  if (input.items.length > MAX_ITEMS) return DRAFT_MESSAGES.tooManyItems
  if (
    input.items.some((item) => !Number.isInteger(item.qty) || item.qty < 1 || item.qty > MAX_QTY)
  ) {
    return DRAFT_MESSAGES.tooManyUnits
  }

  const { discount } = input
  if (discount) {
    if (!Number.isFinite(discount.value) || discount.value < 0) return DRAFT_MESSAGES.discount
    if (discount.type === 'percentage' && discount.value > 100) return DRAFT_MESSAGES.discount
  }

  if (!isMoney(input.tipAmount)) return DRAFT_MESSAGES.tip

  const { total } = computeTotals(input.items, discount, input.tipAmount)
  const split = input.secondPaymentMethod !== null

  if (split) {
    if (input.secondPaymentMethod === input.paymentMethod) return DRAFT_MESSAGES.sameMethod
    const [first, second] = input.splitAmounts
    if (!isMoney(first) || !isMoney(second)) return DRAFT_MESSAGES.amounts
    if (Math.abs(round2(first + second) - total) > 0.01) return DRAFT_MESSAGES.mismatch
  }

  const cashIndex =
    input.paymentMethod === 'cash' ? 0 : input.secondPaymentMethod === 'cash' ? 1 : -1
  const cashTarget =
    (split
      ? cashIndex === -1
        ? 0
        : input.splitAmounts[cashIndex]
      : cashIndex === -1
        ? 0
        : total) + (input.tipPaymentMethod === 'cash' ? input.tipAmount : 0)

  if (cashTarget > 0 && input.cashGiven !== null) {
    if (!isMoney(input.cashGiven)) return DRAFT_MESSAGES.cashInvalid
    if (input.cashGiven + 0.001 < cashTarget) return DRAFT_MESSAGES.cashInsufficient
  }

  return null
}

export function buildPayload(id: string, input: DraftInput) {
  const { discountAmount } = computeTotals(input.items, input.discount, input.tipAmount)
  const split = input.secondPaymentMethod !== null
  const hasCash =
    input.paymentMethod === 'cash' ||
    input.secondPaymentMethod === 'cash' ||
    (input.tipPaymentMethod === 'cash' && input.tipAmount > 0)

  return {
    id,
    customer_name: input.customerName.trim(),
    table_number: input.tableNumber.trim() || null,
    items: input.items.map(({ id: itemId, qty }) => ({ id: itemId, qty })),
    discount: discountAmount > 0 && input.discount ? { ...input.discount } : null,
    tip_amount: input.tipAmount,
    tip_payment_method: input.tipPaymentMethod,
    payments: split
      ? [
          { method: input.paymentMethod, amount: input.splitAmounts[0] },
          { method: input.secondPaymentMethod, amount: input.splitAmounts[1] },
        ]
      : [{ method: input.paymentMethod }],
    cash_given: hasCash && input.cashGiven !== null ? input.cashGiven : null,
  }
}

export function buildOptimisticOrder(
  id: string,
  slug: string,
  input: DraftInput,
  now: Date = new Date(),
): Order {
  const { total } = computeTotals(input.items, input.discount, input.tipAmount)
  const split = input.secondPaymentMethod !== null

  return {
    id,
    org_slug: slug,
    table_number: input.tableNumber.trim().slice(0, MAX_TABLE_NUMBER) || null,
    customer_name: input.customerName.trim(),
    status: 'pending',
    created_at: now.toISOString(),
    total_price: total,
    tip_amount: input.tipAmount,
    tip_payment_method: input.tipPaymentMethod,
    tip_included_in_payments: false,
    payments: split
      ? [
          { method: input.paymentMethod, amount: input.splitAmounts[0] },
          { method: input.secondPaymentMethod as string, amount: input.splitAmounts[1] },
        ]
      : [{ method: input.paymentMethod, amount: total }],
    items: input.items.map(({ id: itemId, name, price, qty }) => ({
      id: itemId,
      name,
      price,
      qty,
    })),
  }
}

export function newOrderId(): string {
  const api = globalThis.crypto
  if (api && typeof api.randomUUID === 'function') return api.randomUUID()

  const bytes = new Uint8Array(16)
  if (api && typeof api.getRandomValues === 'function') api.getRandomValues(bytes)
  else for (let index = 0; index < 16; index += 1) bytes[index] = Math.floor(Math.random() * 256)

  bytes[6] = (bytes[6] & 0x0f) | 0x40
  bytes[8] = (bytes[8] & 0x3f) | 0x80
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0'))
  return `${hex.slice(0, 4).join('')}-${hex.slice(4, 6).join('')}-${hex.slice(6, 8).join('')}-${hex.slice(8, 10).join('')}-${hex.slice(10).join('')}`
}
