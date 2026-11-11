import { describe, expect, it } from 'vitest'
import {
  DRAFT_MESSAGES,
  buildOptimisticOrder,
  buildPayload,
  computeTotals,
  newOrderId,
  validateDraft,
  type DraftInput,
} from './draft'

const base = (overrides: Partial<DraftInput> = {}): DraftInput => ({
  customerName: 'Ana',
  tableNumber: '',
  items: [
    { id: 'a', name: 'Espresso', price: 2500, qty: 2 },
    { id: 'b', name: 'Medialuna', price: 1800, qty: 1 },
  ],
  discount: null,
  tipAmount: 0,
  tipPaymentMethod: 'cash',
  paymentMethod: 'cash',
  secondPaymentMethod: null,
  splitAmounts: [0, 0],
  cashGiven: null,
  ...overrides,
})

describe('computeTotals', () => {
  it('suma subtotal, descuento porcentual y propina como el servidor', () => {
    const totals = computeTotals(
      base().items,
      { type: 'percentage', value: 10, reason: 'clients' },
      500,
    )
    expect(totals).toEqual({ subtotal: 6800, discountAmount: 680, total: 6120, charged: 6620 })
  })

  it('el descuento fijo nunca supera el subtotal', () => {
    const totals = computeTotals(base().items, { type: 'fixed', value: 99999, reason: 'others' }, 0)
    expect(totals.total).toBe(0)
    expect(totals.discountAmount).toBe(6800)
  })

  it('redondea a dos decimales', () => {
    const totals = computeTotals(
      [{ id: 'a', name: 'x', price: 333, qty: 1 }],
      { type: 'percentage', value: 33.333, reason: 'others' },
      0,
    )
    expect(totals.discountAmount).toBe(111)
    expect(totals.total).toBe(222)
  })
})

describe('validateDraft', () => {
  it('acepta una comanda correcta', () => {
    expect(validateDraft(base())).toBeNull()
  })

  it('pide nombre y productos', () => {
    expect(validateDraft(base({ customerName: '   ' }))).toBe(DRAFT_MESSAGES.customerName)
    expect(validateDraft(base({ customerName: 'x'.repeat(81) }))).toBe(
      DRAFT_MESSAGES.customerNameLength,
    )
    expect(validateDraft(base({ items: [] }))).toBe(DRAFT_MESSAGES.noItems)
  })

  it('limita cantidades y cantidad de productos', () => {
    expect(validateDraft(base({ items: [{ id: 'a', name: 'x', price: 1, qty: 100 }] }))).toBe(
      DRAFT_MESSAGES.tooManyUnits,
    )
    const many = Array.from({ length: 51 }, (_, index) => ({
      id: String(index),
      name: 'x',
      price: 1,
      qty: 1,
    }))
    expect(validateDraft(base({ items: many }))).toBe(DRAFT_MESSAGES.tooManyItems)
  })

  it('rechaza descuentos y propinas inválidos', () => {
    expect(validateDraft(base({ discount: { type: 'percentage', value: 101, reason: 'x' } }))).toBe(
      DRAFT_MESSAGES.discount,
    )
    expect(validateDraft(base({ discount: { type: 'fixed', value: -1, reason: 'x' } }))).toBe(
      DRAFT_MESSAGES.discount,
    )
    expect(validateDraft(base({ tipAmount: -5 }))).toBe(DRAFT_MESSAGES.tip)
    expect(validateDraft(base({ tipAmount: Number.NaN }))).toBe(DRAFT_MESSAGES.tip)
  })

  it('bloquea efectivo insuficiente antes de imprimir', () => {
    expect(validateDraft(base({ cashGiven: 6799 }))).toBe(DRAFT_MESSAGES.cashInsufficient)
    expect(validateDraft(base({ cashGiven: 6800 }))).toBeNull()
    expect(validateDraft(base({ paymentMethod: 'debit', cashGiven: 1 }))).toBeNull()
  })

  it('valida el pago dividido', () => {
    const split = (amounts: [number, number], second = 'debit') =>
      base({ secondPaymentMethod: second, splitAmounts: amounts })
    expect(validateDraft(split([3000, 3800]))).toBeNull()
    expect(validateDraft(split([3000, 3700]))).toBe(DRAFT_MESSAGES.mismatch)
    expect(validateDraft(split([3000, 3800], 'cash'))).toBe(DRAFT_MESSAGES.sameMethod)
    expect(
      validateDraft(
        base({ secondPaymentMethod: 'debit', cashGiven: 2999, splitAmounts: [3000, 3800] }),
      ),
    ).toBe(DRAFT_MESSAGES.cashInsufficient)
  })

  it('en pago dividido el efectivo se compara con su parte', () => {
    const input = base({
      paymentMethod: 'debit',
      secondPaymentMethod: 'cash',
      splitAmounts: [5000, 1800],
      cashGiven: 1800,
    })
    expect(validateDraft(input)).toBeNull()
  })

  it('separa la propina del split y la suma al efectivo cuando corresponde', () => {
    const input = base({
      tipAmount: 500,
      tipPaymentMethod: 'cash',
      secondPaymentMethod: 'debit',
      splitAmounts: [5000, 1800],
      cashGiven: 5499,
    })
    expect(validateDraft(input)).toBe(DRAFT_MESSAGES.cashInsufficient)
    expect(validateDraft({ ...input, cashGiven: 5500 })).toBeNull()
  })

  it('permite pagar la propina en otro medio al del pago dividido', () => {
    const input = base({
      tipAmount: 500,
      tipPaymentMethod: 'mercadopago',
      paymentMethod: 'cash',
      secondPaymentMethod: 'debit',
      splitAmounts: [5000, 1800],
      cashGiven: 5000,
    })
    expect(validateDraft(input)).toBeNull()
  })
})

