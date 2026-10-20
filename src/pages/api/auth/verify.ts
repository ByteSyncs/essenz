import type { APIRoute } from 'astro'
import * as Sentry from '@sentry/astro'
import { validateVerifyEmail } from '../../../libs/schemas/auth/verify'

export const POST: APIRoute = async ({ locals, request, cookies }) => {
  let body
  try {
    body = await request.json()
  } catch (err) {
    return new Response(
      JSON.stringify({
        success: false,
        error: 'invalid_request_body',
      }),
      { status: 400 },
    )
  }

  try {
    const validation = validateVerifyEmail(body)
    if (!validation.success) {
      console.error(validation.errors)
      return new Response(
        JSON.stringify({
          success: false,
          errors: validation.errors,
        }),
        { status: 422 },
      )
    }

    const { email, code, plan } = validation.data

    const { data, error } = await locals.supabase.auth.verifyOtp({
      email,
      token: code,
      type: 'email',
    })

    if (error) {
      console.error('Error reading code', error)
      return new Response(
        JSON.stringify({
          success: false,
          error: 'code_error',
        }),
        { status: 400 },
      )
    }

    const { session } = data

    if (session) {
      const { access_token, refresh_token } = session

      cookies.delete('waiting_verify_email', {
        path: '/',
      })

      cookies.set('sb-access-token', access_token, {
        path: '/',
        secure: true,
        httpOnly: true,
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7,
      })

      cookies.set('sb-refresh-token', refresh_token, {
        path: '/',
        secure: true,
        httpOnly: true,
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7,
      })
      return new Response(
        JSON.stringify({
          success: true,
          url: `/checkout?plan=${plan}`,
        }),
      )
    }

    return new Response(
      JSON.stringify({
        success: false,
        error: 'session_not_found',
      }),
      { status: 500 },
    )
  } catch (err) {
    console.error('Error verified email', err)

    Sentry.withScope((scope) => {
      scope.setTag('mechanism', 'verify_otp')
      scope.setExtra('payload_info', {
        email: body?.email,
        plan: body?.plan,
      })
      Sentry.captureException(err)
    })

    return new Response(
      JSON.stringify({
        success: false,
        error: 'internal_server_error',
      }),
      { status: 500 },
    )
  }
}
