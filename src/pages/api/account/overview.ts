import type { APIRoute } from 'astro'
import * as Sentry from '@sentry/astro'
import { PLANS } from '../../../constants/suscriptions'
import { hasActiveSubscription } from '../../../libs/subscription'
import { privateJson } from '../../../libs/server/http'
import { requireAccountOwner } from '../../../libs/server/requireAccountOwner'
import supabaseAdmin from '../../../libs/supabaseAdmin'
import type { AccountOverview, SubscriptionStatus } from '../../../types/account'

const KNOWN_STATUSES: SubscriptionStatus[] = [
  'active',
  'past_due',
  'unpaid',
  'cancelled',
  'expired',
  'pending_payment',
]

interface SettingsRow {
  organization_id: string
  menu_active: boolean | null
  address: string | null
  contact_phone: string | null
  contact_email: string | null
}

function filled(value: string | null | undefined) {
  return Boolean(value && value.trim())
}

export const GET: APIRoute = async ({ locals }) => {
  try {
    const authorization = await requireAccountOwner(locals, { requireActiveSubscription: false })
    if (!authorization.authorized) return authorization.response

    const { maxBranches, branches, subscription, ownerName, email } = authorization.context
    const branchIds = branches.map((branch) => branch.id)

    const [settingsResult, employeesResult, productCounts] = await Promise.all([
      supabaseAdmin
        .from('organization_settings')
        .select('organization_id, menu_active, address, contact_phone, contact_email')
        .in('organization_id', branchIds),
      supabaseAdmin
        .from('profiles')
        .select('organization_id')
        .in('organization_id', branchIds)
        .eq('role', 'employee'),
      Promise.all(
        branchIds.map((id) =>
          supabaseAdmin
            .from('products')
            .select('id', { count: 'exact', head: true })
            .eq('organization_id', id),
        ),
      ),
    ])

    if (settingsResult.error) throw settingsResult.error
    if (employeesResult.error) throw employeesResult.error
    for (const result of productCounts) if (result.error) throw result.error

    const settings = new Map(
      ((settingsResult.data ?? []) as SettingsRow[]).map((row) => [row.organization_id, row]),
    )
    const employees = new Map<string, number>()
    for (const row of employeesResult.data ?? []) {
      employees.set(row.organization_id, (employees.get(row.organization_id) ?? 0) + 1)
    }

    const planMeta = subscription?.plan_type
      ? PLANS[subscription.plan_type as keyof typeof PLANS]
      : undefined
    const status: SubscriptionStatus =
      subscription && KNOWN_STATUSES.includes(subscription.status as SubscriptionStatus)
        ? (subscription.status as SubscriptionStatus)
        : 'none'
    const accountLimit = maxBranches
    const mainBranch = branches[0]

    const overview: AccountOverview = {
      business: { name: mainBranch.name, ownerName, ownerEmail: email },
      plan: {
        id: planMeta?.id ?? null,
        name: planMeta?.name ?? 'Sin plan activo',
        status,
        currentPeriodEnd: subscription?.current_period_end ?? null,
        maxBranches: planMeta ? (planMeta.maxBranches ?? accountLimit) : accountLimit,
        maxProductsPerBranch: planMeta?.maxProducts ?? null,
        billingPath: hasActiveSubscription(subscription)
          ? null
          : `/${mainBranch.slug}/admin/billing/upgrade`,
      },
      branches: branches.map((branch, index) => {
        const row = settings.get(branch.id)
        return {
          id: branch.id,
          slug: branch.slug,
          name: branch.name,
          isMain: index === 0,
          menuActive: row?.menu_active ?? true,
          hasContactInfo:
            filled(row?.address) && (filled(row?.contact_phone) || filled(row?.contact_email)),
          productCount: productCounts[index].count ?? 0,
          employeeCount: employees.get(branch.id) ?? 0,
        }
      }),
    }

    return privateJson({ success: true, data: overview })
  } catch (err) {
    Sentry.captureException(err, { tags: { mechanism: 'account_overview' } })
    return privateJson({ success: false, error: 'internal_server_error' }, 500)
  }
}
