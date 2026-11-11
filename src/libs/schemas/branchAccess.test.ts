import { describe, expect, it } from 'vitest'
import { isAccessToken, validateAccessUpdate } from './branchAccess'

describe('validateAccessUpdate', () => {
  it('accepts a password between 8 and 72 characters', () => {
    expect(validateAccessUpdate({ password: '12345678' }).success).toBe(true)
    expect(validateAccessUpdate({ password: 'a'.repeat(72) }).success).toBe(true)
  })

  it('rejects short, long and non-string passwords', () => {
    expect(validateAccessUpdate({ password: '1234567' }).success).toBe(false)
    expect(validateAccessUpdate({ password: 'a'.repeat(73) }).success).toBe(false)
    expect(validateAccessUpdate({ password: 12345678 }).success).toBe(false)
  })

  it('accepts flags and rejects wrong types', () => {
    const ok = validateAccessUpdate({ enabled: false, staffCanEditSettings: true })
    expect(ok).toEqual({ success: true, data: { enabled: false, staffCanEditSettings: true } })
    expect(validateAccessUpdate({ enabled: 'yes' }).success).toBe(false)
    expect(validateAccessUpdate({ staffCanEditSettings: 1 }).success).toBe(false)
  })

  it('rejects empty and non-object bodies', () => {
    expect(validateAccessUpdate({}).success).toBe(false)
    expect(validateAccessUpdate(null).success).toBe(false)
    expect(validateAccessUpdate([]).success).toBe(false)
  })

  it('ignores unknown fields', () => {
    const result = validateAccessUpdate({ enabled: true, role: 'admin' })
    expect(result).toEqual({ success: true, data: { enabled: true } })
  })
})

describe('isAccessToken', () => {
  it('only accepts UUIDs', () => {
    expect(isAccessToken('3f2b8c1e-5a4d-4e6f-9b0a-1c2d3e4f5a6b')).toBe(true)
    expect(isAccessToken('not-a-token')).toBe(false)
    expect(isAccessToken('')).toBe(false)
    expect(isAccessToken(undefined)).toBe(false)
  })
})
