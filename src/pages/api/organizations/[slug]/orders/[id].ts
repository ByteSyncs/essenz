import type { APIRoute } from 'astro'
import { validateUpdateOrder } from '../../../../../libs/schemas/orders/update'

export const PATCH: APIRoute = async ({ locals, request, params }) => {
  const { slug, id } = params
  if (!slug) {
    return Response.json(
      {
        success: false,
        error: 'slug_not_found',
      },
      { status: 400 },
    )
  }

  if (!id) {
    return Response.json(
      {
        success: false,
        error: 'itemID_not_found',
      },
      { status: 400 },
    )
  }

  let body
  try {
    body = await request.json()
  } catch (err) {
    return Response.json(
      {
        success: false,
        error: 'invalid_request_body',
      },
      { status: 400 },
    )
  }
  const supabase = locals.supabase

  const validation = validateUpdateOrder(body)
  if (!validation.success) {
    console.error({ VALIDATION_ERROR: validation.errors })
    return Response.json(
      {
        success: false,
        errors: validation.errors,
      },
      { status: 422 },
    )
  }

  const { status } = validation.data

  try {
    const { data: updateOrder, error: updateError } = await supabase
      .from('orders')
      .update({
        status,
        updated_at: new Date().toISOString(),
      })
      .eq('org_slug', slug)
      .eq('id', id)
      .select()
      .single()

    if (updateError) throw updateError

    return Response.json({
      success: true,
      order: updateOrder,
      meta: {
        server_time: new Date().toISOString(),
      },
    })
  } catch (err) {
    console.error(err)
    return Response.json(
      {
        success: false,
        error: 'internal_server_error',
        meta: {
          server_time: new Date().toISOString(),
        },
      },
      { status: 500 },
    )
  }
}
