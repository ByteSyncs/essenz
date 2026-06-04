import type { PlansId, PlansMeta } from '../types/plans'

export const PLANS: Record<PlansId, PlansMeta> = {
  basic: {
    id: 'basic',
    name: 'Plan Basic',
    price: 20,
    currency: 'USD',
    lemon_variant_id: import.meta.env.LEMON_VARIANT_BASIC,
    mp_plan_id: import.meta.env.MP_PLAN_BASIC_ID,
    features: ['Menú Online', 'Soporte vía Email'],
  },
  business: {
    id: 'business',
    name: 'Plan Business',
    price: 45,
    currency: 'USD',
    lemon_variant_id: import.meta.env.LEMON_VARIANT_BASIC,
    mp_plan_id: import.meta.env.MP_PLAN_BUSINESS_ID,
    features: ['Menú Online', 'Dominio Personalizado', 'Soporte 24/7'],
  },
  custom: {
    id: 'custom',
    name: 'Plan Custom',
    currency: null,
    price: null,
    lemon_variant_id: null,
    mp_plan_id: null,
    features: ['Todo lo de Business', 'Desarrollo a medida'],
  },
} as const

export type PlanType = keyof typeof PLANS
