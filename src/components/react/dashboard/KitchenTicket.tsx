import React, { forwardRef } from 'react'
import type { Order } from './views/OrdersView'

export const KitchenTicket = forwardRef<HTMLDivElement, { order: Order }>(({ order }, ref) => {
  const time = new Date(order.created_at).toLocaleTimeString('es-AR', {
    hour: '2-digit',
    minute: '2-digit',
  })

  return (
    <div ref={ref} className="print-wrapper-flex">
      <style>{`
        @media print {
          @page {
            size: 80mm auto !important;
            margin: 0mm !important;
          }
          
          /* Reseteamos el lienzo completo del navegador al 100% del ancho visible */
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            width: 100vw !important;
            background-color: #fff !important;
          }

          /* Forzamos un contenedor Flexbox que centre TODO en el medio del lienzo */
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

          /* Solo el tique real se restringe a los 80mm de la tiquetera */
          .kitchen-inner-container {
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
        className="kitchen-inner-container"
        style={{
          fontFamily: 'monospace',
          padding: '16px',
          width: '80mm',
          maxWidth: '100%',
          fontSize: '14px',
          lineHeight: '1.5',
          color: '#000',
          backgroundColor: '#fff',
          boxSizing: 'border-box',
        }}
      >
        <p
          style={{
            fontWeight: 'bold',
            fontSize: '19px',
            margin: '0 0 4px',
            textTransform: 'uppercase',
          }}
        >
          {order.customer_name.toUpperCase()}
        </p>

        {order.table_number && (
          <p style={{ margin: '0 0 8px', fontSize: '14px', fontWeight: 'bold', color: '#000' }}>
            MESA: {order.table_number}
          </p>
        )}

        <hr style={{ margin: '8px 0', border: 'none', borderTop: '1px dashed #000' }} />

        {order.items.map((item, i) => (
          <p key={i} style={{ margin: '6px 0', fontSize: '15px', fontWeight: 'bold' }}>
            {item.name} x{item.qty}
          </p>
        ))}

        <hr style={{ margin: '8px 0', border: 'none', borderTop: '1px dashed #000' }} />

        <p style={{ fontSize: '12px', color: '#000', margin: 0, textAlign: 'right' }}>{time}</p>
      </div>
    </div>
  )
})

KitchenTicket.displayName = 'KitchenTicket'
