import { beforeEach, describe, expect, it, vi } from 'vitest'

const state = vi.hoisted(() => ({
  account: null as { owner_id: string; max_branches: number } | null,
  branches: [] as { id: string; slug: string; name: string; created_at: string }[],
  subscription: null as { plan_type: string; status: string; current_period_end: string } | null,
}))

vi.mock('../supabaseAdmin', () => {
  function table(name: string) {
    const chain = {
      select: () => chain,
      eq: () => chain,
      in: () => chain,
      order: () => chain,
      limit: () => chain,
      maybeSingle: async () => ({
        data: name === 'accounts' ? state.account : state.subscription,
        error: null,
      }),
      then: (resolve: (value: unknown) => unknown) =>
        resolve({ data: name === 'organizations' ? state.branches : [], error: null }),
    }
    return chain
  }
  return { default: { from: table } }
})

import { requireAccountOwner } from './requireAccountOwner'

const USER_ID = '00000000-0000-4000-8000-0000000000a1'
const ACCOUNT_ID = '00000000-0000-4000-8000-0000000000b1'
const FUTURE = new Date(Date.now() + 20 * 86_400_000).toISOString()
const PAST = new Date(Date.now() - 86_400_000).toISOString()

function client(profile: unknown) {
  return {
    from: () => ({
      select: () => ({
        eq: () => ({ maybeSingle: async () => ({ data: profile, error: null }) }),
      }),
    }),
  } as never
}

async function bodyOf(response: Response) {
  return (await response.json()) as { success: boolean; error: string }
}

beforeEach(() => {
  state.account = { owner_id: USER_ID, max_branches: 5 }
  state.branches = [
    { id: 'c1', slug: 'centro', name: 'Centro', created_at: '2026-01-01T00:00:00Z' },
    { id: 'c2', slug: 'norte', name: 'Norte', created_at: '2026-02-01T00:00:00Z' },
  ]
  state.subscription = { plan_type: 'business', status: 'active', current_period_end: FUTURE }
})

describe('requireAccountOwner', () => {
  const owner = {
    role: 'admin',
    account_id: ACCOUNT_ID,
    client_name: 'Ana',
    organizations: { account_id: ACCOUNT_ID },
  }

  it('rejects requests without a session', async () => {
    const result = await requireAccountOwner({ supabase: client(owner), user: null })
    expect(result.authorized).toBe(false)
    if (!result.authorized) {
      expect(result.response.status).toBe(401)
      expect((await bodyOf(result.response)).error).toBe('unauthorized')
    }
  })

  it('rejects employees', async () => {
    const result = await requireAccountOwner({
      supabase: client({ ...owner, role: 'employee' }),
      user: { id: USER_ID },
    })
    expect(result.authorized).toBe(false)
    if (!result.authorized) {
      expect(result.response.status).toBe(403)
      expect((await bodyOf(result.response)).error).toBe('owner_access_required')
    }
  })

  it('rejects an admin profile that points at an account they do not own', async () => {
    state.account = { owner_id: 'someone-else', max_branches: 5 }
    const result = await requireAccountOwner({ supabase: client(owner), user: { id: USER_ID } })
    expect(result.authorized).toBe(false)
    if (!result.authorized) {
      expect(result.response.status).toBe(403)
      expect((await bodyOf(result.response)).error).toBe('owner_access_required')
    }
  })

  it('rejects profiles without an account', async () => {
    const result = await requireAccountOwner({
      supabase: client({
        role: 'admin',
        account_id: null,
        client_name: 'Ana',
        organizations: { account_id: null },
      }),
      user: { id: USER_ID },
    })
    expect(result.authorized).toBe(false)
    if (!result.authorized) expect((await bodyOf(result.response)).error).toBe('account_not_found')
  })

  it('rejects when the profile does not exist', async () => {
    const result = await requireAccountOwner({ supabase: client(null), user: { id: USER_ID } })
    expect(result.authorized).toBe(false)
    if (!result.authorized) expect(result.response.status).toBe(404)
  })

  it('authorizes the registered owner and returns only their account', async () => {
    const result = await requireAccountOwner({ supabase: client(owner), user: { id: USER_ID } })
    expect(result.authorized).toBe(true)
    if (result.authorized) {
      expect(result.context.accountId).toBe(ACCOUNT_ID)
      expect(result.context.maxBranches).toBe(5)
      expect(result.context.branches.map((branch) => branch.slug)).toEqual(['centro', 'norte'])
    }
  })

  it('requires an active subscription unless told otherwise', async () => {
    state.subscription = { plan_type: 'business', status: 'active', current_period_end: PAST }
    const blocked = await requireAccountOwner({ supabase: client(owner), user: { id: USER_ID } })
    expect(blocked.authorized).toBe(false)
    if (!blocked.authorized) {
      expect(blocked.response.status).toBe(402)
      expect((await bodyOf(blocked.response)).error).toBe('subscription_required')
    }

    const relaxed = await requireAccountOwner(
      { supabase: client(owner), user: { id: USER_ID } },
      { requireActiveSubscription: false },
    )
    expect(relaxed.authorized).toBe(true)
  })

  it('treats a missing subscription as inactive', async () => {
    state.subscription = null
    const result = await requireAccountOwner({ supabase: client(owner), user: { id: USER_ID } })
    expect(result.authorized).toBe(false)
    if (!result.authorized) expect(result.response.status).toBe(402)
  })

  it('marks every response as private', async () => {
    const result = await requireAccountOwner({ supabase: client(null), user: { id: USER_ID } })
    if (!result.authorized) {
      expect(result.response.headers.get('Cache-Control')).toBe('private, no-store')
    }
  })
})
