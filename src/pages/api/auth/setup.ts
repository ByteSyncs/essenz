import type { APIRoute } from 'astro'
import { validateSetup } from '../../../libs/schemas/auth/setup'

export const POST: APIRoute = async ({ locals, request }) => {
  let rawData: Record<string, any>
  let logoFile: File | null = null

  try {
    if (!locals.user) {
      return Response.json({ success: false, error: 'unauthorized' }, { status: 401 })
    }
    const formData = await request.formData()
    rawData = Object.fromEntries(formData)
    const logo = formData.get('logoFile') as File | null
    logoFile = logo && logo.size > 0 ? logo : null
  } catch (err) {
    console.error(err)
    return new Response(JSON.stringify({ success: false, error: 'invalid_request_body' }), {
      status: 400,
    })
  }

  const validation = validateSetup({ ...rawData, logoFile })
  if (!validation.success) {
    console.error(validation.errors)
    return new Response(JSON.stringify({ success: false, errors: validation.errors }), {
      status: 422,
    })
  }

  try {
    const { userId, organizationId, tagline, theme, brandColors } = validation.data
    const user = locals.user

    if (!user || user.id !== userId) {
      return new Response(JSON.stringify({ success: false, error: 'unauthorized' }), {
        status: 401,
      })
    }

    const { data: profile, error: profileError } = await locals.supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .maybeSingle()

    if (profileError) throw profileError
    if (!profile || profile.organization_id !== organizationId) {
      return new Response(JSON.stringify({ success: false, error: 'forbidden' }), {
        status: 403,
      })
    }

    const { data: orgData, error: orgError } = await locals.supabase
      .from('organizations')
      .select('slug')
      .eq('id', organizationId)
      .single()

    if (orgError) throw orgError

    const orgPayload: Record<string, any> = {
      tagline,
      theme,
      brand_colors: brandColors,
    }

    const { error: orgUpdateError } = await locals.supabase
      .from('organizations')
      .update(orgPayload)
      .eq('id', organizationId)

    if (orgUpdateError) throw orgUpdateError

    const { error: updateProfileError } = await locals.supabase
      .from('profiles')
      .update({ is_setup_complete: true })
      .eq('id', userId)

    if (updateProfileError) throw updateProfileError

    return new Response(JSON.stringify({ success: true, slug: orgData.slug }), { status: 200 })
  } catch (err) {
    console.error(err)
    return new Response(JSON.stringify({ success: false, error: 'internal_server_error' }), {
      status: 500,
    })
  }
}
