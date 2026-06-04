import { z } from 'astro/zod'

const deleteItemSchema = z.object({
  id: z.uuid(),
})

export type DeleteItem = z.infer<typeof deleteItemSchema>

export function validateDeleteItem(input: unknown) {
  const result = deleteItemSchema.safeParse(input)
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
