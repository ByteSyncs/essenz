import React, { forwardRef } from 'react'
import type { Order } from './views/OrdersView'

interface Props {
  order: Order
  orgName: string
  discountAmount?: number
}

const formatMethod = (m: string) =>
  ({ cash: 'Efectivo', debit: 'Débito', credit: 'Crédito', virtual: 'Virtual' })[m] ?? m

export const Ticket = forwardRef<HTMLDivElement, Props>(
  ({ order, orgName, discountAmount }, ref) => {
    const subtotal = order.items.reduce((a, b) => a + b.price * b.qty, 0)
    const hasDiscount = discountAmount && discountAmount > 0

    return (
      <div ref={ref} className="print-wrapper-flex">
        <style>{`
          @media print {
            @page {
              size: 80mm auto !important;
              margin: 0mm !important;
            }
            
            html, body {
              margin: 0 !important;
              padding: 0 !important;
              width: 100% !important;
              width: 100vw !important;
              background-color: #fff !important;
            }

            .print-wrapper-flex {
              display: flex !important;
              justify-content: center !important;
              align-items: flex-start !important;
              width: 100% !important;
              width: 100vw !important;
              margin: 0 !important;
              padding: 0 !important;
              background-color: #fff !important;
            }

            .ticket-inner-container {
              width: 80mm !important;
              max-width: 80mm !important;
              padding: 16px !important;
              box-sizing: border-box !important;
              page-break-inside: avoid !important;
              break-inside: avoid !important;
            }
          }
        `}</style>

        <div
          className="ticket-inner-container"
          style={{
            fontFamily: 'monospace',
            padding: '16px',
            width: '80mm',
            maxWidth: '100%',
            fontSize: '13px',
            lineHeight: '1.6',
            color: '#000',
            backgroundColor: '#fff',
            boxSizing: 'border-box',
          }}
        >
          <p
            style={{ fontWeight: 'bold', fontSize: '16px', margin: '0 0 2px', textAlign: 'center' }}
          >
            {orgName.toUpperCase()}
          </p>
          <p style={{ margin: '0 0 10px', fontSize: '11px', textAlign: 'center', color: '#000' }}>
            {new Date(order.created_at).toLocaleString('es-AR')}
          </p>

          <hr style={{ margin: '8px 0', border: 'none', borderTop: '1px solid #000' }} />

          <p style={{ margin: '2px 0' }}>
            <strong>Cliente:</strong> {order.customer_name.toUpperCase()}
          </p>
          {order.table_number && (
            <p style={{ margin: '2px 0' }}>
              <strong>Mesa:</strong> {order.table_number}
            </p>
          )}

          <hr style={{ margin: '8px 0', border: 'none', borderTop: '1px solid #000' }} />

          {order.items.map((item, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                margin: '4px 0',
              }}
            >
              <span style={{ maxWidth: '70%', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {item.name} x{item.qty}
              </span>
              <span>${(item.price * item.qty).toLocaleString('es-AR')}</span>
            </div>
          ))}

          <hr style={{ margin: '8px 0', border: 'none', borderTop: '1px solid #000' }} />

          {hasDiscount && (
            <>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  margin: '2px 0',
                }}
              >
                <span>Subtotal</span>
                <span>${subtotal.toLocaleString('es-AR')}</span>
              </div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  margin: '2px 0',
                  fontWeight: 'bold',
                }}
              >
                <span>Descuento</span>
                <span>- ${Math.round(discountAmount).toLocaleString('es-AR')}</span>
              </div>
            </>
          )}

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontWeight: 'bold',
              fontSize: '15px',
              margin: '4px 0',
            }}
          >
            <span>TOTAL</span>
            <span>${order.total_price.toLocaleString('es-AR')}</span>
          </div>

          <hr style={{ margin: '8px 0', border: 'none', borderTop: '1px solid #000' }} />

          <p style={{ margin: '2px 0' }}>
            <strong>Pago:</strong>{' '}
            {order.payments
              .map((p) => `${formatMethod(p.method)} $${p.amount.toLocaleString('es-AR')}`)
              .join(' + ')}
          </p>

          <p style={{ textAlign: 'center', marginTop: '16px', fontSize: '12px' }}>
            ¡Gracias por su visita!
          </p>
        </div>
      </div>
    )
  },
)

Ticket.displayName = 'Ticket'
