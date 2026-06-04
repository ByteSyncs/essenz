import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface Settings {
  mp_enabled: boolean
  mp_access_token: string
  mp_public_key: string
  menu_active: boolean
}

function Toggle({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      onClick={() => !disabled && onChange(!checked)}
      disabled={disabled}
      className={`relative inline-flex h-5 w-9 shrink-0 items-center transition-colors duration-200 ${
        checked ? 'bg-(--clr-ink)' : 'bg-gray-200'
      } ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
      role="switch"
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

function SecretField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
}) {
  const [show, setShow] = useState(false)
  return (
    <div>
      <label className="block text-[10px] uppercase font-black tracking-widest text-gray-400 mb-1.5">
        {label}
      </label>
      <div className="relative">
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full bg-white border border-gray-200 px-3 py-2.5 pr-10 text-sm text-(--clr-ink) placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-(--clr-accent)/30 focus:border-(--clr-accent) transition-all font-mono"
        />
        <button
          type="button"
          onClick={() => setShow(!show)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 transition-colors"
        >
          {show ? (
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88"
              />
            </svg>
          ) : (
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
          )}
        </button>
      </div>
    </div>
  )
}

export default function SettingsView({ slug }: { slug: string }) {
  const [settings, setSettings] = useState<Settings>({
    mp_enabled: false,
    mp_access_token: '',
    mp_public_key: '',
    menu_active: true,
  })
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/settings?slug=${slug}`, { credentials: 'include' })
        if (!res.ok) throw new Error('Error al cargar la configuración')
        const data = await res.json()
        setSettings(data)
      } catch (e) {
        setError((e as Error).message)
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [slug])

  const handleSave = useCallback(async () => {
    setIsSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/settings/update', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, ...settings }),
      })
      if (!res.ok) throw new Error('Error al guardar')
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setIsSaving(false)
    }
  }, [slug, settings])

  const update = <K extends keyof Settings>(key: K, value: Settings[K]) =>
    setSettings((prev) => ({ ...prev, [key]: value }))

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-xs font-black uppercase tracking-widest text-gray-300 animate-pulse">
          Cargando...
        </p>
      </div>
    )
  }

  return (
    <div className="px-6 md:px-10 py-8 max-w-2xl">
      <div className="mb-8">
        <p className="text-[10px] font-black uppercase tracking-[0.25em] text-(--clr-accent) mb-1">
          Configuración
        </p>
        <h2 className="text-2xl font-bold text-(--clr-ink) tracking-tight">Ajustes</h2>
      </div>

      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mb-6 bg-red-50 border border-red-100 text-red-700 text-sm px-4 py-3 flex items-center justify-between"
          >
            <span>{error}</span>
            <button onClick={() => setError(null)} className="text-red-400 hover:text-red-700 ml-4">
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </motion.div>
        )}
        {success && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mb-6 bg-green-50 border border-green-100 text-green-700 text-sm px-4 py-3"
          >
            ✓ Configuración guardada
          </motion.div>
        )}
      </AnimatePresence>

      <div className="space-y-8">
        {/* General */}
        <section>
          <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-4 pb-2 border-b border-gray-100">
            General
          </h3>
          <div className="flex items-center justify-between py-3">
            <div>
              <p className="text-sm font-bold text-(--clr-ink)">Carta activa</p>
              <p className="text-xs text-gray-400">
                Si está desactivada, los clientes no verán el menú
              </p>
            </div>
            <Toggle checked={settings.menu_active} onChange={(v) => update('menu_active', v)} />
          </div>
        </section>

        {/* Mercado Pago */}
        <section>
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-100">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-400">
              Mercado Pago
            </h3>
            <a
              href="https://www.mercadopago.com.ar/developers/es/docs"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] text-(--clr-accent) font-bold hover:underline flex items-center gap-1"
            >
              Ir a Developers
              <svg
                className="w-3 h-3"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"
                />
              </svg>
            </a>
          </div>

          <div className="flex items-center justify-between py-3">
            <div>
              <p className="text-sm font-bold text-(--clr-ink)">Habilitar pagos en línea</p>
              <p className="text-xs text-gray-400">Los clientes podrán pagar desde la carta</p>
            </div>
            <Toggle checked={settings.mp_enabled} onChange={(v) => update('mp_enabled', v)} />
          </div>

          <AnimatePresence>
            {settings.mp_enabled && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="space-y-4 pt-4 pb-2">
                  <div className="bg-amber-50 border border-amber-100 px-4 py-3 text-xs text-amber-700">
                    <strong>Importante:</strong> Estas claves se obtienen desde tu cuenta de{' '}
                    <a
                      href="https://www.mercadopago.com.ar/developers/panel/app"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline font-bold"
                    >
                      Mercado Pago Developers
                    </a>
                    . Nunca compartas tu Access Token.
                  </div>
                  <SecretField
                    label="Access Token"
                    value={settings.mp_access_token}
                    onChange={(v) => update('mp_access_token', v)}
                    placeholder="APP_USR-..."
                  />
                  <SecretField
                    label="Public Key"
                    value={settings.mp_public_key}
                    onChange={(v) => update('mp_public_key', v)}
                    placeholder="APP_USR-..."
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        {/* Save */}
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={handleSave}
          disabled={isSaving}
          className="w-full py-3.5 bg-(--clr-ink) text-white text-sm font-black uppercase tracking-widest hover:bg-black transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-black/5"
        >
          {isSaving ? 'Guardando...' : 'Guardar configuración'}
        </motion.button>
      </div>
    </div>
  )
}
