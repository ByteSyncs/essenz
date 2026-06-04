import type { Category } from '../types/menu'

export const CART_MENU: Category[] = [
  {
    id: 'cafes',
    title: 'Barra de Especialidad',
    items: [
      {
        name: 'Espresso',
        price: '$2.200',
        description: 'Extracción pura de origen único.',
        intensity: 4,
        image_url:
          'https://images.unsplash.com/photo-1510591509098-f4fdc6d0ff04?q=80&w=800&auto=format&fit=crop',
        details: {
          grams: '18g café / 36g líquido',
          bitterness: 'Alto/Medio',
          notes: ['Avellana', 'Caramelo tostado', 'Cacao'],
          sugar: '0g (Sugerido sin endulzar)',
        },
      },
      {
        name: 'Flat White',
        price: '$3.100',
        description: 'Doble shot con leche sedosa.',
        intensity: 2,
        image_url:
          'https://t3.ftcdn.net/jpg/10/20/50/56/360_F_1020505660_W70KY6VaJvY9fJ3OqoWyQiTG2D8tfFL2.jpg',
        details: {
          grams: '36g espresso + 120ml leche',
          bitterness: 'Bajo',
          notes: ['Vainilla', 'Lácteo dulce'],
          sugar: 'Natural de la leche',
        },
      },
      {
        name: 'Cold Brew',
        price: '$3.500',
        description: '12hs de infusión en frío.',
        intensity: 5,
        image_url:
          'https://images.unsplash.com/photo-1517701604599-bb29b565090c?auto=format&fit=crop&w=800&q=80',
        details: {
          grams: '60g café por litro',
          bitterness: 'Muy Bajo (Alta cafeína)',
          notes: ['Chocolate negro', 'Frutos rojos'],
          sugar: '0g',
        },
      },
      {
        name: 'V60',
        price: '$3.800',
        description: 'Filtrado manual de origen único.',
        intensity: 3,
        image_url:
          'https://coffeegeek.com/wp-content/uploads/2023/06/hariov60allison-1-1024x683.jpg',
        details: {
          grams: '15g café / 250ml agua',
          bitterness: 'Bajo',
          notes: ['Jazmín', 'Limón', 'Durazno'],
          sugar: '0g (Sugerido sin endulzar)',
        },
      },
      {
        name: 'Cortado',
        price: '$2.600',
        description: 'Espresso cortado con leche caliente.',
        intensity: 3,
        image_url:
          'https://images.unsplash.com/photo-1534040385115-33dcb3acba5b?auto=format&fit=crop&w=800&q=80',
        details: {
          grams: '36g espresso + 40ml leche',
          bitterness: 'Medio',
          notes: ['Caramelo', 'Cacao', 'Lácteo'],
          sugar: 'Natural de la leche',
        },
      },
      {
        name: 'Nitro Cold Brew',
        price: '$4.200',
        description: 'Cold brew cargado con nitrógeno.',
        intensity: 5,
        image_url:
          'https://images.unsplash.com/photo-1592663527359-cf6642f54cff?auto=format&fit=crop&w=800&q=80',
        details: {
          grams: '60g café por litro + N₂',
          bitterness: 'Muy Bajo (Alta cafeína)',
          notes: ['Chocolate negro', 'Avellana', 'Cremoso'],
          sugar: '0g',
        },
      },
    ],
    organization_id: '',
    display_order: 0,
  },
  {
    id: 'pasteleria',
    title: 'Bakery Artesanal',
    items: [
      {
        name: 'Croissant',
        price: '$2.800',
        description: 'Hojaldre francés de 48hs.',
        image_url:
          'https://images.unsplash.com/photo-1555507036-ab1f4038808a?auto=format&fit=crop&w=800&q=80',
        details: {
          grams: '120g',
          bitterness: 'N/A',
          notes: ['Mantequilla premium', 'Sal de Guerande'],
          sugar: '3g',
        },
      },
      {
        name: 'Pain au Chocolat',
        price: '$3.100',
        description: 'Hojaldre con cobertura de cacao 70%.',
        image_url:
          'https://images.unsplash.com/photo-1606312619070-d48b4c652a52?auto=format&fit=crop&w=800&q=80',
        details: {
          grams: '130g',
          bitterness: 'N/A',
          notes: ['Cacao intenso', 'Mantequilla', 'Vainilla'],
          sugar: '8g',
        },
      },
      {
        name: 'Banana Bread',
        price: '$2.500',
        description: 'Húmedo, sin azúcar refinada.',
        image_url:
          'https://images.unsplash.com/photo-1533782654613-826a072dd6f3?auto=format&fit=crop&w=800&q=80',
        details: {
          grams: '150g',
          bitterness: 'N/A',
          notes: ['Banana madura', 'Canela', 'Nuez'],
          sugar: 'Panela',
        },
      },
    ],
    organization_id: '',
    display_order: 0,
  },
]
