import { useMemo, useState } from 'react'
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  formatCompactMoney,
  formatDateRange,
  formatInteger,
  formatMoney,
  formatShortDate,
  formatWeekdayDate,
} from '../../../libs/account/format'
import type { ChartBucket, ChartPoint } from '../../../types/account'
import { FOCUS, Skeleton } from './ui'

const CURRENT = 'var(--clr-ink)'
const PREVIOUS = '#74746e'

function pointLabel(point: ChartPoint, bucket: ChartBucket) {
  return bucket === 'day'
    ? formatWeekdayDate(point.date)
    : `Semana del ${formatDateRange(point.date, point.endDate)}`
}

interface TooltipProps {
  active?: boolean
  payload?: ReadonlyArray<{ payload?: ChartPoint }>
  bucket: ChartBucket
}

function ChartTooltip({ active, payload, bucket }: TooltipProps) {
  const point = payload?.[0]?.payload
  if (!active || !point) return null
  return (
    <div className="border border-gray-300 bg-white px-3 py-2 text-sm shadow-md">
      <p className="font-medium text-(--clr-ink)">{pointLabel(point, bucket)}</p>
      <p className="mt-1 flex items-center gap-2 text-gray-900">
        <svg aria-hidden="true" width="18" height="4">
          <line x1="0" y1="2" x2="18" y2="2" stroke={CURRENT} strokeWidth="2" />
        </svg>
        Facturación {formatMoney(point.revenue)}
      </p>
      <p className="text-gray-700">
        {formatInteger(point.orders)} {point.orders === 1 ? 'pedido' : 'pedidos'}
      </p>
      {point.prevRevenue !== null && point.prevDate && (
        <p className="mt-1 flex items-center gap-2 text-gray-700">
          <svg aria-hidden="true" width="18" height="4">
            <line
              x1="0"
              y1="2"
              x2="18"
              y2="2"
              stroke={PREVIOUS}
              strokeWidth="2"
              strokeDasharray="4 3"
            />
          </svg>
          Antes {formatMoney(point.prevRevenue)}
        </p>
      )}
    </div>
  )
}

export function ChartSkeleton() {
  return (
    <div aria-hidden="true" className="border border-gray-200 p-4">
      <Skeleton className="h-5 w-48" />
      <Skeleton className="mt-4 h-72 w-full" />
    </div>
  )
}

interface RevenueChartProps {
  points: ChartPoint[]
  bucket: ChartBucket
}

export default function RevenueChart({ points, bucket }: RevenueChartProps) {
  const [asTable, setAsTable] = useState(false)
  const unit = bucket === 'day' ? 'día' : 'semana'
  const hasPrevious = points.some((point) => point.prevRevenue !== null)
  const hasData = points.some((point) => point.revenue > 0 || (point.prevRevenue ?? 0) > 0)

  const summary = useMemo(() => {
    if (!points.length) return ''
    const best = points.reduce(
      (top, point) => (point.revenue > top.revenue ? point : top),
      points[0],
    )
    const range = formatDateRange(points[0].date, points[points.length - 1].endDate)
    if (best.revenue <= 0) return `Facturación por ${unit}, ${range}. Sin ventas registradas.`
    return `Facturación por ${unit}, ${range}. El mayor valor fue ${formatMoney(best.revenue)}, ${pointLabel(best, bucket)}.`
  }, [points, bucket, unit])

  return (
    <section aria-labelledby="chart-title" className="border border-gray-200 p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id="chart-title" className="text-lg font-bold text-(--clr-ink)">
            Facturación por {unit}
          </h2>
          <ul className="mt-1 flex flex-wrap gap-x-5 gap-y-1 text-sm text-gray-800">
            <li className="flex items-center gap-2">
              <svg aria-hidden="true" width="22" height="4">
                <line x1="0" y1="2" x2="22" y2="2" stroke={CURRENT} strokeWidth="2" />
              </svg>
              Este período
            </li>
            {hasPrevious && (
              <li className="flex items-center gap-2">
                <svg aria-hidden="true" width="22" height="4">
                  <line
                    x1="0"
                    y1="2"
                    x2="22"
                    y2="2"
                    stroke={PREVIOUS}
                    strokeWidth="2"
                    strokeDasharray="5 4"
                  />
                </svg>
                Período anterior
              </li>
            )}
          </ul>
        </div>
        {hasData && (
          <button
            type="button"
            aria-pressed={asTable}
            onClick={() => setAsTable((value) => !value)}
            className={`min-h-11 px-2 text-sm font-medium text-(--clr-ink) underline underline-offset-4 ${FOCUS}`}
          >
            {asTable ? 'Ver gráfico' : 'Ver como tabla'}
          </button>
        )}
      </div>

      {!hasData ? (
        <p className="mt-6 border border-dashed border-gray-300 px-4 py-14 text-center text-sm text-gray-700">
          No hay ventas registradas en este período.
        </p>
      ) : asTable ? (
        <div className="mt-4 max-h-80 overflow-auto">
          <table className="w-full border-collapse text-sm">
            <caption className="sr-only">{summary}</caption>
            <thead className="sticky top-0 bg-white">
              <tr className="border-b border-gray-300 text-left text-gray-800">
                <th scope="col" className="px-3 py-2 font-medium">
                  {bucket === 'day' ? 'Día' : 'Semana'}
                </th>
                <th scope="col" className="px-3 py-2 text-right font-medium">
                  Facturación
                </th>
                <th scope="col" className="px-3 py-2 text-right font-medium">
                  Pedidos
                </th>
                {hasPrevious && (
                  <th scope="col" className="px-3 py-2 text-right font-medium">
                    Período anterior
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {points.map((point) => (
                <tr key={point.date} className="border-b border-gray-100">
                  <th scope="row" className="px-3 py-2 text-left font-normal text-gray-900">
                    {pointLabel(point, bucket)}
                  </th>
                  <td className="px-3 py-2 text-right">{formatMoney(point.revenue)}</td>
                  <td className="px-3 py-2 text-right">{formatInteger(point.orders)}</td>
                  {hasPrevious && (
                    <td className="px-3 py-2 text-right">
                      {point.prevRevenue === null ? '—' : formatMoney(point.prevRevenue)}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div role="img" aria-label={summary} className="mt-4 h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={points} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
              <CartesianGrid vertical={false} stroke="#e4e4de" />
              <XAxis
                dataKey="date"
                tickFormatter={(value: string) => formatShortDate(value)}
                tickLine={false}
                axisLine={{ stroke: '#c4c4be' }}
                tick={{ fill: '#4b4b46', fontSize: 12 }}
                interval="preserveStartEnd"
                minTickGap={28}
              />
              <YAxis
                tickFormatter={(value: number) => formatCompactMoney(value)}
                tickLine={false}
                axisLine={false}
                tick={{ fill: '#4b4b46', fontSize: 12 }}
                width={64}
              />
              <Tooltip
                content={<ChartTooltip bucket={bucket} />}
                cursor={{ stroke: '#9a9a94', strokeWidth: 1 }}
              />
              {hasPrevious && (
                <Line
                  type="monotone"
                  dataKey="prevRevenue"
                  stroke={PREVIOUS}
                  strokeWidth={2}
                  strokeDasharray="5 4"
                  dot={false}
                  activeDot={false}
                  isAnimationActive={false}
                />
              )}
              <Line
                type="monotone"
                dataKey="revenue"
                stroke={CURRENT}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 5, fill: '#1a1a1a', stroke: '#fff', strokeWidth: 2 }}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  )
}
