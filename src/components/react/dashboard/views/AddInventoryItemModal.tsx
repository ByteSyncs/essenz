import { useState, useCallback, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import type { InventoryItem } from '../../../../types/inventory'

interface AddInventoryItemModalProps {
  slug: string
  onClose: () => void
  onAdded: (item: InventoryItem) => void
}

interface FormState {
  name: string
  unit: InventoryItem['unit']
  stock: string
  stock_min: string
  cost_per_unit: string
  notes: string
  quantity_per_pack: string
}

const INITIAL_FORM: FormState = {
  name: '',
  unit: 'u',
  stock: '',
  stock_min: '',
  cost_per_unit: '',
  notes: '',
  quantity_per_pack: '',
}

const UNIT_LABELS: Record<InventoryItem['unit'], string> = {
  u: 'Unidad (u)',
  g: 'Gramos (g)',
  kg: 'Kilogramos (kg)',
  ml: 'Mililitros (ml)',
  l: 'Litros (l)',
  box: 'Caja',
  pack: 'Pack',
}

export default function AddInventoryItemModal({
  slug,
  onClose,
  onAdded,
}: AddInventoryItemModalProps) {
  const [form, setForm] = useState<FormState>(INITIAL_FORM)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({})
  const firstInputRef = useRef<HTMLInputElement>(null)

  const showPackQuantity = form.unit === 'box' || form.unit === 'pack'

  useEffect(() => {
    firstInputRef.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }))

  const handleNumericFocus = (key: keyof FormState) => {
    if (form[key] === '0') set(key, '')
  }

  const handleNumericBlur = (key: keyof FormState, fallback = '') => {
    if (form[key] === '') set(key, fallback)
  }

  const validate = (): boolean => {
    const errs: Partial<Record<keyof FormState, string>> = {}
    if (!form.name.trim()) errs.name = 'Requerido'

    const stockVal = parseFloat(form.stock)
    if (form.stock !== '' && (isNaN(stockVal) || stockVal < 0)) errs.stock = 'Stock inválido'

    const stockMinVal = parseFloat(form.stock_min)
    if (form.stock_min !== '' && (isNaN(stockMinVal) || stockMinVal < 0))
      errs.stock_min = 'Stock mínimo inválido'

    if (form.cost_per_unit !== '') {
      const cost = parseFloat(form.cost_per_unit)
      if (isNaN(cost) || cost < 0) errs.cost_per_unit = 'Costo inválido'
    }

    if (showPackQuantity) {
      const packQty = parseFloat(form.quantity_per_pack)
      if (!form.quantity_per_pack || isNaN(packQty) || packQty <= 0) {
        errs.quantity_per_pack = 'Requerido y mayor a 0'
      }
    }

    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = useCallback(async () => {
    if (!validate()) return
    setIsSubmitting(true)
    try {
      const res = await fetch(`/api/organizations/${slug}/inventory`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          unit: form.unit,
          stock: form.stock !== '' ? parseFloat(form.stock) : 0,
          stock_min: form.stock_min !== '' ? parseFloat(form.stock_min) : 0,
          cost_per_unit: form.cost_per_unit !== '' ? parseFloat(form.cost_per_unit) : null,
          notes: form.notes.trim() || null,
          quantity_per_pack: showPackQuantity ? parseFloat(form.quantity_per_pack) : null,
        }),
      })
      if (!res.ok) throw new Error('Error al crear el ítem')
      const data = await res.json()
      onAdded(data.item)
    } catch (e) {
      setErrors({ name: (e as Error).message })
    } finally {
      setIsSubmitting(false)
    }
  }, [form, slug, onAdded, showPackQuantity])

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 10, scale: 0.98 }}
        transition={{ duration: 0.18 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
      >
        <div
          className="bg-white w-full max-w-lg max-h-[90vh] overflow-y-auto pointer-events-auto shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 sticky top-0 bg-white z-10">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.25em] text-(--clr-accent) leading-none mb-0.5">
                Nuevo
              </p>
              <h3 className="text-lg font-bold text-(--clr-ink) leading-tight">Añadir ítem</h3>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-50 transition-all"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="px-6 py-5 space-y-5">
            <ModalField label="Nombre del ítem" required error={errors.name}>
              <input
                ref={firstInputRef}
                type="text"
                value={form.name}
                onChange={(e) => set('name', e.target.value)}
                placeholder="Ej: Harina 000, Aceite de oliva…"
                maxLength={80}
                className={fieldClass(!!errors.name)}
              />
            </ModalField>

            <ModalField label="Unidad de medida">
              <select
                value={form.unit}
                onChange={(e) => set('unit', e.target.value as InventoryItem['unit'])}
                className={fieldClass(false)}
              >
                {(Object.entries(UNIT_LABELS) as [InventoryItem['unit'], string][]).map(
                  ([val, label]) => (
                    <option key={val} value={val}>
                      {label}
                    </option>
                  ),
                )}
              </select>
            </ModalField>

            {showPackQuantity && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
              >
                <ModalField
                  label={`Unidades por ${form.unit === 'box' ? 'Caja' : 'Pack'}`}
                  required
                  error={errors.quantity_per_pack}
                >
                  <input
                    type="number"
                    min={1}
                    step={1}
                    value={form.quantity_per_pack}
                    onChange={(e) => set('quantity_per_pack', e.target.value)}
                    onFocus={() => handleNumericFocus('quantity_per_pack')}
                    placeholder="Ej: 6, 12, 24..."
                    className={fieldClass(!!errors.quantity_per_pack)}
                  />
                </ModalField>
              </motion.div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <ModalField label="Stock actual" error={errors.stock}>
                <div className="relative">
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    value={form.stock}
                    onChange={(e) => set('stock', e.target.value)}
                    onFocus={() => handleNumericFocus('stock')}
                    onBlur={() => handleNumericBlur('stock', '')}
                    placeholder="0"
                    className={`${fieldClass(!!errors.stock)} pr-8`}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-gray-400 font-bold uppercase">
                    {form.unit}
                  </span>
                </div>
              </ModalField>

              <ModalField label="Stock mínimo" error={errors.stock_min}>
                <div className="relative">
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    value={form.stock_min}
                    onChange={(e) => set('stock_min', e.target.value)}
                    onFocus={() => handleNumericFocus('stock_min')}
                    onBlur={() => handleNumericBlur('stock_min', '')}
                    placeholder="0"
                    className={`${fieldClass(!!errors.stock_min)} pr-8`}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-gray-400 font-bold uppercase">
                    {form.unit}
                  </span>
                </div>
              </ModalField>
            </div>

            <p className="text-[10px] text-gray-400 -mt-3 leading-relaxed">
              Se te avisará cuando el stock baje del mínimo.
            </p>

            <ModalField
              label={`Costo por ${UNIT_LABELS[form.unit].toLowerCase()}`}
              error={errors.cost_per_unit}
            >
              <div className="relative max-w-48">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-bold">
                  $
                </span>
                <input
                  type="number"
                  min={0}
                  step={0.0001}
                  value={form.cost_per_unit}
                  onChange={(e) => set('cost_per_unit', e.target.value)}
                  placeholder="0.00"
                  className={`${fieldClass(!!errors.cost_per_unit)} pl-6`}
                />
              </div>
              <p className="text-[10px] text-gray-400 mt-1">Opcional. Útil para calcular costos.</p>
            </ModalField>

            <ModalField label="Notas">
              <textarea
                value={form.notes}
                onChange={(e) => set('notes', e.target.value)}
                placeholder="Marca, proveedor, especificaciones…"
                rows={2}
                maxLength={300}
                className={`${fieldClass(false)} resize-none`}
              />
            </ModalField>
          </div>

          <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-end gap-3 sticky bottom-0 bg-white">
            <button
              onClick={onClose}
              className="px-4 py-2.5 border border-gray-200 text-xs font-black uppercase tracking-widest text-gray-500 hover:bg-gray-50 transition-all"
            >
              Cancelar
            </button>
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="px-5 py-2.5 bg-(--clr-ink) text-white text-xs font-black uppercase tracking-widest hover:bg-black transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isSubmitting && (
                <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
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
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
              )}
              {isSubmitting ? 'Creando...' : 'Añadir ítem'}
            </motion.button>
          </div>
        </div>
      </motion.div>
    </>
  )
}

function fieldClass(hasError: boolean) {
  return `w-full bg-white border px-3 py-2.5 text-sm text-(--clr-ink) placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-(--clr-accent)/30 focus:border-(--clr-accent) transition-all ${
    hasError ? 'border-red-300' : 'border-gray-200'
  }`
}

function ModalField({
  label,
  required,
  error,
  children,
}: {
  label: string
  required?: boolean
  error?: string
  children: React.ReactNode
}) {
  return (
    <div>
      <label className="block text-[10px] uppercase font-black tracking-widest text-gray-400 mb-1.5">
        {label}
        {required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      {children}
      {error && <p className="text-[10px] text-red-500 mt-1 font-medium">{error}</p>}
    </div>
  )
}
