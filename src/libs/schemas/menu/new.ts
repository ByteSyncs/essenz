import { z } from 'astro/zod'

const detailsSchema = z.object({
  grams: z.string().default(''),
  bitterness: z.string().default(''),
  notes: z.array(z.string()).default([]),
  sugar: z.string().default(''),
})

const menuItemSchema = z.object({
  name: z.string().min(1, { message: 'El nombre es requerido' }),
  description: z
    .string()
    .nullish()
    .transform((val) => val ?? null),
  price: z.number().positive({ message: 'El precio debe ser mayor a 0' }),
  category_id: z.uuid({ message: 'Categoría inválida' }),
  image_url: z
    .string()
    .url({ message: 'URL de imagen inválida' })
    .or(z.string().length(0))
    .nullish()
    .transform((val) => val || null),
  intensity: z.number().min(0).max(5).nullish().default(1),
  details: detailsSchema
    .optional()
    .default(() => ({ grams: '', bitterness: '', notes: [], sugar: '' })),
  is_active: z.boolean().default(true),
  in_offer: z.boolean().default(false),
  offer_percent: z
    .number()
    .min(1, { message: 'El porcentaje mínimo es 1' })
    .max(100, { message: 'El porcentaje máximo es 100' })
    .nullish()
    .transform((val) => val ?? null),
})

export type NewMenuItem = z.infer<typeof menuItemSchema>

export function validateNewMenuItem(input: unknown) {
  const response = menuItemSchema.safeParse(input)
  if (!response.success) {
    return {
      success: false as const,
      errors: response.error.issues.map((err) => ({
        field: err.path.join('.') || 'root',
        message: err.message,
      })),
    }
  }

  return {
    success: true as const,
    data: response.data,
  }
}
