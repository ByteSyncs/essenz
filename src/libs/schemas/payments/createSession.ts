import { z } from 'astro/zod'

export const PLAN_IDS = ['basic', 'business', 'custom'] as const
const METHOD = ['mp'] as const // stripe coming soon

export const sessionSchema = z.object({
  plan_id: z.enum(PLAN_IDS),
  method: z.enum(METHOD),
})
