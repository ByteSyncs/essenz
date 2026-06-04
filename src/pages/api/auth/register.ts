import type { APIRoute } from 'astro'
import * as Sentry from '@sentry/astro'
import { validateRegister } from '../../../libs/schemas/auth/signUp'
import { sendMail } from '../../../libs/resend'
import supabaseAdmin from '../../../libs/supabaseAdmin'

export const POST: APIRoute = async ({ request }) => {
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

  try {
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

    const slug = userData.company_name.toLowerCase().replace(/[^a-z0-9]+/g, '-')

    const { data: orgData, error: orgError } = await supabaseAdmin
      .from('organizations')
      .upsert({
        name: userData.company_name,
        slug: slug,
      })
      .select('id')
      .single()

    if (orgError) throw orgError
    createdOrganizationId = orgData.id

    const { error: profileError } = await supabaseAdmin.from('profiles').insert({
      id: createdAuthUserId,
      organization_id: orgData.id,
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

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          user: {
            id: authData.user.id,
            email: authData.user.email,
          },
        },
      }),
      { status: 201 },
    )
  } catch (err) {
    console.error('REGISTER ERROR, STARTING ROLLBACK:', err)

    if (createdOrganizationId) {
      try {
        const { error: deleteOrgError } = await supabaseAdmin
          .from('organizations')
          .delete()
          .eq('id', createdOrganizationId)

        if (deleteOrgError) throw deleteOrgError
        console.warn(`Rollback: organization ${createdOrganizationId} eliminated`)
      } catch (rollbackOrgErr) {
        console.error('CRITICAL: rollback failed for organization:', rollbackOrgErr)
        Sentry.captureException(rollbackOrgErr, {
          tags: { mechanism: 'register_rollback_org_failed' },
        })
      }
    }

    if (createdAuthUserId) {
      try {
        await supabaseAdmin.auth.admin.deleteUser(createdAuthUserId)
        console.warn(`Rollback: user from auth: ${createdAuthUserId} eliminated`)
      } catch (rollbackErr) {
        console.error('CRITICAL: rollback failed from user:', rollbackErr)
        Sentry.captureException(rollbackErr, { tags: { mechanism: 'register_rollback_failed' } })
      }
    }

    Sentry.captureException(err, { tags: { mechanism: 'register' } })

    return new Response(
      JSON.stringify({
        success: false,
        error: 'internal_server_error',
      }),
      { status: 500 },
    )
  }
}
