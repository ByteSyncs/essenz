import type { Category } from '../types/menu'

export const CARTA_MENU: Category[] = [
  {
    id: 'cafes',
    title: 'Barra de Especialidad',
    items: [
      {
        name: 'Espresso',
        price: '$2.200',
        description: 'Extracción pura de origen único.',
        intensity: 4,
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
        details: {
          grams: '60g café por litro + N₂',
          bitterness: 'Muy Bajo (Alta cafeína)',
          notes: ['Chocolate negro', 'Avellana', 'Cremoso'],
          sugar: '0g',
        },
      },
    ],
  },
  {
    id: 'pasteleria',
    title: 'Bakery Artesanal',
    items: [
      {
        name: 'Croissant',
        price: '$2.800',
        description: 'Hojaldre francés de 48hs.',
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
        details: {
          grams: '150g',
          bitterness: 'N/A',
          notes: ['Banana madura', 'Canela', 'Nuez'],
          sugar: 'Panela',
        },
      },
    ],
  },
]
