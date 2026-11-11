import type { APIRoute } from 'astro'
import { normalizeCashText, parseCashAmount } from '../../../../../libs/cashRegister'
import { requireBranchStaff } from '../../../../../libs/server/branchStaff'
import { privateJson } from '../../../../../libs/server/http'
import supabaseAdmin from '../../../../../libs/supabaseAdmin'
import type { CashMovementType } from '../../../../../types/cashRegister'

const MOVEMENT_TYPES = new Set<CashMovementType>(['cash_in', 'cash_out', 'safe_drop'])
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
    const movementType =
      typeof body.type === 'string' && MOVEMENT_TYPES.has(body.type as CashMovementType)
        ? (body.type as CashMovementType)
        : null
    const amount = parseCashAmount(body.amount, false)
    const description = normalizeCashText(body.description, 120)
    const note = normalizeCashText(body.note, 500)
    const createdByName = normalizeCashText(body.createdByName, 80)

    if (!UUID_PATTERN.test(sessionId)) {
      return privateJson({ success: false, error: 'invalid_session' }, 422)
    }
    if (!movementType) return privateJson({ success: false, error: 'invalid_movement_type' }, 422)
    if (amount === null) return privateJson({ success: false, error: 'invalid_amount' }, 422)
    if (!description || description === undefined) {
      return privateJson({ success: false, error: 'invalid_description' }, 422)
    }
    if (note === undefined || createdByName === undefined) {
      return privateJson({ success: false, error: 'invalid_text' }, 422)
    }

    const { data, error } = await supabaseAdmin
      .from('cash_register_movements')
      .insert({
        organization_id: authorization.organizationId,
        session_id: sessionId,
        movement_type: movementType,
        amount,
        description,
        note,
        created_by: locals.user?.id ?? null,
        created_by_name: createdByName,
      })
      .select('id, movement_type, amount, description, note, created_at, created_by_name')
      .single()

    if (error) {
      if (errorMessage(error).includes('cash_register_not_open')) {
        return privateJson({ success: false, error: 'cash_register_not_open' }, 409)
      }
      throw error
    }

    return privateJson({ success: true, data }, 201)
  } catch (error) {
    console.error('[cash-register] movement POST failed:', error)
    return privateJson({ success: false, error: 'internal_server_error' }, 500)
  }
}

export const DELETE: APIRoute = async ({ locals, params, request }) => {
  const { slug } = params
  if (!slug) return privateJson({ success: false, error: 'slug_not_found' }, 400)

  try {
    const authorization = await requireBranchStaff(locals, slug)
    if (!authorization.authorized) return authorization.response

    const movementId = new URL(request.url).searchParams.get('id') ?? ''
    if (!UUID_PATTERN.test(movementId)) {
      return privateJson({ success: false, error: 'invalid_movement' }, 422)
    }

    const { data, error } = await supabaseAdmin
      .from('cash_register_movements')
      .update({
        voided_at: new Date().toISOString(),
        voided_by: locals.user?.id ?? null,
      })
      .eq('id', movementId)
      .eq('organization_id', authorization.organizationId)
      .is('voided_at', null)
      .select('id')
      .maybeSingle()

    if (error) {
      if (errorMessage(error).includes('cash_register_not_open')) {
        return privateJson({ success: false, error: 'cash_register_not_open' }, 409)
      }
      if (errorMessage(error).includes('cash_register_movement_already_voided')) {
        return privateJson({ success: false, error: 'cash_register_movement_not_found' }, 404)
      }
      throw error
    }

    if (!data) {
      return privateJson({ success: false, error: 'cash_register_movement_not_found' }, 404)
    }

    return privateJson({ success: true })
  } catch (error) {
    console.error('[cash-register] movement DELETE failed:', error)
    return privateJson({ success: false, error: 'internal_server_error' }, 500)
  }
}
