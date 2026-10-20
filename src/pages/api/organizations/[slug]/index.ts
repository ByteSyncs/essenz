import type { APIRoute } from 'astro'
import { validateUpdateMenu } from '../../../../libs/schemas/menu/update'
import { requireOrganizationOwner } from '../../../../libs/server/requireOrganizationOwner'

const LOGO_CHANGE_INTERVAL_MS = 3 * 24 * 60 * 60 * 1000

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

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('client_name, role')
      .eq('id', user.id)
      .single()

    if (profileError) throw profileError

    if (!['admin', 'owner'].includes(profile.role)) {
      return Response.json({
        success: true,
        data: {
          profile,
          org: null,
        },
        meta: {
          server_time: new Date().toISOString(),
        },
      })
    }

    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('*')
      .eq('slug', slug)
      .single()

    if (orgError || !org) {
      return Response.json({ success: false, error: 'organization_not_found' }, { status: 404 })
    }

    return Response.json({
      success: true,
      data: {
        profile,
        org,
      },
    })
  } catch (err) {
    console.error('[GET] Organizations - ', err)

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

  try {
    const authorization = await requireOrganizationOwner(locals, slug)
    if (!authorization.authorized) return authorization.response

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return Response.json(
        { success: false, error: 'invalid_request_body' },
        { status: 400, headers: { 'Cache-Control': 'private, no-store' } },
      )
    }

    const validation = validateUpdateMenu(body)
    if (!validation.success) {
      return Response.json({ success: false, errors: validation.errors }, { status: 422 })
    }

    const { data: currentOrganization, error: currentOrganizationError } = await locals.supabase
      .from('organizations')
      .select('id, logo_url, logo_updated_at')
      .eq('id', authorization.organizationId)
      .maybeSingle()

    if (currentOrganizationError) throw currentOrganizationError
    if (!currentOrganization) {
      return Response.json(
        { success: false, error: 'organization_not_found' },
        { status: 404, headers: { 'Cache-Control': 'private, no-store' } },
      )
    }

    const changes: Record<string, string | null> = {}
    if (validation.data.name !== undefined) changes.name = validation.data.name
    if (validation.data.tagline !== undefined) changes.tagline = validation.data.tagline

    if (
      validation.data.logo !== undefined &&
      validation.data.logo !== currentOrganization.logo_url
    ) {
      if (currentOrganization.logo_url && currentOrganization.logo_updated_at) {
        const updatedAt = Date.parse(currentOrganization.logo_updated_at)
        const allowedAt = updatedAt + LOGO_CHANGE_INTERVAL_MS
        if (!Number.isFinite(updatedAt) || allowedAt > Date.now()) {
          const daysLeft = Number.isFinite(updatedAt)
            ? Math.ceil((allowedAt - Date.now()) / (24 * 60 * 60 * 1000))
            : 3
          return Response.json(
            {
              success: false,
              error: 'logo_change_unavailable',
              days_left: daysLeft,
            },
            { status: 429, headers: { 'Cache-Control': 'private, no-store' } },
          )
        }
      }

      changes.logo_url = validation.data.logo
      changes.logo_updated_at = new Date().toISOString()
    }

    if (!Object.keys(changes).length) {
      return Response.json(
        { success: true, data: currentOrganization },
        { headers: { 'Cache-Control': 'private, no-store' } },
      )
    }

    const { data: updateData, error: updateError } = await locals.supabase
      .from('organizations')
      .update(changes)
      .eq('id', authorization.organizationId)
      .select()
      .single()

    if (updateError) throw updateError

    return Response.json(
      {
        success: true,
        data: updateData,
        meta: {
          server_time: new Date().toISOString(),
        },
      },
      { headers: { 'Cache-Control': 'private, no-store' } },
    )
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
