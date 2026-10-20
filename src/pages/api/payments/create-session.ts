import type { APIRoute } from 'astro'
import { validateSession } from '../../../libs/schemas/payments/createSession'
import { PLANS } from '../../../constants/suscriptions'
import { preApproval } from '../../../libs/mercadopago'
import supabaseAdmin from '../../../libs/supabaseAdmin'

export const POST: APIRoute = async ({ locals, request, cookies, redirect }) => {
  const accessToken = cookies.get('sb-access-token')?.value
  if (!accessToken) {
    return redirect('/')
  }
  const {
    data: { user },
  } = await locals.supabase.auth.getUser()
  if (!user) {
    return new Response(JSON.stringify({ success: false, error: 'Unautorized' }), { status: 401 })
  }

  try {
    const body = await request.json()
    const validation = validateSession(body)
    if (!validation.success) {
      console.error(validation.errors)
      return new Response(JSON.stringify({ success: false, error: validation.errors }), {
        status: 422,
      })
    }

    const { plan_id, method } = validation.data

    if (!method.includes('mp')) {
      return new Response(JSON.stringify({ success: false, error: 'Method error' }), {
        status: 422,
      })
    }

    const plan = PLANS[plan_id]
    if (!plan || !plan.price) {
      return new Response(JSON.stringify({ success: false, error: 'Plan not found' }), {
        status: 404,
      })
    }

    const { data: profile, error: profileError } = await locals.supabase
      .from('profiles')
      .select('organization_id, role')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      console.error('Profile not found:', profileError)
      return new Response(JSON.stringify({ error: 'The user does not have an organization' }), {
        status: 400,
      })
    }

    if (!['admin', 'owner'].includes(profile.role)) {
      return new Response(JSON.stringify({ success: false, error: 'owner_access_required' }), {
        status: 403,
      })
    }

    const { data: existingSub } = await supabaseAdmin
      .from('subscriptions')
      .select('status, current_period_end')
      .eq('organization_id', profile.organization_id)
      .maybeSingle()

    if (
      existingSub?.status === 'active' &&
      existingSub.current_period_end &&
      new Date(existingSub.current_period_end) >= new Date()
    ) {
      return new Response(JSON.stringify({ success: false, error: 'already_active' }), {
        status: 409,
      })
    }

    const { data: dbSub, error: subError } = await supabaseAdmin
      .from('subscriptions')
      .upsert(
        {
          organization_id: profile.organization_id,
          plan_type: plan.id,
          status: 'pending_payment',
        },
        { onConflict: 'organization_id' },
      )
      .select('id')
      .single()

    if (subError) {
      console.error('Error create sub:', subError)
      throw subError
    }

    const { data: org, error: orgError } = await locals.supabase
      .from('organizations')
      .select('slug')
      .eq('id', profile.organization_id)
      .single()

    if (orgError || !org) {
      console.error('Organization not found:', orgError)
      return new Response(JSON.stringify({ success: false, error: 'organization_not_found' }), {
        status: 404,
      })
    }

    const slug = org.slug
    const priceARS = plan.price
    const backUrl = `${import.meta.env.PUBLIC_SITE_URL}/${slug}/admin/setup`
    const result = await preApproval.create({
      body: {
        back_url: backUrl,
        reason: `Suscripción a ${plan.name} - Essenz`,
        auto_recurring: {
          frequency: 1,
          frequency_type: 'months',
          transaction_amount: priceARS,
          currency_id: 'ARS',
        },
        external_reference: dbSub.id,
        payer_email: user.email,
        status: 'pending',
      },
    })

    return new Response(JSON.stringify({ url: result.init_point }), { status: 200 })
  } catch (err) {
    console.error('ERROR: create-session', err)
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Failed to create session',
      }),
      { status: 500 },
    )
  }
}
