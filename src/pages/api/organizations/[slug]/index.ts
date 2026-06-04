import type { APIRoute } from 'astro'
import * as Sentry from '@sentry/astro'
import { validateUpdateMenu } from '../../../../libs/schemas/menu/update'

export const GET: APIRoute = async ({ locals, params }) => {
  const { slug } = params
  if (!slug) {
    return Response.json({ success: false, error: 'slug_not_found' }, { status: 400 })
  }

  const supabase = locals.supabase
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return Response.json(
        {
          success: false,
          error: 'unauthorized',
        },
        { status: 401 },
      )
    }

    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('*')
      .eq('slug', slug)
      .single()

    if (orgError || !org) {
      return Response.json({ success: false, error: 'organization_not_found' }, { status: 404 })
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('client_name, role')
      .eq('id', user.id)
      .single()

    if (profileError) throw profileError

    return Response.json({
      success: true,
      data: {
        profile,
        org,
      },
    })
  } catch (err) {
    console.error('[GET] Organizations - ', err)
    // Sentry.captureException({})

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
  const { slug } = params
  if (!slug) {
    return Response.json({ success: false, error: 'slug_not_found' }, { status: 400 })
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

  const validation = validateUpdateMenu(body)
  if (!validation.success) {
    console.error(validation.errors)
    return Response.json({ success: false, errors: validation.errors }, { status: 422 })
  }

  const { name, tagline, logo, logo_updated_at } = validation.data

  try {
    const { data: updateData, error: updateError } = await supabase
      .from('organizations')
      .update({
        name,
        tagline,
        logo_url: logo,
        logo_updated_at,
      })
      .eq('slug', slug)
      .select()
      .single()

    if (updateError) throw updateError

    return Response.json({
      success: true,
      data: updateData,
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
