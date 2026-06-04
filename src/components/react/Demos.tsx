import { m, LazyMotion, domAnimation } from 'framer-motion'

interface Demo {
  slug: string
  href: string
  style: 'modern' | 'minimalist'
  label: string
  title: string
  description: string
}

const DEMOS: Demo[] = [
  {
    slug: 'modern',
    href: '/demo-modern',
    style: 'modern',
    label: 'Estilo 01',
    title: 'Estilo Moderno',
    description: 'Tipografía serif, calidez y elegancia editorial.',
  },
  {
    slug: 'minimalist',
    href: '/demo-minimalist',
    style: 'minimalist',
    label: 'Estilo 02',
    title: 'Estilo Minimalista',
    description: 'Limpieza extrema, sin distracciones, máximo impacto.',
  },
]

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
    },
  },
}

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, easeInOut: [0.215, 0.61, 0.355, 1] },
  },
}

function MockPreview({ style }: { style: 'modern' | 'minimalist' }) {
  const isModern = style === 'modern'
  return (
    <svg
      viewBox="0 0 400 300"
      aria-hidden="true"
      className="size-full"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width="400" height="300" fill={isModern ? '#c9a97a' : '#e8e8e4'} />
      <rect
        x="0"
        y="160"
        width="400"
        height="140"
        fill={isModern ? '#2c1e16' : '#1a1a1a'}
        opacity="0.85"
      />
      <rect
        x="24"
        y="28"
        width={isModern ? 140 : 120}
        height={isModern ? 10 : 8}
        rx={isModern ? 5 : 0}
        fill={isModern ? '#2c1e16' : '#1a1a1a'}
        opacity="0.7"
      />
      <rect
        x="24"
        y="46"
        width="80"
        height="5"
        rx={isModern ? 3 : 0}
        fill={isModern ? '#8b5a2b' : '#c0392b'}
        opacity="0.8"
      />
      <rect
        x="24"
        y="80"
        width="160"
        height="68"
        rx={isModern ? 12 : 0}
        fill="white"
        opacity="0.25"
      />
      <rect x="36" y="96" width="80" height="7" rx={isModern ? 4 : 0} fill="white" opacity="0.7" />
      <rect x="36" y="110" width="55" height="5" rx={isModern ? 3 : 0} fill="white" opacity="0.4" />
      <rect
        x="36"
        y="126"
        width="40"
        height="9"
        rx={isModern ? 4 : 0}
        fill={isModern ? '#b08d57' : '#c0392b'}
        opacity="0.9"
      />
      <rect
        x="200"
        y="80"
        width="176"
        height="68"
        rx={isModern ? 12 : 0}
        fill="white"
        opacity="0.25"
      />
      <rect x="212" y="96" width="90" height="7" rx={isModern ? 4 : 0} fill="white" opacity="0.7" />
      <rect
        x="212"
        y="110"
        width="60"
        height="5"
        rx={isModern ? 3 : 0}
        fill="white"
        opacity="0.4"
      />
      <rect
        x="212"
        y="126"
        width="44"
        height="9"
        rx={isModern ? 4 : 0}
        fill={isModern ? '#b08d57' : '#c0392b'}
        opacity="0.9"
      />
      <rect x="24" y="174" width="352" height="1" fill="white" opacity="0.12" />
      {[0, 1, 2].map((i) => (
        <g key={i}>
          <rect
            x="24"
            y={192 + i * 28}
            width={isModern ? 110 + i * 20 : 130 + i * 15}
            height="6"
            rx={isModern ? 3 : 0}
            fill="white"
            opacity="0.55"
          />
          <rect
            x="340"
            y={190 + i * 28}
            width="36"
            height="10"
            rx={isModern ? 5 : 0}
            fill={isModern ? '#b08d57' : '#c0392b'}
            opacity="0.85"
          />
          <rect
            x="24"
            y={202 + i * 28}
            width="80"
            height="4"
            rx={isModern ? 2 : 0}
            fill="white"
            opacity="0.25"
          />
        </g>
      ))}
    </svg>
  )
}

function ArrowIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      aria-hidden="true"
      className="shrink-0 transition-transform duration-300 group-hover/cta:translate-x-0.5"
    >
      <path
        d="M2 7h10M8 3l4 4-4 4"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function DemoCard({ demo }: { demo: Demo }) {
  const isModern = demo.style === 'modern'

  return (
    <m.article
      variants={cardVariants}
      className={[
        'group relative overflow-hidden',
        'aspect-4/3 sm:aspect-3/2 lg:aspect-4/3',
        isModern ? 'rounded-(--radius-card)' : 'rounded-none',
        'focus-within:ring-2 focus-within:ring-(--clr-accent) focus-within:ring-offset-2',
      ].join(' ')}
    >
      <div className="absolute inset-0 transition-transform duration-500 ease-out will-change-transform group-hover:scale-[1.04]">
        <MockPreview style={demo.style} />
      </div>

      <div
        className={[
          'absolute inset-0 transition-opacity duration-300',
          isModern
            ? 'bg-linear-to-t from-[#2c1e16]/75 via-[#2c1e16]/15 to-transparent'
            : 'bg-linear-to-t from-[#0d0d0d]/80 via-[#0d0d0d]/15 to-transparent',
          'opacity-70 group-hover:opacity-100',
        ].join(' ')}
        aria-hidden="true"
      />

      <div
        className={[
          'absolute top-4 left-4 z-10',
          'border border-white/25 bg-white/10 backdrop-blur-sm',
          'px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.18em] text-white',
          isModern ? 'rounded-full' : 'rounded-none',
        ].join(' ')}
      >
        {demo.style === 'modern' ? 'Modern' : 'Minimalist'}
      </div>

      <div className="absolute inset-0 z-10 flex flex-col justify-end p-6 sm:p-7">
        <p className="mb-1 text-[9px] font-bold uppercase tracking-[0.22em] text-white/55">
          {demo.label}
        </p>

        <h3
          className={[
            'mb-4 text-xl font-bold leading-tight text-white sm:text-2xl',
            !isModern && 'tracking-tight',
          ]
            .filter(Boolean)
            .join(' ')}
          style={{
            fontFamily: isModern ? 'var(--font-display)' : 'var(--font-ui)',
          }}
        >
          {demo.title}
        </h3>

        <a
          href={demo.href}
          className={[
            'group/cta',
            'inline-flex w-fit items-center gap-2',
            'bg-white px-4 py-2.5',
            'text-[10px] font-bold uppercase tracking-[0.14em]',
            isModern ? 'rounded-none text-(--clr-ink)' : 'rounded-none text-(--clr-ink-dark)',
            'translate-y-3 opacity-0 transition-[opacity,transform] duration-300 ease-out',
            'group-hover:translate-y-0 group-hover:opacity-100',
            'supports-[not(hover:hover)]:translate-y-0 supports-[not(hover:hover)]:opacity-100',
            'focus-visible:translate-y-0 focus-visible:opacity-100',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--clr-accent) focus-visible:ring-offset-1',
          ].join(' ')}
          aria-label={`Ver demo: ${demo.title}`}
        >
          Ver demo
          <ArrowIcon />
        </a>
      </div>
    </m.article>
  )
}

export default function DemoPicker() {
  return (
    <LazyMotion features={domAnimation}>
      <section
        id="demos"
        className="w-full bg-(--clr-bg) px-5 py-20 sm:px-8 sm:py-28"
        aria-labelledby="demo-picker-heading"
      >
        <m.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
          className="mx-auto mb-12 max-w-2xl text-center sm:mb-16"
        >
          <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.28em] text-(--clr-accent)">
            Demos en vivo
          </p>
          <h2
            id="demo-picker-heading"
            className="mb-4 text-4xl leading-tight text-(--clr-ink) sm:text-5xl"
          >
            Elegí tu estilo
          </h2>
          <p className="text-base leading-relaxed text-(--clr-accent-light) sm:text-lg">
            Explorá cómo tu carta digital puede verse según la identidad de tu marca.
          </p>
        </m.div>

        <m.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={containerVariants}
          className="mx-auto grid max-w-5xl grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6"
        >
          {DEMOS.map((demo) => (
            <DemoCard key={demo.slug} demo={demo} />
          ))}
        </m.div>
      </section>
    </LazyMotion>
  )
}
