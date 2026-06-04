export interface MenuItem {
  id?: string
  organization_id?: string
  name: string
  description: string | null
  price: string
  category_id?: string

  image_url?: string | null

  intensity?: number
  details: {
    grams: string
    bitterness: string
    notes: string[]
    sugar: string
  }

  is_active?: boolean
  in_offer?: boolean
  offer_percent?: number

  created_at?: string
  updated_at?: string
}

export interface Category {
  id: string
  organization_id: string
  title: string
  display_order: number
  items: MenuItem[]
}
