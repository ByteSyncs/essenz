import type { APIRoute } from 'astro'
import { validateNewCategorie } from '../../../../libs/schemas/organizations/categories'
import * as Sentry from '@sentry/astro'

export const POST: APIRoute = async ({ locals, request, params }) => {
  const { slug } = params

  if (!slug) {
    return Response.json({ success: false, error: 'slug_not_found' }, { status: 400 })
  }

  const supabase = locals.supabase
  let body
  try {
    body = await request.json()
  } catch (err) {
    return Response.json({ success: false, error: 'invalid_request_body' }, { status: 400 })
  }

  const validation = validateNewCategorie(body)
  if (!validation.success) {
    return Response.json({ success: false, errors: validation.errors }, { status: 422 })
  }

  const categorie = validation.data

  try {
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('id')
      .eq('slug', slug)
      .single()

    if (orgError || !org) {
      return Response.json({ success: false, error: 'organization_not_found' }, { status: 404 })
    }

    const { data: newCategory, error: insertError } = await supabase
      .from('categories')
      .insert({
        organization_id: org.id,
        title: categorie?.title,
        display_order: categorie?.display_order || 0,
      })
      .select()
      .single()

    if (insertError) {
      return Response.json(
        { success: false, error: insertError.message ?? 'internal_server_error' },
        { status: 400 },
      )
    }

    return Response.json({ success: true, data: newCategory }, { status: 201 })
  } catch (err) {
    console.error(err)
    // Sentry.captureException(err)
    return Response.json({ success: false, error: 'internal_server_error' }, { status: 500 })
  }
}
