import { describe, expect, it } from 'vitest'
import { canAccessOrganizationApi, isOwnerRole } from './permissions'

const path = (resource?: string) => [
  'api',
  'organizations',
  'centro',
  ...(resource ? [resource] : []),
]

describe('canAccessOrganizationApi', () => {
  it('lets owners use every resource', () => {
    expect(canAccessOrganizationApi('admin', 'DELETE', path('access'))).toBe(true)
    expect(canAccessOrganizationApi('owner', 'PATCH', path())).toBe(true)
  })

  it('lets staff operate the shift resources', () => {
    for (const resource of ['menu', 'categories', 'inventory', 'expenses', 'orders', 'settings']) {
      expect(canAccessOrganizationApi('employee', 'POST', path(resource))).toBe(true)
      expect(canAccessOrganizationApi('employee', 'GET', path(resource))).toBe(true)
    }
  })

  it('keeps statistics read-only for staff', () => {
    expect(canAccessOrganizationApi('employee', 'GET', path('stats'))).toBe(true)
    expect(canAccessOrganizationApi('employee', 'POST', path('stats'))).toBe(false)
  })

  it('never lets staff manage access or change the branch itself', () => {
    expect(canAccessOrganizationApi('employee', 'GET', path('access'))).toBe(false)
    expect(canAccessOrganizationApi('employee', 'PUT', path('access'))).toBe(false)
    expect(canAccessOrganizationApi('employee', 'PATCH', path())).toBe(false)
    expect(canAccessOrganizationApi('employee', 'GET', path())).toBe(true)
  })

  it('recognises owner roles only', () => {
    expect(isOwnerRole('admin')).toBe(true)
    expect(isOwnerRole('employee')).toBe(false)
    expect(isOwnerRole(null)).toBe(false)
  })
})
