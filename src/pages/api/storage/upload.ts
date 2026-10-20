import type { APIRoute } from 'astro'
import { uploadOptimizedImage } from '../../../libs/storage'
import supabaseAdmin from '../../../libs/supabaseAdmin'
import { requireOrganizationOwner } from '../../../libs/server/requireOrganizationOwner'

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    if (!locals.user) {
      return Response.json({ success: false, error: 'unauthorized' }, { status: 401 })
    }
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const bucket = formData.get('bucket') as 'logos-url' | 'menu-items' | null
    const slug = formData.get('slug') as string | null

    if (!slug)
      return Response.json(
        {
          success: false,
          error: 'slug_not_found',
        },
        { status: 404 },
      )

    const authorization = await requireOrganizationOwner(locals, slug)
    if (!authorization.authorized) return authorization.response
    if (bucket !== 'logos-url' && bucket !== 'menu-items') {
      return Response.json({ success: false, error: 'invalid_bucket' }, { status: 400 })
    }

    if (!file || file.size === 0 || !bucket || !slug) {
      return Response.json(
        {
          success: false,
          error: 'missing_required_fields',
        },
        { status: 400 },
      )
    }

    if (
      file.size > 5 * 1024 * 1024 ||
      !['image/png', 'image/jpeg', 'image/webp'].includes(file.type)
    ) {
      return Response.json({ success: false, error: 'invalid_file' }, { status: 422 })
    }

    const url = await uploadOptimizedImage(file, bucket, slug, supabaseAdmin)

    return new Response(JSON.stringify({ success: true, url }), { status: 200 })
  } catch (err) {
    console.error(err)
    return new Response(JSON.stringify({ success: false, error: 'internal_server_error' }), {
      status: 500,
    })
  }
}
