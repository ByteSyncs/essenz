import { z } from 'astro/zod'

const STATUS = ['pending', 'preparing', 'delivered', 'cancelled'] as const

const updateOrderSchema = z.object({
  status: z.enum(STATUS).default('pending'),
})

export function validateUpdateOrder(input: unknown) {
  const result = updateOrderSchema.safeParse(input)
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
