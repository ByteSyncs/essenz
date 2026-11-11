import { describe, expect, it } from 'vitest'
import {
  getArgentinaDate,
  getArgentinaDayBounds,
  getArgentinaHourBounds,
  isValidSalesDate,
  normalizeSalesReport,
  summarizeSales,
} from './salesReport'

describe('sales report date helpers', () => {
  it('uses the Argentina local date and boundaries', () => {
    expect(getArgentinaDate(new Date('2026-11-11T02:00:00.000Z'))).toBe('2026-11-10')
    expect(getArgentinaDayBounds('2026-11-10')).toEqual({
      start: '2026-11-10T03:00:00.000Z',
      end: '2026-11-11T03:00:00.000Z',
    })
    expect(getArgentinaHourBounds('2026-11-10', 9, 17)).toEqual({
      start: '2026-11-10T12:00:00.000Z',
      end: '2026-11-10T21:00:00.000Z',
    })
  })

  it('rejects invalid calendar dates', () => {
    expect(isValidSalesDate('2026-02-29')).toBe(false)
    expect(isValidSalesDate('2024-02-29')).toBe(true)
    expect(isValidSalesDate('10/11/2026')).toBe(false)
  })
})

describe('normalizeSalesReport', () => {
  it('keeps sale line detail and adds separately paid tips to the right method', () => {
    const report = normalizeSalesReport('2026-11-10', [
      {
        id: 'ticket-1',
        created_at: '2026-11-10T15:00:00.000Z',
        status: 'delivered',
        total_price: 5000,
        discount_amount: 0,
        tip_amount: 500,
        tip_payment_method: 'mercadopago',
        tip_included_in_payments: false,
        payments: [
          { method: 'cash', amount: 3000 },
          { method: 'debit', amount: 2000 },
        ],
        items: [{ id: 'coffee', name: 'Café', qty: 2, price: 2500 }],
      },
    ])

    expect(report.tickets[0]).toMatchObject({
      totalPrice: 5000,
      tipAmount: 500,
      items: [{ id: 'coffee', name: 'Café', qty: 2, unitPrice: 2500, lineTotal: 5000 }],
      payments: [
        { method: 'cash', amount: 3000 },
        { method: 'debit', amount: 2000 },
        { method: 'mercadopago', amount: 500 },
      ],
    })
  })

  it('does not count a historical split tip twice', () => {
    const report = normalizeSalesReport('2026-11-10', [
      {
        id: 'ticket-2',
        created_at: '2026-11-10T15:00:00.000Z',
        status: 'delivered',
        total_price: 5000,
        tip_amount: 500,
        tip_included_in_payments: true,
        payments: [
          { method: 'cash', amount: 3000 },
          { method: 'debit', amount: 2500 },
        ],
        items: [{ id: 'coffee', name: 'Café', qty: 2, price: 2500 }],
      },
    ])

    expect(summarizeSales(report.tickets).paymentMethods).toEqual([
      { method: 'cash', amount: 3000, tickets: 1 },
      { method: 'debit', amount: 2500, tickets: 1 },
    ])
  })

  it('aggregates units, line amounts, ticket sales, and local hours', () => {
    const report = normalizeSalesReport('2026-11-10', [
      {
        id: 'ticket-3',
        created_at: '2026-11-10T15:00:00.000Z',
        status: 'delivered',
        total_price: 4600,
        tip_amount: 400,
        tip_payment_method: 'cash',
        tip_included_in_payments: false,
        payments: [{ method: 'mp', amount: 4600 }],
        items: [
          { id: 'coffee', name: 'Café', qty: 2, price: 2000 },
          { id: 'cake', name: 'Torta', qty: 1, price: 600 },
        ],
      },
    ])
    const summary = summarizeSales(report.tickets)

    expect(summary).toMatchObject({
      tickets: 1,
      units: 3,
      sales: 4600,
      tips: 400,
      paymentMethods: [
        { method: 'mercadopago', amount: 4600, tickets: 1 },
        { method: 'cash', amount: 400, tickets: 1 },
      ],
      products: [
        {
          key: 'coffee',
          name: 'Café',
          units: 2,
          amount: 4000,
          tickets: 1,
          paymentMethods: ['mercadopago', 'cash'],
        },
        {
          key: 'cake',
          name: 'Torta',
          units: 1,
          amount: 600,
          tickets: 1,
          paymentMethods: ['mercadopago', 'cash'],
        },
      ],
    })
    expect(summary.hourly[12]).toMatchObject({ units: 3, sales: 4600, tickets: 1 })
  })

  it('ignores malformed tickets and product lines', () => {
    const report = normalizeSalesReport('2026-11-10', [
      null,
      {
        id: 'ticket-4',
        created_at: 'not-a-date',
        items: [],
      },
      {
        id: 'ticket-5',
        created_at: '2026-11-10T15:00:00.000Z',
        total_price: 0,
        items: [{ name: '', qty: 1, price: 0 }],
      },
    ])
    expect(report.tickets).toHaveLength(1)
    expect(report.tickets[0].items).toEqual([])
  })
})
