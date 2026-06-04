import { motion, AnimatePresence } from 'framer-motion'
import { useState, useCallback, useEffect } from 'react'

const DEMO_ITEMS = [
  {
    id: '1',
    name: 'Espresso Clásico',
    description: 'Blend 100% arábica, tostado oscuro',
    price: '1800',
    category_id: 'cafes',
    is_active: true,
    in_offer: false,
    offer_percent: undefined as number | undefined,
    image_url: null as string | null,
    intensity: 8,
  },
  {
    id: '2',
    name: 'Latte de Vainilla',
    description: 'Leche cremosa con vainilla bourbon',
    price: '2400',
    category_id: 'cafes',
    is_active: true,
    in_offer: true,
    offer_percent: 20,
    image_url: null as string | null,
    intensity: 4,
  },
  {
    id: '3',
    name: 'Croissant Relleno',
    description: 'Manteca francesa, jamón y queso brie',
    price: '3200',
    category_id: 'comidas',
    is_active: true,
    in_offer: false,
    offer_percent: undefined as number | undefined,
    image_url: null as string | null,
    intensity: undefined,
  },
  {
    id: '4',
    name: 'Matcha Latte',
    description: 'Ceremonial grade, leche de avena',
    price: '2800',
    category_id: 'bebidas',
    is_active: false,
    in_offer: false,
    offer_percent: undefined as number | undefined,
    image_url: null as string | null,
    intensity: 3,
  },
  {
    id: '5',
    name: 'Tostado Artesanal',
    description: 'Pan de masa madre, palta y semillas',
    price: '2600',
    category_id: 'comidas',
    is_active: true,
    in_offer: true,
    offer_percent: 15,
    image_url: null as string | null,
    intensity: undefined,
  },
  {
    id: '6',
    name: 'Cold Brew 24h',
    description: 'Extracción en frío, notas de chocolate',
    price: '2200',
    category_id: 'bebidas',
    is_active: true,
    in_offer: false,
    offer_percent: undefined as number | undefined,
    image_url: null as string | null,
    intensity: 9,
  },
]

type DemoItem = (typeof DEMO_ITEMS)[number]

function useIsMobile(breakpoint = 640) {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < breakpoint)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [breakpoint])

  return isMobile
}

