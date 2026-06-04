import type { APIRoute } from 'astro'
import { sessionSchema } from '../../../libs/schemas/payments/createSession'
import { PLANS } from '../../../constants/suscriptions'
import { preApproval } from '../../../libs/mercadopago'
import { getUSDtoARS } from '../../../libs/config'

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
    const validation = sessionSchema.safeParse(body)
    if (!validation.success) {
      return new Response(JSON.stringify({ success: false, error: 'Plan invalid' }), {
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
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      console.error('Profile not found:', profileError)
      return new Response(JSON.stringify({ error: 'The user does not have an organization' }), {
        status: 400,
      })
    }

    const { data: dbSub, error: subError } = await locals.supabase
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

    const USD_TO_ARS = await getUSDtoARS(locals)
    if (!USD_TO_ARS) {
      return new Response(JSON.stringify('ERROR'), { status: 500 })
    }

    const priceARS = Math.round(plan.price * USD_TO_ARS)
    const backUrl = `${import.meta.env.PUBLIC_SITE_URL}/admin/dashboard`
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
