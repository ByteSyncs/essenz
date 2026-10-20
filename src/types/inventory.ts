export interface InventoryItem {
  id: string
  organization_id: string
  name: string
  unit: 'u' | 'g' | 'kg' | 'ml' | 'l' | 'box' | 'pack'
  stock: number
  stock_min: number
  cost_per_unit: number | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface InventoryMeta {
  pagination: {
    page: number
    perPage: number
    totalItems: number
    totalPages: number
  }
}

export interface InventoryViewProps {
  slug: string
}
