import type { APIRoute } from 'astro'
import * as Sentry from '@sentry/astro'
import { privateJson } from '../../../libs/server/http'
import { requireAccountOwner } from '../../../libs/server/requireAccountOwner'
import supabaseAdmin from '../../../libs/supabaseAdmin'
import type { ActivityData } from '../../../types/account'

export const GET: APIRoute = async ({ locals }) => {
  try {
    const authorization = await requireAccountOwner(locals)
    if (!authorization.authorized) return authorization.response

    const { data, error } = await supabaseAdmin.rpc('get_account_activity', {
      p_account_id: authorization.context.accountId,
      p_orders_limit: 8,
      p_stock_limit: 6,
    })

    if (error) throw error

    return privateJson({ success: true, data: data as ActivityData })
  } catch (err) {
    Sentry.captureException(err, { tags: { mechanism: 'account_activity' } })
    return privateJson({ success: false, error: 'internal_server_error' }, 500)
  }
}
