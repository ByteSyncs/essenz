import {
  DEFAULT_FILTERS,
  buildSearchIndex,
  collectTags,
  countLabel,
  formatPrice,
  hasActiveFilters,
  matchesFilters,
  parseFilters,
  serializeFilters,
  sortItems,
  type CatalogCategory,
  type CatalogItem,
  type MenuFilters,
  type SortMode,
} from '../../libs/menu/catalog'

const DISMISS_VELOCITY = 0.11
const DISMISS_RATIO = 0.4

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag)
  if (className) node.className = className
  if (text !== undefined) node.textContent = text
  return node
}

function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function isSheetLayout() {
  return window.matchMedia('(max-width: 767px)').matches
}

function rubberBand(overshoot: number, dimension: number) {
  const constant = 0.55
  const distance = Math.abs(overshoot)
  const result = (distance * dimension * constant) / (dimension + constant * distance)
  return overshoot < 0 ? -result : result
}

function enableSheetDrag(dialog: HTMLDialogElement) {
  const grab = dialog.querySelector<HTMLElement>('[data-grab]')
  if (!grab) return

  let dragging = false
  let startY = 0
  let offset = 0
  let samples: Array<{ time: number; y: number }> = []

  grab.addEventListener('pointerdown', (event) => {
    if (!isSheetLayout()) return
    if (event.pointerType === 'mouse' && event.button !== 0) return
    dragging = true
    startY = event.clientY
    offset = 0
    samples = [{ time: event.timeStamp, y: event.clientY }]
    grab.setPointerCapture(event.pointerId)
    dialog.classList.add('is-dragging')
  })

  grab.addEventListener('pointermove', (event) => {
    if (!dragging) return
    const raw = event.clientY - startY
    offset = raw >= 0 ? raw : rubberBand(raw, 120)
    dialog.style.setProperty('--drag-y', `${offset}px`)
    samples.push({ time: event.timeStamp, y: event.clientY })
    const cutoff = event.timeStamp - 100
    samples = samples.filter((sample) => sample.time >= cutoff)
  })

  const finish = (event: PointerEvent, cancelled: boolean) => {
    if (!dragging) return
    dragging = false
    dialog.classList.remove('is-dragging')
    if (grab.hasPointerCapture(event.pointerId)) grab.releasePointerCapture(event.pointerId)

    const recent = samples.filter((sample) => sample.time >= event.timeStamp - 100)
    const first = recent[0]
    const last = recent[recent.length - 1]
    const elapsed = recent.length > 1 ? last.time - first.time : 0
    const velocity = elapsed > 0 ? (last.y - first.y) / elapsed : 0

    const dismiss =
      !cancelled &&
      (velocity > DISMISS_VELOCITY ||
        offset > dialog.getBoundingClientRect().height * DISMISS_RATIO)

    if (dismiss) dialog.close()
    else dialog.style.setProperty('--drag-y', '0px')
  }

  grab.addEventListener('pointerup', (event) => finish(event, false))
  grab.addEventListener('pointercancel', (event) => finish(event, true))
  dialog.addEventListener('close', () => dialog.style.removeProperty('--drag-y'))
}

function buildDetail(item: CatalogItem) {
  const wrapper = el('div')
  if (item.imageUrl) {
    const image = el('img', 'mn-detail-img')
    image.src = item.imageUrl
    image.alt = item.name
    image.width = 800
    image.height = 600
    wrapper.append(image)
  }

  const body = el('div', `mn-detail ${item.imageUrl ? 'has-image' : 'no-image'}`)
  const title = el('h2', undefined, item.name)
  title.id = 'mn-item-title'
  body.append(title)
  if (item.description) body.append(el('p', undefined, item.description))

  const price = el('div', 'mn-detail-price')
  price.append(el('strong', undefined, formatPrice(item.finalPrice)))
  if (item.offerPercent !== null) {
    const old = el('s', 'mn-old')
    old.append(el('span', 'sr-only', 'Antes '), document.createTextNode(formatPrice(item.price)))
    const badge = el('span', 'mn-badge', `-${item.offerPercent}%`)
    badge.setAttribute('aria-hidden', 'true')
    price.append(old, badge, el('span', 'sr-only', `${item.offerPercent}% de descuento`))
  }
  body.append(price)

  if (item.specs.length > 0) {
    const list = el('dl', 'mn-specs')
    for (const spec of item.specs) {
      const row = el('div')
      row.append(el('dt', undefined, spec.label), el('dd', undefined, spec.value))
      list.append(row)
    }
    body.append(list)
  }

  if (item.notes.length > 0) {
    body.append(el('h3', 'mn-notes-title', 'Notas'))
    const notes = el('ul', 'mn-notes')
    for (const note of item.notes) notes.append(el('li', undefined, note))
    body.append(notes)
  }

  wrapper.append(body)
  return wrapper
}

