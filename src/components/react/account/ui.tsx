import type { ReactNode } from 'react'
import { AlertTriangle, ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react'
import { describeDelta, formatSignedPercent } from '../../../libs/account/format'
import type { DeltaInfo } from '../../../types/account'
import type { ApiError } from './api'

export const FOCUS =
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--clr-ink)'

export const BUTTON = `inline-flex min-h-11 items-center justify-center gap-2 border border-(--clr-ink) bg-white px-4 text-sm font-medium text-(--clr-ink) transition-colors hover:bg-(--clr-ink) hover:text-white disabled:cursor-not-allowed disabled:opacity-50 ${FOCUS}`

export const LINK = `inline-flex min-h-11 items-center gap-1.5 text-sm font-medium text-(--clr-ink) underline underline-offset-4 decoration-gray-400 hover:decoration-(--clr-ink) ${FOCUS}`

export function Skeleton({ className = '' }: { className?: string }) {
  return <div aria-hidden="true" className={`animate-pulse bg-gray-100 ${className}`} />
}

const PERIOD_ERRORS: Record<string, string> = {
  invalid_preset: 'El período elegido no existe.',
  invalid_date: 'Alguna de las fechas no es válida.',
  range_order: 'La fecha inicial es posterior a la final.',
  range_too_long: 'El rango puede abarcar hasta 366 días.',
  range_too_old: 'No hay datos anteriores a enero de 2020.',
  range_missing: 'Elegí la fecha inicial y la final.',
}

export function periodErrorMessage(code: string | null) {
  return (code && PERIOD_ERRORS[code]) || 'No pudimos usar ese período.'
}

const ERROR_COPY: Record<ApiError['kind'], { title: string; body: string }> = {
  session: {
    title: 'Tu sesión venció',
    body: 'Ingresá de nuevo para seguir viendo los datos de tu negocio.',
  },
  forbidden: {
    title: 'No tenés permiso para ver esta sección',
    body: 'El panel de cuenta es solo para propietarios. Podés seguir usando el panel de tu sucursal.',
  },
  subscription: {
    title: 'Tu suscripción no está activa',
    body: 'Renová el plan para volver a ver las estadísticas de tus sucursales.',
  },
  invalid: { title: 'No pudimos usar ese período', body: '' },
  network: {
    title: 'No pudimos conectar con el servidor',
    body: 'Revisá tu conexión a internet y volvé a intentar.',
  },
  server: {
    title: 'No pudimos cargar los datos',
    body: 'Algo falló de nuestro lado. Probá de nuevo en unos segundos.',
  },
}

export function ErrorPanel({ error, onRetry }: { error: ApiError; onRetry?: () => void }) {
  const copy = ERROR_COPY[error.kind]
  const body = error.kind === 'invalid' ? periodErrorMessage(error.code) : copy.body
  return (
    <div role="alert" className="border border-gray-200 bg-white p-6">
      <div className="flex items-start gap-3">
        <AlertTriangle aria-hidden="true" size={20} className="mt-0.5 shrink-0 text-red-800" />
        <div className="min-w-0">
          <h2 className="text-base font-bold text-(--clr-ink)">{copy.title}</h2>
          {body && <p className="mt-1 text-sm text-gray-700">{body}</p>}
          <div className="mt-4 flex flex-wrap gap-3">
            {error.kind === 'session' ? (
              <a className={BUTTON} href="/auth/sign-in?notice=session-expired">
                Iniciar sesión
              </a>
            ) : (
              onRetry && (
                <button type="button" className={BUTTON} onClick={onRetry}>
                  Reintentar
                </button>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export function InlineError({ error, onRetry }: { error: ApiError; onRetry: () => void }) {
  return (
    <div
      role="alert"
      className="flex flex-wrap items-center justify-between gap-3 border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900"
    >
      <span className="flex items-center gap-2">
        <AlertTriangle aria-hidden="true" size={16} className="shrink-0" />
        {error.kind === 'invalid'
          ? periodErrorMessage(error.code)
          : 'No pudimos actualizar los datos. Lo que ves puede estar desactualizado.'}
      </span>
      <button type="button" className={`${LINK} text-red-900`} onClick={onRetry}>
        Reintentar
      </button>
    </div>
  )
}

export function EmptyPanel({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="border border-dashed border-gray-300 px-6 py-10 text-center">
      <h2 className="text-base font-bold text-(--clr-ink)">{title}</h2>
      {children && <div className="mx-auto mt-2 max-w-prose text-sm text-gray-700">{children}</div>}
    </div>
  )
}

export function DeltaBadge({
  delta,
  tone = 'result',
}: {
  delta: DeltaInfo
  tone?: 'result' | 'neutral'
}) {
  if (delta.kind === 'none') {
    return <span className="text-xs text-gray-600">Sin datos para comparar</span>
  }
  if (delta.kind === 'new') {
    return <span className="text-xs text-gray-600">Sin datos previos</span>
  }
  if (delta.kind === 'flat') {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-700">
        <Minus aria-hidden="true" size={14} />
        <span aria-hidden="true">0,0 %</span>
        <span className="sr-only">{describeDelta(delta)}</span>
      </span>
    )
  }
  const up = delta.kind === 'up'
  const color = tone === 'neutral' ? 'text-gray-700' : up ? 'text-emerald-800' : 'text-red-800'
  const Icon = up ? ArrowUpRight : ArrowDownRight
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium ${color}`}>
      <Icon aria-hidden="true" size={14} />
      <span aria-hidden="true">{formatSignedPercent(delta.pct ?? 0)}</span>
      <span className="sr-only">{describeDelta(delta)}</span>
    </span>
  )
}
