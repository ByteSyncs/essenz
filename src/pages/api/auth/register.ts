import type { APIRoute } from 'astro'
import * as Sentry from '@sentry/astro'
import { validateRegister } from '../../../libs/schemas/auth/signUp'
import { sendMail } from '../../../libs/resend'
import supabaseAdmin from '../../../libs/supabaseAdmin'
import { generateUniqueSlug } from '../../../libs/reservedSlug'

export const POST: APIRoute = async ({ request, cookies }) => {
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

  const validation = validateRegister(body)
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

  const userData = validation.data
  let createdAuthUserId: string | null = null
  let createdOrganizationId: string | null = null
  let createdAccountId: string | null = null

  try {
    const { data: existingOrg } = await supabaseAdmin
      .from('organizations')
      .select('id')
      .eq('name', userData.company_name)
      .maybeSingle()

    if (existingOrg) {
      return new Response(JSON.stringify({ success: false, error: 'company_name_taken' }), {
        status: 422,
      })
    }

    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: userData.email,
      password: userData.password,
      email_confirm: false,
    })

    const authErrorMap: Record<string, number> = {
      email_exists: 422,
      user_already_exists: 422,
      over_email_send_rate_limit: 429,
    } as const

    if (authError) {
      const authErrorCode = authError.code ?? ''
      const hasMappedError = authErrorCode in authErrorMap

      const status = hasMappedError ? authErrorMap[authErrorCode as keyof typeof authErrorMap] : 400

      const code = hasMappedError ? authErrorCode : 'authentication_failed'

      return new Response(
        JSON.stringify({
          success: false,
          error: code,
        }),
        { status },
      )
    }

    if (!authData.user) {
      return new Response(JSON.stringify({ success: false, error: 'authentication_failed' }), {
        status: 400,
      })
    }

    createdAuthUserId = authData.user.id

    const { data: accountData, error: accountError } = await supabaseAdmin
      .from('accounts')
      .insert({
        owner_id: createdAuthUserId,
        max_branches: 1,
      })
      .select('id')
      .single()

    if (accountError) throw accountError

    createdAccountId = accountData.id

    let orgData: { id: string } | null = null

    for (let attempt = 0; attempt < 3 && !orgData; attempt++) {
      const slug = await generateUniqueSlug(userData.company_name, async (candidate) => {
        const { data } = await supabaseAdmin
          .from('organizations')
          .select('id')
          .eq('slug', candidate)
          .maybeSingle()
        return Boolean(data)
      })

      const { data, error } = await supabaseAdmin
        .from('organizations')
        .insert({
          name: userData.company_name,
          slug,
          account_id: createdAccountId,
        })
        .select('id')
        .single()

      if (!error) {
        orgData = data
        break
      }
      if (error.code !== '23505') throw error
    }

    if (!orgData) throw new Error('failed_to_allocate_slug')
    createdOrganizationId = orgData.id

    const { error: profileError } = await supabaseAdmin.from('profiles').insert({
      id: createdAuthUserId,
      organization_id: orgData.id,
      account_id: createdAccountId,
      client_name: userData.client_name,
      role: 'admin',
      is_setup_complete: false,
    })

    if (profileError) throw profileError

    const { data: otpData, error: otpError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: userData.email,
    })

    if (otpError || !otpData?.properties) {
      throw otpError || new Error('failed_to_generate_otp')
    }

    const otpCode = otpData.properties.email_otp
    if (!otpCode) throw new Error('unable_to_extract_numeric_otp')

    await sendMail({
      email: userData.email,
      code: otpCode,
      plan_id: userData.plan_id,
    })

    const expiresAt = new Date(Date.now() + 15 * 60 * 1000)
    const { data: sessionEmail, error: sessionEmailError } = await supabaseAdmin
      .from('email_verification_sessions')
      .insert({
        email: userData.email,
        expires_at: expiresAt,
      })
      .select()
      .single()

    if (sessionEmailError) throw sessionEmailError

    cookies.set('waiting_verify_email', sessionEmail.id, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 15,
    })

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          user: {
            id: authData.user.id,
            email: authData.user.email,
          },
        },
        meta: {
          server_time: new Date().toISOString(),
        },
      }),
      { status: 201 },
    )
  } catch (err) {
    console.error('REGISTER ERROR, STARTING ROLLBACK:', err)

    if (createdAccountId) {
      try {
        const { error } = await supabaseAdmin.from('accounts').delete().eq('id', createdAccountId)

        if (error) throw error
      } catch (rollbackErr) {
        console.error('CRITICAL: rollback failed for account:', rollbackErr)
        Sentry.captureException(rollbackErr, {
          tags: { mechanism: 'register_rollback_account_failed' },
        })
      }
    }

    if (createdAuthUserId) {
      try {
        const { error } = await supabaseAdmin.auth.admin.deleteUser(createdAuthUserId)

        if (error) throw error
      } catch (rollbackErr) {
        console.error('CRITICAL: rollback failed for auth user:', rollbackErr)
        Sentry.captureException(rollbackErr, {
          tags: { mechanism: 'register_rollback_auth_failed' },
        })
      }
    }

    // Sentry.captureException(err, { tags: { mechanism: 'register' } })

    return new Response(
      JSON.stringify({
        success: false,
        error: 'internal_server_error',
      }),
      { status: 500 },
    )
  }
}
