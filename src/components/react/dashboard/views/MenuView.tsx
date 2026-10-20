import { useState, useMemo, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { uploadImageFromClient } from '../../../../libs/uploadClient'
import ProductModal from '../ProductModal'
import type { Category, MenuItem } from '../../../../types/menu'

async function fetchMenuData(slug: string) {
  const res = await fetch(`/api/organizations/${slug}/menu`, {
    method: 'GET',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error || `Error ${res.status}: Falló la carga`)
  }
  return res.json()
}

const OFFER_PRESETS = [10, 15, 20, 25, 30, 40, 50]

function CheckIcon({ checked }: { checked: boolean }) {
  return (
    <div
      className={`w-5 h-5 border-2 flex items-center justify-center transition-all duration-200 shrink-0 ${checked ? 'bg-(--clr-ink) border-(--clr-ink)' : 'border-gray-300 bg-white'}`}
    >
      <AnimatePresence>
        {checked && (
          <motion.svg
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            className="w-3 h-3 text-white"
            viewBox="0 0 12 12"
            fill="none"
          >
            <path
              d="M2 6l3 3 5-5"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </motion.svg>
        )}
      </AnimatePresence>
    </div>
  )
}

interface EditorAsideProps {
  item: MenuItem
  categories: Category[]
  onSave: (updated: MenuItem, file?: File) => void
  onDelete: (id: string) => void
  onClose: () => void
}

function EditorAside({ item, categories, onSave, onDelete, onClose }: EditorAsideProps) {
  const [draft, setDraft] = useState<MenuItem>({ ...item })
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [customPercent, setCustomPercent] = useState<string>('')
  const [noteInput, setNoteInput] = useState('')

  useEffect(() => {
    setDraft({ ...item })
    setPendingFile(null)
    setCustomPercent('')
    setNoteInput('')
  }, [item])

  const update = useCallback(<K extends keyof MenuItem>(key: K, value: MenuItem[K]) => {
    setDraft((prev) => ({ ...prev, [key]: value }))
  }, [])

  const updateDetail = useCallback(
    <K extends keyof NonNullable<MenuItem['details']>>(
      key: K,
      value: NonNullable<MenuItem['details']>[K],
    ) => {
      setDraft((prev) => ({
        ...prev,
        details: {
          grams: prev.details?.grams ?? '',
          bitterness: prev.details?.bitterness ?? '',
          notes: prev.details?.notes ?? [],
          sugar: prev.details?.sugar ?? '',
          [key]: value,
        },
      }))
    },
    [],
  )

  const toggleOffer = () => {
    if (draft.in_offer) {
      setDraft((prev) => ({ ...prev, in_offer: false, offer_percent: undefined }))
      setCustomPercent('')
    } else {
      setDraft((prev) => ({ ...prev, in_offer: true, offer_percent: 15 }))
    }
  }

  const fieldClass =
    'w-full bg-white border border-gray-200 px-3 py-2.5 text-sm text-(--clr-ink) placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-(--clr-accent)/30 focus:border-(--clr-accent) transition-all'
  const labelClass = 'block text-[10px] uppercase font-black tracking-widest text-gray-400 mb-1.5'

  return (
    <div className="flex flex-col h-full bg-white font-(--font-ui)">
      <div className="px-6 pt-6 pb-4 border-b border-gray-100 flex justify-between items-start">
        <div className="flex-1 pr-4">
          <p className="text-[10px] uppercase tracking-widest text-gray-400 font-bold mb-1">
            Editando
          </p>
          <h3 className="text-lg text-(--clr-ink) leading-tight font-(--font-display) line-clamp-2">
            {draft.name || 'Sin nombre'}
          </h3>
        </div>
        <div className="flex flex-col items-end gap-3 shrink-0">
          <button
            onClick={onClose}
            className="p-2 bg-gray-50 text-gray-400 hover:bg-gray-200 hover:text-gray-800 transition-all cursor-pointer"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <button
            onClick={() => update('is_active', !draft.is_active)}
            className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-widest transition-colors cursor-pointer ${
              draft.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
            }`}
          >
            {draft.is_active ? 'Visible' : 'Oculto'}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
        <div>
          <label className={labelClass}>Imagen del Producto</label>
          <div className="relative w-full h-36 bg-gray-50 border-2 border-dashed border-gray-200 flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-(--clr-accent) hover:bg-(--clr-accent)/5 transition-all group overflow-hidden">
            {pendingFile || draft.image_url ? (
              <>
                <img
                  src={pendingFile ? URL.createObjectURL(pendingFile) : draft.image_url!}
                  alt="Vista previa"
                  className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:opacity-40 transition-opacity"
                />
                <div className="relative z-10 bg-white/90 px-3 py-1.5 shadow-sm">
                  <span className="text-xs text-gray-700 font-bold">Cambiar imagen</span>
                </div>
              </>
            ) : (
              <>
                <svg
                  className="w-6 h-6 text-gray-300 group-hover:text-(--clr-accent) transition-colors"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                >
                  <path
                    d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <span className="text-xs text-gray-400">Subir imagen</span>
              </>
            )}
            <input
              type="file"
              accept="image/*"
              className="absolute inset-0 opacity-0 cursor-pointer"
              onChange={(e) => e.target.files?.[0] && setPendingFile(e.target.files[0])}
            />
          </div>
        </div>

        <div>
          <label className={labelClass}>Categoría</label>
          <select
            value={draft.category_id}
            onChange={(e) => update('category_id', e.target.value)}
            className={fieldClass}
          >
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.title}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={labelClass}>Nombre del Producto</label>
          <input
            type="text"
            value={draft.name}
            onChange={(e) => update('name', e.target.value)}
            className={fieldClass}
          />
        </div>

        <div>
          <label className={labelClass}>Descripción</label>
          <textarea
            value={draft.description ?? ''}
            onChange={(e) => update('description', e.target.value)}
            rows={3}
            className={`${fieldClass} resize-none`}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Precio (ARS)</label>
            <input
              type="number"
              value={draft.price}
              onChange={(e) => update('price', e.target.value)}
              className={fieldClass}
              min="0"
            />
          </div>
        </div>

        <div>
          <button
            type="button"
            onClick={toggleOffer}
            className="flex items-center gap-3 w-full py-3 px-4 bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer"
          >
            <CheckIcon checked={draft.in_offer ?? false} />
            <div className="text-left">
              <p className="text-sm font-bold text-(--clr-ink)">En Oferta</p>
              <p className="text-[10px] text-gray-400">Aplica descuento automático</p>
            </div>
          </button>

          <AnimatePresence>
            {draft.in_offer && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="pt-4 space-y-3">
                  <div className="flex flex-wrap gap-2">
                    {OFFER_PRESETS.map((p) => (
                      <button
                        key={p}
                        onClick={() => {
                          setCustomPercent('')
                          update('offer_percent', p)
                        }}
                        className={`px-3 py-1.5 text-xs font-black transition-all cursor-pointer ${
                          draft.offer_percent === p && !customPercent
                            ? 'bg-(--clr-ink) text-white'
                            : 'bg-white border border-gray-200 text-gray-500'
                        }`}
                      >
                        {p}%
                      </button>
                    ))}
                  </div>
                  {draft.offer_percent && draft.price && (
                    <div className="flex items-center justify-between bg-red-50 px-3 py-2.5 border border-red-100">
                      <span className="text-xs text-red-800 font-medium">Precio final</span>
                      <div className="flex gap-2">
                        <span className="text-xs line-through text-red-300">${draft.price}</span>
                        <span className="text-sm font-black text-red-600">
                          ${Math.round(parseFloat(draft.price) * (1 - draft.offer_percent / 100))}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="px-6 py-5 border-t border-gray-100 bg-white grid grid-cols-2 gap-3 shrink-0">
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => draft.id && onDelete(draft.id)}
          className="w-full py-3.5 border border-red-200 bg-red-50 text-red-600 text-[11px] font-black tracking-widest hover:bg-red-600 hover:text-white transition-colors cursor-pointer uppercase text-center"
        >
          Eliminar
        </motion.button>
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => onSave(draft, pendingFile ?? undefined)}
          className="w-full py-3.5 bg-(--clr-ink) text-white text-[11px] font-black uppercase tracking-widest hover:bg-black transition-colors shadow-lg shadow-black/5 cursor-pointer text-center"
        >
          Guardar
        </motion.button>
      </div>
    </div>
  )
}

function ItemCard({
  item,
  isSelected,
  onClick,
}: {
  item: MenuItem
  isSelected: boolean
  onClick: () => void
}) {
  const discountedPrice =
    item.in_offer && item.offer_percent
      ? Math.round(parseFloat(item.price) * (1 - item.offer_percent / 100))
      : null

  return (
    <motion.button
      layout
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      className={`w-full text-left border transition-all duration-200 overflow-hidden group flex flex-col h-full bg-white cursor-pointer ${
        isSelected
          ? 'border-(--clr-ink) ring-1 ring-(--clr-ink)'
          : 'border-gray-100 hover:border-gray-300'
      }`}
    >
      <div
        className={`relative h-40 w-full flex items-center justify-center transition-colors ${isSelected ? 'bg-gray-100' : 'bg-gray-50/80'}`}
      >
        {item.image_url ? (
          <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
        ) : (
          <svg
            className={`w-12 h-12 ${isSelected ? 'text-gray-400' : 'text-gray-300'}`}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.974 0-5.749-.534-8.214-1.497"
            />
          </svg>
        )}
        {item.in_offer && item.offer_percent && (
          <div className="absolute top-3 left-3 bg-[#e04535] text-white text-[10px] font-bold uppercase px-2.5 py-1">
            -{item.offer_percent}%
          </div>
        )}
        {!item.is_active && (
          <div className="absolute top-3 right-3 bg-gray-800/80 backdrop-blur-sm text-white text-[10px] font-bold uppercase px-2.5 py-1">
            Oculto
          </div>
        )}
      </div>
      <div className="p-5 flex flex-col flex-1">
        <h4 className="font-bold text-sm leading-tight text-gray-900 mb-1">{item.name}</h4>
        <p className="text-[11px] leading-relaxed text-gray-400 mb-4 line-clamp-2 flex-1">
          {item.description}
        </p>
        <div className="flex items-center gap-2 mt-auto">
          {discountedPrice ? (
            <>
              <span className="text-xs line-through text-gray-300">${item.price}</span>
              <span className="text-sm font-black text-[#e04535]">${discountedPrice}</span>
            </>
          ) : (
            <span className="text-sm font-black text-gray-900">${item.price}</span>
          )}
        </div>
      </div>
    </motion.button>
  )
}

export default function MenuView({ slug }: { slug: string }) {
  const [categories, setCategories] = useState<Category[]>([])
  const [isOpen, setIsOpen] = useState<boolean>(false)
  const [isLoading, setIsLoading] = useState(true)
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterCategory, setFilterCategory] = useState<string>('all')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const result = await fetchMenuData(slug)
        if (result.success) setCategories(result.data)
      } catch (err) {
        setErrorMessage((err as Error).message)
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [slug])

  const allItems = useMemo(() => categories.flatMap((cat) => cat.items || []), [categories])

  const filtered = useMemo(() => {
    return allItems.filter((item) => {
      const matchSearch =
        !searchQuery || item.name.toLowerCase().includes(searchQuery.toLowerCase())
      const matchCategory = filterCategory === 'all' || item.category_id === filterCategory
      return matchSearch && matchCategory
    })
  }, [allItems, searchQuery, filterCategory])

  const handleSave = useCallback(
    async (updated: MenuItem, pendingFile?: File) => {
      try {
        setErrorMessage(null)
        let finalImageUrl = updated.image_url
        if (pendingFile)
          finalImageUrl = await uploadImageFromClient(pendingFile, 'menu-items', slug)

        const payload: MenuItem = { ...updated, image_url: finalImageUrl }
        const res = await fetch(`/api/organizations/${slug}/menu`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        if (!res.ok) throw new Error('Error al actualizar en el servidor')
        const resultData = await res.json()
        const savedItem = resultData.data || resultData

        setCategories((prev) =>
          prev.map((cat) => {
            if (cat.id === savedItem.category_id) {
              const exists = cat.items?.some((i) => i.id === savedItem.id) ?? false
              return {
                ...cat,
                items: exists
                  ? cat.items.map((i) => (i.id === savedItem.id ? savedItem : i))
                  : [...(cat.items || []), savedItem],
              }
            }
            return { ...cat, items: (cat.items || []).filter((i) => i.id !== savedItem.id) }
          }),
        )
        setSelectedItem(null)
      } catch (err) {
        setErrorMessage((err as Error).message)
      }
    },
    [slug],
  )

  const handleDelete = useCallback(
    async (id: string) => {
      try {
        setErrorMessage(null)
        const res = await fetch(`/api/organizations/${slug}/menu`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id }),
        })

        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          throw new Error(body.error || 'No se pudo eliminar el producto del servidor')
        }
        setCategories((prev) =>
          prev.map((cat) => ({
            ...cat,
            items: (cat.items || []).filter((item) => item.id !== id),
          })),
        )
        setSelectedItem(null)
      } catch (err) {
        setErrorMessage((err as Error).message)
      }
    },
    [slug],
  )

  const handleCreateCategory = useCallback(
    async (title: string): Promise<Category> => {
      const res = await fetch(`/api/organizations/${slug}/categories`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title }),
      })
      if (!res.ok) throw new Error('Error al crear la categoría')
      const resultData = await res.json()
      const newCategory = { ...(resultData.data || resultData), items: [] }
      setCategories((prev) => [...prev, newCategory])
      return newCategory
    },
    [slug],
  )

  const handleSaveProduct = useCallback(
    async (productData: any) => {
      try {
        setErrorMessage(null)
        const res = await fetch(`/api/organizations/${slug}/menu`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(productData),
        })
        if (!res.ok) throw new Error('Error al crear el producto')
        const resultData = await res.json()
        const savedItem = resultData.data || resultData

        setCategories((prev) =>
          prev.map((cat) => {
            if (cat.id === savedItem.category_id) {
              return {
                ...cat,
                items: [...(cat.items || []), savedItem],
              }
            }
            return cat
          }),
        )
        setIsOpen(false)
      } catch (err) {
        setErrorMessage((err as Error).message)
      }
    },
    [slug],
  )

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-xs font-black uppercase tracking-widest text-gray-300 animate-pulse">
          Cargando Menú...
        </p>
      </div>
    )
  }

  return (
    <div className="flex h-full min-h-0">
      {/* RENDER MOBILE & TABLET (< 1024px): Despliega desde abajo */}
      <AnimatePresence>
        {selectedItem && (
          <motion.div
            initial={{ opacity: 0, y: '100%' }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-0 z-50 bg-white lg:hidden flex flex-col"
          >
            <EditorAside
              item={selectedItem}
              categories={categories}
              onSave={handleSave}
              onDelete={handleDelete}
              onClose={() => setSelectedItem(null)}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* RENDER DESKTOP (>= 1024px): Panel lateral fijo incorporado en el flex layout */}
      <AnimatePresence initial={false}>
        {selectedItem && (
          <motion.aside
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 340, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            className="hidden lg:flex flex-col border-r border-gray-100 bg-white shrink-0 overflow-hidden"
            style={{ width: 340 }}
          >
            <EditorAside
              item={selectedItem}
              categories={categories}
              onSave={handleSave}
              onDelete={handleDelete}
              onClose={() => setSelectedItem(null)}
            />
          </motion.aside>
        )}
      </AnimatePresence>

      <div className="flex-1 flex flex-col min-w-0 bg-[#fafafa]">
        <AnimatePresence>
          {errorMessage && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mx-6 mt-4 bg-red-50 border border-red-100 text-red-700 text-sm px-4 py-3 flex items-center justify-between"
            >
              <span>{errorMessage}</span>
              <button
                onClick={() => setErrorMessage(null)}
                className="text-red-400 hover:text-red-700 ml-4 cursor-pointer"
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

        <header className="px-6 lg:px-8 pt-6 lg:pt-8 pb-6 shrink-0 font-(--font-ui)">
          <div className="flex flex-row justify-between items-center mb-6">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.25em] text-(--clr-accent) mb-1">
                Carta
              </p>
              <h2 className="text-2xl text-(--clr-ink-dark) tracking-tight font-(--font-display)">
                Tu Menú
              </h2>
            </div>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setIsOpen(true)}
              className="group flex items-center gap-2 px-5 py-2.5 bg-(--clr-ink) text-white text-sm font-bold transition-all shadow-lg shadow-black/10 hover:shadow-black/20 hover:bg-black cursor-pointer"
              style={{ borderRadius: 'var(--radius-btn)' }}
            >
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={3}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Agregar
            </motion.button>
          </div>
          <div className="flex flex-col lg:flex-row gap-3">
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar producto..."
              className="flex-1 px-4 py-2.5 bg-white text-sm border border-gray-100 focus:outline-none focus:ring-2 focus:ring-(--clr-accent)/20"
              style={{ borderRadius: 'var(--radius-btn)' }}
            />
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="bg-white border border-gray-100 px-4 py-2.5 text-sm font-bold text-gray-600 focus:outline-none focus:ring-2 focus:ring-(--clr-accent)/20 lg:min-w-40 appearance-none"
              style={{ borderRadius: 'var(--radius-btn)' }}
            >
              <option value="all">Todas las categorías</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.title}
                </option>
              ))}
            </select>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto px-6 lg:px-8 pb-8">
          <motion.div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4" layout>
            {filtered.map((item) => (
              <ItemCard
                key={item.id}
                item={item}
                isSelected={selectedItem?.id === item.id}
                onClick={() => setSelectedItem(selectedItem?.id === item.id ? null : item)}
              />
            ))}
          </motion.div>
          {filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <svg
                className="w-12 h-12 text-gray-200 mb-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                />
              </svg>
              <p className="text-sm font-bold text-gray-300">Sin resultados</p>
            </div>
          )}
        </div>
      </div>

      <ProductModal
        slug={slug}
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        categories={categories}
        onCreateCategory={handleCreateCategory}
        onSaveProduct={handleSaveProduct}
      />
    </div>
  )
}
