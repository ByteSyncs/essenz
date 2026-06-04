import crypto from 'crypto'

/**
 * Validates the authenticity of Mercado Pago webhook notifications
 * @param headers - Request headers object (IncomingHttpHeaders)
 * @param query - URL query parameters object
 * @returns boolean
 */
export const validateMPSignature = (
  headers: Headers,
  searchParams: URLSearchParams,
  secret: string | undefined,
): boolean => {
  const xSignature = headers.get('x-signature')
  const xRequestId = headers.get('x-request-id')

  if (!xSignature || !xRequestId || !secret) return false

  try {
    const parts = xSignature.split(',')
    const ts = parts.find((p) => p.trim().startsWith('ts='))?.split('=')[1]
    const v1 = parts.find((p) => p.trim().startsWith('v1='))?.split('=')[1]

    if (!ts || !v1) return false

    const resourceId = searchParams.get('data.id')

    if (!resourceId) return false

    const manifest = `id:${resourceId};request-id:${xRequestId};ts:${ts};`

    const hmac = crypto.createHmac('sha256', secret)
    const generateHash = hmac.update(manifest).digest('hex')

    return crypto.timingSafeEqual(Buffer.from(generateHash, 'hex'), Buffer.from(v1, 'hex'))
  } catch (err) {
    console.error('[MP_WEBHOOK_ERROR]', err)
    return false
  }
}
