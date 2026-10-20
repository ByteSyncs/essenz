const OWNER_ROLES = new Set(['admin', 'owner'])
const OWNER_ONLY_RESOURCES = new Set(['stats', 'expenses', 'settings', 'team', 'categories'])

export function isOwnerRole(role: string | null | undefined) {
  return typeof role === 'string' && OWNER_ROLES.has(role)
}

export function canAccessOrganizationApi(role: string, method: string, pathSegments: string[]) {
  if (isOwnerRole(role)) return true

  const resource = pathSegments[3]
  const verb = method.toUpperCase()
  const isRead = verb === 'GET' || verb === 'HEAD'

  if (!resource) return isRead
  if (OWNER_ONLY_RESOURCES.has(resource)) return false
  if (resource === 'menu') return isRead
  if (resource === 'inventory') return verb !== 'DELETE'
  if (resource === 'orders') return true

  return isRead
}
