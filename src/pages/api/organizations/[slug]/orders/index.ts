import type { APIRoute } from 'astro'
import * as Sentry from '@sentry/astro'
import supabaseAdmin from '../../../../../libs/supabaseAdmin'

const PAYMENT_METHODS = new Set(['cash', 'debit', 'credit', 'virtual'])
const DISCOUNT_REASONS = new Set(['clients', 'employees', 'others'])
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const MAX_ITEMS = 50
const MAX_QTY = 99
const MAX_AMOUNT = 10_000_000

const round2 = (value: number) => Math.round(value * 100) / 100

function json(body: unknown, status = 200) {
  return Response.json(body, { status, headers: { 'Cache-Control': 'private, no-store' } })
}

function toMoney(value: unknown): number | null {
  const parsed =
    typeof value === 'number'
      ? value
      : typeof value === 'string' && value.trim() !== ''
        ? Number(value)
        : NaN
  return Number.isFinite(parsed) && parsed >= 0 && parsed <= MAX_AMOUNT ? round2(parsed) : null
}

export const GET: APIRoute = async ({ params }) => {
  const slug = params.slug
  if (!slug) return json({ success: false, error: 'not_found' }, 404)

  const { data, error } = await supabaseAdmin
    .from('orders')
    .select('*')
    .eq('org_slug', slug)
    .in('status', ['pending', 'preparing'])
    .order('created_at', { ascending: true })

  if (error) {
    Sentry.captureException(error, { tags: { mechanism: 'list_orders' } })
    return json({ success: false, error: 'internal_server_error' }, 500)
  }

  return json({ success: true, data })
}

