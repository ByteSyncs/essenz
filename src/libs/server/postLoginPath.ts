import type { SupabaseClient } from '@supabase/supabase-js'
import { isOwnerRole } from '../permissions'

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/i

function relatedRecord<T>(record: T | T[] | null | undefined): T | null {
  return Array.isArray(record) ? (record[0] ?? null) : (record ?? null)
}

export async function resolvePostLoginPath(client: SupabaseClient, userId: string) {
  const { data: profile } = await client
    .from('profiles')
    .select('role, account_id, organizations (slug, account_id)')
    .eq('id', userId)
    .maybeSingle()

  if (!profile) return null

  const organization = relatedRecord<{ slug: string; account_id: string | null }>(
    profile.organizations,
  )
  const slug = organization?.slug
  if (!slug || !SLUG_PATTERN.test(slug)) return null

  const accountId = profile.account_id ?? organization?.account_id ?? null

  if (isOwnerRole(profile.role) && accountId) {
    const { count } = await client
      .from('organizations')
      .select('id', { count: 'exact', head: true })
      .eq('account_id', accountId)
    if ((count ?? 0) > 1) return '/account'
  }

  return `/${encodeURIComponent(slug)}/admin/dashboard`
}
