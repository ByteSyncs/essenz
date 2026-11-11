import type { APIRoute } from 'astro'
import { parseCashAmount } from '../../../../../libs/cashRegister'
import { requireBranchStaff } from '../../../../../libs/server/branchStaff'

function errorCode(error: unknown) {
  if (!error || typeof error !== 'object') return ''
  const value = error as { code?: unknown; message?: unknown }
  return `${typeof value.code === 'string' ? value.code : ''} ${typeof value.message === 'string' ? value.message : ''}`
}

export const GET: APIRoute = async ({ locals, params, url }) => {
  const { slug } = params
  if (!slug) {
    return Response.json({ success: false, error: 'slug_not_found' }, { status: 400 })
  }

  const rawLimit = Number.parseInt(url.searchParams.get('limit') ?? '50', 10)
  const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(rawLimit, 1), 100) : 50

  try {
    const authorization = await requireBranchStaff(locals, slug)
    if (!authorization.authorized) return authorization.response

    const { data: expenses, error: expError } = await authorization.db
      .from('expenses')
      .select('id, description, amount, category, uses_cash, created_at')
      .eq('organization_id', authorization.organizationId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (expError) throw expError

    return Response.json({ success: true, data: expenses ?? [] })
  } catch (err) {
    console.error(err)
    return Response.json({ success: false, error: 'internal_server_error' }, { status: 500 })
  }
}

export const POST: APIRoute = async ({ locals, request, params }) => {
  const { slug } = params
  if (!slug) {
    return Response.json({ success: false, error: 'slug_not_found' }, { status: 400 })
  }

  try {
    const authorization = await requireBranchStaff(locals, slug)
    if (!authorization.authorized) return authorization.response

    let body: Record<string, unknown>
    try {
      const value: unknown = await request.json()
      if (!value || typeof value !== 'object' || Array.isArray(value)) {
        return Response.json({ success: false, error: 'invalid_body' }, { status: 400 })
      }
      body = value as Record<string, unknown>
    } catch {
      return Response.json({ success: false, error: 'invalid_body' }, { status: 400 })
    }

    const { description, amount, category } = body
    const usesCash = body.usesCash === undefined ? true : body.usesCash

    const normalizedAmount = parseCashAmount(amount, false)
    if (
      typeof description !== 'string' ||
      !description.trim() ||
      normalizedAmount === null ||
      typeof usesCash !== 'boolean'
    ) {
      return Response.json({ success: false, error: 'invalid_fields' }, { status: 422 })
    }

    const validCategories = ['supplies', 'maintenance', 'utilities', 'staff', 'other']
    if (!validCategories.includes(category)) {
      return Response.json({ success: false, error: 'invalid_category' }, { status: 422 })
    }

    const { data: expense, error: insertError } = await authorization.db
      .from('expenses')
      .insert({
        organization_id: authorization.organizationId,
        description: description.trim(),
        amount: normalizedAmount,
        category,
        uses_cash: usesCash,
      })
      .select('id, description, amount, category, uses_cash, created_at')
      .single()

    if (insertError) {
      if (errorCode(insertError).includes('cash_register_closed')) {
        return Response.json({ success: false, error: 'cash_register_closed' }, { status: 409 })
      }
      throw insertError
    }

    return Response.json({ success: true, data: expense })
  } catch (err) {
    console.error(err)
    return Response.json({ success: false, error: 'internal_server_error' }, { status: 500 })
  }
}

export const DELETE: APIRoute = async ({ locals, params, url }) => {
  const { slug } = params
  const expenseId = url.searchParams.get('id')

  if (!slug || !expenseId) {
    return Response.json({ success: false, error: 'missing_params' }, { status: 400 })
  }

  try {
    const authorization = await requireBranchStaff(locals, slug)
    if (!authorization.authorized) return authorization.response

    const { error: deleteError } = await authorization.db
      .from('expenses')
      .delete()
      .eq('id', expenseId)
      .eq('organization_id', authorization.organizationId)

    if (deleteError) throw deleteError

    return Response.json({ success: true })
  } catch (err) {
    console.error(err)
    return Response.json({ success: false, error: 'internal_server_error' }, { status: 500 })
  }
}
