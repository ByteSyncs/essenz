import { beforeEach, describe, expect, it, vi } from 'vitest'

const state = vi.hoisted(() => ({
  organization: null as { id: string; account_id: string | null } | null,
  profile: null as {
    role: string
    account_id: string | null
    organization_id: string | null
  } | null,
  access: null as { enabled: boolean; staff_user_id: string | null } | null,
}))

vi.mock('../supabaseAdmin', () => {
  function table(name: string) {
    const chain = {
      select: () => chain,
      eq: () => chain,
      maybeSingle: async () => ({
        data:
          name === 'organizations'
            ? state.organization
            : name === 'profiles'
              ? state.profile
              : state.access,
        error: null,
      }),
    }
    return chain
  }
  return { default: { from: table, tag: 'admin' } }
})

import { requireBranchStaff } from './branchStaff'

const ORG = { id: 'org-1', account_id: 'acc-1' }
const user = { id: 'user-1' } as App.Locals['user']
const userClient = { tag: 'user' } as unknown as App.Locals['supabase']

async function run(currentUser: App.Locals['user'] = user) {
  return requireBranchStaff({ supabase: userClient, user: currentUser }, 'centro')
}

async function status(result: Awaited<ReturnType<typeof run>>) {
  if (result.authorized) return 200
  return result.response.status
}

describe('requireBranchStaff', () => {
  beforeEach(() => {
    state.organization = ORG
    state.profile = null
    state.access = null
  })

  it('rejects anonymous requests', async () => {
    expect(await status(await run(null))).toBe(401)
  })

  it('lets an owner of the account use their own client', async () => {
    state.profile = { role: 'admin', account_id: 'acc-1', organization_id: 'other' }
    const result = await run()
    expect(result.authorized && result.isOwner).toBe(true)
    expect(result.authorized && (result.db as unknown as { tag: string }).tag).toBe('user')
  })

  it('hides branches of other accounts from owners', async () => {
    state.profile = { role: 'owner', account_id: 'acc-2', organization_id: 'x' }
    expect(await status(await run())).toBe(404)
  })

  it('lets enabled staff operate their own branch with the server client', async () => {
    state.profile = { role: 'employee', account_id: 'acc-1', organization_id: 'org-1' }
    state.access = { enabled: true, staff_user_id: 'user-1' }
    const result = await run()
    expect(result.authorized && result.isOwner).toBe(false)
    expect(result.authorized && (result.db as unknown as { tag: string }).tag).toBe('admin')
  })

  it('keeps staff out of other branches', async () => {
    state.profile = { role: 'employee', account_id: 'acc-1', organization_id: 'org-9' }
    state.access = { enabled: true, staff_user_id: 'user-1' }
    expect(await status(await run())).toBe(404)
  })

  it('revokes staff when access is disabled or the credentials were replaced', async () => {
    state.profile = { role: 'employee', account_id: 'acc-1', organization_id: 'org-1' }
    state.access = { enabled: false, staff_user_id: null }
    expect(await status(await run())).toBe(403)
    state.access = { enabled: true, staff_user_id: 'someone-else' }
    expect(await status(await run())).toBe(403)
    state.access = null
    expect(await status(await run())).toBe(403)
  })
})
