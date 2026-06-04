import type { APIRoute } from 'astro'
import { payment as Payment, preApproval } from '../../../libs/mercadopago'
import { validateMPSignature } from '../../../libs/webhook.mp'
import supabaseAdmin from '../../../libs/supabaseAdmin'

export const POST: APIRoute = async ({ request, url }) => {
  try {
    const isValid = validateMPSignature(
      request.headers,
      url.searchParams,
      import.meta.env.MP_WEBHOOK,
    )

    if (!isValid) {
      return new Response(JSON.stringify({ message: 'Unauthorized' }), { status: 401 })
    }

    const body = await request.json()

    if (body.type === 'subscription_preapproval') {
      const preApprovalId = body.data.id
      const subscriptionData = await preApproval.get({ id: preApprovalId })

      if (subscriptionData.status === 'authorized') {
        const subId = subscriptionData.external_reference

        await supabaseAdmin
          .from('subscriptions')
          .update({
            status: 'active',
            provider_customer_id: subscriptionData.payer_id?.toString(),
            provider_subscription_id: preApprovalId,
            updated_at: new Date().toISOString(),
          })
          .eq('id', subId)
      }
    }
    if (body.type === 'payment') {
      const paymentId = body.data.id
      const payment = await Payment.get({ id: paymentId })

      if (payment.status === 'approved') {
        const subId = payment.external_reference

        const expirationDate = new Date()
        expirationDate.setMonth(expirationDate.getMonth() + 1)

        const { error } = await supabaseAdmin
          .from('subscriptions')
          .update({
            status: 'active',
            provider_customer_id: payment.payer?.id?.toString(),
            provider_order_id: paymentId.toString(),
            current_period_end: expirationDate.toISOString(),
            payment_provider: `mercadopago:${payment.payment_type_id}`,
            updated_at: new Date().toISOString(),
          })
          .eq('id', subId)

        if (error) {
          console.error('Error updating Supabase:', error.message)
          return new Response('Database Error', { status: 500 })
        }
      }
    }

    return new Response('OK', { status: 200 })
  } catch (err) {
    console.error('Webhook Error:', err)
    return new Response('OK', { status: 200 })
  }
}
