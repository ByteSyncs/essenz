export interface Expense {
  id: string
  description: string
  amount: number
  category: 'supplies' | 'maintenance' | 'utilities' | 'staff' | 'other'
  created_at: string
}
