import { motion } from 'framer-motion'

const testimonials = [
  {
    highlight: 'nuestro menú se actualiza al instante',
    full: 'Lo que más nos cambió el día a día es que {h} desde el celular. No más reimprimir cartas por un cambio de precio.',
    name: 'Julián Rossi',
    role: 'Dueño, Modo Café',
    initials: 'JR',
    bg: '#EADBC8',
    color: '#54372B',
  },
  {
    highlight: 'entendió perfectamente la estética',
    full: 'Buscábamos algo que no pareciera una plantilla barata. ByteSyncs {h} de nuestra marca y lo llevó a la web.',
    name: 'Sofía Méndez',
    role: 'Founder, Alquimia Specialty',
    initials: 'SM',
    bg: '#D2E0FB',
    color: '#2D3142',
  },
  {
    highlight: 'la velocidad de carga es increíble.',
    full: 'Veníamos de un sitio en WordPress que tardaba siglos. Con la tecnología de ByteSyncs {h} Los clientes no esperan.',
    name: 'Marcos Paz',
    role: 'Gerente, Estación Central',
    initials: 'MP',
    bg: '#D7E5CA',
    color: '#285430',
  },
  {
    highlight: 'un socio, no solo un proveedor.',
    full: 'Sentir que tenés a alguien que responde por WhatsApp y resuelve es clave. Son {h}',
    name: 'Valeria Luna',
    role: 'CEO, Bloom Bakery',
    initials: 'VL',
    bg: '#F9F3CC',
    color: '#706233',
  },
]

function renderQuote(full: string, highlight: string) {
  const parts = full.split('{h}')
  return (
    <>
      {parts[0]}
      <span className="font-semibold" style={{ color: 'var(--clr-accent)' }}>
        {highlight}
      </span>
      {parts[1]}
    </>
  )
}

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.15 } },
}

const card = {
  hidden: { opacity: 0, scale: 0.95 },
  show: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.5, easeInOut: [0.23, 1, 0.32, 1] },
  },
}

export default function Testimonials() {
  return (
    <section id="experiences" className="pt-10 pb-8 md:py-24 px-4 max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between md:items-end mb-16 gap-6 ">
        <div className="text-left">
          <motion.p
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="text-xs font-bold tracking-[0.2em] uppercase mb-4 text-(--clr-accent)"
          >
            Feedback Real
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="font-bold tracking-tight text-4xl md:text-5xl text-(--clr-ink)"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Historias de éxito <br /> con ByteSyncs.
          </motion.h2>
        </div>
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          className="text-gray-500 max-w-xs text-sm italic border-l-2 border-(--clr-accent) pl-4"
        >
          "La tecnología solo sirve si soluciona problemas reales."
        </motion.p>
      </div>

      <motion.div
        variants={container}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: '-50px' }}
        className="grid grid-cols-1 md:grid-cols-2 gap-6"
      >
        {testimonials.map((t) => (
          <motion.div
            key={t.name}
            variants={card}
            className="flex flex-col justify-between p-8 transition-all duration-300 hover:shadow-xl hover:-translate-y-1"
            style={{
              background: 'var(--clr-white)',
              border: '1px solid var(--clr-soft-border)',
              borderRadius: '2rem',
            }}
          >
            <div>
              <div className="flex text-amber-400 mb-4 text-xs">★★★★★</div>

              <p
                className="leading-relaxed"
                style={{
                  fontFamily: 'var(--font-editorial)',
                  fontSize: '1.2rem',
                  color: 'var(--clr-ink)',
                  lineHeight: 1.5,
                }}
              >
                "{renderQuote(t.full, t.highlight)}"
              </p>
            </div>

            <div className="flex items-center gap-4 mt-8">
              <div
                className="w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold shrink-0 shadow-inner"
                style={{ background: t.bg, color: t.color }}
              >
                {t.initials}
              </div>
              <div>
                <p className="text-sm font-bold text-(--clr-ink)">{t.name}</p>
                <p className="text-[11px] uppercase tracking-wider text-gray-400 font-medium">
                  {t.role}
                </p>
              </div>
            </div>
          </motion.div>
        ))}
      </motion.div>
    </section>
  )
}
