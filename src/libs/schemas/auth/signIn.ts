import { z } from 'astro/zod'

const loginSchema = z.object({
  email: z.email({ message: 'Email invalid' }),
  password: z.string().min(8, { message: 'The password most be 8 characters or more' }),
})

export type Login = z.infer<typeof loginSchema>

export function validateLogin(input: unknown) {
  const result = loginSchema.safeParse(input)

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
    success: true as const,
    data: result.data,
  }
}
