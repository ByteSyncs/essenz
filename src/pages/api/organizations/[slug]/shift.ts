import type { APIRoute } from 'astro'
import { requireBranchStaff } from '../../../../libs/server/branchStaff'
import { privateJson } from '../../../../libs/server/http'
import supabaseAdmin from '../../../../libs/supabaseAdmin'

interface ShiftRow {
  shift_id: string
  shift_started_at: string
}

type CashRegisterStatus = 'open' | 'closed' | 'unconfigured'

async function getCashRegisterStatus(organizationId: string): Promise<CashRegisterStatus> {
  const { data: active, error: activeError } = await supabaseAdmin
    .from('cash_register_sessions')
    .select('id')
    .eq('organization_id', organizationId)
    .is('closed_at', null)
    .maybeSingle()

  if (activeError) throw activeError
  if (active) return 'open'

  const { count, error: historyError } = await supabaseAdmin
    .from('cash_register_sessions')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', organizationId)

  if (historyError) throw historyError
  return count ? 'closed' : 'unconfigured'
}

async function countOrders(slug: string, startedAt: string) {
  const { count, error } = await supabaseAdmin
    .from('orders')
    .select('id', { count: 'exact', head: true })
    .eq('org_slug', slug)
    .gte('created_at', startedAt)
    .neq('status', 'cancelled')

  if (error) throw error
  return count ?? 0
}

export const GET: APIRoute = async ({ locals, params }) => {
  const { slug } = params
  if (!slug) return privateJson({ success: false, error: 'slug_not_found' }, 400)

  try {
    const authorization = await requireBranchStaff(locals, slug)
    if (!authorization.authorized) return authorization.response

    const { data, error } = await supabaseAdmin.rpc('ensure_branch_shift', {
      p_organization_id: authorization.organizationId,
    })
    if (error) throw error

    const shift = (data as ShiftRow[] | null)?.[0]
    if (!shift) throw new Error('shift_not_available')

    return privateJson({
      success: true,
      data: {
        id: shift.shift_id,
        startedAt: shift.shift_started_at,
        count: await countOrders(slug, shift.shift_started_at),
        cashRegisterStatus: await getCashRegisterStatus(authorization.organizationId),
      },
    })
  } catch (error) {
    console.error('[shift] GET failed:', error)
    return privateJson({ success: false, error: 'internal_server_error' }, 500)
  }
}

export const POST: APIRoute = async ({ locals, params }) => {
  const { slug } = params
  if (!slug) return privateJson({ success: false, error: 'slug_not_found' }, 400)

  try {
    const authorization = await requireBranchStaff(locals, slug)
    if (!authorization.authorized) return authorization.response

    const { data, error } = await supabaseAdmin.rpc('change_branch_shift', {
      p_organization_id: authorization.organizationId,
      p_user_id: locals.user!.id,
    })
    if (error) throw error

    const shift = (data as ShiftRow[] | null)?.[0]
    if (!shift) throw new Error('shift_not_available')

    return privateJson({
      success: true,
      data: {
        id: shift.shift_id,
        startedAt: shift.shift_started_at,
        count: 0,
        cashRegisterStatus: await getCashRegisterStatus(authorization.organizationId),
      },
    })
  } catch (error) {
    console.error('[shift] POST failed:', error)
    return privateJson({ success: false, error: 'internal_server_error' }, 500)
  }
}
