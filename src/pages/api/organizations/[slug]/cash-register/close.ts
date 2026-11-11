import type { APIRoute } from 'astro'
import { normalizeCashText, parseCashAmount } from '../../../../../libs/cashRegister'
import { requireBranchStaff } from '../../../../../libs/server/branchStaff'
import { privateJson } from '../../../../../libs/server/http'
import supabaseAdmin from '../../../../../libs/supabaseAdmin'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function errorMessage(error: unknown) {
  return error && typeof error === 'object' && 'message' in error ? String(error.message) : ''
}

export const POST: APIRoute = async ({ locals, params, request }) => {
  const { slug } = params
  if (!slug) return privateJson({ success: false, error: 'slug_not_found' }, 400)

  try {
    const authorization = await requireBranchStaff(locals, slug)
    if (!authorization.authorized) return authorization.response

    let body: Record<string, unknown>
    try {
      const value: unknown = await request.json()
      if (!value || typeof value !== 'object' || Array.isArray(value)) {
        return privateJson({ success: false, error: 'invalid_request_body' }, 400)
      }
      body = value as Record<string, unknown>
    } catch {
      return privateJson({ success: false, error: 'invalid_request_body' }, 400)
    }

    const sessionId = typeof body.sessionId === 'string' ? body.sessionId : ''
    const cashCounted = parseCashAmount(body.cashCounted)
    const closedByName = normalizeCashText(body.closedByName, 80)
    const differenceReason = normalizeCashText(body.differenceReason, 300)
    const closingNote = normalizeCashText(body.closingNote, 500)

    if (!UUID_PATTERN.test(sessionId)) {
      return privateJson({ success: false, error: 'invalid_session' }, 422)
    }
    if (cashCounted === null) return privateJson({ success: false, error: 'invalid_amount' }, 422)
    if (closedByName === undefined || differenceReason === undefined || closingNote === undefined) {
      return privateJson({ success: false, error: 'invalid_text' }, 422)
    }

    const { data, error } = await supabaseAdmin.rpc('close_cash_register', {
      p_session_id: sessionId,
      p_organization_id: authorization.organizationId,
      p_closed_by: locals.user?.id ?? null,
      p_closed_by_name: closedByName,
      p_cash_counted: cashCounted,
      p_difference_reason: differenceReason,
      p_closing_note: closingNote,
    })

    if (error) {
      const message = errorMessage(error)
      if (message.includes('cash_register_not_found')) {
        return privateJson({ success: false, error: 'cash_register_not_found' }, 404)
      }
      if (message.includes('cash_register_already_closed')) {
        return privateJson({ success: false, error: 'cash_register_already_closed' }, 409)
      }
      if (message.includes('cash_difference_reason_required')) {
        return privateJson({ success: false, error: 'cash_difference_reason_required' }, 422)
      }
      if (message.includes('invalid_cash_counted')) {
        return privateJson({ success: false, error: 'invalid_amount' }, 422)
      }
      throw error
    }

    if (!data) throw new Error('cash_register_close_result_missing')
    return privateJson({ success: true, data })
  } catch (error) {
    console.error('[cash-register] close POST failed:', error)
    return privateJson({ success: false, error: 'internal_server_error' }, 500)
  }
}
