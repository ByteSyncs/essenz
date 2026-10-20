import type { APIRoute } from 'astro'
import { requireOrganizationOwner } from '../../../../../libs/server/requireOrganizationOwner'

export const GET: APIRoute = async ({ locals, params, url }) => {
  const { slug } = params
  if (!slug) {
    return Response.json({ success: false, error: 'slug_not_found' }, { status: 400 })
  }

  const rawLimit = Number.parseInt(url.searchParams.get('limit') ?? '50', 10)
  const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(rawLimit, 1), 100) : 50

  try {
    const authorization = await requireOrganizationOwner(locals, slug)
    if (!authorization.authorized) return authorization.response

    const { data: expenses, error: expError } = await locals.supabase
      .from('expenses')
      .select('id, description, amount, category, created_at')
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
    const authorization = await requireOrganizationOwner(locals, slug)
    if (!authorization.authorized) return authorization.response

    let body: any
    try {
      body = await request.json()
    } catch {
      return Response.json({ success: false, error: 'invalid_body' }, { status: 400 })
    }

    const { description, amount, category } = body

    if (!description?.trim() || !amount || parseFloat(amount) <= 0) {
      return Response.json({ success: false, error: 'invalid_fields' }, { status: 422 })
    }

    const validCategories = ['supplies', 'maintenance', 'utilities', 'staff', 'other']
    if (!validCategories.includes(category)) {
      return Response.json({ success: false, error: 'invalid_category' }, { status: 422 })
    }

    const { data: expense, error: insertError } = await locals.supabase
      .from('expenses')
      .insert({
        organization_id: authorization.organizationId,
        description: description.trim(),
        amount: parseFloat(amount),
        category,
      })
      .select('id, description, amount, category, created_at')
      .single()

    if (insertError) throw insertError

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
    const authorization = await requireOrganizationOwner(locals, slug)
    if (!authorization.authorized) return authorization.response

    const { error: deleteError } = await locals.supabase
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
