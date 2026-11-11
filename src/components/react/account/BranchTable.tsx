import { useMemo, useState } from 'react'
import { ArrowDown, ArrowRight, ArrowUp, ChevronsUpDown } from 'lucide-react'
import { sortBranches, type BranchSortKey } from '../../../libs/account/metrics'
import { formatInteger, formatMoney, formatPercent } from '../../../libs/account/format'
import type { BranchPerformance, Totals } from '../../../types/account'
import { DeltaBadge, FOCUS, LINK } from './ui'

type Direction = 'asc' | 'desc'

const COLUMNS: { key: BranchSortKey; label: string; align: 'left' | 'right' }[] = [
  { key: 'name', label: 'Sucursal', align: 'left' },
  { key: 'revenue', label: 'Facturación', align: 'right' },
  { key: 'orders', label: 'Pedidos', align: 'right' },
  { key: 'avgTicket', label: 'Ticket promedio', align: 'right' },
  { key: 'expenses', label: 'Gastos', align: 'right' },
  { key: 'result', label: 'Resultado estimado', align: 'right' },
  { key: 'share', label: 'Participación', align: 'left' },
]

function defaultDirection(key: BranchSortKey): Direction {
  return key === 'name' ? 'asc' : 'desc'
}

function ShareBar({ share }: { share: number | null }) {
  const width = share === null ? 0 : Math.min(100, Math.max(0, share))
  return (
    <div className="flex items-center gap-2">
      <div aria-hidden="true" className="h-1.5 w-20 shrink-0 bg-gray-200">
        <div className="h-full bg-(--clr-ink)" style={{ width: `${width}%` }} />
      </div>
      <span>{formatPercent(share)}</span>
    </div>
  )
}

function panelHref(slug: string) {
  return `/${slug}/admin/dashboard`
}

function BranchName({ branch }: { branch: BranchPerformance }) {
  return (
    <div className="min-w-0">
      <a
        href={panelHref(branch.slug)}
        className={`font-medium text-(--clr-ink) underline underline-offset-4 decoration-gray-400 hover:decoration-(--clr-ink) ${FOCUS}`}
      >
        {branch.name}
      </a>
      {!branch.menuActive && (
        <span className="ml-2 border border-gray-400 px-1.5 py-0.5 text-xs text-gray-800">
          Carta oculta
        </span>
      )}
    </div>
  )
}

function resultClass(value: number) {
  return value < 0 ? 'text-red-800' : 'text-(--clr-ink)'
}

interface BranchTableProps {
  branches: BranchPerformance[]
  totals: Totals
}