export const POST: APIRoute = async ({ params, request }) => {
  const slug = params.slug
  if (!slug) return json({ success: false, error: 'not_found' }, 404)

  let body: any
  try {
    body = await request.json()
  } catch {
    return json({ success: false, error: 'invalid_request_body' }, 400)
  }

  const customerName = typeof body?.customer_name === 'string' ? body.customer_name.trim() : ''
  if (customerName.length < 1 || customerName.length > 80) {
    return json({ success: false, error: 'invalid_customer_name' }, 422)
  }

  const tableNumber =
    typeof body?.table_number === 'string' && body.table_number.trim()
      ? body.table_number.trim().slice(0, 20)
      : null

  const rawItems = Array.isArray(body?.items) ? body.items : []
  if (rawItems.length === 0 || rawItems.length > MAX_ITEMS) {
    return json({ success: false, error: 'invalid_items' }, 422)
  }

  const quantities = new Map<string, number>()
  for (const raw of rawItems) {
    const id = typeof raw?.id === 'string' ? raw.id : ''
    const qty = Number(raw?.qty)
    if (!UUID_PATTERN.test(id) || !Number.isInteger(qty) || qty < 1 || qty > MAX_QTY) {
      return json({ success: false, error: 'invalid_items' }, 422)
    }
    quantities.set(id, Math.min(MAX_QTY, (quantities.get(id) ?? 0) + qty))
  }

  try {
    const { data: organization } = await supabaseAdmin
      .from('organizations')
      .select('id')
      .eq('slug', slug)
      .maybeSingle()

    if (!organization) return json({ success: false, error: 'not_found' }, 404)

    const ids = [...quantities.keys()]
    const { data: products, error: productsError } = await supabaseAdmin
      .from('products')
      .select('id, name, price, in_offer, offer_percent')
      .eq('organization_id', organization.id)
      .eq('is_active', true)
      .in('id', ids)

    if (productsError) throw productsError
    if (!products || products.length !== ids.length) {
      return json({ success: false, error: 'invalid_items' }, 422)
    }

    const productsById = new Map(products.map((product) => [product.id, product]))
    const items = ids.map((id) => {
      const product = productsById.get(id)!
      const base = Number(product.price)
      const percent = product.in_offer && product.offer_percent ? Number(product.offer_percent) : 0
      const price = percent > 0 ? Math.round(base * (1 - percent / 100)) : base
      return { id, name: product.name as string, price, qty: quantities.get(id)! }
    })

    const subtotal = round2(items.reduce((sum, item) => sum + item.price * item.qty, 0))

    let discountAmount = 0
    let discountReason: string | null = null
    const discount = body?.discount

    if (discount && typeof discount === 'object') {
      const value = Number(discount.value)
      if (!Number.isFinite(value) || value < 0) {
        return json({ success: false, error: 'invalid_discount' }, 422)
      }
      if (value > 0) {
        if (discount.type === 'percentage') {
          if (value > 100) return json({ success: false, error: 'invalid_discount' }, 422)
          discountAmount = (subtotal * value) / 100
        } else if (discount.type === 'fixed') {
          discountAmount = Math.min(value, subtotal)
        } else {
          return json({ success: false, error: 'invalid_discount' }, 422)
        }
        discountAmount = round2(discountAmount)
        discountReason = DISCOUNT_REASONS.has(discount.reason) ? discount.reason : 'others'
      }
    }

    const total = round2(Math.max(0, subtotal - discountAmount))

    const tip = toMoney(body?.tip_amount ?? 0)
    if (tip === null) return json({ success: false, error: 'invalid_tip' }, 422)

    const charged = round2(total + tip)

    const rawPayments = Array.isArray(body?.payments) ? body.payments : []
    let payments: { method: string; amount: number }[] = []

    if (rawPayments.length === 1) {
      const method = rawPayments[0]?.method
      if (!PAYMENT_METHODS.has(method)) {
        return json({ success: false, error: 'invalid_payments' }, 422)
      }
      payments = [{ method, amount: total }]
    } else if (rawPayments.length === 2) {
      for (const raw of rawPayments) {
        const amount = toMoney(raw?.amount)
        if (!PAYMENT_METHODS.has(raw?.method) || amount === null) {
          return json({ success: false, error: 'invalid_payments' }, 422)
        }
        payments.push({ method: raw.method, amount })
      }
      if (payments[0].method === payments[1].method) {
        return json({ success: false, error: 'invalid_payments' }, 422)
      }
      const paid = round2(payments[0].amount + payments[1].amount)
      if (Math.abs(paid - charged) > 0.01) {
        return json({ success: false, error: 'payments_mismatch' }, 422)
      }
    } else {
      return json({ success: false, error: 'invalid_payments' }, 422)
    }

    let changeReturned: number | null = null
    const cashPayment = payments.find((payment) => payment.method === 'cash')

    if (cashPayment) {
      const cashTarget = payments.length === 1 ? charged : cashPayment.amount
      const rawGiven = body?.cash_given
      const hasGiven = rawGiven !== undefined && rawGiven !== null && rawGiven !== ''
      const given = hasGiven ? toMoney(rawGiven) : null

      if (hasGiven && given === null) {
        return json({ success: false, error: 'invalid_cash_given' }, 422)
      }
      if (given !== null && given + 0.001 < cashTarget) {
        return json({ success: false, error: 'cash_insufficient' }, 422)
      }
      changeReturned = given !== null ? round2(given - cashTarget) : 0
    }

    const { data: order, error: insertError } = await supabaseAdmin
      .from('orders')
      .insert({
        org_slug: slug,
        customer_name: customerName,
        table_number: tableNumber,
        status: 'pending',
        items,
        total_price: total,
        payments,
        discount_amount: discountAmount,
        discount_reason: discountReason,
        tip_amount: tip,
        change_returned: changeReturned,
      })
      .select()
      .single()

    if (insertError) throw insertError

    return json({ success: true, data: order }, 201)
  } catch (err) {
    Sentry.captureException(err, { tags: { mechanism: 'create_order' } })
    return json({ success: false, error: 'internal_server_error' }, 500)
  }
}
