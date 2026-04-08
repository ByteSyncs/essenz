export interface MenuItem {
  name: string
  price: string
  description: string
  intensity?: number
  details: {
    grams: string
    bitterness: string
    notes: string[]
    sugar: string
  }
}

export interface Category {
  id: string
  title: string
  items: MenuItem[]
}
