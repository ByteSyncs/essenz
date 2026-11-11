import { describe, expect, it } from 'vitest'
import {
  DEFAULT_FILTERS,
  buildCatalog,
  buildSearchIndex,
  collectTags,
  countLabel,
  formatPrice,
  matchesFilters,
  normalizeText,
  parseFilters,
  serializeFilters,
  sortItems,
  toAnchor,
} from './catalog'

const product = (overrides: Record<string, unknown> = {}) => ({
  id: crypto.randomUUID(),
  name: 'Espresso',
  description: 'Café corto',
  price: 2500,
  image_url: 'https://cdn.test/e.jpg',
  in_offer: false,
  offer_percent: null,
  is_active: true,
  details: { grams: '', bitterness: '', sugar: '', notes: [] },
  display_order: 0,
  ...overrides,
})

const category = (title: string, products: ReturnType<typeof product>[], display_order = 0) => ({
  id: crypto.randomUUID(),
  title,
  display_order,
  products,
})

describe('normalizeText', () => {
  it('ignores case, accents and repeated spaces', () => {
    expect(normalizeText('  CAFÉ   Cortado ')).toBe('cafe cortado')
    expect(normalizeText(null)).toBe('')
  })
})

describe('toAnchor', () => {
  it('builds a safe slug and falls back for symbols or emoji only', () => {
    expect(toAnchor('Pastas & Risottos')).toBe('pastas-risottos')
    expect(toAnchor('🍕🍕')).toBe('categoria')
  })
})

describe('formatPrice', () => {
  it('formats pesos without decimals', () => {
    expect(formatPrice(2500).replace(/\s/g, ' ')).toContain('2.500')
    expect(formatPrice(Number.NaN)).toContain('0')
  })
})

describe('buildCatalog', () => {
  it('drops empty categories and inactive or nameless products', () => {
    const catalog = buildCatalog(
      [
        category('Cafés', [product(), product({ is_active: false }), product({ name: '  ' })]),
        category('Vacía', []),
        category('Solo inactivos', [product({ is_active: false })]),
      ],
      { showImages: true },
    )
    expect(catalog).toHaveLength(1)
    expect(catalog[0].items).toHaveLength(1)
  })

  it('keeps the owner-defined order of categories and products', () => {
    const catalog = buildCatalog(
      [
        category(
          'B',
          [
            product({ name: 'Segundo', display_order: 2 }),
            product({ name: 'Primero', display_order: 1 }),
          ],
          2,
        ),
        category('A', [product({ name: 'Uno' })], 1),
      ],
      { showImages: true },
    )
    expect(catalog.map((entry) => entry.title)).toEqual(['A', 'B'])
    expect(catalog[1].items.map((item) => item.name)).toEqual(['Primero', 'Segundo'])
  })

  it('makes anchors unique when two categories share a title', () => {
    const catalog = buildCatalog(
      [category('Postres', [product()]), category('postres', [product()])],
      { showImages: true },
    )
    expect(catalog.map((entry) => entry.anchor)).toEqual(['postres', 'postres-2'])
  })

  it('computes the offer price and ignores invalid offers', () => {
    const [entry] = buildCatalog(
      [
        category('Promos', [
          product({ name: 'A', price: 2000, in_offer: true, offer_percent: 25 }),
          product({ name: 'B', price: 2000, in_offer: true, offer_percent: null }),
          product({ name: 'C', price: 2000, in_offer: true, offer_percent: 150 }),
          product({ name: 'D', price: 2000, in_offer: false, offer_percent: 25 }),
        ]),
      ],
      { showImages: true },
    )
    const [a, b, c, d] = entry.items
    expect([a.offerPercent, a.finalPrice]).toEqual([25, 1500])
    expect([b.offerPercent, b.finalPrice]).toEqual([null, 2000])
    expect(c.offerPercent).toBeNull()
    expect(d.offerPercent).toBeNull()
  })

  it('hides images when the business turned them off and rejects unsafe urls', () => {
    const withImages = buildCatalog(
      [category('X', [product(), product({ image_url: 'javascript:alert(1)' })])],
      { showImages: true },
    )
    expect(withImages[0].items[0].imageUrl).toBe('https://cdn.test/e.jpg')
    expect(withImages[0].items[1].imageUrl).toBeNull()

    const withoutImages = buildCatalog([category('X', [product()])], { showImages: false })
    expect(withoutImages[0].items[0].imageUrl).toBeNull()
  })

  it('reads notes and specs defensively', () => {
    const [entry] = buildCatalog(
      [
        category('X', [
          product({
            name: 'A',
            details: {
              notes: ['Vegano', 'vegano', ' Sin TACC ', 7, ''],
              grams: '250 g',
              sugar: ' ',
            },
          }),
          product({ name: 'B', details: { notes: '' } }),
          product({ name: 'C', details: null }),
        ]),
      ],
      { showImages: true },
    )
    expect(entry.items[0].notes).toEqual(['Vegano', 'Sin TACC'])
    expect(entry.items[0].specs).toEqual([{ label: 'Gramaje', value: '250 g' }])
    expect(entry.items[1].notes).toEqual([])
    expect(entry.items[2].specs).toEqual([])
  })
})

