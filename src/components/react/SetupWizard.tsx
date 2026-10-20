import { useState, useRef } from 'react'
import { errorMessages } from '../../libs/errorMessages'

interface SetupWizardProps {
  userId: string
  organizationId: string
  name: string
  slug: string
}

interface BrandColors {
  '--clr-accent': string
  '--clr-bg': string
}

const PALETTES: { name: string; colors: BrandColors }[] = [
  { name: 'Caramelo', colors: { '--clr-accent': '#C8A882', '--clr-bg': '#F5EFE6' } },
  { name: 'Espresso', colors: { '--clr-accent': '#6B3F2A', '--clr-bg': '#F2EBE3' } },
  { name: 'Matcha', colors: { '--clr-accent': '#4A7C59', '--clr-bg': '#F0F4EF' } },
  { name: 'Noir', colors: { '--clr-accent': '#C0392B', '--clr-bg': '#F8F8F6' } },
  { name: 'Lavanda', colors: { '--clr-accent': '#7C6FA0', '--clr-bg': '#F4F0FA' } },
  { name: 'Oceano', colors: { '--clr-accent': '#2980B9', '--clr-bg': '#EEF6FB' } },
]

function ColorSwatch({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (v: string) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs font-bold uppercase tracking-widest text-(--clr-ink)/50">
        {label}
      </span>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="group relative flex items-center gap-3 w-full rounded-2xl border border-black/10 bg-white px-4 py-3 hover:border-(--clr-accent)/60 transition-all"
      >
        <span
          className="w-8 h-8 rounded-xl shrink-0 border border-black/10 shadow-sm transition-transform group-hover:scale-105"
          style={{ backgroundColor: value }}
        />
        <span className="text-sm font-mono font-medium text-(--clr-ink-dark) uppercase tracking-wider">
          {value}
        </span>
        <svg
          className="w-4 h-4 text-(--clr-ink)/30 ml-auto group-hover:text-(--clr-accent) transition-colors"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
          />
        </svg>
        <input
          ref={inputRef}
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
          aria-label={label}
        />
      </button>
    </div>
  )
}

