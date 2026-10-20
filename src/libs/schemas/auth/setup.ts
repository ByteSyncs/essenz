import { z } from 'astro/zod'

const BrandColorsSchema = z.object({
  '--clr-accent': z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  '--clr-bg': z.string().regex(/^#[0-9A-Fa-f]{6}$/),
})

const setupSchema = z.object({
  userId: z.string().min(1),
  organizationId: z.string().min(1),
  tagline: z.string().min(3).max(40),
  theme: z.enum(['modern', 'minimalist']),
  domainType: z.literal('path'),
  logoFile: z.instanceof(File).nullable().optional(),
  brandColors: z.string().transform((val, ctx) => {
    try {
      return BrandColorsSchema.parse(JSON.parse(val))
    } catch {
      ctx.addIssue({
        code: 'custom',
        message: 'brandColors invalid',
      })

      return z.NEVER
    }
  }),
})

export type Setup = z.infer<typeof setupSchema>

export function validateSetup(input: unknown) {
  const result = setupSchema.safeParse(input)

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
