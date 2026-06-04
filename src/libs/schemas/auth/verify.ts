import { z } from 'astro/zod'
import { PLAN_IDS } from './signUp'

export const verifyEmailSchema = z.object({
  email: z.string(),
  code: z.string().min(6, { message: 'Code invalid' }).max(6, { message: 'Code invalid' }),
  plan: z.enum(PLAN_IDS, { message: 'Plan invalid' }),
})

export type VerifyEmail = z.infer<typeof verifyEmailSchema>

export function validateVerifyEmail(input: unknown) {
  const result = verifyEmailSchema.safeParse(input)

  if (!result.success) {
    return {
      success: false as const,
      errors: result.error.issues.map((e) => ({
        field: e.path[0],
        message: e.message,
      })),
    }
  }

  return {
    success: true,
    data: result.data,
  }
}
