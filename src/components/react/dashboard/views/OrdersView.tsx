import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import supabase from '../../../../libs/supabase'
import { useReactToPrint } from 'react-to-print'
import { Ticket } from '../Ticket'
import { KitchenTicket } from '../KitchenTicket'
import type { Order, OrderItem, OrderStatus } from '../../../../types/orders'

const DISCOUNT_TYPES = {
  Clientes: 'clients',
  Empleados: 'employees',
  Otros: 'others',
} as const

const PAYMENT_METHODS = {
  Efectivo: 'cash',
  Débito: 'debit',
  Crédito: 'credit',
  Virtual: 'virtual',
} as const

const METHOD_LABELS: Record<string, string> = {
  cash: 'Efectivo',
  debit: 'Débito',
  credit: 'Crédito',
  virtual: 'Virtual',
}

const ORDER_ERRORS: Record<string, string> = {
  payments_mismatch: 'Los montos de pago no suman el total más la propina.',
  invalid_payments: 'Revisá los métodos de pago. No podés repetir el mismo método.',
  cash_insufficient: 'El efectivo recibido no alcanza para cubrir el pago.',
  invalid_items: 'Hay productos que ya no están disponibles. Quitalos e intentá de nuevo.',
  invalid_discount: 'El descuento no es válido.',
  owner_access_required: 'Tu usuario no tiene permiso para esta acción.',
  subscription_required: 'La suscripción del local no está activa.',
}

function getUnitPrice(product: {
  price: number | string
  in_offer?: boolean
  offer_percent?: number | null
}) {
  const base = Number(product.price)
  return product.in_offer && product.offer_percent
    ? Math.round(base * (1 - Number(product.offer_percent) / 100))
    : base
}

function timeAgo(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
  if (diff < 60) return `${diff}s`
  if (diff < 3600) return `${Math.floor(diff / 60)}m`
  return `${Math.floor(diff / 3600)}h`
}

function getMinutesElapsed(dateStr: string): number {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000)
}

