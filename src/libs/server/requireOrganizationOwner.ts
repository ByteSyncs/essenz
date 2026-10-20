import { isOwnerRole } from '../permissions'

interface OwnerRequestContext {
  supabase: App.Locals['supabase']
  user: App.Locals['user']
}

type OwnerAuthorization =
  | { authorized: true; organizationId: string }
  | { authorized: false; response: Response }

export async function requireOrganizationOwner(
  { supabase, user }: OwnerRequestContext,
  slug: string,
): Promise<OwnerAuthorization> {
  if (!user) {
    return {
      authorized: false,
      response: Response.json(
        { success: false, error: 'unauthorized' },
        { status: 401, headers: { 'Cache-Control': 'private, no-store' } },
      ),
    }
  }

  const { data: organization, error: organizationError } = await supabase
    .from('organizations')
    .select('id, account_id')
    .eq('slug', slug)
    .maybeSingle()

  if (organizationError) throw organizationError

  if (!organization) {
    return {
      authorized: false,
      response: Response.json(
        { success: false, error: 'organization_not_found' },
        { status: 404, headers: { 'Cache-Control': 'private, no-store' } },
      ),
    }
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('account_id, role')
    .eq('id', user.id)
    .maybeSingle()

  if (profileError) throw profileError

  if (
    !profile ||
    !organization.account_id ||
    !profile.account_id ||
    profile.account_id !== organization.account_id
  ) {
    return {
      authorized: false,
      response: Response.json(
        { success: false, error: 'organization_not_found' },
        { status: 404, headers: { 'Cache-Control': 'private, no-store' } },
      ),
    }
  }

  if (!isOwnerRole(profile.role)) {
    return {
      authorized: false,
      response: Response.json(
        { success: false, error: 'owner_access_required' },
        { status: 403, headers: { 'Cache-Control': 'private, no-store' } },
      ),
    }
  }

  return { authorized: true, organizationId: organization.id }
}
