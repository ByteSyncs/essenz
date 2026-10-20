export type PlansId = 'basic' | 'business' | 'custom'

export type PlansMeta = {
  id: string
  name: string
  price: number | null
  currency: string | null
  maxBranches: number | null
  maxProducts: number | null
  lemon_variant_id: string | null
  features: Array<string>
}

export interface RegisterPayload {
  client_name: string
  company_name: string
  email: string
  password: string
  plan_id: string
}

export interface RegisterResponse {
  sessionToken?: string
  message?: string
  error?: string
  errors?: [
    {
      field: string
      message: string
    },
  ]
}

export interface UserSubscription {
  id: string
  organization_id: string
  plan_type: 'basic' | 'business' | 'custom'
  status: 'active' | 'past_due' | 'cancelled' | 'expired' | 'pending_payment'
  provider_subscription_id: string
  payment_provider: 'lemon_squeezy' | 'mercadopago' | 'stripe'
  current_period_end: string
}
