export interface MenuProductInput {
  id: string
  name: string
  description?: string | null
  price: number
  image_url?: string | null
  in_offer?: boolean | null
  offer_percent?: number | null
  is_active?: boolean | null
  details?: unknown
  display_order?: number | null
}

export interface MenuCategoryInput {
  id: string
  title: string
  display_order?: number | null
  products?: MenuProductInput[] | null
}

export interface CatalogSpec {
  label: string
  value: string
}

export interface CatalogItem {
  id: string
  name: string
  description: string
  price: number
  finalPrice: number
  offerPercent: number | null
  imageUrl: string | null
  notes: string[]
  specs: CatalogSpec[]
}

export interface CatalogCategory {
  id: string
  anchor: string
  title: string
  items: CatalogItem[]
}

export type SortMode = 'menu' | 'price-asc' | 'price-desc'

export interface MenuFilters {
  query: string
  onlyOffers: boolean
  tags: string[]
  sort: SortMode
}

export interface TagOption {
  key: string
  label: string
  count: number
}

export const DEFAULT_FILTERS: MenuFilters = {
  query: '',
  onlyOffers: false,
  tags: [],
  sort: 'menu',
}

const MAX_NOTES_PER_ITEM = 12
const MAX_TAG_OPTIONS = 12

const SPEC_LABELS: Array<[string, string]> = [
  ['grams', 'Gramaje'],
  ['bitterness', 'Amargor'],
  ['sugar', 'Azúcar'],
]

export function normalizeText(value: unknown) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

export function toAnchor(title: string) {
  return (
    normalizeText(title)
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'categoria'
  )
}

const priceFormatter = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  maximumFractionDigits: 0,
})

export function formatPrice(value: number) {
  return priceFormatter.format(Number.isFinite(value) ? value : 0)
}

function safeImageUrl(value: unknown) {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return /^https?:\/\//i.test(trimmed) ? trimmed : null
}

function readDetails(details: unknown) {
  const record =
    details && typeof details === 'object' && !Array.isArray(details)
      ? (details as Record<string, unknown>)
      : {}

  const seen = new Set<string>()
  const notes: string[] = []
  if (Array.isArray(record.notes)) {
    for (const note of record.notes) {
      if (typeof note !== 'string') continue
      const label = note.trim()
      const key = normalizeText(label)
      if (!label || seen.has(key)) continue
      seen.add(key)
      notes.push(label)
      if (notes.length >= MAX_NOTES_PER_ITEM) break
    }
  }

  const specs: CatalogSpec[] = []
  for (const [field, label] of SPEC_LABELS) {
    const value = record[field]
    if (typeof value === 'string' && value.trim()) specs.push({ label, value: value.trim() })
  }

  return { notes, specs }
}

function toItem(product: MenuProductInput): CatalogItem {
  const percent = product.offer_percent
  const offerPercent =
    product.in_offer && typeof percent === 'number' && percent >= 1 && percent <= 100
      ? Math.round(percent)
      : null
  const price = Number(product.price)
  const finalPrice =
    offerPercent === null ? price : Math.round(price * (1 - offerPercent / 100) * 100) / 100
  const { notes, specs } = readDetails(product.details)

  return {
    id: product.id,
    name: String(product.name ?? '').trim(),
    description: typeof product.description === 'string' ? product.description.trim() : '',
    price,
    finalPrice,
    offerPercent,
    imageUrl: safeImageUrl(product.image_url),
    notes,
    specs,
  }
}

