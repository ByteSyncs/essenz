import type { PlansId, PlansMeta } from '../types/plans'

export const PLANS: Record<PlansId, PlansMeta> = {
  basic: {
    id: 'basic',
    name: 'Plan Basic',
    price: 15000,
    currency: 'ARS',
    maxBranches: 1,
    maxProducts: 100,
    lemon_variant_id: null,
    features: [
      'Sitio público para presentar tu local',
      'Plantilla visual y personalización de marca',
      'Menú digital con categorías, productos y ofertas',
      'Código QR para compartir el menú',
      'Soporte por email',
    ],
  },
  business: {
    id: 'business',
    name: 'Plan Business',
    price: 38500,
    currency: 'ARS',
    maxBranches: 5,
    maxProducts: 1000,
    lemon_variant_id: null,
    features: [
      'Todo lo incluido en Basic',
      'Comandas, estados de pedidos y cobros',
      'Inventario de insumos y seguimiento de stock',
      'Registro de gastos y estadísticas de ingresos, gastos y pedidos',
      'Soporte prioritario',
    ],
  },
  custom: {
    id: 'custom',
    name: 'Plan Custom',
    currency: null,
    price: null,
    maxBranches: null,
    maxProducts: null,
    lemon_variant_id: null,
    features: ['Todo lo de Business', 'Desarrollo a medida'],
  },
} as const

export type PlanType = keyof typeof PLANS
