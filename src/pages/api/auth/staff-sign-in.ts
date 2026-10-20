import type { APIRoute } from 'astro'
import { buildStaffEmail } from '../../../libs/staffEmail'

const ONE_MONTH_IN_SECONDS = 60 * 60 * 24 * 30

function json(body: unknown, status = 200) {
  return Response.json(body, { status, headers: { 'Cache-Control': 'private, no-store' } })
}

export const POST: APIRoute = async ({ request, locals, cookies, url }) => {
  let body: any
  try {
    body = await request.json()
  } catch {
    return json({ success: false, error: 'invalid_request_body' }, 400)
  }

  const slug = typeof body?.slug === 'string' ? body.slug.trim().toLowerCase() : ''
  const username = typeof body?.username === 'string' ? body.username.trim().toLowerCase() : ''
  const password = typeof body?.password === 'string' ? body.password : ''

  if (
    !/^[a-z0-9-]{2,60}$/.test(slug) ||
    !/^[a-z0-9][a-z0-9_-]{2,23}$/.test(username) ||
    !password
  ) {
    return json({ success: false, error: 'invalid_credentials' }, 401)
  }

  const { data, error } = await locals.supabase.auth.signInWithPassword({
    email: buildStaffEmail(username, slug),
    password,
  })

  if (error?.status === 429) {
    return json({ success: false, error: 'rate_limited' }, 429)
  }

  if (error || !data.session) {
    return json({ success: false, error: 'invalid_credentials' }, 401)
  }

  const options = {
    path: '/',
    secure: url.protocol === 'https:',
    httpOnly: true,
    sameSite: 'lax' as const,
    maxAge: ONE_MONTH_IN_SECONDS,
  }

  cookies.set('sb-access-token', data.session.access_token, options)
  cookies.set('sb-refresh-token', data.session.refresh_token, options)

  return json({ success: true, data: { redirect: `/${slug}/admin/dashboard` } })
}
