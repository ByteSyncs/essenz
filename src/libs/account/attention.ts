import type {
  AccountOverview,
  ActivityData,
  AttentionItem,
  AttentionKind,
  DashboardData,
} from '../../types/account'

const PRODUCT_LIMIT_WARNING_RATIO = 0.9

function branchPanel(slug: string, view: string) {
  return `/${slug}/admin/dashboard?view=${view}`
}

const DEFAULT_PERIOD_TEXT = 'en el período seleccionado'

export function buildAttention(
  overview: AccountOverview | null,
  activity: ActivityData | null,
  dashboard: DashboardData | null,
  periodText: string = DEFAULT_PERIOD_TEXT,
): AttentionItem[] {
  if (!overview) return []

  const items: AttentionItem[] = []
  const maxProducts = overview.plan.maxProductsPerBranch
  const lowByBranch = new Map(
    (activity?.lowStock.byBranch ?? []).map((entry) => [entry.branchSlug, entry.items]),
  )
  const performance = new Map((dashboard?.branches ?? []).map((branch) => [branch.slug, branch]))
  const accountHasOrders = (dashboard?.totals.orders ?? 0) > 0

  for (const branch of overview.branches) {
    if (!branch.menuActive) {
      items.push({
        id: `${branch.slug}:menu_inactive`,
        kind: 'menu_inactive',
        branchSlug: branch.slug,
        branchName: branch.name,
        message: 'La carta pública está desactivada y los clientes no pueden verla.',
        actionLabel: 'Revisar configuración',
        actionHref: branchPanel(branch.slug, 'settings'),
      })
    }

    const low = lowByBranch.get(branch.slug) ?? 0
    if (low > 0) {
      items.push({
        id: `${branch.slug}:low_stock`,
        kind: 'low_stock',
        branchSlug: branch.slug,
        branchName: branch.name,
        message: `${low} ${low === 1 ? 'insumo está' : 'insumos están'} en el stock mínimo o por debajo.`,
        actionLabel: 'Ver inventario',
        actionHref: branchPanel(branch.slug, 'inventory'),
      })
    }

    if (maxProducts !== null && branch.productCount >= maxProducts * PRODUCT_LIMIT_WARNING_RATIO) {
      items.push({
        id: `${branch.slug}:product_limit`,
        kind: 'product_limit',
        branchSlug: branch.slug,
        branchName: branch.name,
        message: `Usa ${branch.productCount} de ${maxProducts} productos que permite el plan.`,
        actionLabel: 'Ver carta',
        actionHref: branchPanel(branch.slug, 'menu'),
      })
    }

    const stats = performance.get(branch.slug)
    if (accountHasOrders && stats && stats.orders === 0) {
      items.push({
        id: `${branch.slug}:no_orders`,
        kind: 'no_orders',
        branchSlug: branch.slug,
        branchName: branch.name,
        message: `No registró pedidos ${periodText}.`,
        actionLabel: 'Ver estadísticas',
        actionHref: branchPanel(branch.slug, 'statistics'),
      })
    }

    if (!branch.hasContactInfo) {
      items.push({
        id: `${branch.slug}:no_contact`,
        kind: 'no_contact',
        branchSlug: branch.slug,
        branchName: branch.name,
        message: 'Faltan la dirección y los datos de contacto en el sitio público.',
        actionLabel: 'Completar datos',
        actionHref: branchPanel(branch.slug, 'settings'),
      })
    }
  }

  return items
}

const PRIORITY: Record<AttentionKind, number> = {
  menu_inactive: 0,
  low_stock: 1,
  product_limit: 2,
  no_orders: 3,
  no_contact: 4,
}

export function prioritizeAttention(items: AttentionItem[]): AttentionItem[] {
  return items
    .map((item, index) => ({ item, index }))
    .sort((a, b) => PRIORITY[a.item.kind] - PRIORITY[b.item.kind] || a.index - b.index)
    .map(({ item }) => item)
}

export interface BranchAttention {
  branchSlug: string
  branchName: string
  items: AttentionItem[]
}

export function groupAttentionByBranch(
  branches: { slug: string; name: string }[],
  items: AttentionItem[],
): { withItems: BranchAttention[]; clean: { branchSlug: string; branchName: string }[] } {
  const byBranch = new Map<string, AttentionItem[]>()
  for (const item of prioritizeAttention(items)) {
    byBranch.set(item.branchSlug, [...(byBranch.get(item.branchSlug) ?? []), item])
  }

  const withItems: BranchAttention[] = []
  const clean: { branchSlug: string; branchName: string }[] = []
  for (const branch of branches) {
    const list = byBranch.get(branch.slug)
    if (list?.length)
      withItems.push({ branchSlug: branch.slug, branchName: branch.name, items: list })
    else clean.push({ branchSlug: branch.slug, branchName: branch.name })
  }

  withItems.sort((a, b) => b.items.length - a.items.length)
  return { withItems, clean }
}
