import { isOwnerRole } from '../permissions'
import { hasActiveSubscription } from '../subscription'
import supabaseAdmin from '../supabaseAdmin'
import { privateJson } from './http'

interface AccountRequestContext {
  supabase: App.Locals['supabase']
  user: App.Locals['user']
}

export interface AccountBranch {
  id: string
  slug: string
  name: string
  created_at: string | null
}

export interface AccountSubscription {
  plan_type: string | null
  status: string
  current_period_end: string | null
}

export interface AccountContext {
  userId: string
  email: string | null
  accountId: string
  maxBranches: number | null
  ownerName: string | null
  branches: AccountBranch[]
  subscription: AccountSubscription | null
}

export type AccountAuthorization =
  | { authorized: true; context: AccountContext }
  | { authorized: false; response: Response }

interface Options {
  requireActiveSubscription?: boolean
}

function relatedRecord<T>(record: T | T[] | null | undefined): T | null {
  return Array.isArray(record) ? (record[0] ?? null) : (record ?? null)
}

function denied(error: string, status: number): AccountAuthorization {
  return { authorized: false, response: privateJson({ success: false, error }, status) }
}

export async function loadAccountSubscription(accountId: string, branchIds: string[]) {
  const columns = 'plan_type, status, current_period_end'

  const byAccount = await supabaseAdmin
    .from('subscriptions')
    .select(columns)
    .eq('account_id', accountId)
    .maybeSingle()
  if (byAccount.error) throw byAccount.error
  if (byAccount.data) return byAccount.data as AccountSubscription

  if (!branchIds.length) return null

  const byBranch = await supabaseAdmin
    .from('subscriptions')
    .select(columns)
    .in('organization_id', branchIds)
    .limit(1)
    .maybeSingle()
  if (byBranch.error) throw byBranch.error
  return (byBranch.data as AccountSubscription | null) ?? null
}

export async function requireAccountOwner(
  { supabase, user }: AccountRequestContext,
  options: Options = {},
): Promise<AccountAuthorization> {
  const requireActive = options.requireActiveSubscription ?? true

  if (!user) return denied('unauthorized', 401)

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role, account_id, client_name, organizations (account_id)')
    .eq('id', user.id)
    .maybeSingle()

  if (profileError) throw profileError
  if (!profile) return denied('profile_not_found', 404)
  if (!isOwnerRole(profile.role)) return denied('owner_access_required', 403)

  const organization = relatedRecord(profile.organizations)
  const accountId = profile.account_id ?? organization?.account_id ?? null
  if (!accountId) return denied('account_not_found', 403)

  const [accountResult, branchesResult] = await Promise.all([
    supabaseAdmin
      .from('accounts')
      .select('owner_id, max_branches')
      .eq('id', accountId)
      .maybeSingle(),
    supabaseAdmin
      .from('organizations')
      .select('id, slug, name, created_at')
      .eq('account_id', accountId)
      .order('created_at', { ascending: true }),
  ])

  if (accountResult.error) throw accountResult.error
  if (branchesResult.error) throw branchesResult.error

  const account = accountResult.data
  const branches = branchesResult.data
  if (!account || !branches?.length) return denied('account_not_found', 403)
  if (account.owner_id !== user.id) return denied('owner_access_required', 403)

  const subscription = await loadAccountSubscription(
    accountId,
    branches.map((branch) => branch.id),
  )

  if (requireActive && !hasActiveSubscription(subscription)) {
    return denied('subscription_required', 402)
  }

  return {
    authorized: true,
    context: {
      userId: user.id,
      email: user.email ?? null,
      accountId,
      maxBranches: account.max_branches ?? null,
      ownerName: profile.client_name ?? null,
      branches: branches as AccountBranch[],
      subscription,
    },
  }
}
