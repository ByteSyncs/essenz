const RESERVED_SLUGS = new Set([
  'admin',
  'auth',
  'error',
  'api',
  'checkout',
  'plans',
  'demo-modern',
  'demo-minimalist',
  'menu-unavailable',
  'menu',
  '404',
  '500',
  'favicon',
  'robots',
  'sitemap',
  'sitemap-index',
  'invite',
  'www',
  'app',
  'billing',
  'dashboard',
  'login',
  'register',
  'sign-in',
  'sign-up',
  'static',
  'assets',
  'public',
  'support',
  'help',
  'about',
  'contact',
  'terms',
  'privacy',
  'staff',
])

export function slugify(name: string) {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
    .replace(/-+$/g, '')
}

export function isReservedSlug(slug: string) {
  return slug.length < 2 || RESERVED_SLUGS.has(slug)
}

export async function generateUniqueSlug(name: string, exists: (slug: string) => Promise<boolean>) {
  const base = slugify(name) || 'negocio'

  if (!isReservedSlug(base) && !(await exists(base))) return base

  for (let suffix = 2; suffix <= 50; suffix++) {
    const candidate = `${base}-${suffix}`
    if (!isReservedSlug(candidate) && !(await exists(candidate))) return candidate
  }

  return `${base}-${Math.random().toString(36).slice(2, 7)}`
}
