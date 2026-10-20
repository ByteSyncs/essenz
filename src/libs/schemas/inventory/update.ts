import { z } from 'astro/zod'

const updateItemInventorySchema = z.object({
  stock: z.number().positive().min(0),
})

export function validateUpdateItemInventory(input: unknown) {
  const result = updateItemInventorySchema.safeParse(input)
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
