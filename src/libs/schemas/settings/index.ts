import { z } from 'astro/zod'

const publicUrl = z
  .string()
  .trim()
  .max(300)
  .refine((value) => {
    if (!value) return true
    try {
      return ['http:', 'https:'].includes(new URL(value).protocol)
    } catch {
      return false
    }
  }, 'Ingresá una URL válida con http o https')

const updateSettingsSchema = z.object({
  menu_active: z.boolean(),
  show_menu_images: z.boolean(),
  address: z.string().trim().max(160),
  city: z.string().trim().max(100),
  contact_phone: z.string().trim().max(40),
  contact_email: z
    .string()
    .trim()
    .max(254)
    .refine((value) => !value || z.email().safeParse(value).success, 'Ingresá un email válido'),
  opening_hours: z.string().trim().max(160),
  instagram_url: publicUrl,
  facebook_url: publicUrl,
})

export type UpdateSettings = z.infer<typeof updateSettingsSchema>

export function validateUpdateSettings(input: unknown) {
  const result = updateSettingsSchema.safeParse(input)
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
