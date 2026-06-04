import type { APIRoute } from 'astro'
import * as Sentry from '@sentry/astro'
import { validateLogin, type Login } from '../../../libs/schemas/auth/signIn'

const ONE_MONTH_IN_SECONDS = 60 * 60 * 24 * 30

export const POST: APIRoute = async ({ locals, request, cookies }) => {
  let body
  try {
    body = await request.json()
  } catch {
    return new Response(
      JSON.stringify({
        success: false,
        error: 'invalid_request_body',
      }),
      {
        status: 400,
      },
    )
  }

  const validation = validateLogin(body)
  if (!validation.success) {
    return new Response(
      JSON.stringify({
        success: false,
        errors: validation.errors,
      }),
      { status: 422 },
    )
  }

  const authData: Login = validation.data

  try {
    const { data, error } = await locals.supabase.auth.signInWithPassword({
      email: authData.email,
      password: authData.password,
    })

    const { data: profileData } = await locals.supabase
      .from('profiles')
      .select('organizations (slug)')
      .eq('id', data.user?.id)
      .maybeSingle()

    let slug
    if (profileData) {
      const org = Array.isArray(profileData.organizations)
        ? profileData.organizations[0]
        : profileData.organizations

      slug = org?.slug
    }

    const errorMap: Record<string, number> = {
      invalid_credentials: 400,
      user_already_exists: 400,
      email_not_confirmed: 400,
    } as const

    if (error) {
      const errorCode = error.code ?? ''
      const hasMappedError = errorCode in errorMap

      const status = hasMappedError ? errorMap[errorCode as keyof typeof errorMap] : 400
      const code = hasMappedError ? errorCode : 'authentication_failed'
      return new Response(
        JSON.stringify({
          success: false,
          error: code,
        }),
        { status },
      )
    }

    const { session } = data

    if (session) {
      const { access_token, refresh_token } = session

      cookies.set('sb-access-token', access_token, {
        path: '/',
        secure: true,
        httpOnly: true,
        sameSite: 'lax',
        maxAge: ONE_MONTH_IN_SECONDS,
      })

      cookies.set('sb-refresh-token', refresh_token, {
        path: '/',
        secure: true,
        httpOnly: true,
        sameSite: 'lax',
        maxAge: ONE_MONTH_IN_SECONDS,
      })

      return new Response(
        JSON.stringify({
          success: true,
          requiresConfirmation: false,
          message: 'login_successfully',
          url: `/${slug}/admin/dashboard`,
        }),
        { status: 200 },
      )
    }

    return new Response(
      JSON.stringify({
        success: true,
        requiresConfirmation: true,
        message: 'email_require_confirmation',
      }),
      { status: 200 },
    )
  } catch (err) {
    console.error('Internal server error', err)
    Sentry.captureException(new Error('Error login - ' + err))

    return new Response(
      JSON.stringify({
        success: false,
        error: 'internal_server_error',
      }),
      { status: 500 },
    )
  }
}
