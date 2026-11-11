export interface Expense {
  id: string
  description: string
  amount: number
  category: 'supplies' | 'maintenance' | 'utilities' | 'staff' | 'other'
  uses_cash: boolean
  created_at: string
}
