import type { APIRoute } from 'astro'
import * as Sentry from '@sentry/astro'
import supabaseAdmin from '../../../../../libs/supabaseAdmin'
import { invalidateProfileCache } from '../../../../../libs/profileCache'
import { isOwnerRole } from '../../../../../libs/permissions'
import { buildStaffEmail } from '../../../../../libs/staffEmail'

const MAX_EMPLOYEES = 15
const USERNAME_PATTERN = /^[a-z0-9][a-z0-9_-]{2,23}$/

function json(body: unknown, status = 200) {
  return Response.json(body, { status, headers: { 'Cache-Control': 'private, no-store' } })
}

async function getOwnerContext(userId: string | undefined, slug: string | undefined) {
  if (!userId || !slug) return null

  const { data } = await supabaseAdmin
    .from('profiles')
    .select('role, organization_id, organizations(slug)')
    .eq('id', userId)
    .maybeSingle()

  if (!data || !isOwnerRole(data.role)) return null

  const organization = Array.isArray(data.organizations)
    ? data.organizations[0]
    : data.organizations
  if (organization?.slug !== slug) return null

  return { userId, organizationId: data.organization_id as string }
}

export const GET: APIRoute = async ({ params, locals }) => {
  const owner = await getOwnerContext(locals.user?.id, params.slug)
  if (!owner) return json({ success: false, error: 'owner_access_required' }, 403)

  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('id, client_name, username, created_at')
    .eq('organization_id', owner.organizationId)
    .eq('role', 'employee')
    .order('created_at', { ascending: false })

  if (error) {
    Sentry.captureException(error, { tags: { mechanism: 'team_list' } })
    return json({ success: false, error: 'internal_server_error' }, 500)
  }

  return json({ success: true, data })
}

export const POST: APIRoute = async ({ params, locals, request }) => {
  const owner = await getOwnerContext(locals.user?.id, params.slug)
  if (!owner) return json({ success: false, error: 'owner_access_required' }, 403)

  let body: any
  try {
    body = await request.json()
  } catch {
    return json({ success: false, error: 'invalid_request_body' }, 400)
  }

  const name = typeof body?.name === 'string' ? body.name.trim() : ''
  const username = typeof body?.username === 'string' ? body.username.trim().toLowerCase() : ''
  const password = typeof body?.password === 'string' ? body.password : ''

  if (name.length < 2 || name.length > 60)
    return json({ success: false, error: 'invalid_name' }, 422)
  if (!USERNAME_PATTERN.test(username))
    return json({ success: false, error: 'invalid_username' }, 422)
  if (password.length < 8 || password.length > 72) {
    return json({ success: false, error: 'invalid_password' }, 422)
  }

  let createdUserId: string | null = null

  try {
    const { count } = await supabaseAdmin
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', owner.organizationId)
      .eq('role', 'employee')

    if ((count ?? 0) >= MAX_EMPLOYEES) {
      return json({ success: false, error: 'member_limit_reached' }, 422)
    }

    const { data: taken } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('organization_id', owner.organizationId)
      .eq('username', username)
      .maybeSingle()

    if (taken) return json({ success: false, error: 'username_taken' }, 422)

    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: buildStaffEmail(username, params.slug!),
      password,
      email_confirm: true,
    })

    if (authError || !authData.user) {
      const code = authError?.code ?? ''
      if (code === 'email_exists' || code === 'user_already_exists') {
        return json({ success: false, error: 'username_taken' }, 422)
      }
      throw authError ?? new Error('failed_to_create_employee')
    }

    createdUserId = authData.user.id

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert({
        id: createdUserId,
        organization_id: owner.organizationId,
        client_name: name,
        username,
        role: 'employee',
        is_setup_complete: true,
        created_by: owner.userId,
      })
      .select('id, client_name, username, created_at')
      .single()

    if (profileError) throw profileError

    return json({ success: true, data: profile }, 201)
  } catch (err) {
    if (createdUserId) {
      try {
        await supabaseAdmin.auth.admin.deleteUser(createdUserId)
      } catch (rollbackErr) {
        Sentry.captureException(rollbackErr, { tags: { mechanism: 'team_rollback_failed' } })
      }
    }
    Sentry.captureException(err, { tags: { mechanism: 'team_create' } })
    return json({ success: false, error: 'internal_server_error' }, 500)
  }
}

async function findEmployee(organizationId: string, id: string | null | undefined) {
  if (!id) return null
  const { data } = await supabaseAdmin
    .from('profiles')
    .select('id')
    .eq('id', id)
    .eq('organization_id', organizationId)
    .eq('role', 'employee')
    .maybeSingle()
  return data
}

export const DELETE: APIRoute = async ({ params, locals, url }) => {
  const owner = await getOwnerContext(locals.user?.id, params.slug)
  if (!owner) return json({ success: false, error: 'owner_access_required' }, 403)

  const employee = await findEmployee(owner.organizationId, url.searchParams.get('id'))
  if (!employee) return json({ success: false, error: 'not_found' }, 404)

  const { error } = await supabaseAdmin.auth.admin.deleteUser(employee.id)
  if (error) {
    Sentry.captureException(error, { tags: { mechanism: 'team_delete' } })
    return json({ success: false, error: 'internal_server_error' }, 500)
  }

  invalidateProfileCache(employee.id)
  return json({ success: true })
}

export const PATCH: APIRoute = async ({ params, locals, request }) => {
  const owner = await getOwnerContext(locals.user?.id, params.slug)
  if (!owner) return json({ success: false, error: 'owner_access_required' }, 403)

  let body: any
  try {
    body = await request.json()
  } catch {
    return json({ success: false, error: 'invalid_request_body' }, 400)
  }

  const password = typeof body?.password === 'string' ? body.password : ''
  if (password.length < 8 || password.length > 72) {
    return json({ success: false, error: 'invalid_password' }, 422)
  }

  const employee = await findEmployee(owner.organizationId, body?.id)
  if (!employee) return json({ success: false, error: 'not_found' }, 404)

  const { error } = await supabaseAdmin.auth.admin.updateUserById(employee.id, { password })
  if (error) {
    Sentry.captureException(error, { tags: { mechanism: 'team_password' } })
    return json({ success: false, error: 'internal_server_error' }, 500)
  }

  return json({ success: true })
}
