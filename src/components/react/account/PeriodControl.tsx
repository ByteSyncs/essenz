import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { addDays, daysBetween, isValidDate, todayInArgentina } from '../../../libs/account/period'
import type { PeriodPreset } from '../../../types/account'
import { BUTTON, FOCUS } from './ui'

export interface PeriodValue {
  range: PeriodPreset
  from: string
  to: string
}

const PRESETS: { id: PeriodPreset; label: string }[] = [
  { id: 'today', label: 'Hoy' },
  { id: '7d', label: '7 días' },
  { id: '30d', label: '30 días' },
  { id: 'month', label: 'Este mes' },
  { id: 'last_month', label: 'Mes anterior' },
  { id: 'custom', label: 'Rango' },
]

const MIN_DATE = '2020-01-01'

function validateRange(from: string, to: string, today: string) {
  if (!from || !to) return 'Elegí la fecha inicial y la final.'
  if (!isValidDate(from) || !isValidDate(to)) return 'Alguna de las fechas no es válida.'
  if (from > to) return 'La fecha inicial es posterior a la final.'
  if (to > today) return 'La fecha final no puede ser futura.'
  if (from < MIN_DATE) return 'No hay datos anteriores a enero de 2020.'
  if (daysBetween(from, to) > 366) return 'El rango puede abarcar hasta 366 días.'
  return null
}

interface PeriodControlProps {
  value: PeriodValue
  onChange: (value: PeriodValue) => void
}

export default function PeriodControl({ value, onChange }: PeriodControlProps) {
  const today = todayInArgentina(new Date())
  const [draftFrom, setDraftFrom] = useState(value.from)
  const [draftTo, setDraftTo] = useState(value.to)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setDraftFrom(value.from)
    setDraftTo(value.to)
    setError(null)
  }, [value.from, value.to])

  function choose(range: PeriodPreset) {
    if (range === 'custom') {
      if (value.range === 'custom') return
      onChange({ range, from: addDays(today, -6), to: today })
      return
    }
    onChange({ range, from: '', to: '' })
  }

  function apply(event: FormEvent) {
    event.preventDefault()
    const problem = validateRange(draftFrom, draftTo, today)
    setError(problem)
    if (!problem) onChange({ range: 'custom', from: draftFrom, to: draftTo })
  }

  return (
    <div className="space-y-3">
      <div
        role="group"
        aria-label="Período"
        className="flex max-w-full divide-x divide-gray-300 overflow-x-auto border border-gray-300"
      >
        {PRESETS.map((preset) => {
          const active = value.range === preset.id
          return (
            <button
              key={preset.id}
              type="button"
              aria-pressed={active}
              onClick={() => choose(preset.id)}
              className={`min-h-11 shrink-0 px-3.5 text-sm font-medium transition-colors ${FOCUS} focus-visible:-outline-offset-2 ${
                active ? 'bg-(--clr-ink) text-white' : 'bg-white text-gray-800 hover:bg-gray-50'
              }`}
            >
              {preset.label}
            </button>
          )
        })}
      </div>

      {value.range === 'custom' && (
        <form onSubmit={apply} className="flex flex-wrap items-end gap-3" noValidate>
          <label className="block text-sm text-gray-800">
            <span className="mb-1 block font-medium">Desde</span>
            <input
              type="date"
              value={draftFrom}
              min={MIN_DATE}
              max={today}
              onChange={(event) => setDraftFrom(event.target.value)}
              className={`min-h-11 border border-gray-300 bg-white px-3 text-sm text-(--clr-ink) ${FOCUS}`}
            />
          </label>
          <label className="block text-sm text-gray-800">
            <span className="mb-1 block font-medium">Hasta</span>
            <input
              type="date"
              value={draftTo}
              min={MIN_DATE}
              max={today}
              onChange={(event) => setDraftTo(event.target.value)}
              className={`min-h-11 border border-gray-300 bg-white px-3 text-sm text-(--clr-ink) ${FOCUS}`}
            />
          </label>
          <button type="submit" className={BUTTON}>
            Aplicar
          </button>
          {error && (
            <p role="alert" className="basis-full text-sm font-medium text-red-800">
              {error}
            </p>
          )}
        </form>
      )}
    </div>
  )
}
