import { describe, expect, it } from 'vitest'
import { canAccessBranchSlug } from './branchAccess'

const accountSlugs = ['centro', 'norte', 'sur']

describe('canAccessBranchSlug', () => {
  it('lets an owner open any branch of their account', () => {
    const scope = { role: 'admin', organizationSlug: 'centro', accountSlugs }
    expect(canAccessBranchSlug(scope, 'centro')).toBe(true)
    expect(canAccessBranchSlug(scope, 'norte')).toBe(true)
    expect(canAccessBranchSlug({ ...scope, role: 'owner' }, 'sur')).toBe(true)
  })

  it('never lets an owner open a branch of another account', () => {
    const scope = { role: 'admin', organizationSlug: 'centro', accountSlugs }
    expect(canAccessBranchSlug(scope, 'otra-cuenta')).toBe(false)
  })

  it('keeps employees inside their own branch', () => {
    const scope = { role: 'employee', organizationSlug: 'norte', accountSlugs }
    expect(canAccessBranchSlug(scope, 'norte')).toBe(true)
    expect(canAccessBranchSlug(scope, 'centro')).toBe(false)
    expect(canAccessBranchSlug(scope, 'sur')).toBe(false)
  })

  it('denies missing slugs and users without a branch', () => {
    expect(
      canAccessBranchSlug({ role: 'admin', organizationSlug: 'centro', accountSlugs }, null),
    ).toBe(false)
    expect(
      canAccessBranchSlug({ role: 'admin', organizationSlug: 'centro', accountSlugs }, ''),
    ).toBe(false)
    expect(
      canAccessBranchSlug({ role: 'employee', organizationSlug: null, accountSlugs: [] }, 'centro'),
    ).toBe(false)
  })

  it('does not trust account slugs for a role that is not an owner', () => {
    const scope = { role: 'employee', organizationSlug: 'norte', accountSlugs }
    expect(canAccessBranchSlug(scope, 'centro')).toBe(false)
  })
})
