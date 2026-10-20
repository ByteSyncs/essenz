import { useState } from 'react'
import type { PlansId } from '../../../types/plans'
import Alert from '../Alert'

interface CheckoutProps {
  planName: PlansId
  price: number
  clientName: string
  companyName: string
  slug: string
}

export const CheckoutPage = ({ planName, price, clientName, companyName, slug }: CheckoutProps) => {
  const formatted = new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
  }).format(price)

  const [loading, setLoading] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState<'mp' | 'stripe' | null>('mp')
  const [alertError, setAlertError] = useState<string | null>(null)

  const handlePayment = async () => {
    if (!paymentMethod) return

    setLoading(true)
    setAlertError(null)

    try {
      const response = await fetch('/api/payments/create-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan_id: planName,
          method: paymentMethod,
          slug: slug,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error al conectar con el servidor de pagos')
      }

      if (data.url) {
        window.location.href = data.url
      } else {
        throw new Error('El servidor no devolvió un link de pago válido')
      }
    } catch (error) {
      console.error('Error de Checkout:', error)
      setAlertError(
        error instanceof Error
          ? error.message
          : 'Hubo un error al procesar el pago. Por favor, intenta de nuevo.',
      )
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <Alert message={alertError ?? ''} error={alertError} onClose={() => setAlertError(null)} />

      <div className="max-w-5xl mx-auto">
        <header className="mb-12 text-center">
          <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">
            Finaliza tu suscripción
          </h1>
          <p className="mt-2 text-lg text-gray-600">
            Estás a un paso de activar <strong>{companyName}</strong> en Essenz.
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-7 space-y-6">
            <section className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
              <h2 className="text-xl font-semibold mb-4 text-gray-800">
                1. Confirmar Datos de Facturación
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 bg-gray-50 rounded-lg border border-gray-100">
                  <span className="block text-xs text-gray-500 uppercase font-bold mb-1">
                    Propietario
                  </span>
                  <span className="text-gray-900 font-medium">{clientName}</span>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg border border-gray-100">
                  <span className="block text-xs text-gray-500 uppercase font-bold mb-1">
                    Empresa
                  </span>
                  <span className="text-gray-900 font-medium">{companyName}</span>
                </div>
              </div>
            </section>

            <section className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
              <h2 className="text-xl font-semibold mb-4 text-gray-800">
                2. Seleccionar Método de Pago
              </h2>
              <div className="space-y-3">
                <button
                  onClick={() => setPaymentMethod('mp')}
                  disabled={loading}
                  className={`w-full flex items-center justify-between p-4 border-2 rounded-xl transition-all ${
                    paymentMethod === 'mp'
                      ? 'border-blue-600 bg-blue-50/50'
                      : 'border-gray-100 hover:border-gray-300 bg-white'
                  } ${loading ? 'opacity-60 cursor-not-allowed' : ''}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-8 bg-blue-500 rounded flex items-center justify-center text-[10px] text-white font-bold uppercase shadow-inner">
                      MP
                    </div>
                    <div className="text-left">
                      <span
                        className={`block font-bold ${paymentMethod === 'mp' ? 'text-blue-900' : 'text-gray-700'}`}
                      >
                        Mercado Pago
                      </span>
                      <span className="text-xs text-gray-500">
                        Tarjetas de crédito, débito y dinero en cuenta
                      </span>
                    </div>
                  </div>
                  <div
                    className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${paymentMethod === 'mp' ? 'border-blue-600' : 'border-gray-300'}`}
                  >
                    {paymentMethod === 'mp' && <div className="w-3 h-3 bg-blue-600 rounded-full" />}
                  </div>
                </button>

                <button
                  disabled
                  className="w-full flex items-center justify-between p-4 border border-gray-200 rounded-xl bg-gray-50 opacity-50 cursor-not-allowed grayscale"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-8 bg-indigo-600 rounded flex items-center justify-center text-[10px] text-white font-bold uppercase">
                      Stripe
                    </div>
                    <div className="text-left">
                      <span className="block font-bold text-gray-700">Pago Internacional</span>
                      <span className="text-xs text-gray-500">Próximamente disponible</span>
                    </div>
                  </div>
                  <div className="w-6 h-6 rounded-full border-2 border-gray-200" />
                </button>
              </div>
            </section>

            {paymentMethod === 'mp' && (
              <section className="bg-blue-50 border border-blue-200 p-5 rounded-2xl flex items-start gap-4">
                <div className="w-9 h-9 bg-blue-100 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                  <svg
                    className="w-4 h-4 text-blue-600"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M13 16h-1v-4h-1m1-4h.01M12 2a10 10 0 100 20A10 10 0 0012 2z"
                    />
                  </svg>
                </div>
                <div>
                  <h3 className="font-bold text-blue-900 text-sm mb-1">
                    El pago es gestionado por Mercado Pago
                  </h3>
                  <p className="text-xs text-blue-700 leading-relaxed">
                    Serás redirigido a su plataforma segura donde podrás pagar con tarjeta de
                    crédito, débito, transferencia o dinero en cuenta.
                  </p>
                </div>
              </section>
            )}
          </div>

          <div className="lg:col-span-5">
            <div className="bg-white p-8 rounded-2xl shadow-lg border border-gray-100 sticky top-8">
              <h2 className="text-2xl font-bold mb-6 text-gray-900">Resumen del Plan</h2>

              <div className="flex justify-between items-center mb-4">
                <span className="text-gray-600">Plan Seleccionado</span>
                <span className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-sm font-bold uppercase tracking-wider">
                  {planName}
                </span>
              </div>

              <div className="space-y-4 border-y border-gray-100 py-6 my-6">
                <div className="flex justify-between">
                  <span className="text-gray-600">Suscripción Mensual</span>
                  <span className="text-gray-900 font-bold">{formatted}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Dominio Personalizado</span>
                  <span className="text-green-600 font-medium">Bonificado</span>
                </div>
              </div>

              <div className="flex justify-between items-baseline mb-8">
                <span className="text-lg font-bold text-gray-900">Total hoy</span>
                <div className="text-right">
                  <span className="text-3xl font-extrabold text-gray-900">{formatted}</span>
                  <span className="block text-[10px] text-gray-400 uppercase font-bold tracking-tighter">
                    Iva incluido
                  </span>
                </div>
              </div>

              <button
                onClick={handlePayment}
                disabled={loading || !paymentMethod}
                className={`w-full py-4 rounded-xl font-bold text-lg transition-all shadow-xl flex items-center justify-center gap-2 ${
                  loading
                    ? 'bg-blue-400 cursor-not-allowed text-white'
                    : !paymentMethod
                      ? 'bg-gray-300 cursor-not-allowed text-gray-500'
                      : 'bg-gray-900 text-white hover:bg-black active:scale-[0.98] shadow-gray-200'
                }`}
              >
                {loading ? (
                  <>
                    <svg
                      className="animate-spin h-5 w-5 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    Redirigiendo a Mercado Pago...
                  </>
                ) : (
                  'Confirmar y Pagar'
                )}
              </button>

              <p className="mt-6 text-center text-[11px] text-gray-400 px-4 leading-relaxed">
                Al continuar, aceptas los términos de servicio de <strong>Essenz</strong>. Tu
                suscripción se renovará automáticamente cada mes.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
