import { z } from 'astro/zod'

const UNIT_LABELS = ['u', 'g', 'kg', 'ml', 'l', 'box', 'pack'] as const

const newItemInventarySchema = z.object({
  name: z.string(),
  unit: z.enum(UNIT_LABELS).default('u'),
  stock: z.number().positive().min(1),
  stock_min: z.number().min(1).optional().default(1),
  cost_per_unit: z.number().nullable().optional(),
  notes: z.string().nullable().optional(),
  units_per_package: z.number().min(1).positive().nullable().optional(),
})

export type NewItemInventory = z.infer<typeof newItemInventarySchema>

export function validateNewItemInventory(input: unknown) {
  const result = newItemInventarySchema.safeParse(input)
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
    success: true,
    data: result.data,
  }
}
