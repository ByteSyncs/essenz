import type { APIRoute } from 'astro'
import * as Sentry from '@sentry/astro'
import { buildDashboard } from '../../../libs/account/dashboard'
import { resolvePeriod } from '../../../libs/account/period'
import { privateJson } from '../../../libs/server/http'
import { requireAccountOwner } from '../../../libs/server/requireAccountOwner'
import supabaseAdmin from '../../../libs/supabaseAdmin'
import type { RawDashboard } from '../../../types/account'

export const GET: APIRoute = async ({ locals, url }) => {
  try {
    const authorization = await requireAccountOwner(locals)
    if (!authorization.authorized) return authorization.response

    const now = new Date()
    const resolved = resolvePeriod(
      {
        preset: url.searchParams.get('range'),
        from: url.searchParams.get('from'),
        to: url.searchParams.get('to'),
      },
      now,
    )

    if (!resolved.ok) {
      return privateJson({ success: false, error: resolved.error }, 422)
    }

    const { period } = resolved

    const { data, error } = await supabaseAdmin.rpc('get_account_dashboard', {
      p_account_id: authorization.context.accountId,
      p_from: period.startsAt,
      p_to: period.endsAt,
      p_prev_from: period.prevStartsAt,
      p_prev_to: period.prevEndsAt,
    })

    if (error) throw error

    return privateJson({
      success: true,
      data: buildDashboard(data as RawDashboard, period, now),
    })
  } catch (err) {
    Sentry.captureException(err, { tags: { mechanism: 'account_dashboard' } })
    return privateJson({ success: false, error: 'internal_server_error' }, 500)
  }
}
