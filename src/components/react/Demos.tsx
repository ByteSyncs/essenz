interface Demo {
  slug: string
  href: string
  menuHref: string
  style: 'modern' | 'minimalist'
  label: string
  title: string
  description: string
}

const DEMOS: Demo[] = [
  {
    slug: 'modern',
    href: '/demo-modern',
    menuHref: '/demo-modern/menu',
    style: 'modern',
    title: 'Moderno',
    label: 'Cálida y editorial',
    description: 'Un sitio de ejemplo con productos destacados y acceso directo a su carta.',
  },
  {
    slug: 'minimalist',
    href: '/demo-minimalist',
    menuHref: '/demo-minimalist/menu',
    style: 'minimalist',
    title: 'Minimalista',
    label: 'Directa y tipográfica',
    description: 'Otro ejemplo real, con una presentación distinta y su propia carta digital.',
  },
]

function LivePreview({ demo }: { demo: Demo }) {
  return (
    <iframe
      src={demo.href}
      title={`Vista previa del sitio de ejemplo ${demo.title}`}
      loading="lazy"
      className="block h-96 w-full border-0 bg-white sm:h-112"
    />
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
  return (
    <article className="min-w-0">
      <div className="overflow-hidden rounded-(--radius-card) border border-stone-200 bg-white">
        <div className="flex min-h-11 items-center justify-between gap-4 border-b border-stone-200 px-4">
          <p className="truncate text-xs font-semibold text-(--clr-ink)">{demo.title}</p>
          <a
            href={demo.href}
            className="shrink-0 text-xs font-semibold text-(--clr-accent) underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-(--clr-accent)"
          >
            Abrir sitio
          </a>
        </div>
        <LivePreview demo={demo} />
      </div>

      <div className="flex flex-col gap-4 pt-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="max-w-md">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-(--clr-accent)">
            {demo.label}
          </p>
          <h3 className="mt-2 text-xl font-semibold text-(--clr-ink)">{demo.title}</h3>
          <p className="mt-2 text-sm leading-relaxed text-stone-600">{demo.description}</p>
        </div>
        <a
          href={demo.menuHref}
          className="inline-flex min-h-11 shrink-0 items-center rounded-full border border-stone-300 px-5 text-sm font-semibold text-(--clr-ink) transition-colors hover:border-(--clr-ink) focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-(--clr-accent)"
        >
          Ver carta
        </a>
      </div>
    </article>
  )
}

export default function DemoPicker() {
  return (
    <section
      id="templates"
      className="w-full bg-(--clr-bg) px-5 py-16 sm:px-8 sm:py-20"
      aria-labelledby="demo-picker-heading"
    >
      <div className="mx-auto mb-10 grid max-w-6xl gap-4 sm:grid-cols-[0.9fr_1.1fr] sm:items-end sm:gap-10">
        <h2
          id="demo-picker-heading"
          className="max-w-xl text-3xl leading-tight font-semibold text-(--clr-ink) sm:text-4xl"
        >
          Mirá Essenz desde el lado de tus clientes.
        </h2>
        <p className="max-w-2xl text-base leading-relaxed text-stone-600">
          Cada ejemplo muestra un sitio y una carta cargados con los datos de su negocio de
          demostración. Abrí cualquiera para recorrer su contenido real.
        </p>
      </div>

      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-10">
        {DEMOS.map((demo) => (
          <DemoCard key={demo.slug} demo={demo} />
        ))}
      </div>
    </section>
  )
}
