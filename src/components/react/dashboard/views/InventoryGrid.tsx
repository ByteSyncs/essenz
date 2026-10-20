import { useState, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { InventoryItem } from '../../../../types/inventory'

interface InventoryGridProps {
  items: InventoryItem[]
  isLoading: boolean
  slug: string
  onStockUpdate: (id: string, newStock: number) => void
  onDelete: (id: string) => void
}

const UNIT_SHORT: Record<InventoryItem['unit'], string> = {
  u: 'u',
  g: 'g',
  kg: 'kg',
  ml: 'ml',
  l: 'l',
  box: 'caja',
  pack: 'pack',
}

export default function InventoryGrid({
  items,
  isLoading,
  slug,
  onStockUpdate,
  onDelete,
}: InventoryGridProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="bg-gray-50 border border-gray-100 p-4 animate-pulse">
            <div className="h-3 bg-gray-200 w-2/3 mb-2" />
            <div className="h-2.5 bg-gray-200 w-1/3 mb-4" />
            <div className="h-4 bg-gray-200 w-1/2" />
          </div>
        ))}
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-14 h-14 bg-gray-50 border border-gray-100 flex items-center justify-center mb-4">
          <svg
            className="w-6 h-6 text-gray-300"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z"
            />
          </svg>
        </div>
        <p className="text-sm font-bold text-gray-400">Sin ítems</p>
        <p className="text-xs text-gray-300 mt-1">No hay ítems en el inventario todavía</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
      <AnimatePresence mode="popLayout">
        {items.map((item, i) => (
          <motion.div
            key={item.id}
            layout
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.15, delay: Math.min(i * 0.03, 0.3) }}
          >
            <InventoryItemCard
              item={item}
              slug={slug}
              onStockUpdate={onStockUpdate}
              onDelete={onDelete}
            />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}

function InventoryItemCard({
  item,
  slug,
  onStockUpdate,
  onDelete,
}: {
  item: InventoryItem
  slug: string
  onStockUpdate: (id: string, stock: number) => void
  onDelete: (id: string) => void
}) {
  const [isEditingStock, setIsEditingStock] = useState(false)
  const [stockInput, setStockInput] = useState(String(item.stock))
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const unitLabel = UNIT_SHORT[item.unit]
  const stockStatus = item.stock === 0 ? 'empty' : item.stock <= item.stock_min ? 'low' : 'ok'

  const stockColors = {
    empty: 'bg-red-50 text-red-600 border-red-100',
    low: 'bg-amber-50 text-amber-600 border-amber-100',
    ok: 'bg-green-50 text-green-700 border-green-100',
  }

  const stockLabels = {
    empty: 'Sin stock',
    low: 'Stock bajo',
    ok: 'En stock',
  }

  const handleEditStart = useCallback(() => {
    setStockInput(String(item.stock))
    setIsEditingStock(true)
    setTimeout(() => inputRef.current?.select(), 30)
  }, [item.stock])

  const handleStockSave = useCallback(async () => {
    const value = parseFloat(stockInput)
    if (isNaN(value) || value < 0) {
      setStockInput(String(item.stock))
      setIsEditingStock(false)
      return
    }
    if (value === item.stock) {
      setIsEditingStock(false)
      return
    }
    setIsSaving(true)
    try {
      const res = await fetch(`/api/organizations/${slug}/inventory/${item.id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stock: value }),
      })
      if (!res.ok) throw new Error()
      onStockUpdate(item.id, value)
    } catch {
      setStockInput(String(item.stock))
    } finally {
      setIsSaving(false)
      setIsEditingStock(false)
    }
  }, [stockInput, item.stock, item.id, slug, onStockUpdate])

  const handleDelete = useCallback(async () => {
    setIsDeleting(true)
    try {
      const res = await fetch(`/api/organizations/${slug}/inventory/${item.id}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      if (!res.ok) throw new Error()
      onDelete(item.id)
    } catch {
      setIsDeleting(false)
      setShowDeleteConfirm(false)
    }
  }, [item.id, slug, onDelete])

  return (
    <div className="relative bg-white border border-gray-100 hover:border-gray-200 flex flex-col transition-all group">
      <div className="p-4 flex-1">
        <div className="flex items-start justify-between gap-2 mb-1">
          <p className="text-sm font-bold text-(--clr-ink) leading-tight truncate">{item.name}</p>
          <span className="text-[10px] font-black uppercase tracking-wide text-gray-400 shrink-0 mt-0.5">
            {unitLabel}
          </span>
        </div>

        {item.cost_per_unit != null && (
          <p className="text-xs font-black text-(--clr-accent) mb-2">
            $
            {item.cost_per_unit.toLocaleString('es-AR', {
              minimumFractionDigits: 0,
              maximumFractionDigits: 2,
            })}{' '}
            / {unitLabel}
          </p>
        )}

        {item.notes && <p className="text-[11px] text-gray-400 mb-3 line-clamp-1">{item.notes}</p>}

        <div className="flex items-center gap-2 mt-2">
          <span
            className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 border ${stockColors[stockStatus]}`}
          >
            {stockLabels[stockStatus]}
          </span>
          {stockStatus === 'low' && item.stock > 0 && (
            <span className="text-[9px] text-gray-400">
              mín: {item.stock_min} {unitLabel}
            </span>
          )}
        </div>
      </div>

      <div className="border-t border-gray-100 px-4 py-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">
            Stock
          </span>
          {isEditingStock ? (
            <div className="flex items-center gap-1">
              <input
                ref={inputRef}
                type="number"
                min={0}
                step={1}
                value={stockInput}
                onChange={(e) => {
                  const val = e.target.value
                  if (val === '') {
                    setStockInput('')
                    return
                  }
                  const parsed = parseInt(val, 10)
                  setStockInput(isNaN(parsed) ? '' : String(parsed))
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleStockSave()
                  if (e.key === 'Escape') {
                    setIsEditingStock(false)
                    setStockInput(String(item.stock))
                  }
                }}
                onBlur={handleStockSave}
                className="w-16 border border-(--clr-accent) px-2 py-0.5 text-xs font-bold text-(--clr-ink) text-center focus:outline-none focus:ring-1 focus:ring-(--clr-accent)/40"
                disabled={isSaving}
              />
              <span className="text-[10px] text-gray-400 font-bold">{unitLabel}</span>
              {isSaving && (
                <svg className="w-3 h-3 text-gray-400 animate-spin" fill="none" viewBox="0 0 24 24">
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
            </div>
          ) : (
            <button
              onClick={handleEditStart}
              className="flex items-center gap-1 group/stock"
              title="Editar stock"
            >
              <span className="text-sm font-black text-(--clr-ink)">{item.stock}</span>
              <span className="text-[10px] text-gray-400 font-bold">{unitLabel}</span>
              <svg
                className="w-3 h-3 text-gray-300 group-hover/stock:text-(--clr-accent) transition-colors"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125"
                />
              </svg>
            </button>
          )}
        </div>

        <div className="flex items-center gap-0.5">
          {showDeleteConfirm ? (
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-gray-400">¿Eliminar?</span>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="px-2 py-1 bg-red-500 text-white text-[10px] font-black hover:bg-red-600 transition-colors disabled:opacity-50"
              >
                {isDeleting ? '...' : 'Sí'}
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-2 py-1 bg-gray-100 text-gray-600 text-[10px] font-black hover:bg-gray-200 transition-colors"
              >
                No
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="p-1.5 text-gray-300 hover:text-red-400 hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100"
              title="Eliminar ítem"
            >
              <svg
                className="w-3.5 h-3.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
                />
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
