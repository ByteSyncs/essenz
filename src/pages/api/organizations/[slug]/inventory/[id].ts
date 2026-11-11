import type { APIRoute } from 'astro'
import { requireBranchStaff } from '../../../../../libs/server/branchStaff'
import { validateUpdateItemInventory } from '../../../../../libs/schemas/inventory/update'

export const DELETE: APIRoute = async ({ locals, params }) => {
  const { slug, id } = params
  if (!slug) {
    return Response.json({ success: false, error: 'slug_not_found' }, { status: 400 })
  }

  if (!id) {
    return Response.json({ success: false, error: 'itemID_not_found' }, { status: 400 })
  }

  try {
    const authorization = await requireBranchStaff(locals, slug)
    if (!authorization.authorized) return authorization.response
    const org = { id: authorization.organizationId }
    const supabase = authorization.db

    const { error: deleteError } = await supabase
      .from('inventory_items')
      .delete()
      .eq('id', id)
      .eq('organization_id', org.id)

    if (deleteError) {
      throw deleteError
    }

    return Response.json(null, { status: 203 })
  } catch (err) {
    console.error(err)
    return Response.json(
      {
        success: false,
        error: 'internal_server_error',
      },
      { status: 500 },
    )
  }
}

export const PATCH: APIRoute = async ({ locals, params, request }) => {
  const { slug, id } = params
  if (!slug) {
    return Response.json({ success: false, error: 'slug_not_found' }, { status: 400 })
  }

  if (!id) {
    return Response.json({ success: false, error: 'itemID_not_found' }, { status: 400 })
  }

  let body
  try {
    body = await request.json()
  } catch (err) {
    return Response.json({ success: false, error: 'invalid_request_body' }, { status: 400 })
  }
  const validation = validateUpdateItemInventory(body)
  if (!validation.success) {
    console.error(validation.errors)
    return Response.json({ success: false, errors: validation.errors }, { status: 422 })
  }

  const { stock } = validation.data

  try {
    const authorization = await requireBranchStaff(locals, slug)
    if (!authorization.authorized) return authorization.response
    const org = { id: authorization.organizationId }
    const supabase = authorization.db

    const { data: updateItem, error: updateError } = await supabase
      .from('inventory_items')
      .update({
        stock,
      })
      .eq('id', id)
      .eq('organization_id', org.id)
      .select()
      .single()

    if (updateError) throw updateError

    return Response.json({
      success: true,
      item: updateItem,
    })
  } catch (err) {
    console.error(err)
    return Response.json(
      {
        success: false,
        error: 'internal_server_error',
      },
      { status: 500 },
    )
  }
}