export function buildCatalog(
  categories: MenuCategoryInput[] | null | undefined,
  options: { showImages: boolean },
): CatalogCategory[] {
  const usedAnchors = new Map<string, number>()
  const result: CatalogCategory[] = []

  const ordered = [...(categories ?? [])]
    .map((category, index) => ({ category, index }))
    .sort(
      (a, b) =>
        (a.category.display_order ?? 0) - (b.category.display_order ?? 0) || a.index - b.index,
    )

  for (const { category } of ordered) {
    const items = [...(category.products ?? [])]
      .map((product, index) => ({ product, index }))
      .filter(({ product }) => product.is_active !== false && product.id && product.name?.trim())
      .sort(
        (a, b) =>
          (a.product.display_order ?? 0) - (b.product.display_order ?? 0) || a.index - b.index,
      )
      .map(({ product }) => {
        const item = toItem(product)
        return options.showImages ? item : { ...item, imageUrl: null }
      })

    if (items.length === 0) continue

    const base = toAnchor(category.title)
    const seen = usedAnchors.get(base) ?? 0
    usedAnchors.set(base, seen + 1)

    result.push({
      id: category.id,
      anchor: seen === 0 ? base : `${base}-${seen + 1}`,
      title: category.title.trim() || 'Sin nombre',
      items,
    })
  }

  return result
}

export function buildSearchIndex(item: CatalogItem, categoryTitle: string) {
  return normalizeText(
    [
      item.name,
      item.description,
      categoryTitle,
      ...item.notes,
      ...item.specs.map((spec) => spec.value),
    ].join(' '),
  )
}

export function noteKey(note: string) {
  return normalizeText(note)
}

export function matchesFilters(item: CatalogItem, searchIndex: string, filters: MenuFilters) {
  if (filters.onlyOffers && item.offerPercent === null) return false

  if (filters.tags.length > 0) {
    const itemTags = new Set(item.notes.map(noteKey))
    if (!filters.tags.every((tag) => itemTags.has(tag))) return false
  }

  const tokens = normalizeText(filters.query).split(' ').filter(Boolean)
  return tokens.every((token) => searchIndex.includes(token))
}

export function sortItems<T extends { finalPrice: number }>(items: T[], sort: SortMode) {
  if (sort === 'menu') return items
  const direction = sort === 'price-asc' ? 1 : -1
  return items
    .map((item, index) => ({ item, index }))
    .sort((a, b) => (a.item.finalPrice - b.item.finalPrice) * direction || a.index - b.index)
    .map(({ item }) => item)
}

export function collectTags(catalog: CatalogCategory[]): TagOption[] {
  const counts = new Map<string, TagOption>()
  for (const category of catalog) {
    for (const item of category.items) {
      for (const note of item.notes) {
        const key = noteKey(note)
        const current = counts.get(key)
        if (current) current.count += 1
        else counts.set(key, { key, label: note, count: 1 })
      }
    }
  }
  return [...counts.values()]
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, 'es'))
    .slice(0, MAX_TAG_OPTIONS)
}

export function hasActiveFilters(filters: MenuFilters) {
  return (
    filters.onlyOffers || filters.tags.length > 0 || filters.sort !== 'menu' || filters.query !== ''
  )
}

const SORT_PARAM: Record<SortMode, string> = {
  menu: '',
  'price-asc': 'menor',
  'price-desc': 'mayor',
}

export function serializeFilters(filters: MenuFilters) {
  const params = new URLSearchParams()
  const query = filters.query.trim()
  if (query) params.set('q', query)
  if (filters.onlyOffers) params.set('ofertas', '1')
  if (filters.tags.length > 0) params.set('etiquetas', filters.tags.join(','))
  if (filters.sort !== 'menu') params.set('orden', SORT_PARAM[filters.sort])
  return params.toString()
}

export function parseFilters(search: string, knownTags: string[] = []): MenuFilters {
  const params = new URLSearchParams(search)
  const orden = params.get('orden')
  const sort: SortMode = orden === 'menor' ? 'price-asc' : orden === 'mayor' ? 'price-desc' : 'menu'
  const known = new Set(knownTags)
  const tags = (params.get('etiquetas') ?? '')
    .split(',')
    .map((tag) => normalizeText(tag))
    .filter((tag) => tag && known.has(tag))

  return {
    query: (params.get('q') ?? '').slice(0, 80),
    onlyOffers: params.get('ofertas') === '1',
    tags: [...new Set(tags)],
    sort,
  }
}

export function countLabel(shown: number, total: number) {
  const noun = total === 1 ? 'producto' : 'productos'
  return shown === total ? `${total} ${noun}` : `${shown} de ${total} ${noun}`
}