describe('buildPayload', () => {
  it('envía el id, pagos y solo ids y cantidades', () => {
    const payload = buildPayload('id-1', base({ tableNumber: ' 4 ', cashGiven: 7000 }))
    expect(payload.id).toBe('id-1')
    expect(payload.table_number).toBe('4')
    expect(payload.items).toEqual([
      { id: 'a', qty: 2 },
      { id: 'b', qty: 1 },
    ])
    expect(payload.payments).toEqual([{ method: 'cash' }])
    expect(payload.tip_payment_method).toBe('cash')
    expect(payload.cash_given).toBe(7000)
    expect(payload.discount).toBeNull()
  })

  it('omite el descuento cuando no descuenta nada', () => {
    const payload = buildPayload(
      'id-1',
      base({ discount: { type: 'percentage', value: 0, reason: 'x' } }),
    )
    expect(payload.discount).toBeNull()
  })

  it('no manda efectivo recibido si no se paga en efectivo', () => {
    expect(buildPayload('i', base({ paymentMethod: 'debit', cashGiven: 5 })).cash_given).toBeNull()
  })
})

describe('buildOptimisticOrder', () => {
  it('replica lo que guardaría el servidor', () => {
    const now = new Date('2026-11-06T20:00:00.000Z')
    const order = buildOptimisticOrder(
      'id-1',
      'cafe',
      base({
        customerName: '  Ana ',
        discount: { type: 'percentage', value: 10, reason: 'clients' },
      }),
      now,
    )
    expect(order).toMatchObject({
      id: 'id-1',
      org_slug: 'cafe',
      customer_name: 'Ana',
      status: 'pending',
      created_at: '2026-11-06T20:00:00.000Z',
      total_price: 6120,
      table_number: null,
      payments: [{ method: 'cash', amount: 6120 }],
      tip_amount: 0,
      tip_payment_method: 'cash',
      tip_included_in_payments: false,
    })
    expect(order.items).toHaveLength(2)
  })

  it('en pago dividido conserva los montos de cada método', () => {
    const order = buildOptimisticOrder(
      'id-1',
      'cafe',
      base({ secondPaymentMethod: 'debit', splitAmounts: [3000, 3800] }),
    )
    expect(order.payments).toEqual([
      { method: 'cash', amount: 3000 },
      { method: 'debit', amount: 3800 },
    ])
  })
})

describe('newOrderId', () => {
  const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/

  it('genera ids únicos con formato uuid v4', () => {
    const ids = new Set(Array.from({ length: 200 }, () => newOrderId()))
    expect(ids.size).toBe(200)
    for (const id of ids) expect(id).toMatch(UUID)
  })

  it('funciona aunque la página no sea segura (sin crypto.randomUUID)', () => {
    const original = globalThis.crypto
    Object.defineProperty(globalThis, 'crypto', {
      value: { getRandomValues: original.getRandomValues.bind(original) },
      configurable: true,
    })
    try {
      expect(newOrderId()).toMatch(UUID)
    } finally {
      Object.defineProperty(globalThis, 'crypto', { value: original, configurable: true })
    }
  })
})