export default function OrdersView({ slug }: { slug: string }) {
  const [orders, setOrders] = useState<Order[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [isOpenNewOrder, setIsOpenNewOrder] = useState(false)
  const [customerName, setCustomerName] = useState('')
  const [tableNumber, setTableNumber] = useState('')
  const [cart, setCart] = useState<OrderItem[]>([])
  const [cancelConfirm, setCancelConfirm] = useState<string | null>(null)

  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [paymentMethod2, setPaymentMethod2] = useState<string | null>(null)

  const [splitAmount1, setSplitAmount1] = useState('')
  const [splitAmount2, setSplitAmount2] = useState('')

  const [cashGiven, setCashGiven] = useState('')
  const [tipAmount, setTipAmount] = useState('')

  const [showDiscount, setShowDiscount] = useState(false)
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>('percentage')
  const [discountReason, setDiscountReason] = useState('clients')
  const [discountValue, setDiscountValue] = useState('')

  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const kitchenTicketRef = useRef<HTMLDivElement>(null)
  const invoiceTicketRef = useRef<HTMLDivElement>(null)

  const resetForm = () => {
    setCustomerName('')
    setTableNumber('')
    setCart([])
    setSearchQuery('')
    setPaymentMethod('cash')
    setPaymentMethod2(null)
    setShowDiscount(false)
    setDiscountValue('')
    setSplitAmount1('')
    setSplitAmount2('')
    setCashGiven('')
    setTipAmount('')
    setIsOpenNewOrder(false)
    setSelectedOrder(null)
  }

  const handlePrintKitchen = useReactToPrint({
    contentRef: kitchenTicketRef,
    pageStyle: '@page { size: 80mm auto; margin: 0; }',
  })

  const handlePrintInvoice = useReactToPrint({
    contentRef: invoiceTicketRef,
    onAfterPrint: resetForm,
  })

  const subtotal = cart.reduce((a, b) => a + b.price * b.qty, 0)

  let discountAmount = 0
  const numericDiscount = parseFloat(discountValue) || 0
  if (numericDiscount > 0) {
    if (discountType === 'percentage') {
      discountAmount = subtotal * (numericDiscount / 100)
    } else {
      discountAmount = numericDiscount
    }
  }

  const total = Math.max(0, subtotal - discountAmount)
  const finalTotalWithTip = total + (parseFloat(tipAmount) || 0)

  const isSplit = paymentMethod2 !== null
  const isCash1 = paymentMethod === 'cash'
  const isCash2 = paymentMethod2 === 'cash'
  const hasCash = isCash1 || isCash2

  const handleSplit1Change = (val: string) => {
    setSplitAmount1(val)
  }

  const handleSplit2Change = (val: string) => {
    setSplitAmount2(val)
  }

  const cashTargetAmount = isSplit
    ? isCash1
      ? parseFloat(splitAmount1) || 0
      : isCash2
        ? parseFloat(splitAmount2) || 0
        : 0
    : finalTotalWithTip

  const cashGivenNum = parseFloat(cashGiven) || 0
  const changeAmount = cashGiven ? Math.max(0, cashGivenNum - cashTargetAmount) : 0
  const missingAmount = cashGiven ? Math.max(0, cashTargetAmount - cashGivenNum) : 0
  const isPayingEnough = !cashGiven || cashGivenNum >= cashTargetAmount

  const splitDiff =
    (parseFloat(splitAmount1) || 0) + (parseFloat(splitAmount2) || 0) - finalTotalWithTip
  const splitInvalid = isSplit && (Math.abs(splitDiff) > 0.009 || paymentMethod === paymentMethod2)

  useEffect(() => {
    async function initDashboard() {
      setIsLoading(true)
      try {
        const [ordersRes, menuRes] = await Promise.all([
          fetch(`/api/organizations/${slug}/orders`),
          fetch(`/api/organizations/${slug}/menu`),
        ])

        if (ordersRes.ok) {
          const ordersData = await ordersRes.json()
          setOrders(ordersData.data ?? [])
        }

        if (menuRes.ok) {
          const menuData = await menuRes.json()
          const allProducts = (menuData.data ?? []).reduce((acc: any[], category: any) => {
            return category.items ? [...acc, ...category.items] : acc
          }, [])
          setProducts(allProducts.length > 0 ? allProducts : [])
        }
      } catch (e) {
        setError((e as Error).message)
      } finally {
        setIsLoading(false)
      }
    }
    initDashboard()
  }, [slug])

  useEffect(() => {
    const channel = supabase
      .channel('orders-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `org_slug=eq.${slug}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const incoming = payload.new as Order
            setOrders((prev) =>
              prev.some((o) => o.id === incoming.id) ? prev : [...prev, incoming],
            )
          }
          if (payload.eventType === 'UPDATE') {
            setOrders((prev) =>
              prev.map((o) => (o.id === (payload.new as Order).id ? (payload.new as Order) : o)),
            )
          }
          if (payload.eventType === 'DELETE') {
            setOrders((prev) => prev.filter((o) => o.id !== (payload.old as Order).id))
          }
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [slug])

  const handleStatusChange = useCallback(
    async (id: string, status: OrderStatus) => {
      setOrders((prev) => {
        if (status === 'delivered' || status === 'cancelled') return prev.filter((o) => o.id !== id)
        return prev.map((o) => (o.id === id ? { ...o, status } : o))
      })

      try {
        const res = await fetch(`/api/organizations/${slug}/orders/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status }),
        })
        if (!res.ok) throw new Error('Failed to update the status on the server')
      } catch (e) {
        console.error(e)
      }
    },
    [slug],
  )

  const addToCart = (p: {
    id: string
    name: string
    price: number | string
    in_offer?: boolean
    offer_percent?: number | null
  }) => {
    const price = getUnitPrice(p)
    setCart((prev) => {
      const exists = prev.find((item) => item.id === p.id)
      if (exists) {
        return prev.map((item) => (item.id === p.id ? { ...item, qty: item.qty + 1 } : item))
      }
      return [...prev, { id: p.id, name: p.name, price, qty: 1 }]
    })
  }

  const removeFromCart = (id: string) => {
    setCart((prev) => {
      const exists = prev.find((item) => item.id === id)
      if (!exists) return prev
      if (exists.qty > 1) {
        return prev.map((item) => (item.id === id ? { ...item, qty: item.qty - 1 } : item))
      }
      return prev.filter((item) => item.id !== id)
    })
  }

  const submitOrder = async (e?: React.FormEvent | React.MouseEvent) => {
    e?.preventDefault()
    if (!customerName || cart.length === 0 || isSubmitting) return

    setIsSubmitting(true)
    setError(null)

    try {
      const payload = {
        customer_name: customerName,
        table_number: tableNumber || null,
        items: cart.map(({ id, qty }) => ({ id, qty })),
        discount:
          discountAmount > 0
            ? { type: discountType, value: numericDiscount, reason: discountReason }
            : null,
        tip_amount: parseFloat(tipAmount) || 0,
        payments: isSplit
          ? [
              { method: paymentMethod, amount: parseFloat(splitAmount1) || 0 },
              { method: paymentMethod2, amount: parseFloat(splitAmount2) || 0 },
            ]
          : [{ method: paymentMethod }],
        cash_given: hasCash && cashGiven ? parseFloat(cashGiven) : null,
      }

      const res = await fetch(`/api/organizations/${slug}/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const result = await res.json()
      if (!res.ok) {
        throw new Error(ORDER_ERRORS[result.error] ?? 'No se pudo procesar la comanda.')
      }

      setTimeout(() => handlePrintKitchen(), 150)
      const createdOrder: Order = result.data
      setOrders((prev) =>
        prev.some((o) => o.id === createdOrder.id) ? prev : [...prev, createdOrder],
      )
      setSelectedOrder(createdOrder)
    } catch (e: any) {
      console.error('Error detallado:', e)
      setError(e.message || 'Ocurrió un error inesperado al guardar el pedido.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const sortedOrdersFIFO = useMemo(() => {
    return [...orders].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    )
  }, [orders])

  const filteredProducts = useMemo(() => {
    return products
      .filter((p) => p.name.toLowerCase().includes(searchQuery.toLowerCase()))
      .slice(0, 50)
  }, [products, searchQuery])

  if (isLoading && orders.length === 0 && products.length === 0)
    return (
      <div className="h-64 flex items-center justify-center text-xs font-black uppercase tracking-widest text-gray-300 animate-pulse">
        Cargando...
      </div>
    )

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-6rem)] w-full relative bg-gray-50/50 overflow-hidden">
      <div className="flex-1 px-4 md:px-8 py-6 overflow-y-auto h-full [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-gray-200 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-gray-300 transition-colors">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <span className="text-[9px] font-black uppercase tracking-widest text-gray-400">
              KDS / Sistema de Despacho de Cocina
            </span>
            <h2 className="text-xl font-bold tracking-tight text-gray-900">
              Fila de Producción Directa
            </h2>
          </div>

          <button
            onClick={() => setIsOpenNewOrder(true)}
            className="lg:hidden px-4 py-2 bg-gray-900 text-white text-xs font-black uppercase tracking-wider self-start"
          >
            + Tomar Pedido
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-600 text-xs font-bold border border-red-100">
            ⚠ {error}
          </div>
        )}

        <div className="flex flex-col gap-3">
          <AnimatePresence mode="popLayout">
            {sortedOrdersFIFO.map((order, index) => {
              const minutesElapsed = getMinutesElapsed(order.created_at)
              const isDelayed = minutesElapsed >= 5

              return (
                <motion.div
                  key={order.id}
                  layout
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className={`bg-white border rounded-sm shadow-xs overflow-hidden flex flex-col md:flex-row md:items-center min-h-18 transition-colors ${
                    isDelayed ? 'border-amber-300' : 'border-gray-200'
                  }`}
                >
                  <div
                    className={`p-4 flex items-center justify-center shrink-0 min-w-14 text-center font-black text-lg border-b md:border-b-0 md:border-r ${
                      isDelayed
                        ? 'bg-amber-550 text-amber-950 border-amber-300'
                        : 'bg-gray-900 text-white border-gray-200'
                    }`}
                  >
                    {index + 1}
                  </div>

                  <div className="p-4 flex flex-col justify-center min-w-36 shrink-0 border-b md:border-b-0 md:border-r border-gray-100 bg-gray-50/50">
                    <span className="text-xs font-black text-gray-950 truncate uppercase tracking-tight">
                      {order.customer_name}
                    </span>
                    <div className="flex items-center gap-2 mt-0.5">
                      {order.table_number && (
                        <span className="text-[10px] font-black bg-gray-200 text-gray-800 px-1 py-0.2 rounded-xs">
                          M {order.table_number}
                        </span>
                      )}
                      <span
                        className={`text-[10px] font-mono font-bold ${
                          isDelayed ? 'text-amber-700 font-black' : 'text-gray-400'
                        }`}
                      >
                        ⏱ {timeAgo(order.created_at)}
                      </span>
                    </div>
                  </div>

                  <div className="flex-1 p-3.5 flex flex-wrap gap-1.5 items-center bg-white min-w-0">
                    {order.items.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center gap-1.5 bg-gray-100 px-2.5 py-1.5 rounded-sm border border-gray-200/60 text-xs font-bold shrink-0"
                      >
                        <span className="text-gray-950 font-black text-sm bg-white border px-1.5 py-0.2 shadow-2xs rounded-xs">
                          {item.qty}
                        </span>
                        <span className="text-gray-900 tracking-tight">{item.name}</span>
                      </div>
                    ))}
                  </div>

                  <div className="p-3 shrink-0 bg-gray-50/30 border-t md:border-t-0 md:border-l border-gray-100 flex flex-col items-end gap-2">
                    <button
                      onClick={() => handleStatusChange(order.id, 'delivered')}
                      className="w-full md:w-auto px-5 py-2.5 text-[10px] font-black uppercase tracking-widest text-white bg-gray-900 hover:bg-gray-800 active:bg-black transition-colors rounded-sm"
                    >
                      ✓ Despachar
                    </button>

                    {cancelConfirm === order.id ? (
                      <div className="flex items-center gap-1.5 w-full md:w-auto">
                        <span className="text-[10px] text-gray-400 font-bold">¿Cancelar?</span>
                        <button
                          onClick={() => {
                            handleStatusChange(order.id, 'cancelled')
                            setCancelConfirm(null)
                          }}
                          className="px-3 py-1.5 bg-red-500 text-white text-[10px] font-black hover:bg-red-600 transition-colors rounded-sm"
                        >
                          Sí
                        </button>
                        <button
                          onClick={() => setCancelConfirm(null)}
                          className="px-3 py-1.5 bg-gray-100 text-gray-600 text-[10px] font-black hover:bg-gray-200 transition-colors rounded-sm"
                        >
                          No
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setCancelConfirm(order.id)}
                        className="w-full md:w-auto px-5 py-2 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-red-500 hover:bg-red-50 border border-gray-200 hover:border-red-200 transition-colors rounded-sm"
                      >
                        ✕ Cancelar
                      </button>
                    )}
                  </div>
                </motion.div>
              )
            })}
          </AnimatePresence>

          {sortedOrdersFIFO.length === 0 && (
            <div className="text-center py-20 bg-white border border-gray-200 border-dashed rounded-sm text-xs font-bold text-gray-300 uppercase tracking-widest">
              Sin comandas pendientes en fila
            </div>
          )}
        </div>
      </div>

      <div
        className={`
          ${isOpenNewOrder ? 'fixed inset-y-0 right-0 z-50 w-full sm:w-100 bg-white shadow-2xl flex flex-col' : 'hidden'}
          lg:flex lg:static lg:w-100 lg:border-l lg:border-gray-200 lg:shadow-none bg-white p-6 flex flex-col shrink-0 h-full overflow-y-auto
          [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-gray-200 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-gray-300 transition-colors
        `}
      >
        <div className="flex justify-between items-center mb-5 shrink-0">
          <h3 className="font-black text-xs uppercase tracking-wider text-gray-400">
            Caja / Nuevo Pedido
          </h3>
          <div className="flex items-center gap-4">
            <button
              onClick={() => selectedOrder && handlePrintInvoice()}
              title={selectedOrder ? 'Imprimir factura del cliente' : 'Aún no hay comanda creada'}
              className={`flex items-center gap-1.5 transition-all rounded-sm ${
                selectedOrder
                  ? 'text-white bg-gray-900 px-3 py-1.5 animate-pulse cursor-pointer hover:animate-none hover:bg-black'
                  : 'text-gray-300 cursor-default'
              }`}
            >
              <svg
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
                />
              </svg>
              <span
                className={`text-[10px] font-black uppercase tracking-wider hidden lg:block ${!selectedOrder && 'hidden'}`}
              >
                Factura
              </span>
            </button>
            {isOpenNewOrder && (
              <button
                onClick={() => setIsOpenNewOrder(false)}
                className="text-gray-400 font-bold text-xs lg:hidden"
              >
                Cerrar
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 flex flex-col pr-1 space-y-4 shrink-0">
          <div className="space-y-2 shrink-0">
            <input
              type="text"
              placeholder="Nombre cliente"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className="w-full text-xs p-3 border border-gray-200 font-bold focus:outline-none focus:border-black rounded-sm"
            />
            <input
              type="text"
              placeholder="Mesa (Opcional)"
              value={tableNumber}
              onChange={(e) => setTableNumber(e.target.value)}
              className="w-full text-xs p-3 border border-gray-200 font-bold focus:outline-none focus:border-black rounded-sm"
            />
          </div>

          <div className="shrink-0">
            <div className="flex justify-between items-center mb-2">
              <label className="text-[10px] font-black uppercase text-gray-400 tracking-wider">
                Método de Pago principal
              </label>
              {!isSplit && (
                <button
                  onClick={() => setPaymentMethod2(paymentMethod === 'debit' ? 'cash' : 'debit')}
                  className="text-[10px] font-black text-gray-400 hover:text-black transition-colors"
                >
                  + AGREGAR
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-1.5 mb-2">
              {Object.entries(PAYMENT_METHODS).map(([label, value]) => (
                <button
                  key={value}
                  onClick={() => setPaymentMethod(value)}
                  className={`py-2 px-1 text-[11px] font-bold rounded-sm border transition-colors ${
                    paymentMethod === value
                      ? 'bg-black text-white border-black'
                      : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <AnimatePresence>
              {isSplit && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="bg-gray-50 p-2 rounded-sm border border-dashed border-gray-300 overflow-hidden"
                >
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-[9px] font-black uppercase tracking-wider text-gray-500">
                      Segundo Método (Dividido)
                    </span>
                    <button
                      onClick={() => setPaymentMethod2(null)}
                      className="text-[9px] font-black text-red-500 hover:text-red-700 uppercase"
                    >
                      ✕ Quitar
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {Object.entries(PAYMENT_METHODS).map(([label, value]) => (
                      <button
                        key={`${value}-2`}
                        onClick={() => setPaymentMethod2(value)}
                        className={`py-1.5 px-1 text-[10px] font-bold rounded-sm border transition-colors ${
                          paymentMethod2 === value
                            ? 'bg-gray-800 text-white border-gray-800'
                            : 'bg-white text-gray-400 border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="shrink-0">
            <input
              type="text"
              placeholder="🔍 Buscar producto..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs p-2.5 bg-gray-50 border border-gray-200 focus:outline-none focus:bg-white focus:border-black font-medium rounded-sm"
            />
          </div>

          <div className="max-h-36 overflow-y-auto pr-2 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-gray-200 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-gray-300 transition-colors shrink-0">
            <div className="grid grid-cols-1 gap-2">
              {filteredProducts.map((p) => (
                <button
                  key={p.id}
                  onClick={() => addToCart(p)}
                  className="p-3 border bg-white border-gray-200 rounded-sm text-left hover:border-black transition-all flex justify-between items-center group active:bg-gray-50"
                >
                  <div className="min-w-0 flex-1 pr-2">
                    <p className="text-xs font-bold text-gray-900 group-hover:text-black truncate">
                      {p.name}
                    </p>
                  </div>
                  <span className="text-xs font-black text-gray-400 shrink-0 bg-gray-50 px-2 py-1 border rounded-xs">
                    ${getUnitPrice(p).toLocaleString('es-AR')}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="border-t border-gray-200 pt-4 shrink-0 bg-white mt-auto">
          <div className="max-h-[15vh] overflow-y-auto overflow-x-hidden space-y-2 mb-4 pr-2 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-gray-200 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-gray-300 transition-colors">
            <AnimatePresence mode="popLayout">
              {cart.map((item) => (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  className="flex justify-between items-center text-xs font-bold bg-white py-1"
                >
                  <span className="text-gray-700 truncate mr-2">
                    {item.qty}x {item.name}
                  </span>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-gray-950 font-black">
                      ${(item.price * item.qty).toLocaleString('es-AR')}
                    </span>
                    <button
                      onClick={() => removeFromCart(item.id)}
                      className="text-[10px] text-red-500 hover:text-red-700 font-black uppercase h-5 w-5 flex items-center justify-center border border-transparent hover:border-red-100 rounded-xs"
                    >
                      ✕
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          <div className="bg-gray-50 p-3 border border-gray-200 rounded-sm mb-4">
            <label className="text-[10px] font-black uppercase tracking-wider text-gray-400 block mb-1.5">
              Propina / Tip Amount
            </label>
            <div className="relative">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-xs">
                $
              </span>
              <input
                type="number"
                placeholder="Monto de propina..."
                value={tipAmount}
                onChange={(e) => setTipAmount(e.target.value)}
                className="w-full pl-7 pr-2 py-2 text-xs font-bold border border-gray-200 bg-white focus:outline-none focus:border-black rounded-xs"
              />
            </div>
          </div>

          <div className="border-t border-gray-100 pt-3 mb-2">
            <button
              onClick={() => setShowDiscount(!showDiscount)}
              className="text-[10px] font-black uppercase tracking-wider text-gray-500 hover:text-black transition-colors mb-2"
            >
              {showDiscount ? '− Ocultar Descuento' : '+ Aplicar Descuento'}
            </button>

            <AnimatePresence>
              {showDiscount && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="bg-gray-50 p-3 rounded-sm border border-gray-200 space-y-3 mb-2 overflow-hidden"
                >
                  <div className="flex gap-1">
                    {Object.entries(DISCOUNT_TYPES).map(([label, reason]) => (
                      <button
                        key={reason}
                        onClick={() => setDiscountReason(reason.toLowerCase())}
                        className={`flex-1 py-1.5 text-[10px] font-bold rounded-xs border ${
                          discountReason === reason.toLowerCase()
                            ? 'bg-gray-900 text-white border-gray-900'
                            : 'bg-white text-gray-500 border-gray-200'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>

                  <div className="flex gap-2">
                    <div className="flex border border-gray-200 rounded-xs overflow-hidden bg-white shrink-0">
                      <button
                        onClick={() => setDiscountType('percentage')}
                        className={`px-3 py-1.5 text-xs font-black transition-colors ${
                          discountType === 'percentage'
                            ? 'bg-gray-200 text-black'
                            : 'text-gray-400 hover:bg-gray-50'
                        }`}
                      >
                        %
                      </button>
                      <button
                        onClick={() => setDiscountType('fixed')}
                        className={`px-3 py-1.5 text-xs font-black transition-colors ${
                          discountType === 'fixed'
                            ? 'bg-gray-200 text-black'
                            : 'text-gray-400 hover:bg-gray-50'
                        }`}
                      >
                        $
                      </button>
                    </div>
                    <input
                      type="number"
                      placeholder="Monto..."
                      value={discountValue}
                      onChange={(e) => setDiscountValue(e.target.value)}
                      className="w-full text-xs p-2 border border-gray-200 font-bold focus:outline-none focus:border-black rounded-xs"
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="border-t border-gray-100 pt-3">
            {discountAmount > 0 && (
              <>
                <div className="flex justify-between font-bold text-xs mb-1 text-gray-500">
                  <span>Subtotal:</span>
                  <span>$ {subtotal.toLocaleString('es-AR')}</span>
                </div>
                <div className="flex justify-between font-bold text-xs mb-2 text-red-500">
                  <span>
                    Descuento {discountType === 'percentage' ? `(${discountValue}%)` : ''}:
                  </span>
                  <span>- $ {Math.round(discountAmount).toLocaleString('es-AR')}</span>
                </div>
              </>
            )}

            {parseFloat(tipAmount) > 0 && (
              <div className="flex justify-between font-bold text-xs mb-2 text-emerald-600">
                <span>Propina:</span>
                <span>+ $ {parseFloat(tipAmount).toLocaleString('es-AR')}</span>
              </div>
            )}

            <div className="flex justify-between font-black text-sm mb-4 tracking-tight">
              <span>TOTAL:</span>
              <span>$ {Math.round(finalTotalWithTip).toLocaleString('es-AR')}</span>
            </div>

            <>
              {(() => {
                const suma = (parseFloat(splitAmount1) || 0) + (parseFloat(splitAmount2) || 0)
                const diff = suma - finalTotalWithTip
                const showDiffLabel =
                  isSplit && finalTotalWithTip > 0 && (splitAmount1 || splitAmount2)

                return (
                  <>
                    <motion.div
                      initial={false}
                      animate={{
                        height: showDiffLabel ? 'auto' : 0,
                        opacity: showDiffLabel ? 1 : 0,
                        marginBottom: showDiffLabel ? 8 : 0,
                      }}
                      transition={{
                        duration: 0.25,
                        ease: [0.4, 0, 0.2, 1],
                      }}
                      className="overflow-hidden px-1"
                    >
                      <div
                        className={`flex justify-between items-center text-xs font-black ${diff >= 0 ? 'text-emerald-600' : 'text-red-500'}`}
                      >
                        <span>{diff >= 0 ? 'Cubierto' : 'Falta'}</span>
                        <span>
                          {diff >= 0
                            ? `+ $${diff.toLocaleString('es-AR')}`
                            : `$${Math.abs(diff).toLocaleString('es-AR')}`}
                        </span>
                      </div>
                    </motion.div>

                    <motion.div
                      initial={false}
                      animate={{
                        height: isSplit && finalTotalWithTip > 0 ? 'auto' : 0,
                        opacity: isSplit && finalTotalWithTip > 0 ? 1 : 0,
                        marginBottom: isSplit && finalTotalWithTip > 0 ? 16 : 0,
                      }}
                      transition={{
                        duration: 0.3,
                        ease: [0.4, 0, 0.2, 1],
                      }}
                      className="flex gap-2 overflow-hidden"
                    >
                      <div className="flex-1 bg-gray-50 border border-gray-200 rounded-sm p-2">
                        <label className="text-[9px] font-black uppercase tracking-wider text-gray-500 mb-1 block">
                          Monto en {METHOD_LABELS[paymentMethod] ?? paymentMethod}
                        </label>
                        <div className="relative">
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-xs">
                            $
                          </span>
                          <input
                            type="number"
                            value={splitAmount1}
                            onChange={(e) => handleSplit1Change(e.target.value)}
                            placeholder="0"
                            className="w-full pl-6 pr-2 py-1 text-xs font-black border-b border-transparent focus:border-gray-900 focus:outline-none bg-transparent transition-colors"
                          />
                        </div>
                      </div>

                      <div className="flex-1 bg-gray-50 border border-gray-200 rounded-sm p-2">
                        <label className="text-[9px] font-black uppercase tracking-wider text-gray-500 mb-1 block">
                          Monto en {METHOD_LABELS[paymentMethod2 ?? ''] ?? paymentMethod2}
                        </label>
                        <div className="relative">
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-xs">
                            $
                          </span>
                          <input
                            type="number"
                            value={splitAmount2}
                            onChange={(e) => handleSplit2Change(e.target.value)}
                            placeholder="0"
                            className="w-full pl-6 pr-2 py-1 text-xs font-black border-b border-transparent focus:border-gray-900 focus:outline-none bg-transparent transition-colors"
                          />
                        </div>
                      </div>
                    </motion.div>
                  </>
                )
              })()}

              <motion.div
                initial={false}
                animate={{
                  height: hasCash && finalTotalWithTip > 0 ? 'auto' : 0,
                  opacity: hasCash && finalTotalWithTip > 0 ? 1 : 0,
                  marginTop: hasCash && finalTotalWithTip > 0 ? 16 : 0,
                  marginBottom: hasCash && finalTotalWithTip > 0 ? 16 : 0,
                }}
                transition={{
                  duration: 0.3,
                  ease: [0.4, 0, 0.2, 1],
                }}
                className="overflow-hidden"
              >
                <div className="bg-white border border-gray-200 p-4 rounded-sm">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1">
                      <label className="text-[9px] font-black uppercase tracking-wider text-gray-400 mb-1.5 block">
                        Paga {isSplit ? 'la parte en efectivo' : 'el total'} con:
                      </label>
                      <div className="relative">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-xs">
                          $
                        </span>
                        <input
                          type="number"
                          value={cashGiven}
                          onChange={(e) =>
                            setCashGiven(e.target.value === '0' ? '' : e.target.value)
                          }
                          placeholder="0"
                          className="w-full pl-7 pr-2 py-2 text-xs font-black border border-gray-200 rounded-sm focus:outline-none focus:border-black transition-colors bg-gray-50"
                        />
                      </div>
                    </div>

                    <div className="flex-1 text-right">
                      <label className="text-[9px] font-black uppercase tracking-wider text-gray-400 mb-1.5 block">
                        {isPayingEnough ? 'Vuelto' : 'Faltante'}
                      </label>
                      <div
                        className={`text-sm font-black tracking-tight ${
                          !cashGiven
                            ? 'text-gray-400'
                            : isPayingEnough
                              ? 'text-emerald-600'
                              : 'text-red-600'
                        }`}
                      >
                        ${' '}
                        {cashGiven
                          ? isPayingEnough
                            ? changeAmount.toLocaleString('es-AR')
                            : missingAmount.toLocaleString('es-AR')
                          : '0'}
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            </>

            <button
              onClick={submitOrder}
              disabled={!customerName || cart.length === 0 || isSubmitting || splitInvalid}
              className="w-full py-4 bg-gray-900 text-white font-black text-xs uppercase tracking-widest hover:bg-black disabled:bg-gray-100 disabled:text-gray-300 transition-colors rounded-sm"
            >
              {isSubmitting ? 'Creando...' : 'Crear Comanda →'}
            </button>
          </div>
        </div>
      </div>

      <div className="print-delivery-wrapper">
        <style>{`
          .print-delivery-wrapper {
            overflow: hidden;
            height: 0;
            width: 0;
          }
          @media print {
            .print-delivery-wrapper {
              overflow: visible !important;
              height: auto !important;
              width: 80mm !important;
              max-width: 80mm !important;
              display: block !important;
              margin: 0 auto !important;
            }
          }
        `}</style>
        {selectedOrder && (
          <>
            <KitchenTicket ref={kitchenTicketRef} order={selectedOrder} />
            <Ticket
              ref={invoiceTicketRef}
              order={selectedOrder}
              orgName={slug}
              discountAmount={discountAmount}
            />
          </>
        )}
      </div>
    </div>
  )
}
