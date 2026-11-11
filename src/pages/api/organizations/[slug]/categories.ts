import type { APIRoute } from 'astro'
import { validateNewCategorie } from '../../../../libs/schemas/organizations/categories'
import { requireBranchStaff } from '../../../../libs/server/branchStaff'

export const POST: APIRoute = async ({ locals, request, params }) => {
  const { slug } = params

  if (!slug) {
    return Response.json({ success: false, error: 'slug_not_found' }, { status: 400 })
  }

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
    const authorization = await requireBranchStaff(locals, slug)
    if (!authorization.authorized) return authorization.response

    const { data: newCategory, error: insertError } = await authorization.db
      .from('categories')
      .insert({
        organization_id: authorization.organizationId,
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
    return Response.json({ success: false, error: 'internal_server_error' }, { status: 500 })
  }
}
