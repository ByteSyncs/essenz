import type { Order } from '../../types/orders'

export const ORDER_ERROR_MESSAGES: Record<string, string> = {
  payments_mismatch: 'Los montos de pago no suman el total de la venta.',
  invalid_payments: 'Revisá los métodos de pago. No podés repetir el mismo método.',
  invalid_tip_payment_method: 'Revisá el medio de pago elegido para la propina.',
  cash_insufficient: 'El efectivo recibido no alcanza para cubrir el pago.',
  invalid_items: 'Hay productos que ya no están disponibles. Quitalos e intentá de nuevo.',
  invalid_discount: 'El descuento no es válido.',
  invalid_customer_name: 'El nombre del cliente no es válido.',
  invalid_tip: 'La propina no es válida.',
  invalid_cash_given: 'El efectivo recibido no es válido.',
  owner_access_required: 'Tu usuario no tiene permiso para esta acción.',
  subscription_required: 'La suscripción del local no está activa.',
  unauthorized: 'Tu sesión venció. Volvé a ingresar.',
  not_found: 'No se encontró la sucursal.',
  order_conflict: 'Esta comanda no se pudo registrar. Creala de nuevo.',
  cash_register_closed:
    'La caja de esta sucursal está cerrada. Abrí una nueva caja para registrar ventas.',
}

export const NETWORK_MESSAGE = 'Sin conexión con el servidor. La comanda todavía no se guardó.'
export const GENERIC_MESSAGE = 'No se pudo guardar la comanda.'

export type SaveResult = { ok: true; order: Order } | { ok: false; message: string }

interface SaveOrderOptions {
  slug: string
  payload: unknown
  fetchFn?: typeof fetch
  delays?: number[]
  sleep?: (ms: number) => Promise<void>
}

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

export async function saveOrder({
  slug,
  payload,
  fetchFn = fetch,
  delays = [800, 2000],
  sleep = wait,
}: SaveOrderOptions): Promise<SaveResult> {
  const body = JSON.stringify(payload)
  let failure = GENERIC_MESSAGE

  for (let attempt = 0; attempt <= delays.length; attempt += 1) {
    let retryable = false

    try {
      const response = await fetchFn(`/api/organizations/${slug}/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
      })
      const result = (await response.json().catch(() => null)) as {
        data?: Order
        error?: string
      } | null

      if (response.ok && result?.data?.id) return { ok: true, order: result.data }

      retryable = response.status >= 500 || response.status === 429 || response.status === 408
      failure = (result?.error && ORDER_ERROR_MESSAGES[result.error]) || GENERIC_MESSAGE
    } catch {
      retryable = true
      failure = NETWORK_MESSAGE
    }

    if (!retryable || attempt === delays.length) break
    await sleep(delays[attempt])
  }

  return { ok: false, message: failure }
}
