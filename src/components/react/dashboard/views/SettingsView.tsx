import { useState, useEffect, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface Settings {
  menu_active: boolean
  show_menu_images: boolean
  address: string
  city: string
  contact_phone: string
  contact_email: string
  opening_hours: string
  instagram_url: string
  facebook_url: string
}

const EMPTY_SETTINGS: Settings = {
  menu_active: true,
  show_menu_images: true,
  address: '',
  city: '',
  contact_phone: '',
  contact_email: '',
  opening_hours: '',
  instagram_url: '',
  facebook_url: '',
}

const TEXT_FIELDS: {
  key: Exclude<keyof Settings, 'menu_active' | 'show_menu_images'>
  label: string
  type?: string
  placeholder?: string
}[] = [
  { key: 'address', label: 'Dirección' },
  { key: 'city', label: 'Ciudad o zona' },
  {
    key: 'contact_phone',
    label: 'Teléfono / WhatsApp',
    type: 'tel',
    placeholder: '+54 9 11 2345 6789',
  },
  { key: 'contact_email', label: 'Email de contacto', type: 'email' },
  { key: 'opening_hours', label: 'Días y horarios' },
  { key: 'instagram_url', label: 'Enlace de Instagram', type: 'url' },
  { key: 'facebook_url', label: 'Enlace de Facebook', type: 'url' },
]

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean
  onChange: (value: boolean) => void
  label: string
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 shrink-0 items-center transition-colors duration-200 ${
        checked ? 'bg-(--clr-ink)' : 'bg-gray-200'
      }`}
      role="switch"
      aria-label={label}
      aria-checked={checked}
    >
      <span
        className={`inline-block h-3.5 w-3.5 bg-white shadow-sm transition-transform duration-200 ${
          checked ? 'translate-x-4' : 'translate-x-0.5'
        }`}
      />
    </button>
  )
}

function readSettings(value: Partial<Settings>): Settings {
  return {
    menu_active: Boolean(value.menu_active),
    show_menu_images: value.show_menu_images !== false,
    address: value.address ?? '',
    city: value.city ?? '',
    contact_phone: value.contact_phone ?? '',
    contact_email: value.contact_email ?? '',
    opening_hours: value.opening_hours ?? '',
    instagram_url: value.instagram_url ?? '',
    facebook_url: value.facebook_url ?? '',
  }
}

export default function SettingsView({ slug }: { slug: string }) {
  const [settings, setSettings] = useState<Settings>(EMPTY_SETTINGS)
  const [initialSettings, setInitialSettings] = useState<Settings>(EMPTY_SETTINGS)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const hasChanges = useMemo(
    () => JSON.stringify(settings) !== JSON.stringify(initialSettings),
    [settings, initialSettings],
  )

  useEffect(() => {
    async function load() {
      try {
        const response = await fetch(`/api/organizations/${slug}/settings`, {
          credentials: 'include',
        })
        const result = await response.json()
        if (!response.ok || !result.success || !result.settings) {
          throw new Error(
            response.status === 403
              ? 'Solo el dueño puede administrar estos ajustes.'
              : 'No pudimos cargar la configuración.',
          )
        }
        const loaded = readSettings(result.settings)
        setSettings(loaded)
        setInitialSettings(loaded)
      } catch (loadError) {
        setError((loadError as Error).message)
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [slug])

  const handleSave = useCallback(async () => {
    if (!hasChanges) return
    setIsSaving(true)
    setError(null)
    try {
      const response = await fetch(`/api/organizations/${slug}/settings`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      })
      const result = await response.json()
      if (!response.ok || !result.success) {
        throw new Error(
          response.status === 403
            ? 'Solo el dueño puede administrar estos ajustes.'
            : 'No pudimos guardar los cambios.',
        )
      }
      const saved = readSettings(result.settings)
      setSettings(saved)
      setInitialSettings(saved)
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (saveError) {
      setError((saveError as Error).message)
    } finally {
      setIsSaving(false)
    }
  }, [slug, settings, hasChanges])

  const update = <K extends keyof Settings>(key: K, value: Settings[K]) =>
    setSettings((previous) => ({ ...previous, [key]: value }))

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="animate-pulse text-xs font-black uppercase tracking-widest text-gray-300">
          Cargando...
        </p>
      </div>
    )
  }

  return (
    <div className="max-w-3xl px-6 py-8 md:px-10">
      <div className="mb-8">
        <p className="mb-1 text-[10px] font-black uppercase tracking-[0.25em] text-(--clr-accent)">
          Configuración del dueño
        </p>
        <h2 className="text-2xl font-bold tracking-tight text-(--clr-ink)">Tu sitio público</h2>
        <p className="mt-2 text-sm text-gray-500">
          Estos datos aparecen en la página de tu negocio y son públicos para tus clientes.
        </p>
      </div>

      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mb-6 flex items-center justify-between border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700"
            role="alert"
          >
            <span>{error}</span>
            <button onClick={() => setError(null)} className="ml-4 text-red-400 hover:text-red-700">
              Cerrar
            </button>
          </motion.div>
        )}
        {success && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mb-6 border border-green-100 bg-green-50 px-4 py-3 text-sm text-green-700"
            role="status"
          >
            Configuración guardada.
          </motion.div>
        )}
      </AnimatePresence>

      <div className="space-y-8">
        <section>
          <h3 className="mb-3 border-b border-gray-100 pb-2 text-[10px] font-black uppercase tracking-widest text-gray-400">
            Visibilidad
          </h3>
          <div className="divide-y divide-gray-100">
            <div className="flex items-center justify-between gap-5 py-4">
              <div>
                <p className="text-sm font-bold text-(--clr-ink)">Carta activa</p>
                <p className="mt-1 text-xs text-gray-400">
                  Si la desactivás, tus clientes no podrán abrir la carta.
                </p>
              </div>
              <Toggle
                checked={settings.menu_active}
                onChange={(value) => update('menu_active', value)}
                label="Activar o desactivar la carta"
              />
            </div>
            <div className="flex items-center justify-between gap-5 py-4">
              <div>
                <p className="text-sm font-bold text-(--clr-ink)">Fotos en la carta</p>
                <p className="mt-1 text-xs text-gray-400">
                  Mostrá u ocultá las fotos que subiste para tus productos.
                </p>
              </div>
              <Toggle
                checked={settings.show_menu_images}
                onChange={(value) => update('show_menu_images', value)}
                label="Mostrar fotos de productos en la carta"
              />
            </div>
          </div>
        </section>

        <section>
          <h3 className="mb-4 border-b border-gray-100 pb-2 text-[10px] font-black uppercase tracking-widest text-gray-400">
            Información del negocio
          </h3>
          <div className="grid gap-4 sm:grid-cols-2">
            {TEXT_FIELDS.map(({ key, label, type = 'text', placeholder }) => (
              <label
                key={key}
                className={`block text-[10px] font-bold uppercase tracking-widest text-gray-500 ${
                  key === 'opening_hours' ? 'sm:col-span-2' : ''
                }`}
              >
                {label}
                <input
                  type={type}
                  value={settings[key]}
                  onChange={(event) => update(key, event.target.value)}
                  placeholder={placeholder}
                  maxLength={key === 'contact_email' ? 254 : key.includes('_url') ? 300 : 160}
                  className="mt-2 w-full border border-gray-200 bg-white px-3 py-3 text-sm font-normal normal-case tracking-normal text-(--clr-ink) outline-none transition focus:border-(--clr-accent)"
                  autoComplete={type === 'email' ? 'email' : type === 'tel' ? 'tel' : 'off'}
                />
              </label>
            ))}
          </div>
        </section>

        <motion.button
          whileTap={hasChanges && !isSaving ? { scale: 0.98 } : undefined}
          onClick={handleSave}
          disabled={!hasChanges || isSaving}
          className="w-full bg-(--clr-ink) py-3.5 text-sm font-black uppercase tracking-widest text-white shadow-lg shadow-black/5 transition-colors hover:bg-black disabled:cursor-not-allowed disabled:opacity-30"
        >
          {isSaving ? 'Guardando...' : 'Guardar configuración'}
        </motion.button>
      </div>
    </div>
  )
}
