import type { APIRoute } from 'astro'
import { isAccessToken } from '../../../libs/schemas/branchAccess'
import { privateJson } from '../../../libs/server/http'
import { clearFailures, isRateLimited, recordFailure } from '../../../libs/server/loginLimiter'
import supabaseAdmin from '../../../libs/supabaseAdmin'

const ONE_MONTH_IN_SECONDS = 60 * 60 * 24 * 30

export const POST: APIRoute = async ({ request, locals, cookies, url, clientAddress }) => {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return privateJson({ success: false, error: 'invalid_request_body' }, 400)
  }

  const input = (typeof body === 'object' && body !== null ? body : {}) as Record<string, unknown>
  const token = typeof input.token === 'string' ? input.token.trim().toLowerCase() : ''
  const password = typeof input.password === 'string' ? input.password : ''

  if (!isAccessToken(token) || !password || password.length > 200) {
    return privateJson({ success: false, error: 'invalid_credentials' }, 401)
  }

  let address = 'unknown'
  try {
    address = clientAddress
  } catch {
    address = 'unknown'
  }
  const limitKey = `${token}:${address}`

  if (isRateLimited(limitKey)) {
    return privateJson({ success: false, error: 'rate_limited' }, 429)
  }

  try {
    const { data: access, error: accessError } = await supabaseAdmin
      .from('branch_access')
      .select('enabled, staff_user_id, organizations (slug)')
      .eq('token', token)
      .maybeSingle()

    if (accessError) throw accessError

    const organization = Array.isArray(access?.organizations)
      ? access.organizations[0]
      : access?.organizations

    if (!access?.enabled || !access.staff_user_id || !organization?.slug) {
      recordFailure(limitKey)
      return privateJson({ success: false, error: 'invalid_credentials' }, 401)
    }

    const { data: staffUser, error: userError } = await supabaseAdmin.auth.admin.getUserById(
      access.staff_user_id,
    )

    if (userError || !staffUser.user?.email) {
      recordFailure(limitKey)
      return privateJson({ success: false, error: 'invalid_credentials' }, 401)
    }

    const { data, error } = await locals.supabase.auth.signInWithPassword({
      email: staffUser.user.email,
      password,
    })

    if (error?.status === 429) {
      return privateJson({ success: false, error: 'rate_limited' }, 429)
    }

    if (error || !data.session) {
      recordFailure(limitKey)
      return privateJson({ success: false, error: 'invalid_credentials' }, 401)
    }

    clearFailures(limitKey)

    const options = {
      path: '/',
      secure: url.protocol === 'https:',
      httpOnly: true,
      sameSite: 'lax' as const,
      maxAge: ONE_MONTH_IN_SECONDS,
    }

    cookies.set('sb-access-token', data.session.access_token, options)
    cookies.set('sb-refresh-token', data.session.refresh_token, options)

    return privateJson({
      success: true,
      data: { redirect: `/${organization.slug}/admin/dashboard` },
    })
  } catch (error) {
    console.error('[branch-access] login failed:', error)
    return privateJson({ success: false, error: 'internal_server_error' }, 500)
  }
}
