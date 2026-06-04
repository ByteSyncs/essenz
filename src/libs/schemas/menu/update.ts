import { z } from 'astro/zod'

const updateMenuItemSchema = z.object({
  name: z.string().optional(),
  tagline: z.string().optional(),
  logo: z.string().optional(),
  logo_updated_at: z.string().optional(),
})

export type UpdateMenuItem = z.infer<typeof updateMenuItemSchema>

export function validateUpdateMenu(input: unknown) {
  const result = updateMenuItemSchema.safeParse(input)
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
