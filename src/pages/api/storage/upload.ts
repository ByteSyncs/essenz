import type { APIRoute } from 'astro'
import { uploadOptimizedImage } from '../../../libs/storage'
import supabaseAdmin from '../../../libs/supabaseAdmin'

export const POST: APIRoute = async ({ request }) => {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const bucket = formData.get('bucket') as 'logos-url' | 'menu-items' | null
    const slug = formData.get('slug') as string | null

    if (!file || file.size === 0 || !bucket || !slug) {
      return Response.json(
        {
          success: false,
          error: 'missing_required_fields',
        },
        { status: 400 },
      )
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
