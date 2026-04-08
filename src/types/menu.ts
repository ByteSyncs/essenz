export interface MenuItem {
  name: string
  price: string
  description: string
  intensity?: number
  image: string
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
