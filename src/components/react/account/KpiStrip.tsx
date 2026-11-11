import { formatDateRange, formatInteger, formatMoney } from '../../../libs/account/format'
import type { DeltaInfo, PeriodInfo, Totals } from '../../../types/account'
import { DeltaBadge, Skeleton, FOCUS } from './ui'

interface MetricProps {
  label: string
  value: string
  delta: DeltaInfo
  tone?: 'result' | 'neutral'
  featured?: boolean
}

function Metric({ label, value, delta, tone = 'result', featured = false }: MetricProps) {
  return (
    <div className={`bg-white p-4 ${featured ? 'col-span-2 lg:col-span-1' : ''}`}>
      <dt className="text-sm text-gray-700">{label}</dt>
      <dd className={`mt-1 font-bold text-(--clr-ink) ${featured ? 'text-3xl' : 'text-xl'}`}>
        {value}
      </dd>
      <dd className="mt-1">
        <DeltaBadge delta={delta} tone={tone} />
      </dd>
    </div>
  )
}

export function KpiSkeleton() {
  return (
    <div
      aria-hidden="true"
      className="grid grid-cols-2 gap-px border border-gray-200 bg-gray-200 lg:grid-cols-5"
    >
      {Array.from({ length: 5 }, (_, index) => (
        <div
          key={index}
          className={`bg-white p-4 ${index === 0 ? 'col-span-2 lg:col-span-1' : ''}`}
        >
          <Skeleton className="h-4 w-24" />
          <Skeleton className={`mt-2 w-32 ${index === 0 ? 'h-9' : 'h-7'}`} />
          <Skeleton className="mt-2 h-4 w-20" />
        </div>
      ))}
    </div>
  )
}

interface KpiStripProps {
  totals: Totals
  period: PeriodInfo
}

export default function KpiStrip({ totals, period }: KpiStripProps) {
  return (
    <section aria-labelledby="kpi-title">
      <h2 id="kpi-title" className="sr-only">
        Indicadores del período
      </h2>
      <dl className="grid grid-cols-2 gap-px border border-gray-200 bg-gray-200 lg:grid-cols-5">
        <Metric
          featured
          label="Facturación"
          value={formatMoney(totals.revenue)}
          delta={totals.revenueDelta}
        />
        <Metric label="Pedidos" value={formatInteger(totals.orders)} delta={totals.ordersDelta} />
        <Metric
          label="Ticket promedio"
          value={totals.avgTicket === null ? '—' : formatMoney(totals.avgTicket)}
          delta={totals.avgTicketDelta}
        />
        <Metric
          label="Gastos"
          value={formatMoney(totals.expenses)}
          delta={totals.expensesDelta}
          tone="neutral"
        />
        <Metric
          label="Resultado estimado"
          value={formatMoney(totals.result)}
          delta={totals.resultDelta}
        />
      </dl>

      <p className="mt-3 text-sm text-gray-700">
        Comparado con {formatDateRange(period.prevFrom, period.prevTo)}.
        {totals.tips > 0 && (
          <> Las propinas ({formatMoney(totals.tips)}) no están incluidas en la facturación.</>
        )}
      </p>

      <details className="mt-1 text-sm text-gray-800">
        <summary
          className={`inline-flex min-h-11 cursor-pointer items-center font-medium underline underline-offset-4 ${FOCUS}`}
        >
          Cómo se calcula cada indicador
        </summary>
        <dl className="mt-2 max-w-prose space-y-2">
          <div>
            <dt className="font-medium">Facturación</dt>
            <dd>Suma del total de los pedidos no cancelados, sin propinas.</dd>
          </div>
          <div>
            <dt className="font-medium">Ticket promedio</dt>
            <dd>Facturación dividida por la cantidad de pedidos.</dd>
          </div>
          <div>
            <dt className="font-medium">Gastos</dt>
            <dd>Suma de los gastos registrados en cada sucursal.</dd>
          </div>
          <div>
            <dt className="font-medium">Resultado estimado</dt>
            <dd>
              Facturación menos gastos registrados. No incluye costo de mercadería, impuestos ni
              comisiones.
            </dd>
          </div>
          <div>
            <dt className="font-medium">Días y horarios</dt>
            <dd>Los días se cuentan en hora argentina (UTC-3).</dd>
          </div>
        </dl>
      </details>
    </section>
  )
}
