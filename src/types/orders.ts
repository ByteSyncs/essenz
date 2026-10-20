export type OrderStatus = 'pending' | 'preparing' | 'delivered' | 'cancelled'

export interface OrderItem {
  id: string
  name: string
  qty: number
  price: number
}

export interface Order {
  id: string
  org_slug: string
  table_number: string | null
  customer_name: string
  status: OrderStatus
  created_at: string
  total_price: number
  payments: { method: string; amount: number }[]
  items: OrderItem[]
}
