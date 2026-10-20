import type { InventoryItem } from '../../../../types/inventory'

interface InventoryFiltersProps {
  search: string
  onSearchChange: (v: string) => void
  categories: InventoryItem[]
  selectedCategory: string
  onCategoryChange: (v: string) => void
  total: number
  isLoading: boolean
}

export default function InventoryFilters({
  search,
  onSearchChange,
  categories,
  selectedCategory,
  onCategoryChange,
  total,
  isLoading,
}: InventoryFiltersProps) {
  return (
    <div className="bg-gray-50 border border-gray-100 px-5 py-4 mb-6 flex flex-col sm:flex-row sm:items-center gap-4">
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">
          Total
        </span>
        <span className="text-sm font-black text-(--clr-ink)">
          {isLoading ? <span className="inline-block w-8 h-4 bg-gray-200 animate-pulse" /> : total}
        </span>
        <span className="text-xs text-gray-400 font-medium">productos</span>
      </div>

      <div className="hidden sm:block w-px h-5 bg-gray-200 shrink-0" />

      <div className="flex-1 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-xs">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
            />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Buscar producto..."
            className="w-full bg-white border border-gray-200 pl-9 pr-3 py-2 text-xs text-(--clr-ink) placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-(--clr-accent)/30 focus:border-(--clr-accent) transition-all"
          />
          {search && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500 transition-colors"
            >
              <svg
                className="w-3 h-3"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {categories.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={() => onCategoryChange('all')}
              className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-widest transition-all border ${
                selectedCategory === 'all'
                  ? 'bg-(--clr-ink) text-white border-(--clr-ink)'
                  : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300 hover:text-(--clr-ink)'
              }`}
            >
              Todas
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => onCategoryChange(cat.id)}
                className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-widest transition-all border ${
                  selectedCategory === cat.id
                    ? 'bg-(--clr-ink) text-white border-(--clr-ink)'
                    : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300 hover:text-(--clr-ink)'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
