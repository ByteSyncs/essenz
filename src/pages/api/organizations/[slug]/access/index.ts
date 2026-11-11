import type { APIRoute } from 'astro'
import { validateAccessUpdate } from '../../../../../libs/schemas/branchAccess'
import { provisionStaffUser, revokeStaffUser } from '../../../../../libs/server/branchCredentials'
import { privateJson } from '../../../../../libs/server/http'
import { requireOrganizationOwner } from '../../../../../libs/server/requireOrganizationOwner'
import { invalidateProfileCache } from '../../../../../libs/profileCache'
import supabaseAdmin from '../../../../../libs/supabaseAdmin'

interface AccessRow {
  token: string
  enabled: boolean
  staff_user_id: string | null
}

async function readState(organizationId: string) {
  const [accessResult, settingsResult] = await Promise.all([
    supabaseAdmin
      .from('branch_access')
      .select('token, enabled, staff_user_id')
      .eq('organization_id', organizationId)
      .maybeSingle(),
    supabaseAdmin
      .from('organization_settings')
      .select('staff_can_edit_settings')
      .eq('organization_id', organizationId)
      .maybeSingle(),
  ])

  if (accessResult.error) throw accessResult.error
  if (settingsResult.error) throw settingsResult.error

  let access = accessResult.data as AccessRow | null

  if (!access) {
    const { data, error } = await supabaseAdmin
      .from('branch_access')
      .insert({ organization_id: organizationId })
      .select('token, enabled, staff_user_id')
      .single()
    if (error) throw error
    access = data as AccessRow
  }

  return {
    enabled: access.enabled,
    token: access.token,
    accessPath: `/access/${access.token}`,
    staffCanEditSettings: settingsResult.data?.staff_can_edit_settings === true,
  }
}

export const GET: APIRoute = async ({ locals, params }) => {
  const { slug } = params
  if (!slug) return privateJson({ success: false, error: 'slug_not_found' }, 400)

  try {
    const authorization = await requireOrganizationOwner(locals, slug)
    if (!authorization.authorized) return authorization.response

    return privateJson({ success: true, data: await readState(authorization.organizationId) })
  } catch (error) {
    console.error('[branch-access] GET failed:', error)
    return privateJson({ success: false, error: 'internal_server_error' }, 500)
  }
}

export const PUT: APIRoute = async ({ locals, params, request }) => {
  const { slug } = params
  if (!slug) return privateJson({ success: false, error: 'slug_not_found' }, 400)

  try {
    const authorization = await requireOrganizationOwner(locals, slug)
    if (!authorization.authorized) return authorization.response

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return privateJson({ success: false, error: 'invalid_request_body' }, 400)
    }

    const validation = validateAccessUpdate(body)
    if (!validation.success) {
      return privateJson({ success: false, error: validation.errors }, 422)
    }

    const { enabled, password, staffCanEditSettings } = validation.data
    const organizationId = authorization.organizationId

    const current = await readState(organizationId)
    const { data: row, error: rowError } = await supabaseAdmin
      .from('branch_access')
      .select('enabled, staff_user_id')
      .eq('organization_id', organizationId)
      .single()
    if (rowError) throw rowError

    const willBeEnabled = enabled ?? current.enabled

    if (enabled === true && !current.enabled && !password) {
      return privateJson(
        { success: false, error: [{ field: 'password', message: 'Elegí una contraseña' }] },
        422,
      )
    }

    if (staffCanEditSettings !== undefined) {
      const { data: existing, error: existingError } = await supabaseAdmin
        .from('organization_settings')
        .select('id')
        .eq('organization_id', organizationId)
        .maybeSingle()
      if (existingError) throw existingError

      const { error: settingsError } = existing
        ? await supabaseAdmin
            .from('organization_settings')
            .update({ staff_can_edit_settings: staffCanEditSettings })
            .eq('organization_id', organizationId)
        : await supabaseAdmin.from('organization_settings').insert({
            organization_id: organizationId,
            staff_can_edit_settings: staffCanEditSettings,
          })
      if (settingsError) throw settingsError
    }

    if (!willBeEnabled) {
      if (row.staff_user_id || row.enabled) {
        const { error } = await supabaseAdmin
          .from('branch_access')
          .update({ enabled: false, staff_user_id: null, updated_at: new Date().toISOString() })
          .eq('organization_id', organizationId)
        if (error) throw error
        await revokeStaffUser(supabaseAdmin, row.staff_user_id)
        if (row.staff_user_id) invalidateProfileCache(row.staff_user_id)
      }
    } else if (password) {
      const { data: organization, error: organizationError } = await supabaseAdmin
        .from('organizations')
        .select('account_id')
        .eq('id', organizationId)
        .single()
      if (organizationError) throw organizationError

      const newUserId = await provisionStaffUser(supabaseAdmin, {
        organizationId,
        accountId: organization.account_id,
        slug,
        password,
        createdBy: locals.user!.id,
      })

      const { error } = await supabaseAdmin
        .from('branch_access')
        .update({ enabled: true, staff_user_id: newUserId, updated_at: new Date().toISOString() })
        .eq('organization_id', organizationId)

      if (error) {
        await revokeStaffUser(supabaseAdmin, newUserId)
        throw error
      }

      await revokeStaffUser(supabaseAdmin, row.staff_user_id)
      if (row.staff_user_id) invalidateProfileCache(row.staff_user_id)
    }

    return privateJson({ success: true, data: await readState(organizationId) })
  } catch (error) {
    console.error('[branch-access] PUT failed:', error)
    return privateJson({ success: false, error: 'internal_server_error' }, 500)
  }
}

export const POST: APIRoute = async ({ locals, params }) => {
  const { slug } = params
  if (!slug) return privateJson({ success: false, error: 'slug_not_found' }, 400)

  try {
    const authorization = await requireOrganizationOwner(locals, slug)
    if (!authorization.authorized) return authorization.response

    await readState(authorization.organizationId)

    const { error } = await supabaseAdmin
      .from('branch_access')
      .update({ token: crypto.randomUUID(), updated_at: new Date().toISOString() })
      .eq('organization_id', authorization.organizationId)
    if (error) throw error

    return privateJson({ success: true, data: await readState(authorization.organizationId) })
  } catch (error) {
    console.error('[branch-access] rotate failed:', error)
    return privateJson({ success: false, error: 'internal_server_error' }, 500)
  }
}
