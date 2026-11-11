import type { APIRoute } from 'astro'
import { normalizeCashText, parseCashAmount } from '../../../../../libs/cashRegister'
import { requireBranchStaff } from '../../../../../libs/server/branchStaff'
import { privateJson } from '../../../../../libs/server/http'
import supabaseAdmin from '../../../../../libs/supabaseAdmin'
import type {
  CashRegisterData,
  CashRegisterMovement,
  CashRegisterSession,
  CashRegisterSummary,
} from '../../../../../types/cashRegister'

interface SessionRow {
  id: string
  opened_at: string
  opened_by_name: string | null
  opening_amount: number | string
  opening_note: string | null
  closed_at: string | null
  closed_by_name: string | null
  cash_expected: number | string | null
  cash_counted: number | string | null
  difference: number | string | null
  difference_reason: string | null
  closing_note: string | null
  summary_snapshot: CashRegisterSummary | null
}

interface MovementRow {
  id: string
  session_id: string
  movement_type: CashRegisterMovement['type']
  amount: number | string
  description: string
  note: string | null
  created_at: string
  created_by_name: string | null
  voided_at: string | null
}

function numberOrNull(value: number | string | null) {
  if (value === null) return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function mapSession(
  row: SessionRow,
  summary: CashRegisterSummary | null,
  movements: CashRegisterMovement[] = [],
): CashRegisterSession {
  return {
    id: row.id,
    openedAt: row.opened_at,
    openedByName: row.opened_by_name,
    openingAmount: Number(row.opening_amount),
    openingNote: row.opening_note,
    closedAt: row.closed_at,
    closedByName: row.closed_by_name,
    cashExpected: numberOrNull(row.cash_expected),
    cashCounted: numberOrNull(row.cash_counted),
    difference: numberOrNull(row.difference),
    differenceReason: row.difference_reason,
    closingNote: row.closing_note,
    summary,
    movements,
  }
}

function mapMovement(row: MovementRow): CashRegisterMovement {
  return {
    id: row.id,
    type: row.movement_type,
    amount: Number(row.amount),
    description: row.description,
    note: row.note,
    createdAt: row.created_at,
    createdByName: row.created_by_name,
    voidedAt: row.voided_at,
  }
}

export const GET: APIRoute = async ({ locals, params }) => {
  const { slug } = params
  if (!slug) return privateJson({ success: false, error: 'slug_not_found' }, 400)

  try {
    const authorization = await requireBranchStaff(locals, slug)
    if (!authorization.authorized) return authorization.response

    const sessionFields =
      'id, opened_at, opened_by_name, opening_amount, opening_note, closed_at, closed_by_name, cash_expected, cash_counted, difference, difference_reason, closing_note, summary_snapshot'

    const [activeResult, historyResult] = await Promise.all([
      supabaseAdmin
        .from('cash_register_sessions')
        .select(sessionFields)
        .eq('organization_id', authorization.organizationId)
        .is('closed_at', null)
        .maybeSingle(),
      supabaseAdmin
        .from('cash_register_sessions')
        .select(sessionFields)
        .eq('organization_id', authorization.organizationId)
        .not('closed_at', 'is', null)
        .order('closed_at', { ascending: false })
        .limit(20),
    ])

    if (activeResult.error) throw activeResult.error
    if (historyResult.error) throw historyResult.error

    let active: CashRegisterSession | null = null
    if (activeResult.data) {
      const row = activeResult.data as SessionRow
      const [summaryResult, movementResult] = await Promise.all([
        supabaseAdmin.rpc('cash_register_summary', { p_session_id: row.id }),
        supabaseAdmin
          .from('cash_register_movements')
          .select(
            'id, session_id, movement_type, amount, description, note, created_at, created_by_name, voided_at',
          )
          .eq('organization_id', authorization.organizationId)
          .eq('session_id', row.id)
          .order('created_at', { ascending: false })
          .limit(50),
      ])

      if (summaryResult.error) throw summaryResult.error
      if (movementResult.error) throw movementResult.error

      active = mapSession(
        row,
        summaryResult.data as CashRegisterSummary | null,
        ((movementResult.data ?? []) as MovementRow[]).map(mapMovement),
      )
    }

    const historyRows = (historyResult.data ?? []) as SessionRow[]
    const historyIds = historyRows.map((row) => row.id)
    let historyMovements: MovementRow[] = []
    if (historyIds.length > 0) {
      const { data: movementRows, error: historyMovementError } = await supabaseAdmin
        .from('cash_register_movements')
        .select(
          'id, session_id, movement_type, amount, description, note, created_at, created_by_name, voided_at',
        )
        .eq('organization_id', authorization.organizationId)
        .in('session_id', historyIds)
        .order('created_at', { ascending: false })
        .limit(100)

      if (historyMovementError) throw historyMovementError
      historyMovements = (movementRows ?? []) as MovementRow[]
    }

    const movementsBySession = new Map<string, CashRegisterMovement[]>()
    for (const movement of historyMovements) {
      const grouped = movementsBySession.get(movement.session_id) ?? []
      grouped.push(mapMovement(movement))
      movementsBySession.set(movement.session_id, grouped)
    }

    const data: CashRegisterData = {
      active,
      history: historyRows.map((row) =>
        mapSession(row, row.summary_snapshot, movementsBySession.get(row.id) ?? []),
      ),
    }

    return privateJson({ success: true, data })
  } catch (error) {
    console.error('[cash-register] GET failed:', error)
    return privateJson({ success: false, error: 'internal_server_error' }, 500)
  }
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

    const openingAmount = parseCashAmount(body.openingAmount)
    const openedByName = normalizeCashText(body.openedByName, 80)
    const openingNote = normalizeCashText(body.openingNote, 500)
    if (openingAmount === null) {
      return privateJson({ success: false, error: 'invalid_amount' }, 422)
    }
    if (openedByName === undefined || openingNote === undefined) {
      return privateJson({ success: false, error: 'invalid_text' }, 422)
    }

    const { data, error } = await supabaseAdmin
      .from('cash_register_sessions')
      .insert({
        organization_id: authorization.organizationId,
        opened_by: locals.user?.id ?? null,
        opened_by_name: openedByName,
        opening_amount: openingAmount,
        opening_note: openingNote,
      })
      .select(
        'id, opened_at, opened_by_name, opening_amount, opening_note, closed_at, closed_by_name, cash_expected, cash_counted, difference, difference_reason, closing_note, summary_snapshot',
      )
      .single()

    if (error) {
      if (error.code === '23505') {
        return privateJson({ success: false, error: 'cash_register_already_open' }, 409)
      }
      throw error
    }

    return privateJson(
      {
        success: true,
        data: { active: mapSession(data as SessionRow, null), history: [] },
      },
      201,
    )
  } catch (error) {
    console.error('[cash-register] POST failed:', error)
    return privateJson({ success: false, error: 'internal_server_error' }, 500)
  }
}
