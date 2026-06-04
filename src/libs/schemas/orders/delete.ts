import { z } from 'astro/zod'

const deleteOrderSchema = z.object({
  id: z.string(),
})

export function validateDeleteOrder(input: unknown) {
  const result = deleteOrderSchema.safeParse(input)
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
