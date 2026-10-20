import { z } from 'astro/zod'

export const PLAN_IDS = ['basic', 'business'] as const

const RegisterSchema = z.object({
  email: z.email({ message: 'Invalid email' }),
  password: z.string().min(8, { message: 'Password must contain at least 8 characters' }),
  company_name: z.string().min(3, { message: 'Company name must contain at least 3 characters' }),
  client_name: z.string().min(3, { message: 'Client name must contain at least 3 characters' }),
  plan_id: z.enum(PLAN_IDS, { message: 'Invalid plan' }),
})

export type Register = z.infer<typeof RegisterSchema>

export function validateRegister(input: unknown) {
  const result = RegisterSchema.safeParse(input)

  if (!result.success) {
    return {
      success: false as const,
      errors: result.error.issues.map((err) => ({
        field: err.path[0],
        message: err.message,
      })),
    }
  }

  return { success: true as const, data: result.data }
}
