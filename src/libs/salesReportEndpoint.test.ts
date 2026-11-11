import { beforeEach, describe, expect, it, vi } from 'vitest'

interface QueryState {
  table: string
  columns?: string
  filters: Array<[string, unknown]>
  range?: [number, number]
}

const state = vi.hoisted(() => ({
  queries: [] as QueryState[],
  data: [] as unknown[],
  error: null as unknown,
  authorization: null as Response | null,
}))

vi.mock('./supabaseAdmin', () => ({
  default: {
    from(table: string) {
      const query: QueryState = { table, filters: [] }
      const builder = {
        select(columns: string) {
          query.columns = columns
          return builder
        },
        eq(column: string, value: unknown) {
          query.filters.push([column, value])
          return builder
        },
        neq(column: string, value: unknown) {
          query.filters.push([column, value])
          return builder
        },
        gte(column: string, value: unknown) {
          query.filters.push([column, value])
          return builder
        },
        lt(column: string, value: unknown) {
          query.filters.push([column, value])
          return builder
        },
        order: () => builder,
        range(start: number, end: number) {
          query.range = [start, end]
          state.queries.push(query)
          return Promise.resolve({ data: state.data, error: state.error })
        },
      }
      return builder
    },
  },
}))

vi.mock('./server/branchStaff', () => ({
  requireBranchStaff: async () =>
    state.authorization
      ? { authorized: false, response: state.authorization }
      : { authorized: true, organizationId: 'org-1', isOwner: false, db: {} },
}))

vi.mock('@sentry/astro', () => ({ captureException: vi.fn() }))

import { GET } from '../pages/api/organizations/[slug]/sales/index'

const call = (query = '') =>
  GET({
    params: { slug: 'cafe-centro' },
    locals: {},
    url: new URL(`http://localhost/api/organizations/cafe-centro/sales${query}`),
  } as unknown as Parameters<typeof GET>[0])

describe('GET /sales', () => {
  beforeEach(() => {
    state.queries = []
    state.data = []
    state.error = null
    state.authorization = null
  })

  it('returns an empty report for the current Argentina day by default', async () => {
    const response = await call()
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body).toMatchObject({
      success: true,
      data: { date: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/), tickets: [] },
    })
    expect(state.queries[0].filters).toContainEqual(['org_slug', 'cafe-centro'])
    expect(state.queries[0].filters).toContainEqual(['status', 'cancelled'])
  })

  it('filters by an Argentina calendar day and inclusive hour range', async () => {
    const response = await call('?date=2026-11-10&from=9&to=17')
    expect(response.status).toBe(200)
    expect(state.queries[0].filters).toContainEqual(['created_at', '2026-11-10T12:00:00.000Z'])
    expect(state.queries[0].filters).toContainEqual(['created_at', '2026-11-10T21:00:00.000Z'])
  })

  it('rejects invalid dates and hour ranges before querying sales', async () => {
    expect((await call('?date=2026-02-29')).status).toBe(422)
    expect((await call('?date=2026-11-10&from=18&to=17')).status).toBe(422)
    expect((await call('?date=2026-11-10&from=25')).status).toBe(422)
    expect(state.queries).toHaveLength(0)
  })

  it('honors branch authorization', async () => {
    state.authorization = Response.json(
      { success: false, error: 'access_revoked' },
      { status: 403 },
    )
    const response = await call('?date=2026-11-10')
    expect(response.status).toBe(403)
    expect(state.queries).toHaveLength(0)
  })

  it('normalizes database failures without returning their details', async () => {
    state.error = { message: 'private database detail', code: 'XX000' }
    const response = await call('?date=2026-11-10')
    expect(response.status).toBe(500)
    expect(await response.json()).toMatchObject({
      success: false,
      error: 'internal_server_error',
    })
  })
})
