import type { SupabaseClient } from '@supabase/supabase-js'
import { buildStaffEmail } from '../staffEmail'

interface ProvisionInput {
  organizationId: string
  accountId: string | null
  slug: string
  password: string
  createdBy: string
}

export async function provisionStaffUser(admin: SupabaseClient, input: ProvisionInput) {
  const username = `turno-${crypto.randomUUID().replace(/-/g, '').slice(0, 10)}`

  const { data, error } = await admin.auth.admin.createUser({
    email: buildStaffEmail(username, input.slug),
    password: input.password,
    email_confirm: true,
  })

  if (error || !data.user) throw error ?? new Error('failed_to_create_staff_user')

  const userId = data.user.id

  const { error: profileError } = await admin.from('profiles').insert({
    id: userId,
    organization_id: input.organizationId,
    account_id: input.accountId,
    client_name: 'Personal de turno',
    username,
    role: 'employee',
    is_setup_complete: true,
    created_by: input.createdBy,
  })

  if (profileError) {
    await admin.auth.admin.deleteUser(userId).catch(() => undefined)
    throw profileError
  }

  return userId
}

export async function revokeStaffUser(admin: SupabaseClient, userId: string | null) {
  if (!userId) return
  await admin.from('profiles').delete().eq('id', userId)
  await admin.auth.admin.deleteUser(userId).catch(() => undefined)
}
