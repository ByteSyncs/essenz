import type { ReactNode } from 'react'
import { formatInteger, formatLongDate } from '../../../libs/account/format'
import { todayInArgentina } from '../../../libs/account/period'
import type { AccountOverview, SubscriptionStatus } from '../../../types/account'
import { useApi } from './api'
import { BUTTON, ErrorPanel, LINK, Skeleton } from './ui'

const STATUS_LABEL: Record<SubscriptionStatus, string> = {
  active: 'Activa',
  past_due: 'Pago atrasado',
  unpaid: 'Impaga',
  cancelled: 'Cancelada',
  expired: 'Vencida',
  pending_payment: 'Pago pendiente',
  none: 'Sin suscripción',
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid gap-1 py-3 sm:grid-cols-[14rem_1fr] sm:gap-4">
      <dt className="text-sm text-gray-700">{label}</dt>
      <dd className="text-sm font-medium text-(--clr-ink)">{children}</dd>
    </div>
  )
}

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="border border-gray-200 p-4 sm:p-5">
      <h2 id={id} className="text-lg font-bold text-(--clr-ink)">
        {title}
      </h2>
      {children}
    </section>
  )
}

function periodEnd(iso: string | null) {
  if (!iso) return '—'
  return formatLongDate(todayInArgentina(new Date(iso)))
}

function limitText(limit: number | null, noun: string) {
  return limit === null ? 'A medida, sin límite fijo' : `Hasta ${formatInteger(limit)} ${noun}`
}

export default function AccountSettingsView() {
  const overview = useApi<AccountOverview>('/api/account/overview')
  const data = overview.data

  return (
    <div className="space-y-6 p-5 sm:p-6 lg:p-8">
      <header>
        <h1 className="text-2xl font-bold text-(--clr-ink)">Cuenta</h1>
        <p className="mt-1 text-sm text-gray-700">
          Datos generales del negocio, tu plan y los accesos a los ajustes de cada sucursal.
        </p>
      </header>

      {overview.error && !data ? (
        <ErrorPanel error={overview.error} onRetry={overview.reload} />
      ) : !data ? (
        <div aria-hidden="true" className="space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      ) : (
        <>
          <Section id="business-title" title="Negocio">
            <dl className="mt-1 divide-y divide-gray-100">
              <Row label="Nombre">{data.business.name}</Row>
              <Row label="Propietario">{data.business.ownerName ?? '—'}</Row>
              <Row label="Email">{data.business.ownerEmail ?? '—'}</Row>
            </dl>
          </Section>

          <Section id="plan-title" title="Plan y suscripción">
            <dl className="mt-1 divide-y divide-gray-100">
              <Row label="Plan">{data.plan.name}</Row>
              <Row label="Estado">{STATUS_LABEL[data.plan.status]}</Row>
              <Row label="Vigente hasta">{periodEnd(data.plan.currentPeriodEnd)}</Row>
              <Row label="Sucursales">
                {formatInteger(data.branches.length)} en uso ·{' '}
                {limitText(data.plan.maxBranches, 'sucursales')}
              </Row>
              <Row label="Productos por sucursal">
                {limitText(data.plan.maxProductsPerBranch, 'productos')}
              </Row>
            </dl>
            <p className="mt-2 max-w-prose text-sm text-gray-700">
              El plan y los pagos se gestionan con el flujo de suscripción de Essenz. Este panel no
              los modifica.
            </p>
            {data.plan.billingPath && (
              <a href={data.plan.billingPath} className={`${BUTTON} mt-3`}>
                Gestionar suscripción
              </a>
            )}
          </Section>

          <Section id="branches-settings-title" title="Ajustes por sucursal">
            <p className="mt-1 max-w-prose text-sm text-gray-700">
              La carta, los horarios, los datos de contacto y el acceso del personal se configuran
              en el panel de cada sucursal.
            </p>
            <ul className="mt-3 divide-y divide-gray-200 border-t border-gray-200">
              {data.branches.map((branch) => {
                const panel = `/${branch.slug}/admin/dashboard`
                return (
                  <li
                    key={branch.id}
                    className="flex flex-wrap items-center justify-between gap-x-6 gap-y-1 py-2"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-(--clr-ink)">{branch.name}</p>
                    </div>
                    <div className="flex flex-wrap gap-x-5">
                      <a href={`${panel}?view=settings`} className={LINK}>
                        Configuración
                        <span className="sr-only"> de {branch.name}</span>
                      </a>
                      <a href={`${panel}?view=access`} className={LINK}>
                        Acceso del personal
                        <span className="sr-only"> de {branch.name}</span>
                      </a>
                    </div>
                  </li>
                )
              })}
            </ul>
            <a href="/account/branches" className={`${LINK} mt-2`}>
              Ver todas las sucursales
            </a>
          </Section>
        </>
      )}
    </div>
  )
}
