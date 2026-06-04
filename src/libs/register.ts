import { PLANS, type PlanType } from '../constants/suscriptions'
import type { PlansMeta, RegisterPayload, RegisterResponse } from '../types/plans'

export function getPlanMeta(planId: string | null): PlansMeta {
  const normalizedId = planId?.toLowerCase() as PlanType
  if (planId && PLANS[normalizedId]) return PLANS[normalizedId]
  return PLANS.basic
}

export function validateRegisterForm(data: RegisterPayload): Record<string, string> {
  const errors: Record<string, string> = {}

  if (!data.client_name.trim()) {
    errors.client_name = 'Ingresá tu nombre.'
  }

  if (!data.company_name.trim()) {
    errors.company_name = 'Ingresá el nombre de tu negocio.'
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!data.email || !emailRegex.test(data.email)) {
    errors.email = 'Ingresá un email válido.'
  }

  if (!data.password || data.password.length < 8) {
    errors.password = 'La contraseña debe tener al menos 8 caracteres.'
  }

  return errors
}

export function evaluatePasswordStrength(password: string): {
  score: number
  label: string
  color: string
  width: string
} {
  let score = 0
  if (password.length >= 8) score++
  if (/[A-Z]/.test(password)) score++
  if (/[0-9]/.test(password)) score++
  if (/[^A-Za-z0-9]/.test(password)) score++

  const levels = [
    { label: '', color: 'transparent', width: '0%' },
    { label: 'Débil', color: '#ef4444', width: '25%' },
    { label: 'Regular', color: '#f97316', width: '55%' },
    { label: 'Buena', color: '#eab308', width: '75%' },
    { label: 'Fuerte', color: '#22c55e', width: '100%' },
  ]

  const capped = Math.min(score, 4) as 0 | 1 | 2 | 3 | 4
  return { score: capped, ...levels[capped] }
}

export async function submitRegister(
  payload: RegisterPayload,
): Promise<{ ok: boolean; data: RegisterResponse }> {
  const res = await fetch('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const data: RegisterResponse = await res.json()
  return { ok: res.ok, data }
}