describe('matchesFilters', () => {
  const [entry] = buildCatalog(
    [
      category('Cafetería', [
        product({
          name: 'Café con leche',
          description: 'Taza grande',
          details: { notes: ['Vegano'] },
        }),
        product({ name: 'Medialuna', in_offer: true, offer_percent: 10 }),
      ]),
    ],
    { showImages: true },
  )
  const [coffee, croissant] = entry.items
  const index = (item: typeof coffee) => buildSearchIndex(item, entry.title)

  it('matches without accents, case or word order', () => {
    expect(matchesFilters(coffee, index(coffee), { ...DEFAULT_FILTERS, query: 'CAFE leche' })).toBe(
      true,
    )
    expect(matchesFilters(coffee, index(coffee), { ...DEFAULT_FILTERS, query: 'leche cafe' })).toBe(
      true,
    )
    expect(matchesFilters(coffee, index(coffee), { ...DEFAULT_FILTERS, query: 'pizza' })).toBe(
      false,
    )
  })

  it('also searches the category title, description and notes', () => {
    expect(
      matchesFilters(croissant, index(croissant), { ...DEFAULT_FILTERS, query: 'cafeteria' }),
    ).toBe(true)
    expect(matchesFilters(coffee, index(coffee), { ...DEFAULT_FILTERS, query: 'taza' })).toBe(true)
    expect(matchesFilters(coffee, index(coffee), { ...DEFAULT_FILTERS, query: 'vegano' })).toBe(
      true,
    )
  })

  it('filters offers and requires every selected tag', () => {
    expect(matchesFilters(coffee, index(coffee), { ...DEFAULT_FILTERS, onlyOffers: true })).toBe(
      false,
    )
    expect(
      matchesFilters(croissant, index(croissant), { ...DEFAULT_FILTERS, onlyOffers: true }),
    ).toBe(true)
    expect(matchesFilters(coffee, index(coffee), { ...DEFAULT_FILTERS, tags: ['vegano'] })).toBe(
      true,
    )
    expect(
      matchesFilters(coffee, index(coffee), { ...DEFAULT_FILTERS, tags: ['vegano', 'sin tacc'] }),
    ).toBe(false)
  })
})

describe('sortItems', () => {
  const items = [
    { name: 'a', finalPrice: 30 },
    { name: 'b', finalPrice: 10 },
    { name: 'c', finalPrice: 10 },
  ]
  it('keeps the original order by default and is stable on ties', () => {
    expect(sortItems(items, 'menu')).toBe(items)
    expect(sortItems(items, 'price-asc').map((item) => item.name)).toEqual(['b', 'c', 'a'])
    expect(sortItems(items, 'price-desc').map((item) => item.name)).toEqual(['a', 'b', 'c'])
  })
})

describe('collectTags', () => {
  it('counts tags across categories, most used first', () => {
    const catalog = buildCatalog(
      [
        category('A', [
          product({ details: { notes: ['Vegano', 'Picante'] } }),
          product({ details: { notes: ['vegano'] } }),
        ]),
      ],
      { showImages: true },
    )
    const tags = collectTags(catalog)
    expect(tags[0]).toMatchObject({ key: 'vegano', count: 2 })
    expect(tags[1]).toMatchObject({ key: 'picante', count: 1 })
  })
})

describe('url state', () => {
  it('round-trips filters and drops unknown tags', () => {
    const filters = {
      query: 'café',
      onlyOffers: true,
      tags: ['vegano'],
      sort: 'price-asc' as const,
    }
    const search = serializeFilters(filters)
    expect(parseFilters(search, ['vegano'])).toEqual(filters)
    expect(parseFilters('?etiquetas=inventada&orden=xx', ['vegano'])).toEqual(DEFAULT_FILTERS)
  })

  it('writes nothing for the default state', () => {
    expect(serializeFilters(DEFAULT_FILTERS)).toBe('')
  })
})

describe('countLabel', () => {
  it('uses singular and plural', () => {
    expect(countLabel(1, 1)).toBe('1 producto')
    expect(countLabel(3, 3)).toBe('3 productos')
    expect(countLabel(2, 30)).toBe('2 de 30 productos')
  })
})
