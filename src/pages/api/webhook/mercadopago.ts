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
      console.error('[MP WEBHOOK] Invalid signature')
      return new Response('Unauthorized', { status: 401 })
    }

    const body = await request.json()

    if (body.type === 'subscription_preapproval') {
      const preApprovalId = body.data?.id

      if (!preApprovalId) {
        console.error('[MP WEBHOOK] Missing preapproval ID')
        return new Response('Missing preapproval ID', { status: 400 })
      }

      const subscriptionData = await preApproval.get({ id: preApprovalId })

      if (subscriptionData.status === 'authorized') {
        const subId = subscriptionData.external_reference

        if (!subId) {
          console.error('[MP WEBHOOK] Preapproval has no subscription reference')
          return new Response('Missing subscription reference', { status: 400 })
        }

        const { data: updated, error } = await supabaseAdmin
          .from('subscriptions')
          .update({
            provider_customer_id: subscriptionData.payer_id?.toString(),
            provider_subscription_id: preApprovalId.toString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', subId)
          .select('id')
          .maybeSingle()

        if (error) {
          console.error('[MP WEBHOOK] Failed to update subscription:', error)
          return new Response('Subscription update failed', { status: 500 })
        }

        if (!updated) {
          console.error('[MP WEBHOOK] Subscription not found:', subId)
          return new Response('Subscription not found', { status: 500 })
        }
      }
    }

    if (body.type === 'payment') {
      const paymentId = body.data?.id

      if (!paymentId) {
        console.error('[MP WEBHOOK] Missing payment ID')
        return new Response('Missing payment ID', { status: 400 })
      }

      const payment = await Payment.get({ id: paymentId })

      if (payment.status === 'approved') {
        const subId = payment.external_reference

        if (!subId) {
          console.error('[MP WEBHOOK] Approved payment has no subscription reference')
          return new Response('Missing subscription reference', { status: 400 })
        }

        const { data: processed, error } = await supabaseAdmin.rpc('process_mp_payment', {
          p_payment_id: paymentId.toString(),
          p_subscription_id: subId,
          p_payer_id: payment.payer?.id?.toString() ?? null,
          p_payment_type_id: payment.payment_type_id ?? 'unknown',
        })

        if (error) {
          console.error('[MP WEBHOOK] Payment processing failed:', error)
          return new Response('Payment processing failed', { status: 500 })
        }

        if (processed) {
          console.info('[MP WEBHOOK] Payment processed successfully:', paymentId)
        } else {
          console.info('[MP WEBHOOK] Duplicate payment ignored:', paymentId)
        }
      }
    }

    return new Response('OK', { status: 200 })
  } catch (err) {
    console.error('[MP WEBHOOK] Unexpected error:', err)
    return new Response('Internal Server Error', { status: 500 })
  }
}
