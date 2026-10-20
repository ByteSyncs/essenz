import { z } from 'astro/zod'

export const PLAN_IDS = ['basic', 'business'] as const
const METHOD = ['mp'] as const // stripe coming soon

export const sessionSchema = z.object({
  plan_id: z.enum(PLAN_IDS),
  method: z.enum(METHOD),
  slug: z.string(),
})

export function validateSession(input: unknown) {
  const result = sessionSchema.safeParse(input)
  if (!result.success) {
    return {
      success: false as const,
      errors: result.error.issues.map((err) => ({
        field: err.path[0],
        message: err.message,
      })),
    }
  }

  return {
    success: true,
    data: result.data,
  }
}