export function initMenu() {
  const root = document.querySelector<HTMLElement>('.mn')
  const dataNode = document.getElementById('mn-data')
  if (!root || !dataNode) return

  const catalog = (JSON.parse(dataNode.textContent ?? '{}').categories ?? []) as CatalogCategory[]
  const total = catalog.reduce((sum, category) => sum + category.items.length, 0)

  const bar = root.querySelector<HTMLElement>('[data-bar]')
  const rail = root.querySelector<HTMLElement>('[data-rail]')
  const input = root.querySelector<HTMLInputElement>('#mn-q')
  const searchForm = root.querySelector<HTMLFormElement>('[data-search-form]')
  const clearButton = root.querySelector<HTMLButtonElement>('[data-clear]')
  const status = root.querySelector<HTMLElement>('[data-status]')
  const pills = root.querySelector<HTMLElement>('[data-pills]')
  const empty = root.querySelector<HTMLElement>('[data-empty]')
  const emptyText = root.querySelector<HTMLElement>('[data-empty-text]')
  const onlyOffersLink = root.querySelector<HTMLElement>('[data-only-offers]')
  const filterButton = root.querySelector<HTMLButtonElement>('[data-open-filters]')
  const filterCount = root.querySelector<HTMLElement>('[data-filter-count]')
  const itemDialog = root.querySelector<HTMLDialogElement>('#mn-item-dialog')
  const itemBody = root.querySelector<HTMLElement>('#mn-item-body')
  const filterDialog = root.querySelector<HTMLDialogElement>('#mn-filter-dialog')
  if (!bar || !input || !status || !pills || !empty || !itemDialog || !itemBody || !filterDialog) {
    return
  }

  const tags = collectTags(catalog)
  const tagLabels = new Map(tags.map((tag) => [tag.key, tag.label]))

  const itemsById = new Map<string, CatalogItem>()
  const searchIndex = new Map<string, string>()
  const itemNodes = new Map<string, HTMLElement>()
  const sections = catalog.map((category) => {
    const section = root.querySelector<HTMLElement>(`[data-cat="${CSS.escape(category.anchor)}"]`)
    const list = section?.querySelector<HTMLElement>('[data-list]') ?? null
    const count = section?.querySelector<HTMLElement>('[data-count]') ?? null
    const chip = rail?.querySelector<HTMLElement>(`[data-chip="${CSS.escape(category.anchor)}"]`)
    for (const item of category.items) {
      itemsById.set(item.id, item)
      searchIndex.set(item.id, buildSearchIndex(item, category.title))
      const node = list?.querySelector<HTMLElement>(`[data-item="${CSS.escape(item.id)}"]`)
      if (node) itemNodes.set(item.id, node)
    }
    return { category, section, list, count, chip: chip ?? null }
  })

  let filters: MenuFilters = parseFilters(
    window.location.search,
    tags.map((tag) => tag.key),
  )
  let renderedSort: SortMode = 'menu'
  let urlTimer: number | undefined

  const sortInputs = [...filterDialog.querySelectorAll<HTMLInputElement>('input[name="mn-sort"]')]
  const offersInput = filterDialog.querySelector<HTMLInputElement>('[data-offers-input]')
  const tagInputs = [...filterDialog.querySelectorAll<HTMLInputElement>('[data-tag-input]')]
  const offerTotal = [...itemsById.values()].filter((item) => item.offerPercent !== null).length

  function syncBarHeight() {
    document.documentElement.style.setProperty('--mn-bar-h', `${bar!.offsetHeight}px`)
  }
  syncBarHeight()
  new ResizeObserver(syncBarHeight).observe(bar)

  function writeUrl() {
    window.clearTimeout(urlTimer)
    urlTimer = window.setTimeout(() => {
      const query = serializeFilters(filters)
      const next = `${window.location.pathname}${query ? `?${query}` : ''}${window.location.hash}`
      window.history.replaceState(null, '', next)
    }, 250)
  }

  function renderPills() {
    pills!.replaceChildren()
    const entries: Array<{ label: string; remove: () => void }> = []
    if (filters.onlyOffers) {
      entries.push({ label: 'Solo ofertas', remove: () => update({ onlyOffers: false }) })
    }
    for (const key of filters.tags) {
      entries.push({
        label: tagLabels.get(key) ?? key,
        remove: () => update({ tags: filters.tags.filter((tag) => tag !== key) }),
      })
    }
    if (filters.sort !== 'menu') {
      entries.push({
        label: filters.sort === 'price-asc' ? 'Precio: menor a mayor' : 'Precio: mayor a menor',
        remove: () => update({ sort: 'menu' }),
      })
    }
    for (const entry of entries) {
      const item = el('li')
      const button = el('button', 'mn-pill')
      button.type = 'button'
      button.setAttribute('aria-label', `Quitar filtro: ${entry.label}`)
      button.append(document.createTextNode(entry.label))
      button.insertAdjacentHTML(
        'beforeend',
        '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"></path></svg>',
      )
      button.addEventListener('click', entry.remove)
      item.append(button)
      pills!.append(item)
    }
    pills!.hidden = entries.length === 0
  }

  function syncInputs() {
    if (input!.value !== filters.query) input!.value = filters.query
    for (const radio of sortInputs) radio.checked = radio.value === filters.sort
    if (offersInput) offersInput.checked = filters.onlyOffers
    for (const checkbox of tagInputs) checkbox.checked = filters.tags.includes(checkbox.value)
    if (clearButton) clearButton.hidden = filters.query === ''
  }

  function apply() {
    let shown = 0
    for (const { category, section, list, count, chip } of sections) {
      let visible = 0
      for (const item of category.items) {
        const node = itemNodes.get(item.id)
        if (!node) continue
        const match = matchesFilters(item, searchIndex.get(item.id) ?? '', filters)
        node.hidden = !match
        if (match) visible += 1
      }
      if (list && renderedSort !== filters.sort) {
        const ordered = sortItems(category.items, filters.sort)
        list.append(...ordered.flatMap((item) => itemNodes.get(item.id) ?? []))
      }
      if (section) section.hidden = visible === 0
      if (chip) chip.hidden = visible === 0
      if (count) count.textContent = String(visible)
      shown += visible
    }
    renderedSort = filters.sort

    status!.textContent = countLabel(shown, total)
    empty!.hidden = shown > 0
    if (emptyText) {
      const query = filters.query.trim()
      emptyText.textContent = query
        ? `No hay productos para “${query}” con los filtros elegidos.`
        : 'No hay productos con los filtros elegidos.'
    }

    const active = hasActiveFilters(filters)
    if (onlyOffersLink)
      onlyOffersLink.hidden = filters.onlyOffers || offerTotal === 0 || shown === 0
    root!.querySelectorAll<HTMLElement>('[data-reset-all]').forEach((button) => {
      if (!button.closest('dialog') && !button.closest('[data-empty]'))
        button.hidden = !active || shown === 0
    })

    const badge =
      (filters.onlyOffers ? 1 : 0) + filters.tags.length + (filters.sort !== 'menu' ? 1 : 0)
    if (filterCount) {
      filterCount.hidden = badge === 0
      filterCount.textContent = String(badge)
    }
    const apply = filterDialog!.querySelector<HTMLElement>('[data-apply]')
    if (apply) {
      apply.textContent =
        shown === 0 ? 'Sin resultados' : shown === 1 ? 'Ver 1 resultado' : `Ver ${shown} resultados`
    }

    renderPills()
    syncInputs()
    writeUrl()
    observeSections()
  }

  function update(patch: Partial<MenuFilters>) {
    filters = { ...filters, ...patch }
    apply()
  }

  input.addEventListener('input', () => update({ query: input.value }))
  input.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && input.value) {
      event.preventDefault()
      update({ query: '' })
    }
  })
  searchForm?.addEventListener('submit', (event) => {
    event.preventDefault()
    input.blur()
  })
  clearButton?.addEventListener('click', () => {
    update({ query: '' })
    input.focus()
  })
  onlyOffersLink?.addEventListener('click', () => update({ onlyOffers: true }))
  root.querySelectorAll('[data-reset-all]').forEach((button) =>
    button.addEventListener('click', () => {
      filters = { ...DEFAULT_FILTERS }
      apply()
    }),
  )

  sortInputs.forEach((radio) =>
    radio.addEventListener('change', () => {
      if (radio.checked) update({ sort: radio.value as SortMode })
    }),
  )
  offersInput?.addEventListener('change', () => update({ onlyOffers: offersInput.checked }))
  tagInputs.forEach((checkbox) =>
    checkbox.addEventListener('change', () =>
      update({
        tags: tagInputs
          .filter((candidate) => candidate.checked)
          .map((candidate) => candidate.value),
      }),
    ),
  )

  filterButton?.addEventListener('click', () => filterDialog.showModal())
  filterDialog.querySelector('[data-apply]')?.addEventListener('click', () => filterDialog.close())

  root.addEventListener('click', (event) => {
    const target = event.target as Element
    const opener = target.closest<HTMLElement>('[data-open]')
    if (opener) {
      const item = itemsById.get(opener.dataset.open ?? '')
      if (!item) return
      itemBody.replaceChildren(buildDetail(item))
      itemDialog.setAttribute('aria-labelledby', 'mn-item-title')
      itemDialog.showModal()
      itemBody.scrollTop = 0
      return
    }
    if (target.closest('[data-close]')) {
      target.closest('dialog')?.close()
      return
    }
    if (target instanceof HTMLDialogElement) target.close()
  })

  enableSheetDrag(itemDialog)
  enableSheetDrag(filterDialog)

  let activeAnchor = catalog[0]?.anchor ?? ''
  let lockedUntil = 0

  function setActive(anchor: string) {
    if (!rail || anchor === activeAnchor) return
    activeAnchor = anchor
    for (const { chip, category } of sections) {
      if (!chip) continue
      if (category.anchor === anchor) {
        chip.setAttribute('aria-current', 'true')
        const left = chip.offsetLeft - (rail.clientWidth - chip.offsetWidth) / 2
        rail.scrollTo({ left, behavior: prefersReducedMotion() ? 'auto' : 'smooth' })
      } else {
        chip.removeAttribute('aria-current')
      }
    }
  }

  rail?.addEventListener('click', (event) => {
    const chip = (event.target as Element).closest<HTMLAnchorElement>('[data-chip]')
    if (!chip) return
    const anchor = chip.dataset.chip ?? ''
    const target = document.getElementById(anchor)
    if (!target) return
    event.preventDefault()
    lockedUntil = performance.now() + 900
    setActive(anchor)
    target.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' })
  })

  const visibleSections = new Set<string>()
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        const anchor = (entry.target as HTMLElement).dataset.cat ?? ''
        if (entry.isIntersecting) visibleSections.add(anchor)
        else visibleSections.delete(anchor)
      }
      if (performance.now() < lockedUntil) return
      const first = sections.find(({ category }) => visibleSections.has(category.anchor))
      if (first) setActive(first.category.anchor)
    },
    { rootMargin: `-${bar.offsetHeight + 16}px 0px -60% 0px` },
  )
  sections.forEach(({ section }) => section && observer.observe(section))

  function observeSections() {
    const first = sections.find(({ section }) => section && !section.hidden)
    if (
      first &&
      !sections.some(
        ({ category }) => category.anchor === activeAnchor && !isHidden(category.anchor),
      )
    ) {
      activeAnchor = ''
      setActive(first.category.anchor)
    }
  }

  function isHidden(anchor: string) {
    return sections.find(({ category }) => category.anchor === anchor)?.section?.hidden ?? true
  }

  apply()
}