export default function BranchTable({ branches, totals }: BranchTableProps) {
  const [sortKey, setSortKey] = useState<BranchSortKey>('revenue')
  const [direction, setDirection] = useState<Direction>('desc')

  const rows = useMemo(
    () => sortBranches(branches, sortKey, direction),
    [branches, sortKey, direction],
  )

  function sortBy(key: BranchSortKey) {
    if (key === sortKey) {
      setDirection((value) => (value === 'asc' ? 'desc' : 'asc'))
      return
    }
    setSortKey(key)
    setDirection(defaultDirection(key))
  }

  return (
    <section aria-labelledby="branches-title" className="border border-gray-200 p-4 sm:p-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="branches-title" className="text-lg font-bold text-(--clr-ink)">
            Rendimiento por sucursal
          </h2>
          <p className="mt-1 text-sm text-gray-700">
            La participación es el porcentaje de la facturación total del período.
          </p>
        </div>
        <label className="block text-sm text-gray-800 md:hidden">
          <span className="mb-1 block font-medium">Ordenar por</span>
          <select
            value={sortKey}
            onChange={(event) => {
              const key = event.target.value as BranchSortKey
              setSortKey(key)
              setDirection(defaultDirection(key))
            }}
            className={`min-h-11 border border-gray-300 bg-white px-3 text-sm text-(--clr-ink) ${FOCUS}`}
          >
            {COLUMNS.map((column) => (
              <option key={column.key} value={column.key}>
                {column.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="mt-4 hidden overflow-x-auto md:block">
        <table className="w-full min-w-224 border-collapse text-sm">
          <caption className="sr-only">
            Facturación, pedidos, gastos y participación de cada sucursal en el período elegido.
          </caption>
          <thead>
            <tr className="border-b border-gray-300">
              {COLUMNS.map((column) => {
                const active = sortKey === column.key
                const Icon = !active ? ChevronsUpDown : direction === 'asc' ? ArrowUp : ArrowDown
                return (
                  <th
                    key={column.key}
                    scope="col"
                    aria-sort={active ? (direction === 'asc' ? 'ascending' : 'descending') : 'none'}
                    className={`px-3 py-1 font-medium text-gray-800 ${
                      column.align === 'right' ? 'text-right' : 'text-left'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => sortBy(column.key)}
                      className={`inline-flex min-h-11 items-center gap-1.5 ${FOCUS}`}
                    >
                      {column.label}
                      <Icon
                        aria-hidden="true"
                        size={14}
                        className={active ? '' : 'text-gray-500'}
                      />
                    </button>
                  </th>
                )
              })}
              <th scope="col" className="px-3 py-1 text-left font-medium text-gray-800">
                Panel
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((branch) => (
              <tr key={branch.id} className="border-b border-gray-100 align-top">
                <th scope="row" className="px-3 py-3 text-left font-normal">
                  <BranchName branch={branch} />
                </th>
                <td className="px-3 py-3 text-right">
                  <div className="font-medium text-(--clr-ink)">{formatMoney(branch.revenue)}</div>
                  <DeltaBadge delta={branch.revenueDelta} />
                </td>
                <td className="px-3 py-3 text-right">
                  <div className="text-(--clr-ink)">{formatInteger(branch.orders)}</div>
                  <DeltaBadge delta={branch.ordersDelta} />
                </td>
                <td className="px-3 py-3 text-right text-(--clr-ink)">
                  {branch.avgTicket === null ? '—' : formatMoney(branch.avgTicket)}
                </td>
                <td className="px-3 py-3 text-right text-(--clr-ink)">
                  {formatMoney(branch.expenses)}
                </td>
                <td className={`px-3 py-3 text-right ${resultClass(branch.result)}`}>
                  {formatMoney(branch.result)}
                </td>
                <td className="px-3 py-3 text-(--clr-ink)">
                  <ShareBar share={branch.share} />
                </td>
                <td className="px-3 py-3">
                  <a href={panelHref(branch.slug)} className={LINK}>
                    Abrir
                    <span className="sr-only"> panel de {branch.name}</span>
                    <ArrowRight aria-hidden="true" size={14} />
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-gray-300 font-medium text-(--clr-ink)">
              <th scope="row" className="px-3 py-3 text-left font-medium">
                Total de la cuenta
              </th>
              <td className="px-3 py-3 text-right">{formatMoney(totals.revenue)}</td>
              <td className="px-3 py-3 text-right">{formatInteger(totals.orders)}</td>
              <td className="px-3 py-3 text-right">
                {totals.avgTicket === null ? '—' : formatMoney(totals.avgTicket)}
              </td>
              <td className="px-3 py-3 text-right">{formatMoney(totals.expenses)}</td>
              <td className={`px-3 py-3 text-right ${resultClass(totals.result)}`}>
                {formatMoney(totals.result)}
              </td>
              <td className="px-3 py-3">{totals.revenue > 0 ? '100,0 %' : '—'}</td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>

      <ul className="mt-4 divide-y divide-gray-200 border-t border-gray-200 md:hidden">
        {rows.map((branch) => (
          <li key={branch.id} className="py-4">
            <div className="flex items-start justify-between gap-3">
              <BranchName branch={branch} />
              <a href={panelHref(branch.slug)} className={`${LINK} shrink-0`}>
                Abrir
                <span className="sr-only"> panel de {branch.name}</span>
                <ArrowRight aria-hidden="true" size={14} />
              </a>
            </div>
            <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
              <div>
                <dt className="text-gray-700">Facturación</dt>
                <dd className="font-medium text-(--clr-ink)">{formatMoney(branch.revenue)}</dd>
                <dd>
                  <DeltaBadge delta={branch.revenueDelta} />
                </dd>
              </div>
              <div>
                <dt className="text-gray-700">Pedidos</dt>
                <dd className="font-medium text-(--clr-ink)">{formatInteger(branch.orders)}</dd>
                <dd>
                  <DeltaBadge delta={branch.ordersDelta} />
                </dd>
              </div>
              <div>
                <dt className="text-gray-700">Ticket promedio</dt>
                <dd className="text-(--clr-ink)">
                  {branch.avgTicket === null ? '—' : formatMoney(branch.avgTicket)}
                </dd>
              </div>
              <div>
                <dt className="text-gray-700">Gastos</dt>
                <dd className="text-(--clr-ink)">{formatMoney(branch.expenses)}</dd>
              </div>
              <div>
                <dt className="text-gray-700">Resultado estimado</dt>
                <dd className={resultClass(branch.result)}>{formatMoney(branch.result)}</dd>
              </div>
              <div>
                <dt className="text-gray-700">Participación</dt>
                <dd className="text-(--clr-ink)">
                  <ShareBar share={branch.share} />
                </dd>
              </div>
            </dl>
          </li>
        ))}
      </ul>
    </section>
  )
}
