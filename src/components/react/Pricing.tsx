import { motion } from 'framer-motion'

const plans = [
  {
    name: 'Basic',
    price: '$20',
    period: '/ mes',
    description: 'La base digital ideal para cafeterías de especialidad emergentes.',
    features: [
      'Dominio: essenz.bytesyncs.com/tu-cafe',
      'Hasta 30 productos en el menú',
      'Temas Modern & Minimalist',
      'Soporte por comunidad/email',
    ],
    cta: 'Empezar ahora',
    url: 'auth/sign-up?plan=basic',
    featured: false,
  },
  {
    name: 'Business',
    price: '$45',
    period: '/ mes',
    description: 'Elevá tu marca con dominio propio y métricas de consumo.',
    features: [
      'Dominio Personalizado (.com)',
      'Productos ilimitados',
      'Estadísticas de productos vistos',
      'QR Kit listo para impresión',
      'Soporte prioritario WhatsApp',
    ],
    cta: 'Elegir Business',
    url: 'auth/sign-up?plan=business',
    featured: true,
  },
  {
    name: 'Custom',
    price: 'Consultar',
    period: 'Diseño a medida',
    description: 'Para marcas que buscan una identidad única y secciones extra.',
    features: [
      'Diseño UX/UI exclusivo',
      'Múltiples sucursales',
      'Integración con sistemas POS',
      'Consultoría técnica directa',
    ],
    cta: 'Contactar ventas',
    url: 'auth/sign-up?plan=custom',
    featured: false,
  },
]

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1 } },
}

const card = {
  hidden: { opacity: 0, y: 30 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, easeInOut: 'easeOut' } },
}

export default function Pricing() {
  return (
    <section className="py-12 md:py-24 px-4 max-w-7xl mx-auto text-center" id="plans">
      <motion.p
        initial={{ opacity: 0, y: 10 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="text-[10px] font-bold tracking-[0.3em] uppercase mb-4"
        style={{ color: 'var(--clr-accent)' }}
      >
        Inversión
      </motion.p>

      <motion.h2
        initial={{ opacity: 0, y: 10 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="font-bold tracking-tight max-w-2xl mx-auto mb-6"
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'clamp(2rem, 4vw, 3.2rem)',
          color: 'var(--clr-ink)',
          lineHeight: 1.1,
        }}
      >
        Escalabilidad para tu negocio.
      </motion.h2>

      <motion.div
        variants={container}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: '-50px' }}
        className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 mt-16"
      >
        {plans.map((plan) => (
          <motion.div
            key={plan.name}
            variants={card}
            className="p-8 lg:p-10 text-left relative flex flex-col h-full"
            style={{
              background: plan.featured ? 'var(--clr-ink)' : 'var(--clr-white)',
              border: `1px solid ${plan.featured ? 'var(--clr-ink)' : 'var(--clr-soft-border)'}`,
              borderRadius: '2rem',
              boxShadow: plan.featured ? '0 30px 60px -12px rgba(0,0,0,0.25)' : 'none',
            }}
          >
            {plan.featured && (
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1.5 bg-[#C8A882] text-white text-[9px] font-bold uppercase tracking-[0.2em] rounded-full shadow-lg">
                Recomendado
              </div>
            )}

            <p
              className="text-[10px] font-bold tracking-widest uppercase mb-6"
              style={{ color: plan.featured ? 'var(--clr-accent)' : 'var(--clr-ink-light)' }}
            >
              {plan.name}
            </p>

            <div className="mb-4">
              <span
                className="font-bold tracking-tighter"
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: '3rem',
                  color: plan.featured ? 'var(--clr-white)' : 'var(--clr-ink)',
                }}
              >
                {plan.price}
              </span>
              <p
                className="text-xs mt-1 font-medium"
                style={{ color: plan.featured ? 'rgba(255,255,255,0.4)' : 'var(--clr-ink-light)' }}
              >
                {plan.period}
              </p>
            </div>

            <p
              className="text-sm mb-8 leading-relaxed h-12"
              style={{ color: plan.featured ? 'rgba(255,255,255,0.6)' : 'var(--clr-ink-light)' }}
            >
              {plan.description}
            </p>

            <ul className="space-y-4 mb-10 grow">
              {plan.features.map((f) => (
                <li
                  key={f}
                  className="flex items-start gap-3 text-xs leading-tight"
                  style={{
                    color: plan.featured ? 'rgba(255,255,255,0.8)' : 'var(--clr-ink)',
                  }}
                >
                  <span style={{ color: 'var(--clr-bg)', marginTop: '1px' }}>✦</span>
                  {f}
                </li>
              ))}
            </ul>

            <motion.a
              href={plan.url}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full p-4 text-center text-xs font-bold transition-all duration-300 uppercase tracking-widest"
              style={{
                borderRadius: '1rem',
                background: plan.featured ? 'var(--clr-accent)' : 'var(--clr-ink)',
                color: plan.featured ? 'var(--clr-white)' : 'var(--clr-white)',
                border: 'none',
              }}
            >
              {plan.cta}
            </motion.a>
          </motion.div>
        ))}
      </motion.div>
    </section>
  )
}
