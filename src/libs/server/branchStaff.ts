import type { SupabaseClient } from '@supabase/supabase-js'
import { isOwnerRole } from '../permissions'
import supabaseAdmin from '../supabaseAdmin'
import { privateJson } from './http'

interface StaffRequestContext {
  supabase: App.Locals['supabase']
  user: App.Locals['user']
}

export type BranchStaffAuthorization =
  | {
      authorized: true
      organizationId: string
      isOwner: boolean
      db: SupabaseClient
    }
  | { authorized: false; response: Response }

function denied(error: string, status: number): BranchStaffAuthorization {
  return { authorized: false, response: privateJson({ success: false, error }, status) }
}

export async function requireBranchStaff(
  { supabase, user }: StaffRequestContext,
  slug: string,
): Promise<BranchStaffAuthorization> {
  if (!user) return denied('unauthorized', 401)

  const [organizationResult, profileResult] = await Promise.all([
    supabaseAdmin.from('organizations').select('id, account_id').eq('slug', slug).maybeSingle(),
    supabaseAdmin
      .from('profiles')
      .select('role, account_id, organization_id')
      .eq('id', user.id)
      .maybeSingle(),
  ])

  if (organizationResult.error) throw organizationResult.error
  if (profileResult.error) throw profileResult.error

  const organization = organizationResult.data
  const profile = profileResult.data

  if (!organization || !profile) return denied('organization_not_found', 404)

  if (isOwnerRole(profile.role)) {
    if (!organization.account_id || profile.account_id !== organization.account_id) {
      return denied('organization_not_found', 404)
    }
    return { authorized: true, organizationId: organization.id, isOwner: true, db: supabase }
  }

  if (profile.organization_id !== organization.id) return denied('organization_not_found', 404)

  const { data: access, error: accessError } = await supabaseAdmin
    .from('branch_access')
    .select('enabled, staff_user_id')
    .eq('organization_id', organization.id)
    .maybeSingle()

  if (accessError) throw accessError

  if (!access?.enabled || access.staff_user_id !== user.id) {
    return denied('access_revoked', 403)
  }

  return {
    authorized: true,
    organizationId: organization.id,
    isOwner: false,
    db: supabaseAdmin,
  }
}
