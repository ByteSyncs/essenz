import { z } from 'astro/zod'

const STATUS = ['pending', 'preparing', 'delivered'] as const
const PAYMENT_METHODS = ['cash', 'debit', 'credit', 'virtual'] as const
const DESCOUNT_REASON = ['clients', 'employees', 'others'] as const

const PaymentSchema = z.object({
  method: z.enum(PAYMENT_METHODS),
  amount: z.number().nonnegative(),
})

const OrderItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  qty: z.number().int().positive(),
  price: z.number().nonnegative(),
})

const newOrderSchema = z.object({
  customer_name: z.string(),
  table_number: z.string().optional(),
  status: z.enum(STATUS).default('pending'),
  items: z.array(OrderItemSchema).min(1),
  total_price: z.number().positive(),
  payments: z.array(PaymentSchema),
  discount_amount: z.number().nonnegative().nullish().default(0),
  discount_reason: z.enum(DESCOUNT_REASON).nullish(),
  change_returned: z.number().nonnegative().nullish().default(0),
})

export type Order = z.infer<typeof newOrderSchema>

export function validateNewOrder(input: unknown) {
  const result = newOrderSchema.safeParse(input)
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
