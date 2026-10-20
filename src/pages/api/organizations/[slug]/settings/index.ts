import type { APIRoute } from 'astro'
import { validateUpdateSettings } from '../../../../../libs/schemas/settings'
import { requireOrganizationOwner } from '../../../../../libs/server/requireOrganizationOwner'

const SETTINGS_COLUMNS =
  'menu_active, show_menu_images, address, city, contact_phone, contact_email, opening_hours, instagram_url, facebook_url'

export const GET: APIRoute = async ({ locals, params }) => {
  const { slug } = params
  if (!slug) {
    return Response.json(
      { success: false, error: 'slug_not_found' },
      { status: 400, headers: { 'Cache-Control': 'private, no-store' } },
    )
  }

  try {
    const context = await requireOrganizationOwner(locals, slug)
    if (!context.authorized) return context.response

    let { data: settings, error } = await locals.supabase
      .from('organization_settings')
      .select(SETTINGS_COLUMNS)
      .eq('organization_id', context.organizationId)
      .maybeSingle()

    if (error) throw error

    if (!settings) {
      const { data: insertedSettings, error: insertError } = await locals.supabase
        .from('organization_settings')
        .insert({ organization_id: context.organizationId })
        .select(SETTINGS_COLUMNS)
        .single()

      if (insertError) throw insertError
      settings = insertedSettings
    }

    return Response.json(
      { success: true, settings },
      { headers: { 'Cache-Control': 'private, no-store' } },
    )
  } catch (error) {
    console.error('[organization-settings] GET failed:', error)
    return Response.json(
      { success: false, error: 'internal_server_error' },
      { status: 500, headers: { 'Cache-Control': 'private, no-store' } },
    )
  }
}

export const PATCH: APIRoute = async ({ locals, params, request }) => {
  const { slug } = params
  if (!slug) {
    return Response.json(
      { success: false, error: 'slug_not_found' },
      { status: 400, headers: { 'Cache-Control': 'private, no-store' } },
    )
  }

  try {
    const context = await requireOrganizationOwner(locals, slug)
    if (!context.authorized) return context.response

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return Response.json(
        { success: false, error: 'invalid_request_body' },
        { status: 400, headers: { 'Cache-Control': 'private, no-store' } },
      )
    }

    const validation = validateUpdateSettings(body)
    if (!validation.success) {
      return Response.json(
        { success: false, error: validation.errors },
        { status: 422, headers: { 'Cache-Control': 'private, no-store' } },
      )
    }

    const { data: existingSettings, error: settingsError } = await locals.supabase
      .from('organization_settings')
      .select('id')
      .eq('organization_id', context.organizationId)
      .maybeSingle()

    if (settingsError) throw settingsError

    const update = {
      ...validation.data,
      updated_at: new Date().toISOString(),
    }
    const query = existingSettings
      ? locals.supabase
          .from('organization_settings')
          .update(update)
          .eq('organization_id', context.organizationId)
      : locals.supabase
          .from('organization_settings')
          .insert({ ...update, organization_id: context.organizationId })

    const { data: settings, error } = await query.select(SETTINGS_COLUMNS).single()
    if (error) throw error

    return Response.json(
      { success: true, settings },
      { headers: { 'Cache-Control': 'private, no-store' } },
    )
  } catch (error) {
    console.error('[organization-settings] PATCH failed:', error)
    return Response.json(
      { success: false, error: 'internal_server_error' },
      { status: 500, headers: { 'Cache-Control': 'private, no-store' } },
    )
  }
}
