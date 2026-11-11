import type { APIRoute } from 'astro'
import * as Sentry from '@sentry/astro'
import { mapOrderRow, parseOrdersLimit, type OrderRow } from '../../../libs/account/orders'
import { privateJson } from '../../../libs/server/http'
import { requireAccountOwner } from '../../../libs/server/requireAccountOwner'
import supabaseAdmin from '../../../libs/supabaseAdmin'
import type { OrdersData } from '../../../types/account'

export const GET: APIRoute = async ({ locals, url }) => {
  try {
    const authorization = await requireAccountOwner(locals)
    if (!authorization.authorized) return authorization.response

    const limit = parseOrdersLimit(url.searchParams.get('limit'))
    const { branches } = authorization.context

    const results = await Promise.all(
      branches.map(async (branch) => {
        const { data, error } = await supabaseAdmin
          .from('orders')
          .select('id, customer_name, total_price, status, created_at')
          .eq('org_slug', branch.slug)
          .order('created_at', { ascending: false })
          .limit(limit)
        if (error) throw error
        return {
          branchSlug: branch.slug,
          branchName: branch.name,
          orders: ((data ?? []) as OrderRow[]).map((row) => mapOrderRow(row, branch)),
        }
      }),
    )

    const body: OrdersData = { branches: results, limit }
    return privateJson({ success: true, data: body })
  } catch (err) {
    Sentry.captureException(err, { tags: { mechanism: 'account_orders' } })
    return privateJson({ success: false, error: 'internal_server_error' }, 500)
  }
}
