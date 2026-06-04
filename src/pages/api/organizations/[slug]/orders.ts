import type { APIRoute } from 'astro'
import { validateNewOrder } from '../../../../libs/schemas/orders/new'
import * as Sentry from '@sentry/astro'
import { validateDeleteOrder } from '../../../../libs/schemas/orders/delete'

export const GET: APIRoute = async ({ locals, params }) => {
  const { slug } = params
  if (!slug) {
    return Response.json({
      success: false,
      error: 'slug_not_found',
      meta: {
        server_time: new Date().toISOString(),
      },
    })
  }
  const supabase = locals.supabase

  try {
    const { data: ordersData, error: ordersError } = await supabase
      .from('orders')
      .select('*')
      .eq('org_slug', slug)
      .in('status', ['pending', 'preparing'])
      .order('created_at', { ascending: true })

    if (!ordersData) {
      return Response.json(
        {
          success: true,
          data: [],
          meta: {
            server_time: new Date().toISOString(),
          },
        },
        { status: 200 },
      )
    }

    if (ordersError) {
      console.error(ordersError)
      return Response.json(
        {
          success: false,
          error: 'internal_server_error',
          meta: {
            server_time: new Date().toISOString(),
          },
        },
        { status: 400 },
      )
    }

    return Response.json({
      success: true,
      data: ordersData ?? [],
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
      },
      { status: 500 },
    )
  }
}

export const POST: APIRoute = async ({ locals, params, request }) => {
  const { slug } = params
  if (!slug) {
    return Response.json(
      {
        success: false,
        error: 'slug_not_found',
      },
      { status: 400 },
    )
  }

  const supabase = locals.supabase
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

  const validation = validateNewOrder(body)
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

  const {
    customer_name,
    status,
    total_price,
    table_number,
    items,
    discount_amount,
    payments,
    discount_reason,
    change_returned,
  } = validation.data

  try {
    const { data, error } = await supabase
      .from('orders')
      .insert({
        org_slug: slug,
        customer_name,
        status,
        total_price,
        items,
        table_number,
        discount_amount,
        payments,
        discount_reason,
        change_returned,
      })
      .select()
      .single()

    if (error) throw error

    return Response.json({
      success: true,
      data,
      meta: {
        server_time: new Date().toISOString(),
      },
    })
  } catch (err) {
    console.error(err)
    // Sentry.captureException(err)
    return Response.json(
      {
        success: false,
        error: 'internal_server_error',
      },
      { status: 500 },
    )
  }
}

export const DELETE: APIRoute = async ({ locals, params, request }) => {
  const { slug } = params
  if (!slug) {
    return Response.json(
      {
        success: false,
        error: 'slug_not_found',
      },
      { status: 400 },
    )
  }

  const supabase = locals.supabase
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
  const validation = validateDeleteOrder(body)
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

  const { id } = validation.data

  try {
    const { error } = await supabase.from('orders').delete().eq('id', id).eq('org_slug', slug)

    if (error) throw error

    return Response.json({ success: true }, { status: 200 })
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
