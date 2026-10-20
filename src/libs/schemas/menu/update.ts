import { z } from 'astro/zod'

const logoUrl = z
  .string()
  .trim()
  .max(2048)
  .refine((value) => {
    try {
      return ['http:', 'https:'].includes(new URL(value).protocol)
    } catch {
      return false
    }
  }, 'El logo debe tener una URL http o https válida')

const updateOrganizationSchema = z.object({
  name: z.string().trim().min(1).max(60).optional(),
  tagline: z.string().trim().max(100).optional(),
  logo: logoUrl.nullable().optional(),
})

export type UpdateOrganization = z.infer<typeof updateOrganizationSchema>

export function validateUpdateMenu(input: unknown) {
  const result = updateOrganizationSchema.safeParse(input)
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
