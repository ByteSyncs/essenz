import { isOwnerRole } from '../permissions'

interface BranchAccessScope {
  role: string
  organizationSlug: string | null
  accountSlugs: string[]
}

export function canAccessBranchSlug(scope: BranchAccessScope, requestedSlug: string | null) {
  if (!requestedSlug) return false
  if (scope.organizationSlug && requestedSlug === scope.organizationSlug) return true
  return isOwnerRole(scope.role) && scope.accountSlugs.includes(requestedSlug)
}
