import type { APIRoute } from 'astro'
import { validateUpdateSettings } from '../../../../../libs/schemas/settings'
import { requireBranchStaff } from '../../../../../libs/server/branchStaff'

const SETTINGS_COLUMNS =
  'menu_active, show_menu_images, address, city, contact_phone, contact_email, opening_hours, instagram_url, facebook_url'
const READ_COLUMNS = `${SETTINGS_COLUMNS}, staff_can_edit_settings`

export const GET: APIRoute = async ({ locals, params }) => {
  const { slug } = params
  if (!slug) {
    return Response.json(
      { success: false, error: 'slug_not_found' },
      { status: 400, headers: { 'Cache-Control': 'private, no-store' } },
    )
  }

  try {
    const context = await requireBranchStaff(locals, slug)
    if (!context.authorized) return context.response

    let { data: settings, error } = await context.db
      .from('organization_settings')
      .select(READ_COLUMNS)
      .eq('organization_id', context.organizationId)
      .maybeSingle()

    if (error) throw error

    if (!settings) {
      const { data: insertedSettings, error: insertError } = await context.db
        .from('organization_settings')
        .insert({ organization_id: context.organizationId })
        .select(READ_COLUMNS)
        .single()

      if (insertError) throw insertError
      settings = insertedSettings
    }

    const { staff_can_edit_settings: staffCanEdit, ...publicSettings } = settings
    const canEdit = context.isOwner || staffCanEdit === true

    return Response.json(
      { success: true, settings: publicSettings, canEdit, isOwner: context.isOwner },
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
    const context = await requireBranchStaff(locals, slug)
    if (!context.authorized) return context.response

    if (!context.isOwner) {
      const { data: permission, error: permissionError } = await context.db
        .from('organization_settings')
        .select('staff_can_edit_settings')
        .eq('organization_id', context.organizationId)
        .maybeSingle()
      if (permissionError) throw permissionError
      if (permission?.staff_can_edit_settings !== true) {
        return Response.json(
          { success: false, error: 'settings_read_only' },
          { status: 403, headers: { 'Cache-Control': 'private, no-store' } },
        )
      }
    }

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

    const { data: existingSettings, error: settingsError } = await context.db
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
      ? context.db
          .from('organization_settings')
          .update(update)
          .eq('organization_id', context.organizationId)
      : context.db
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
