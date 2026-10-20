import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { uploadImageFromClient } from '../../../../libs/uploadClient'

interface OrgData {
  name: string
  logo_url: string | null
  tagline: string | null
  theme: string | null
  logo_updated_at: string | null
}

interface ProfileData {
  client_name: string
  role: string
}

interface HomeViewProps {
  slug: string
}

const LOGO_COOLDOWN_DAYS = 3

function canChangeLogo(logoUpdatedAt: string | null): { allowed: boolean; daysLeft: number } {
  if (!logoUpdatedAt) return { allowed: true, daysLeft: 0 }

  const updatedAt = Date.parse(logoUpdatedAt)
  if (!Number.isFinite(updatedAt)) return { allowed: false, daysLeft: LOGO_COOLDOWN_DAYS }

  const remaining = updatedAt + LOGO_COOLDOWN_DAYS * 24 * 60 * 60 * 1000 - Date.now()
  return {
    allowed: remaining <= 0,
    daysLeft: Math.max(0, Math.ceil(remaining / (24 * 60 * 60 * 1000))),
  }
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  maxLength,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  maxLength?: number
}) {
  return (
    <div>
      <label className="block text-[10px] uppercase font-black tracking-widest text-gray-400 mb-1.5">
        {label}
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        maxLength={maxLength}
        className="w-full bg-white border border-gray-200 px-3 py-2.5 text-sm text-(--clr-ink) placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-(--clr-accent)/30 focus:border-(--clr-accent) transition-all"
      />
      {maxLength && (
        <p className="text-[10px] text-gray-300 mt-1 text-right">
          {value.length}/{maxLength}
        </p>
      )}
    </div>
  )
}

