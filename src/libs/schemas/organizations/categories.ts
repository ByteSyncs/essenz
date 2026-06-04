import { z } from 'astro/zod'

const newCategorieSchema = z.object({
  title: z.string().min(1),
  display_order: z.number().default(0),
})

export type NewCategorie = z.infer<typeof newCategorieSchema>

export function validateNewCategorie(input: unknown) {
  const result = newCategorieSchema.safeParse(input)
  if (!result.success) {
    return {
      success: false,
      errors: result.error.issues.map((err) => ({
        field: err.path[0],
        message: err.message,
      })),
    }
  }

  return {
    success: true as const,
    data: result.data,
  }
}