const ProductIcon = ({ categoryId, intensity }: { categoryId: string; intensity?: number }) => {
  if (categoryId === 'cafes') {
    return (
      <svg viewBox="0 0 40 40" fill="none" className="w-10 h-10">
        <circle cx="20" cy="22" r="10" stroke="currentColor" strokeWidth="1.5" />
        <path
          d="M14 22 Q20 16 26 22"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <path
          d="M28 20 Q32 18 31 23 Q30 26 27 25"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <path
          d="M18 12 Q20 8 22 12"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        {intensity && intensity > 6 && (
          <path
            d="M20 9 Q21 6 20 4"
            stroke="currentColor"
            strokeWidth="1"
            strokeLinecap="round"
            className="opacity-50"
          />
        )}
      </svg>
    )
  }
  if (categoryId === 'comidas') {
    return (
      <svg viewBox="0 0 40 40" fill="none" className="w-10 h-10">
        <path
          d="M10 28 Q15 12 20 10 Q25 12 30 28"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <path
          d="M13 22 Q20 19 27 22"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <line
          x1="20"
          y1="28"
          x2="20"
          y2="34"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    )
  }
  return (
    <svg viewBox="0 0 40 40" fill="none" className="w-10 h-10">
      <rect x="13" y="8" width="14" height="20" rx="7" stroke="currentColor" strokeWidth="1.5" />
      <line
        x1="20"
        y1="28"
        x2="20"
        y2="34"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <line
        x1="15"
        y1="34"
        x2="25"
        y2="34"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M27 14 Q31 14 31 18 Q31 22 27 22"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  )
}

const MiniCard = ({
  item,
  isSelected,
  onClick,
}: {
  item: DemoItem
  isSelected: boolean
  onClick: () => void
}) => {
  const discounted =
    item.in_offer && item.offer_percent
      ? Math.round(parseFloat(item.price) * (1 - item.offer_percent / 100))
      : null

  return (
    <motion.button
      layout
      whileTap={{ scale: 0.96 }}
      onClick={onClick}
      className={`w-full text-left rounded-2xl border transition-all duration-200 overflow-hidden bg-white flex flex-col ${
        isSelected
          ? 'border-(--clr-ink) ring-1 ring-(--clr-ink) shadow-md'
          : 'border-gray-100 hover:border-gray-300'
      }`}
    >
      <div
        className={`relative h-20 w-full flex items-center justify-center transition-colors ${
          isSelected ? 'bg-gray-100' : 'bg-gray-50/80'
        }`}
      >
        <span className={isSelected ? 'text-gray-500' : 'text-gray-300'}>
          <ProductIcon categoryId={item.category_id} intensity={item.intensity} />
        </span>
        {item.in_offer && item.offer_percent && (
          <div className="absolute top-2 left-2 bg-[#e04535] text-white text-[8px] font-bold uppercase px-1.5 py-0.5 rounded">
            -{item.offer_percent}%
          </div>
        )}
        {!item.is_active && (
          <div className="absolute top-2 right-2 bg-gray-800/70 backdrop-blur-sm text-white text-[8px] font-bold uppercase px-1.5 py-0.5 rounded">
            Oculto
          </div>
        )}
      </div>
      <div className="p-3 flex flex-col flex-1">
        <p className="font-bold text-[11px] leading-tight text-gray-900 mb-0.5 truncate">
          {item.name}
        </p>
        <p className="text-[9px] text-gray-400 mb-2 line-clamp-1 flex-1">{item.description}</p>
        <div className="flex items-center gap-1.5">
          {discounted ? (
            <>
              <span className="text-[9px] line-through text-gray-300">${item.price}</span>
              <span className="text-[11px] font-black text-[#e04535]">${discounted}</span>
            </>
          ) : (
            <span className="text-[11px] font-black text-gray-900">${item.price}</span>
          )}
        </div>
      </div>
    </motion.button>
  )
}

const MiniEditor = ({
  item,
  onClose,
  onToggleActive,
  onToggleOffer,
}: {
  item: DemoItem
  onClose: () => void
  onToggleActive: () => void
  onToggleOffer: () => void
}) => {
  const labelClass = 'block text-[8px] uppercase font-black tracking-widest text-gray-400 mb-1'
  const fieldClass =
    'w-full bg-white border border-gray-200 rounded-lg px-2.5 py-2 text-[11px] text-(--clr-ink) placeholder-gray-300 focus:outline-none focus:ring-1 focus:ring-(--clr-accent)/30 transition-all'

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ type: 'spring', damping: 25, stiffness: 220 }}
      className="flex flex-col h-full bg-white"
    >
      <div className="px-4 pt-4 pb-3 border-b border-gray-100 flex justify-between items-start">
        <div className="flex-1 pr-2">
          <p className="text-[8px] uppercase tracking-widest text-gray-400 font-bold mb-0.5">
            Editando
          </p>
          <h3 className="text-sm font-bold text-(--clr-ink) leading-tight line-clamp-2">
            {item.name}
          </h3>
        </div>
        <div className="flex flex-col items-end gap-2 shrink-0">
          <button
            onClick={onClose}
            className="p-1.5 bg-gray-50 text-gray-400 hover:bg-gray-200 hover:text-gray-800 rounded-full transition-all"
          >
            <svg
              className="w-3.5 h-3.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <button
            onClick={onToggleActive}
            className={`px-2 py-1 rounded-full text-[8px] font-black uppercase tracking-wider transition-colors ${
              item.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
            }`}
          >
            {item.is_active ? 'Visible' : 'Oculto'}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        <div>
          <label className={labelClass}>Imagen del Producto</label>
          <div className="relative w-full h-20 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center gap-1 cursor-pointer hover:border-(--clr-accent) transition-all group">
            <div className="text-gray-300 group-hover:text-(--clr-accent) transition-colors">
              <ProductIcon categoryId={item.category_id} intensity={item.intensity} />
            </div>
            <span className="text-[8px] text-gray-400">Subir imagen</span>
          </div>
        </div>

        <div>
          <label className={labelClass}>Nombre del Producto</label>
          <input type="text" defaultValue={item.name} className={fieldClass} readOnly />
        </div>

        <div>
          <label className={labelClass}>Descripción</label>
          <textarea
            defaultValue={item.description ?? ''}
            rows={2}
            className={`${fieldClass} resize-none`}
            readOnly
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className={labelClass}>Precio (ARS)</label>
            <input type="text" defaultValue={`$${item.price}`} className={fieldClass} readOnly />
          </div>
          {item.intensity && (
            <div>
              <label className={labelClass}>Intensidad</label>
              <div className="flex items-center gap-1 mt-1">
                {Array.from({ length: 10 }).map((_, i) => (
                  <div
                    key={i}
                    className={`h-2 flex-1 rounded-sm ${i < item.intensity! ? 'bg-(--clr-ink)' : 'bg-gray-100'}`}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        <button
          onClick={onToggleOffer}
          className="flex items-center gap-2.5 w-full py-2.5 px-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors"
        >
          <div
            className={`w-4 h-4 rounded-sm border-2 flex items-center justify-center transition-all shrink-0 ${
              item.in_offer ? 'bg-(--clr-ink) border-(--clr-ink)' : 'border-gray-300 bg-white'
            }`}
          >
            {item.in_offer && (
              <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 12 12" fill="none">
                <path
                  d="M2 6l3 3 5-5"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            )}
          </div>
          <div className="text-left">
            <p className="text-[10px] font-bold text-(--clr-ink)">En Oferta</p>
            <p className="text-[8px] text-gray-400">Aplica descuento automático</p>
          </div>
        </button>

        <AnimatePresence>
          {item.in_offer && item.offer_percent && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="flex items-center justify-between bg-red-50 rounded-lg px-3 py-2 border border-red-100">
                <span className="text-[10px] text-red-800 font-medium">Precio final</span>
                <div className="flex gap-2 items-center">
                  <span className="text-[9px] line-through text-red-300">${item.price}</span>
                  <span className="text-sm font-black text-red-600">
                    ${Math.round(parseFloat(item.price) * (1 - item.offer_percent / 100))}
                  </span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="px-4 py-3 border-t border-gray-100">
        <motion.button
          whileTap={{ scale: 0.97 }}
          className="w-full py-2.5 bg-(--clr-ink) text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-black transition-colors shadow-lg shadow-black/5"
        >
          Guardar Cambios
        </motion.button>
      </div>
    </motion.div>
  )
}

const DashboardPreview = () => {
  const [items, setItems] = useState(DEMO_ITEMS)
  const [selectedId, setSelectedId] = useState<string | null>('2')
  const [search, setSearch] = useState('')
  const isMobile = useIsMobile()

  const selectedItem = items.find((i) => i.id === selectedId) ?? null

  const filtered = items.filter(
    (item) => !search || item.name.toLowerCase().includes(search.toLowerCase()),
  )

  const toggleActive = useCallback(() => {
    if (!selectedId) return
    setItems((prev) =>
      prev.map((i) => (i.id === selectedId ? { ...i, is_active: !i.is_active } : i)),
    )
  }, [selectedId])

  const toggleOffer = useCallback(() => {
    if (!selectedId) return
    setItems((prev) =>
      prev.map((i) =>
        i.id === selectedId
          ? { ...i, in_offer: !i.in_offer, offer_percent: !i.in_offer ? 20 : undefined }
          : i,
      ),
    )
  }, [selectedId])

  const handleCardClick = (id: string) => {
    setSelectedId(selectedId === id ? null : id)
  }

  const handleClose = () => setSelectedId(null)

  return (
    <div className="flex h-full bg-white rounded-2xl overflow-hidden relative">
      {/* ── Desktop aside ── */}
      {!isMobile && (
        <AnimatePresence initial={false}>
          {selectedItem && (
            <motion.aside
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 220, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="shrink-0 border-r border-gray-100 overflow-hidden"
              style={{ width: 220 }}
            >
              <MiniEditor
                item={selectedItem}
                onClose={handleClose}
                onToggleActive={toggleActive}
                onToggleOffer={toggleOffer}
              />
            </motion.aside>
          )}
        </AnimatePresence>
      )}

      {/* ── Main grid ── */}
      <main className="flex-1 flex flex-col min-w-0 bg-[#fafafa]">
        <header className="px-4 pt-4 pb-3 shrink-0">
          <div className="flex justify-between items-center mb-3">
            <div>
              <p className="text-[8px] font-black uppercase tracking-[0.3em] text-[#e04535] mb-0.5">
                Essenz · Dashboard
              </p>
              <h2 className="text-base font-bold text-(--clr-ink) leading-tight">Tu Carta</h2>
              <p className="text-[9px] text-gray-400 uppercase tracking-widest font-medium">
                Gestioná tus productos
              </p>
            </div>
            <motion.button
              whileHover={{ y: -1 }}
              whileTap={{ scale: 0.97 }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-(--clr-ink) text-white rounded-lg text-[9px] font-bold shadow-lg shadow-black/10 hover:bg-black transition-colors"
            >
              <svg
                className="w-3 h-3"
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
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar producto..."
            className="w-full px-3 py-1.5 bg-white rounded-xl text-[11px] border border-gray-100 focus:outline-none focus:ring-2 focus:ring-(--clr-accent)/20"
          />
        </header>

        <div className="flex-1 overflow-y-auto px-4 pb-4">
          <motion.div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5" layout>
            <AnimatePresence>
              {filtered.map((item) => (
                <MiniCard
                  key={item.id}
                  item={item}
                  isSelected={selectedId === item.id}
                  onClick={() => handleCardClick(item.id)}
                />
              ))}
            </AnimatePresence>
          </motion.div>
        </div>
      </main>

      {/* ── Mobile bottom sheet ── */}
      {isMobile && (
        <AnimatePresence>
          {selectedItem && (
            <>
              {/* Backdrop */}
              <motion.div
                key="backdrop"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={handleClose}
                className="absolute inset-0 bg-black/30 z-10"
              />
              {/* Sheet */}
              <motion.div
                key="sheet"
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 28, stiffness: 260 }}
                className="absolute bottom-0 left-0 right-0 z-20 rounded-t-3xl overflow-hidden shadow-2xl"
                style={{ height: '85%' }}
              >
                {/* Drag handle */}
                <div className="absolute top-2.5 left-0 right-0 flex justify-center z-10 pointer-events-none">
                  <div className="w-8 h-1 rounded-full bg-gray-300" />
                </div>
                <MiniEditor
                  item={selectedItem}
                  onClose={handleClose}
                  onToggleActive={toggleActive}
                  onToggleOffer={toggleOffer}
                />
              </motion.div>
            </>
          )}
        </AnimatePresence>
      )}
    </div>
  )
}

export default function Hero() {
  return (
    <section className="relative min-h-screen flex items-center justify-center pt-32 overflow-hidden bg-[#fafafa]">
      <div className="absolute inset-0 z-0">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full bg-[radial-gradient(circle_at_50%_50%,rgba(0,0,0,0.02)_0%,transparent_50%)]" />
      </div>

      <div className="container max-w-6xl mx-auto px-6 relative z-10">
        <div className="text-center mb-16 mt-16">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="font-bold tracking-tight leading-none mb-8 text-(--clr-ink)"
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(3.5rem, 8vw, 6rem)',
            }}
          >
            La identidad digital <br />
            <span
              className="italic font-normal text-(--clr-accent2)"
              style={{ fontFamily: 'var(--font-editorial)' }}
            >
              que tu café merece.
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1 }}
            className="max-w-xl mx-auto mb-10 text-lg text-gray-500 font-light"
          >
            Diseñamos cartas digitales de alto impacto que elevan la percepción de tu marca. Sin
            fricciones, sin esperas, pura elegancia visual.
          </motion.p>

          <div className="flex justify-center gap-8">
            <motion.a
              href="/#plans"
              whileHover={{ y: -2 }}
              className="text-[11px] font-bold uppercase tracking-widest px-10 py-5 bg-(--clr-ink) text-white rounded-full"
            >
              Empezar Proyecto
            </motion.a>
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.3 }}
          className="relative max-w-5xl mx-auto"
        >
          <div className="bg-white rounded-t-[2.5rem] border border-gray-200/60 shadow-[0_-20px_60px_rgba(0,0,0,0.06)] overflow-hidden">
            <div className="px-4 sm:px-8 py-4 border-b border-gray-100 flex items-center justify-between bg-white">
              <div className="flex gap-2">
                <div className="w-3 h-3 rounded-full bg-gray-100" />
                <div className="w-3 h-3 rounded-full bg-gray-100" />
                <div className="w-3 h-3 rounded-full bg-gray-100" />
              </div>
              <div className="text-[9px] font-bold text-gray-400 uppercase tracking-[0.2em]">
                Essenz Editor — Dashboard
              </div>
              <div className="w-16" />
            </div>

            <div className="h-120 sm:h-130">
              <DashboardPreview />
            </div>
          </div>

          <motion.div
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute top-1/3 -right-10 bg-white p-4 rounded-2xl shadow-xl border border-gray-100 hidden xl:block"
          >
            <div className="flex flex-col gap-2">
              <span className="text-[9px] font-bold text-gray-400">TYPOGRAPHY</span>
              <span className="text-sm font-serif italic text-(--clr-accent2)">
                Editorial Serif
              </span>
              <div className="flex gap-1">
                <div className="w-4 h-4 rounded bg-(--clr-ink)" />
                <div className="w-4 h-4 rounded bg-(--clr-accent)" />
                <div className="w-4 h-4 rounded bg-[#e04535]" />
              </div>
            </div>
          </motion.div>

          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
            className="absolute top-1/2 -left-10 bg-white p-3 rounded-2xl shadow-xl border border-gray-100 hidden xl:flex items-center gap-2.5"
          >
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <div>
              <p className="text-[9px] font-bold text-gray-900 leading-none mb-0.5">
                En tiempo real
              </p>
              <p className="text-[8px] text-gray-400">Cambios al instante</p>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  )
}