export default function HomeView({ slug }: HomeViewProps) {
  const [org, setOrg] = useState<OrgData | null>(null)
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const [name, setName] = useState('')
  const [tagline, setTagline] = useState('')
  const [pendingLogo, setPendingLogo] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const isOwner = profile?.role === 'admin' || profile?.role === 'owner'

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/organizations/${slug}`, {
          credentials: 'include',
        })
        if (!res.ok) throw new Error('Error al cargar los datos')
        const result = await res.json()
        if (result.success && result.data) {
          const { org, profile } = result.data
          setOrg(org)
          setProfile(profile)
          setName(org?.name ?? '')
          setTagline(org?.tagline ?? '')
        } else {
          throw new Error('La respuesta de la API no es válida')
        }
      } catch (e) {
        setError((e as Error).message)
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [slug])

  const handleLogoChange = useCallback((file: File) => {
    setPendingLogo(file)
    setLogoPreview(URL.createObjectURL(file))
  }, [])

  const handleSave = useCallback(async () => {
    if (!org || !isOwner) return
    setIsSaving(true)
    setError(null)
    try {
      let logoUrl = org.logo_url

      if (pendingLogo) {
        const { allowed } = canChangeLogo(org.logo_url ? org.logo_updated_at : null)
        if (!allowed) throw new Error('No podés cambiar el logo todavía')
        logoUrl = await uploadImageFromClient(pendingLogo, 'logos-url', slug)
      }

      const res = await fetch(`/api/organizations/${slug}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          tagline,
          logo: logoUrl,
        }),
      })
      const result = await res.json()
      if (!res.ok) {
        throw new Error(
          result.error === 'logo_change_unavailable'
            ? `Podés cambiar el logo en ${result.days_left} ${result.days_left === 1 ? 'día' : 'días'}.`
            : 'Error al guardar',
        )
      }

      setOrg((prev) =>
        prev
          ? {
              ...prev,
              name,
              tagline,
              logo_url: logoUrl,
              logo_updated_at: result.data?.logo_updated_at ?? prev.logo_updated_at,
            }
          : prev,
      )
      setPendingLogo(null)
      setLogoPreview(null)
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setIsSaving(false)
    }
  }, [org, name, tagline, pendingLogo, slug, isOwner])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-xs font-black uppercase tracking-widest text-gray-300 animate-pulse">
          Cargando...
        </p>
      </div>
    )
  }

  const { allowed: logoAllowed, daysLeft } = canChangeLogo(
    org?.logo_url ? org.logo_updated_at : null,
  )
  const currentLogo = logoPreview ?? org?.logo_url

  return (
    <div className="px-6 md:px-10 py-8 max-w-2xl">
      <div className="mb-8">
        <p className="text-[10px] font-black uppercase tracking-[0.25em] text-(--clr-accent) mb-1">
          Inicio
        </p>
        <h2 className="text-2xl font-bold text-(--clr-ink) tracking-tight">Tu negocio</h2>
        {profile && (
          <p className="text-sm text-gray-400 mt-1">
            Bienvenido, <span className="font-semibold text-gray-600">{profile.client_name}</span>
            <span className="ml-2 text-[10px] uppercase tracking-widest bg-gray-100 text-gray-500 px-2 py-0.5 font-bold">
              {profile.role}
            </span>
          </p>
        )}
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
            ✓ Cambios guardados correctamente
          </motion.div>
        )}
      </AnimatePresence>

      <div className="space-y-8">
        {isOwner ? (
          <>
            <div>
              <label className="block text-[10px] uppercase font-black tracking-widest text-gray-400 mb-3">
                Logo
              </label>
              <div className="flex items-start gap-5">
                <div className="w-20 h-20 bg-gray-50 border border-gray-100 flex items-center justify-center shrink-0 overflow-hidden">
                  {currentLogo ? (
                    <img src={currentLogo} alt="Logo" className="w-full h-full object-contain" />
                  ) : (
                    <svg
                      className="w-8 h-8 text-gray-300"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={1.5}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"
                      />
                    </svg>
                  )}
                </div>
                <div className="flex-1">
                  {logoAllowed ? (
                    <>
                      <button
                        onClick={() => fileRef.current?.click()}
                        className="px-4 py-2 border border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-all"
                      >
                        {pendingLogo ? 'Cambiar selección' : 'Subir nuevo logo'}
                      </button>
                      {pendingLogo && (
                        <p className="text-xs text-gray-400 mt-2">📎 {pendingLogo.name}</p>
                      )}
                      <input
                        ref={fileRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => e.target.files?.[0] && handleLogoChange(e.target.files[0])}
                      />
                      <p className="text-[10px] text-gray-300 mt-2">
                        Podés cambiar el logo cada {LOGO_COOLDOWN_DAYS} días. Recomendado: PNG con
                        fondo transparente.
                      </p>
                    </>
                  ) : (
                    <div className="bg-amber-50 border border-amber-100 px-3 py-2.5">
                      <p className="text-xs text-amber-700 font-medium">
                        Próximo cambio disponible en{' '}
                        <strong>
                          {daysLeft} {daysLeft === 1 ? 'día' : 'días'}
                        </strong>
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-5">
              <Field
                label="Nombre del negocio"
                value={name}
                onChange={setName}
                placeholder="Ej: Casa Oliva"
                maxLength={60}
              />
              <Field
                label="Tagline"
                value={tagline}
                onChange={setTagline}
                placeholder="Ej: Cocina de estación para compartir"
                maxLength={100}
              />
            </div>

            <div className="bg-gray-50 border border-gray-100 px-5 py-4 space-y-3">
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3">
                Datos de solo lectura
              </p>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400 font-medium">Tema visual</span>
                <span className="text-xs font-bold text-(--clr-ink) uppercase tracking-wide">
                  {org?.theme ?? '—'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400 font-medium">Slug / URL</span>
                <span className="text-xs font-bold text-(--clr-ink) font-mono">{slug}</span>
              </div>
            </div>

            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={handleSave}
              disabled={isSaving}
              className="w-full py-3.5 bg-(--clr-ink) text-white text-sm font-black uppercase tracking-widest hover:bg-black transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-black/5"
            >
              {isSaving ? 'Guardando...' : 'Guardar cambios'}
            </motion.button>
          </>
        ) : (
          <div className="border border-gray-100 bg-gray-50 px-5 py-4">
            <p className="text-sm font-semibold text-(--clr-ink)">Administración del sitio</p>
            <p className="mt-2 text-sm leading-relaxed text-gray-500">
              La identidad y la información pública del negocio solo están disponibles para el
              dueño.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
