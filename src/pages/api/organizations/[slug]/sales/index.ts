import type { APIRoute } from 'astro'
import * as Sentry from '@sentry/astro'
import {
  getArgentinaDate,
  getArgentinaHourBounds,
  isValidSalesDate,
  normalizeSalesReport,
} from '../../../../../libs/salesReport'
import { requireBranchStaff } from '../../../../../libs/server/branchStaff'
import supabaseAdmin from '../../../../../libs/supabaseAdmin'

const PAGE_SIZE = 500
const MAX_ORDERS = 20_000

function json(body: unknown, status = 200) {
  return Response.json(body, { status, headers: { 'Cache-Control': 'private, no-store' } })
}

function parseHour(value: string | null, fallback: number): number | null {
  if (value === null) return fallback
  if (!/^\d{1,2}$/.test(value)) return null
  const hour = Number(value)
  return Number.isInteger(hour) && hour >= 0 && hour <= 23 ? hour : null
}

export const GET: APIRoute = async ({ locals, params, url }) => {
  const slug = params.slug
  if (!slug) return json({ success: false, error: 'not_found' }, 404)

  const date = url.searchParams.get('date') ?? getArgentinaDate()
  const fromHour = parseHour(url.searchParams.get('from'), 0)
  const throughHour = parseHour(url.searchParams.get('to'), 23)

  if (!isValidSalesDate(date)) {
    return json({ success: false, error: 'invalid_date' }, 422)
  }
  if (fromHour === null || throughHour === null || fromHour > throughHour) {
    return json({ success: false, error: 'invalid_hour_range' }, 422)
  }

  try {
    const authorization = await requireBranchStaff(locals, slug)
    if (!authorization.authorized) return authorization.response

    const { start, end } = getArgentinaHourBounds(date, fromHour, throughHour)
    const orders: unknown[] = []

    for (let offset = 0; offset < MAX_ORDERS; offset += PAGE_SIZE) {
      const { data, error } = await supabaseAdmin
        .from('orders')
        .select(
          'id, created_at, status, total_price, discount_amount, tip_amount, tip_payment_method, tip_included_in_payments, payments, items',
        )
        .eq('org_slug', slug)
        .neq('status', 'cancelled')
        .gte('created_at', start)
        .lt('created_at', end)
        .order('created_at', { ascending: false })
        .range(offset, offset + PAGE_SIZE - 1)

      if (error) throw error
      const page = Array.isArray(data) ? data : []
      orders.push(...page)
      if (page.length < PAGE_SIZE) break
      if (offset + PAGE_SIZE >= MAX_ORDERS) {
        return json({ success: false, error: 'report_too_large' }, 422)
      }
    }

    return json({ success: true, data: normalizeSalesReport(date, orders) })
  } catch (error) {
    Sentry.captureException(error, { tags: { mechanism: 'sales_report' } })
    return json({ success: false, error: 'internal_server_error' }, 500)
  }
}
