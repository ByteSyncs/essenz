import type { APIRoute } from 'astro'
import { validateNewItemInventory } from '../../../../../libs/schemas/inventory/new'

export const GET: APIRoute = async ({ locals, params, url }) => {
  const { slug } = params
  if (!slug) {
    return Response.json({ success: false, error: 'slug_not_found' }, { status: 400 })
  }

  const page = parseInt(url.searchParams.get('page') ?? '') || 1
  const perPage = parseInt(url.searchParams.get('per_page') ?? '') || 50

  const from = (page - 1) * perPage
  const to = from + perPage - 1

  const supabase = locals.supabase
  try {
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('id')
      .eq('slug', slug)
      .single()

    if (orgError || !org) {
      return Response.json({ success: false, error: 'organization_not_found' }, { status: 404 })
    }

    const {
      data: invData,
      error: invError,
      count,
    } = await supabase
      .from('inventory_items')
      .select('*', { count: 'exact' })
      .eq('organization_id', org.id)
      .range(from, to)

    if (invError) {
      throw invError
    }

    const calculatedPages = Math.ceil((count ?? 0) / perPage)

    return Response.json({
      success: true,
      products: invData,
      meta: {
        pagination: {
          page,
          perPage,
          totalItems: count ?? 0,
          totalPages: Math.max(1, calculatedPages),
        },
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

export const POST: APIRoute = async ({ locals, request, params }) => {
  const { slug } = params
  if (!slug) {
    return Response.json({ success: false, error: 'slug_not_found' }, { status: 400 })
  }

  const supabase = locals.supabase
  let body
  try {
    body = await request.json()
  } catch (err) {
    return Response.json({ success: false, error: 'invalid_request_body' }, { status: 400 })
  }
  const validation = validateNewItemInventory(body)
  if (!validation.success) {
    console.error(validation.errors)
    return Response.json({ success: false, errors: validation.errors }, { status: 422 })
  }

  try {
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('id')
      .eq('slug', slug)
      .single()

    if (orgError || !org) {
      return Response.json(
        {
          success: false,
          error: 'organization_not_found',
        },
        { status: 404 },
      )
    }

    const { data: newItem, error: insertError } = await supabase
      .from('inventory_items')
      .insert({
        ...validation.data,
        organization_id: org.id,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (insertError) throw insertError

    return Response.json({
      success: true,
      item: newItem,
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
