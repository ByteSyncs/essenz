import type { APIRoute } from 'astro'
import { requireOrganizationOwner } from '../../../../../libs/server/requireOrganizationOwner'
import supabaseAdmin from '../../../../../libs/supabaseAdmin'

const VALID_RANGES = ['today', '7d', '30d']

export const GET: APIRoute = async ({ locals, params, url }) => {
  const { slug } = params
  if (!slug) {
    return Response.json({ success: false, error: 'slug_not_found' }, { status: 400 })
  }

  const range = url.searchParams.get('range') ?? '7d'
  const safeRange = VALID_RANGES.includes(range) ? range : '7d'

  try {
    const authorization = await requireOrganizationOwner(locals, slug)
    if (!authorization.authorized) return authorization.response

    const { data, error } = await supabaseAdmin.rpc('get_organization_stats', {
      p_org_slug: slug,
      p_range: safeRange,
    })

    if (error) throw error

    if (data?.error) {
      return Response.json({ success: false, error: data.error }, { status: 404 })
    }

    return Response.json(
      {
        success: true,
        stats: data,
        meta: {
          server_time: new Date().toISOString(),
        },
      },
      { headers: { 'Cache-Control': 'private, no-store' } },
    )
  } catch (err) {
    console.error(err)

    return Response.json(
      {
        success: false,
        error: 'internal_server_error',
        meta: {
          server_time: new Date().toISOString(),
        },
      },
      {
        status: 500,
      },
    )
  }
}