export default function SetupWizard({ userId, organizationId, name, slug }: SetupWizardProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [tagline, setTagline] = useState('')
  const [theme, setTheme] = useState<'modern' | 'minimalist'>('modern')
  const [brandColors, setBrandColors] = useState<BrandColors>(PALETTES[0].colors)
  const [selectedPalette, setSelectedPalette] = useState<string>(PALETTES[0].name)

  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setLogoFile(file)
      const reader = new FileReader()
      reader.onloadend = () => setLogoPreview(reader.result as string)
      reader.readAsDataURL(file)
    }
  }

  const applyPalette = (palette: (typeof PALETTES)[0]) => {
    setBrandColors(palette.colors)
    setSelectedPalette(palette.name)
  }

  const updateColor = (key: keyof BrandColors, value: string) => {
    setBrandColors((prev) => ({ ...prev, [key]: value }))
    setSelectedPalette('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!tagline) return

    try {
      setLoading(true)
      setError(null)

      const formData = new FormData()
      formData.append('userId', userId)
      formData.append('organizationId', organizationId)
      formData.append('tagline', tagline)
      formData.append('theme', theme)
      formData.append('domainType', 'path')
      formData.append('brandColors', JSON.stringify(brandColors))

      if (logoFile) {
        const { optimizeImage } = await import('../../libs/imageCompression')
        const compressed = await optimizeImage(logoFile, true)
        formData.append('logoFile', compressed, 'logo.webp')
      }

      const res = await fetch('/api/auth/setup', {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) {
        const errorText = await res.text()
        throw new Error(`Error del servidor (${res.status}): ${errorText}`)
      }

      const result = await res.json()
      if (result.success) {
        window.location.href = `/${result.slug}/admin/dashboard`
      } else {
        const readableError = errorMessages[result.error] || errorMessages.internal_server_error
        setError(readableError)
        console.error(result.error)
      }
    } catch (err: any) {
      setError(errorMessages.internal_server_error)
    } finally {
      setLoading(false)
    }
  }

  const previewStyle = {
    '--clr-accent': brandColors['--clr-accent'],
    '--clr-bg': brandColors['--clr-bg'],
  } as React.CSSProperties

  return (
    <form
      onSubmit={handleSubmit}
      className="mx-auto max-w-2xl rounded-(--radius-card) bg-(--clr-bg) p-6 md:p-10 shadow-2xl ring-1 ring-black/5"
    >
      <div className="mb-10 text-center">
        <h1 className="font-display text-3xl md:text-4xl font-bold text-(--clr-ink-dark) tracking-tight">
          Configura tu Cafetería
        </h1>
        <h2 className="mt-3 text-(--clr-ink)/70 text-base md:text-lg">
          Último paso antes de lanzar <strong className="text-(--clr-accent-light)">{name}</strong>
        </h2>
      </div>

      <div className="space-y-10 md:space-y-12">
        <div>
          <h2 className="mb-6 flex items-center gap-3 text-xl font-semibold text-(--clr-ink-dark)">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-(--clr-accent)/10 text-(--clr-accent) text-sm font-bold">
              1
            </span>
            Información Básica
          </h2>
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="tagline" className="text-sm font-medium text-(--clr-ink-dark)/80">
                Tagline / Slogan <span className="text-red-500">*</span>
              </label>
              <input
                id="tagline"
                type="text"
                required
                value={tagline}
                onChange={(e) => setTagline(e.target.value)}
                className="w-full rounded-2xl border border-black/10 bg-white px-5 py-4 text-(--clr-ink-dark) placeholder:text-(--clr-ink)/40 focus:border-(--clr-accent) focus:ring-2 focus:ring-(--clr-accent)/20 outline-none transition-all"
                placeholder="El aroma que une momentos"
              />
            </div>
          </div>
        </div>

        <div>
          <h2 className="mb-6 flex items-center gap-3 text-xl font-semibold text-(--clr-ink-dark)">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-(--clr-accent)/10 text-(--clr-accent) text-sm font-bold">
              2
            </span>
            Logo de la Cafetería
          </h2>
          <div className="flex flex-col sm:flex-row items-center gap-8">
            <div
              onClick={() => fileInputRef.current?.click()}
              className="group relative flex h-32 w-32 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-3xl border-2 border-dashed border-(--clr-accent)/30 bg-white hover:border-(--clr-accent) transition-all"
            >
              {logoPreview ? (
                <img src={logoPreview} alt="Preview" className="h-full w-full object-cover" />
              ) : (
                <div className="text-center">
                  <div className="mx-auto mb-2 text-3xl text-(--clr-accent)/60 group-hover:text-(--clr-accent)">
                    📸
                  </div>
                  <span className="text-xs font-medium text-(--clr-accent)">Subir logo</span>
                </div>
              )}
            </div>
            <div>
              <p className="text-(--clr-ink)/70 mb-3 text-sm">
                Recomendamos PNG o JPG cuadrado (mínimo 512×512 px)
              </p>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="rounded-xl bg-(--clr-accent) px-6 py-3 text-sm font-semibold text-white hover:bg-(--clr-accent-light) transition-colors"
              >
                Seleccionar archivo
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleLogoChange}
                className="hidden"
              />
            </div>
          </div>
        </div>

        <div>
          <h2 className="mb-6 flex items-center gap-3 text-xl font-semibold text-(--clr-ink-dark)">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-(--clr-accent)/10 text-(--clr-accent) text-sm font-bold">
              3
            </span>
            Identidad Visual
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => setTheme('modern')}
              className={`rounded-3xl border-2 p-6 text-left transition-all ${theme === 'modern' ? 'border-(--clr-accent) bg-(--clr-accent)/5' : 'border-black/10 hover:border-black/30 bg-white'}`}
            >
              <h3 className="font-display text-2xl font-bold mb-2">Moderno</h3>
              <p className="text-sm text-(--clr-ink)/70 mb-4">
                Elegancia clásica con calidez editorial
              </p>
              <a
                href="/demo-modern"
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-(--clr-accent) hover:underline underline-offset-2"
              >
                Ver demo
                <svg
                  className="w-3 h-3"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"
                  />
                </svg>
              </a>
            </button>
            <button
              type="button"
              onClick={() => setTheme('minimalist')}
              className={`rounded-3xl border-2 p-6 text-left transition-all ${theme === 'minimalist' ? 'border-(--clr-accent) bg-(--clr-accent)/5' : 'border-black/10 hover:border-black/30 bg-white'}`}
            >
              <h3 className="font-ui text-2xl font-bold mb-2">Minimalista</h3>
              <p className="text-sm text-(--clr-ink)/70 mb-4">Limpieza extrema y máximo impacto</p>
              <a
                href="/demo-minimalist"
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-(--clr-accent) hover:underline underline-offset-2"
              >
                Ver demo
                <svg
                  className="w-3 h-3"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"
                  />
                </svg>
              </a>
            </button>
          </div>
        </div>

        <div>
          <h2 className="mb-6 flex items-center gap-3 text-xl font-semibold text-(--clr-ink-dark)">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-(--clr-accent)/10 text-(--clr-accent) text-sm font-bold">
              4
            </span>
            Colores de Marca
          </h2>

          <p className="text-xs font-bold uppercase tracking-widest text-(--clr-ink)/40 mb-3">
            Paletas sugeridas
          </p>
          <div className="flex flex-wrap gap-2 mb-6">
            {PALETTES.map((p) => (
              <button
                key={p.name}
                type="button"
                onClick={() => applyPalette(p)}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl border-2 text-xs font-semibold transition-all ${
                  selectedPalette === p.name
                    ? 'border-(--clr-accent) bg-(--clr-accent)/5 text-(--clr-ink-dark)'
                    : 'border-black/10 bg-white text-(--clr-ink)/60 hover:border-black/25'
                }`}
              >
                <span className="flex gap-0.5">
                  <span
                    className="w-3.5 h-3.5 rounded-full border border-black/10"
                    style={{ backgroundColor: p.colors['--clr-accent'] }}
                  />
                  <span
                    className="w-3.5 h-3.5 rounded-full border border-black/10"
                    style={{ backgroundColor: p.colors['--clr-bg'] }}
                  />
                </span>
                {p.name}
              </button>
            ))}
          </div>

          <div className="grid gap-4 sm:grid-cols-2 mb-6">
            <ColorSwatch
              label="Color de acento"
              value={brandColors['--clr-accent']}
              onChange={(v) => updateColor('--clr-accent', v)}
            />
            <ColorSwatch
              label="Color de fondo"
              value={brandColors['--clr-bg']}
              onChange={(v) => updateColor('--clr-bg', v)}
            />
          </div>

          <div className="rounded-2xl border border-black/8 overflow-hidden" style={previewStyle}>
            <div
              className="px-5 py-4 flex items-center gap-3 border-b border-black/8"
              style={{ backgroundColor: brandColors['--clr-bg'] }}
            >
              {logoPreview ? (
                <img src={logoPreview} alt="Logo" className="w-7 h-7 rounded-lg object-cover" />
              ) : (
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold"
                  style={{ backgroundColor: brandColors['--clr-accent'] }}
                >
                  {name?.charAt(0)?.toUpperCase() ?? 'C'}
                </div>
              )}
              <span className="text-sm font-bold" style={{ color: brandColors['--clr-accent'] }}>
                {name || 'Tu Cafetería'}
              </span>
            </div>
            <div
              className="px-5 py-5 flex flex-col gap-3"
              style={{ backgroundColor: brandColors['--clr-bg'] }}
            >
              <div className="flex gap-2 flex-wrap">
                {['Cafés', 'Pastelería', 'Bebidas'].map((cat) => (
                  <span
                    key={cat}
                    className="text-[10px] font-black uppercase tracking-widest px-3 py-1.5"
                    style={{ backgroundColor: brandColors['--clr-accent'], color: '#fff' }}
                  >
                    {cat}
                  </span>
                ))}
              </div>
              <div className="flex gap-3">
                {['Cappuccino', 'Latte', 'Espresso'].map((item) => (
                  <div
                    key={item}
                    className="flex-1 rounded-xl p-3 border border-black/8 bg-white/60"
                  >
                    <div
                      className="w-full h-10 rounded-lg mb-2 opacity-20"
                      style={{ backgroundColor: brandColors['--clr-accent'] }}
                    />
                    <p className="text-[10px] font-bold text-center" style={{ color: '#1a1a1a' }}>
                      {item}
                    </p>
                  </div>
                ))}
              </div>
              <p
                className="text-[10px] text-center opacity-40 font-medium"
                style={{ color: '#1a1a1a' }}
              >
                Vista previa de tu carta
              </p>
            </div>
          </div>
        </div>

        <div>
          <h2 className="mb-6 flex items-center gap-3 text-xl font-semibold text-(--clr-ink-dark)">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-(--clr-accent)/10 text-(--clr-accent) text-sm font-bold">
              5
            </span>
            Dirección de tu local
          </h2>
          <div className="rounded-3xl border border-black/10 bg-white p-6">
            <p className="text-sm font-medium text-(--clr-ink-dark)">Tu sitio se publica en</p>
            <p className="mt-2 break-all font-mono text-sm text-(--clr-accent)">
              essenz.bytesyncs.com/{slug ?? 'tu-local'}
            </p>
            <p className="mt-2 text-sm text-(--clr-ink)/60">
              La dirección usa el mismo formato en todos los planes.
            </p>
          </div>
        </div>
      </div>

      <div className="mt-8 flex flex-col gap-4">
        {error && (
          <div className="animate-fade-in flex items-center gap-3 rounded-2xl border border-red-400/20 bg-red-500/10 p-4 text-red-600 text-sm font-medium">
            <svg
              className="w-5 h-5 shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <span>{error}</span>
          </div>
        )}

        <div className="flex md:justify-end justify-center">
          <button
            type="submit"
            disabled={loading || !tagline.trim()}
            className="w-full md:w-auto rounded-2xl bg-(--clr-accent) px-10 py-4 font-bold text-white text-lg tracking-wide hover:bg-(--clr-accent-light) disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.985]"
          >
            {loading ? 'Configurando tu espacio...' : 'Lanzar mi Cafetería'}
          </button>
        </div>
      </div>
    </form>
  )
}
