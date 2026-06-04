declare namespace App {
  interface Locals {
    supabase: import('@supabase/supabase-js').SupabaseClient
    user: {
      id: string
      email?: string
    } | null
    subdomain: string | null
    tenantIdentifier: string | null
  }
}
