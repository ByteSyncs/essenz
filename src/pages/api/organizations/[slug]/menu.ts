import type { APIRoute } from 'astro'
import { validateNewMenuItem } from '../../../../libs/schemas/menu/new'
import { validateDeleteItem } from '../../../../libs/schemas/menu/delete'
import { PLANS } from '../../../../constants/suscriptions'
import supabaseAdmin from '../../../../libs/supabaseAdmin'
import { requireOrganizationOwner } from '../../../../libs/server/requireOrganizationOwner'

export const GET: APIRoute = async ({ locals, url, params }) => {
  const { slug } = params
  if (!slug) {
    return Response.json({ success: false, error: 'slug_not_found' }, { status: 400 })
  }

  const page = parseInt(url.searchParams.get('pages') || '1', 10)
  const limit = parseInt(url.searchParams.get('limit') || '20', 10)

  try {
    const {
      data: { user },
    } = await locals.supabase.auth.getUser()

    let query = locals.supabase
      .from('categories')
      .select(
        `
        id,
        title,
        display_order,
        items: products (
          id,
          name,
          price,
          description,
          image_url,
          category_id,
          intensity,
          details,
          is_active,
          in_offer,
          offer_percent,
          display_order,
          created_at
        ),
        organizations!inner (slug)
      `,
      )
      .eq('organizations.slug', slug)
      .order('display_order', { ascending: true })
      .order('display_order', { referencedTable: 'products', ascending: true })

    if (!user) {
      query = query.eq('products.is_active', true)
    }

    const { data, error } = await query
    if (error) throw error

    const cleanedData = data?.map(({ organizations, ...category }) => category) ?? []

    const totalProductsCount = cleanedData.reduce((acc, cat) => acc + (cat.items?.length || 0), 0)

    return new Response(
      JSON.stringify({
        success: true,
        data: cleanedData,
        meta: {
          pagination: {
            total: totalProductsCount,
            currentPage: page,
            limit,
            totalPages: Math.ceil(totalProductsCount / limit) || 1,
          },
          server_time: new Date().toISOString(),
        },
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      },
    )
  } catch (err) {
    console.error(err)
    return new Response(
      JSON.stringify({
        success: false,
        error: 'internal_server_error',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    )
  }
}

export const POST: APIRoute = async ({ locals, request, params }) => {
  const { slug } = params

  if (!slug) {
    return Response.json({ success: false, error: 'slug_not_found' }, { status: 400 })
  }

  try {
    const authorization = await requireOrganizationOwner(locals, slug)

    if (!authorization.authorized) {
      return authorization.response
    }

    let body: unknown

    try {
      body = await request.json()
    } catch {
      return Response.json({ success: false, error: 'invalid_request_body' }, { status: 400 })
    }

    const validation = validateNewMenuItem(body)

    if (!validation.success) {
      return Response.json({ success: false, errors: validation.errors }, { status: 422 })
    }

    const { data: organization, error: organizationError } = await supabaseAdmin
      .from('organizations')
      .select('id, account_id')
      .eq('id', authorization.organizationId)
      .maybeSingle()

    if (organizationError) {
      throw organizationError
    }

    if (!organization) {
      return Response.json({ success: false, error: 'organization_not_found' }, { status: 404 })
    }

    if (!organization.account_id) {
      return Response.json({ success: false, error: 'account_not_found' }, { status: 403 })
    }

    const { data: subscription, error: subscriptionError } = await supabaseAdmin
      .from('subscriptions')
      .select('plan_type, status, current_period_end')
      .eq('account_id', organization.account_id)
      .maybeSingle()

    if (subscriptionError) {
      throw subscriptionError
    }

    if (
      !subscription ||
      subscription.status !== 'active' ||
      !subscription.current_period_end ||
      new Date(subscription.current_period_end).getTime() <= Date.now()
    ) {
      return Response.json(
        { success: false, error: 'active_subscription_required' },
        { status: 403 },
      )
    }

    const plan = PLANS[subscription.plan_type as keyof typeof PLANS]

    if (!plan) {
      return Response.json({ success: false, error: 'invalid_subscription_plan' }, { status: 403 })
    }

    const { count, error: countError } = await supabaseAdmin
      .from('products')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', organization.id)

    if (countError) {
      throw countError
    }

    const currentCount = count ?? 0

    if (plan.maxProducts !== null && currentCount >= plan.maxProducts) {
      return Response.json(
        {
          success: false,
          error: 'product_limit_reached',
          data: {
            plan: plan.id,
            current: currentCount,
            limit: plan.maxProducts,
          },
        },
        { status: 409 },
      )
    }

    const newItemData = validation.data

    const { data: newProduct, error: productError } = await locals.supabase
      .from('products')
      .insert({
        organization_id: organization.id,
        name: newItemData.name,
        price: newItemData.price,
        description: newItemData.description,
        image_url: newItemData.image_url,
        category_id: newItemData.category_id,
        details: newItemData.details,
        intensity: newItemData.intensity,
        is_active: newItemData.is_active,
        in_offer: newItemData.in_offer,
        offer_percent: newItemData.in_offer ? newItemData.offer_percent : null,
      })
      .select()
      .single()

    if (productError) {
      console.error('[POST] Error creating product:', productError)

      return Response.json({ success: false, error: 'error_creating_product' }, { status: 400 })
    }

    return Response.json({ success: true, data: newProduct }, { status: 201 })
  } catch (err) {
    console.error('[POST] Menu - ', err)

    return Response.json({ success: false, error: 'internal_server_error' }, { status: 500 })
  }
}

export const PATCH: APIRoute = async ({ locals, params, request }) => {
  const { slug } = params

  if (!slug) {
    return Response.json({ success: false, error: 'slug_not_found' }, { status: 400 })
  }

  try {
    const authorization = await requireOrganizationOwner(locals, slug)

    if (!authorization.authorized) {
      return authorization.response
    }

    let body: unknown

    try {
      body = await request.json()
    } catch {
      return Response.json({ success: false, error: 'invalid_request_body' }, { status: 400 })
    }

    const idValidation = validateDeleteItem(body)

    if (!idValidation.success) {
      return Response.json({ success: false, errors: idValidation.errors }, { status: 422 })
    }

    const productValidation = validateNewMenuItem(body)

    if (!productValidation.success) {
      return Response.json({ success: false, errors: productValidation.errors }, { status: 422 })
    }

    const { id } = idValidation.data
    const updatedItemData = productValidation.data

    const { data: updatedProduct, error: updateError } = await locals.supabase
      .from('products')
      .update({
        name: updatedItemData.name,
        price: updatedItemData.price,
        description: updatedItemData.description,
        image_url: updatedItemData.image_url,
        category_id: updatedItemData.category_id,
        details: updatedItemData.details,
        intensity: updatedItemData.intensity,
        is_active: updatedItemData.is_active,
        in_offer: updatedItemData.in_offer,
        offer_percent: updatedItemData.in_offer ? updatedItemData.offer_percent : null,
      })
      .eq('id', id)
      .eq('organization_id', authorization.organizationId)
      .select()
      .maybeSingle()

    if (updateError) {
      console.error('[PATCH] Error updating product:', updateError)

      return Response.json({ success: false, error: 'error_updating_product' }, { status: 400 })
    }

    if (!updatedProduct) {
      return Response.json({ success: false, error: 'item_not_found' }, { status: 404 })
    }

    return Response.json({ success: true, data: updatedProduct }, { status: 200 })
  } catch (err) {
    console.error('[PATCH] Menu -', err)

    return Response.json({ success: false, error: 'internal_server_error' }, { status: 500 })
  }
}

export const DELETE: APIRoute = async ({ locals, params, request }) => {
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
  const validation = validateDeleteItem(body)
  if (!validation.success) {
    console.error(validation.errors)
    return Response.json({ success: false, errors: validation.errors }, { status: 422 })
  }

  const { id } = validation.data

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

    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', id)
      .eq('organization_id', org.id)

    if (error) {
      if (error.code === 'PGRST116') {
        return Response.json(
          {
            success: false,
            error: 'item_not_found',
          },
          { status: 404 },
        )
      }

      throw error
    }
    return Response.json({ success: true }, { status: 200 })
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
