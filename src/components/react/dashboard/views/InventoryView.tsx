import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import InventoryGrid from './InventoryGrid'
import AddInventoryItemModal from './AddInventoryItemModal'
import type { InventoryItem, InventoryMeta, InventoryViewProps } from '../../../../types/inventory'

const PER_PAGE = 50

export default function InventoryView({ slug }: InventoryViewProps) {
  const [items, setItems] = useState<InventoryItem[]>([])
  const [meta, setMeta] = useState<InventoryMeta>({
    pagination: { page: 1, perPage: PER_PAGE, totalItems: 0, totalPages: 1 },
  })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [showModal, setShowModal] = useState(false)
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(search)
      setPage(1)
    }, 300)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [search])

  const fetchInventory = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({
        page: String(page),
        per_page: String(PER_PAGE),
        ...(debouncedSearch && { search: debouncedSearch }),
      })
      const res = await fetch(`/api/organizations/${slug}/inventory?${params}`, {
        credentials: 'include',
      })
      if (!res.ok) throw new Error('Error al cargar el inventario')
      const data = await res.json()
      setItems(data.products ?? [])
      setMeta(data.meta)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setIsLoading(false)
    }
  }, [slug, page, debouncedSearch])

  useEffect(() => {
    fetchInventory()
  }, [fetchInventory])

  const handleItemAdded = useCallback((item: InventoryItem) => {
    setShowModal(false)
    setItems((prev) => [item, ...prev])
    setMeta((prev) => ({
      ...prev,
      pagination: {
        ...prev.pagination,
        totalItems: prev.pagination.totalItems + 1,
      },
    }))
  }, [])

  const handleStockUpdate = useCallback((id: string, newStock: number) => {
    setItems((prev) => prev.map((p) => (p.id === id ? { ...p, stock: newStock } : p)))
  }, [])

  const handleItemDelete = useCallback((id: string) => {
    setItems((prev) => prev.filter((p) => p.id !== id))
    setMeta((prev) => ({
      ...prev,
      pagination: {
        ...prev.pagination,
        totalItems: Math.max(0, prev.pagination.totalItems - 1),
      },
    }))
  }, [])

  const totalItems = meta.pagination.totalItems
  const totalPages = meta.pagination.totalPages

  return (
    /* Cambiamos a h-full de forma relativa y usamos flex-1 para que se adapte al contenedor padre de la app sin desbordar */
    <div className="px-6 md:px-10 py-6 flex flex-col h-full justify-between box-border overflow-hidden">
      <div className="flex-1 flex flex-col">
        <div className="flex items-start justify-between mb-6">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-(--clr-accent) mb-1">
              Inventario
            </p>
            <h2 className="text-2xl font-bold text-(--clr-ink) tracking-tight">
              Ítems de inventario
            </h2>
            <p className="text-sm text-gray-400 mt-1">Gestioná insumos, materias primas y stock</p>
          </div>
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-(--clr-ink) text-white text-xs font-black uppercase tracking-widest hover:bg-black transition-colors shadow-sm shrink-0 mt-1"
          >
            <svg
              className="w-3.5 h-3.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Añadir ítem
          </motion.button>
        </div>

        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mb-6 bg-red-50 border border-red-100 text-red-700 text-sm px-4 py-3 flex items-center justify-between"
            >
              <span>{error}</span>
              <button
                onClick={() => setError(null)}
                className="text-red-400 hover:text-red-700 ml-4"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex items-center gap-4 mb-6">
          <div className="relative flex-1 max-w-xs">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-300"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 15.803 7.5 7.5 0 0015.803 15.803z"
              />
            </svg>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar ítem..."
              className="w-full pl-9 pr-3 py-2 border border-gray-200 text-sm text-(--clr-ink) placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-(--clr-accent)/30 focus:border-(--clr-accent) transition-all bg-white"
            />
          </div>
          {!isLoading && (
            <span className="text-xs text-gray-400 font-medium shrink-0">
              {totalItems} {totalItems === 1 ? 'ítem' : 'ítems'}
            </span>
          )}
        </div>

        <InventoryGrid
          items={items}
          isLoading={isLoading}
          slug={slug}
          onStockUpdate={handleStockUpdate}
          onDelete={handleItemDelete}
        />
      </div>

      {/* Reducimos el padding superior y usamos mt-auto de forma controlada */}
      {totalPages >= 1 && items.length > 0 && (
        <div className="mt-auto pt-4 shrink-0">
          <InventoryPagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </div>
      )}

      <AnimatePresence mode="wait">
        {showModal && (
          <AddInventoryItemModal
            slug={slug}
            onClose={() => setShowModal(false)}
            onAdded={handleItemAdded}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

function InventoryPagination({
  page,
  totalPages,
  onPageChange,
}: {
  page: number
  totalPages: number
  onPageChange: (p: number) => void
}) {
  const getPages = () => {
    const pages: (number | '...')[] = []
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i)
    } else {
      pages.push(1)
      if (page > 3) pages.push('...')
      for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++)
        pages.push(i)
      if (page < totalPages - 2) pages.push('...')
      pages.push(totalPages)
    }
    return pages
  }

  return (
    <div className="flex items-center justify-center gap-1 pb-1">
      <button
        onClick={() => onPageChange(page - 1)}
        disabled={page === 1}
        className="flex items-center justify-center w-8 h-8 border border-gray-200 text-gray-500 hover:bg-gray-50 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
      >
        <svg
          className="w-3.5 h-3.5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
        </svg>
      </button>
      {getPages().map((p, i) =>
        p === '...' ? (
          <span
            key={`dots-${i}`}
            className="w-8 h-8 flex items-center justify-center text-xs text-gray-400"
          >
            ···
          </span>
        ) : (
          <button
            key={p}
            onClick={() => onPageChange(p as number)}
            className={`w-8 h-8 text-xs font-bold transition-all border ${page === p ? 'bg-(--clr-ink) text-white border-(--clr-ink)' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}
          >
            {p}
          </button>
        ),
      )}
      <button
        onClick={() => onPageChange(page + 1)}
        disabled={page === totalPages}
        className="flex items-center justify-center w-8 h-8 border border-gray-200 text-gray-500 hover:bg-gray-50 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
      >
        <svg
          className="w-3.5 h-3.5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
        </svg>
      </button>
    </div>
  )
}
