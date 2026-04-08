import type { CoffeeQuizData } from '../types/coffeeQuiz'

export const coffeeQuiz: CoffeeQuizData = {
  steps: [
    {
      id: 'step-1',
      question: '¿Cómo te gusta empezar el día?',
      emoji: '☀️',
      options: [
        { value: 'solo', label: 'Solo y directo', sub: 'Sin rodeos, sin leche' },
        { value: 'leche', label: 'Con algo de compañía', sub: 'Un toque cremoso, por favor' },
        { value: 'frio', label: 'Frío y refrescante', sub: 'Hielo, siempre hielo' },
        { value: 'especial', label: 'Algo distinto', sub: 'Sorpréndeme' },
      ],
    },
    {
      id: 'step-2',
      question: '¿Qué sensación buscás en cada sorbo?',
      emoji: '✨',
      options: [
        { value: 'suave', label: 'Suave y floral', sub: 'Notas frutales, acidez brillante' },
        { value: 'equilibrado', label: 'Equilibrado y dulce', sub: 'Ni muy fuerte, ni muy leve' },
        { value: 'intenso', label: 'Intenso y robusto', sub: 'Cuerpo fuerte, chocolate oscuro' },
        { value: 'ahumado', label: 'Profundo y ahumado', sub: 'Tostado oscuro, terroso' },
      ],
    },
  ],
  results: {
    'solo-suave': {
      title: 'V60 · Etiopía Yirgacheffe',
      desc: 'Un filtrado cristalino con notas de jazmín, limón y durazno. La expresión más pura del café de especialidad.',
      tag: 'Filtrado de Especialidad',
    },
    'solo-equilibrado': {
      title: 'Chemex · Colombia Huila',
      desc: 'Cuerpo medio, suave dulzura de caramelo y una acidez redonda. El equilibrio perfecto en cada taza.',
      tag: 'Filtrado Clásico',
    },
    'solo-intenso': {
      title: 'Espresso Doble',
      desc: 'Concentrado, con crema dorada y notas profundas de cacao amargo. Energía pura en 60ml.',
      tag: 'Espresso Puro',
    },
    'solo-ahumado': {
      title: 'Ristretto · Brasil Cerrado',
      desc: 'Ultraconcentrado, de tueste oscuro con notas terrosas y cuerpo aterciopelado. Para valientes.',
      tag: 'Espresso Oscuro',
    },
    'leche-suave': {
      title: 'Flat White · Etiopía',
      desc: 'Microespuma sedosa sobre un espresso de tueste claro. Cremoso pero con carácter frutal.',
      tag: 'Leche & Especialidad',
    },
    'leche-equilibrado': {
      title: 'Latte Artesanal',
      desc: 'Suave, cremoso y reconfortante. Un clásico que nunca decepciona, con tueste medio balanceado.',
      tag: 'Clásico Reconfortante',
    },
    'leche-intenso': {
      title: 'Cortado Intenso',
      desc: 'La fuerza del espresso cortando apenas la dulzura de la leche. Contundente e infalible.',
      tag: 'Espresso & Leche',
    },
    'leche-ahumado': {
      title: 'Macchiato Oscuro',
      desc: 'Un espresso de tueste profundo manchado con espuma densa. Robusto, complejo, memorable.',
      tag: 'Oscuro con Cuerpo',
    },
    'frio-suave': {
      title: 'Cold Brew · Kenia AA',
      desc: '18 horas de extracción en frío. Notas de grosella negra y bergamota, sin una pizca de acidez.',
      tag: 'Cold Brew Premium',
    },
    'frio-equilibrado': {
      title: 'Iced Latte',
      desc: 'Espresso sobre hielo y leche fría. Simple, refrescante y perfecto para cualquier momento.',
      tag: 'Frío Clásico',
    },
    'frio-intenso': {
      title: 'Nitro Cold Brew',
      desc: 'Cold brew cargado de nitrógeno. Textura aterciopelada, cuerpo de cerveza negra y sin azúcar.',
      tag: 'Frío Intenso',
    },
    'frio-ahumado': {
      title: 'Espresso Tónico',
      desc: 'Un shot oscuro sobre agua tónica y hielo. Combinación audaz: amargor, carbonatación y cafeína.',
      tag: 'Audaz & Refrescante',
    },
    'especial-suave': {
      title: 'Cascara Latte',
      desc: 'Infusión de la cáscara del fruto del café, con leche de avena. Floral, suave y completamente único.',
      tag: 'Raro & Especial',
    },
    'especial-equilibrado': {
      title: 'Café de Olla',
      desc: 'Canela, piloncillo y café de tueste medio. Una receta ancestral que calienta desde adentro.',
      tag: 'Tradicional',
    },
    'especial-intenso': {
      title: 'Affogato Doble',
      desc: 'Dos shots de espresso volcados sobre helado de vainilla. El postre que también es un café.',
      tag: 'Café & Postre',
    },
    'especial-ahumado': {
      title: 'Café Turco',
      desc: 'Molido ultrafino, hervido en cezve, sin filtrar. Profundo, denso y lleno de historia milenaria.',
      tag: 'Ancestral & Oscuro',
    },
  },
}
