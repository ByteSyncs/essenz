import type { APIRoute } from 'astro'
import { validateSetup } from '../../../libs/schemas/auth/setup'

export const POST: APIRoute = async ({ locals, request }) => {
  let rawData: Record<string, any>
  let logoFile: File | null = null

  try {
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
    return new Response(JSON.stringify({ success: false, errors: validation.errors }), {
      status: 422,
    })
  }

  try {
    const { userId, organizationId, tagline, theme, domainType, brandColors } = validation.data

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

    if (domainType === 'subdomain' && orgData.slug) {
      orgPayload.custom_domain = `${orgData.slug}.bytesyncs.com`
    }

    const { error: orgUpdateError } = await locals.supabase
      .from('organizations')
      .update(orgPayload)
      .eq('id', organizationId)

    if (orgUpdateError) throw orgUpdateError

    const { error: profileError } = await locals.supabase
      .from('profiles')
      .update({ is_setup_complete: true })
      .eq('id', userId)

    if (profileError) throw profileError

    return new Response(JSON.stringify({ success: true, slug: orgData.slug }), { status: 200 })
  } catch (err) {
    console.error(err)
    return new Response(JSON.stringify({ success: false, error: 'internal_server_error' }), {
      status: 500,
    })
  }
}
