import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'

const STORAGE_KEY = 'essenz_staff_slug'
const SLUG_PATTERN = /^[a-z0-9-]{2,60}$/
const USERNAME_PATTERN = /^[a-z0-9][a-z0-9_-]{2,23}$/

const MESSAGES = {
  invalid: 'Negocio, usuario o contraseña incorrectos. Revisá los datos e intentá de nuevo.',
  rate_limited: 'Hiciste demasiados intentos. Esperá un minuto e intentá de nuevo.',
  network: 'No pudimos conectarnos. Revisá tu conexión a internet e intentá de nuevo.',
  server: 'Algo salió mal de nuestro lado. Intentá de nuevo en unos segundos.',
}

const normalizeSlug = (value: string) => value.trim().toLowerCase().replace(/\s+/g, '-')
const normalizeUsername = (value: string) => value.trim().toLowerCase()

function readStoredSlug() {
  try {
    return localStorage.getItem(STORAGE_KEY) ?? ''
  } catch {
    return ''
  }
}

function storeSlug(value: string) {
  try {
    localStorage.setItem(STORAGE_KEY, value)
  } catch {
    return
  }
}

const EASE = 'ease-[cubic-bezier(0.23,1,0.32,1)]'
const fieldClass =
  'w-full h-12 bg-white border border-gray-200 px-3.5 text-base text-(--clr-ink) placeholder-gray-300 rounded-none focus:outline-none focus:border-(--clr-accent) focus:ring-2 focus:ring-(--clr-accent)/25 transition-[border-color,box-shadow] duration-150'
const labelClass = 'block text-[10px] uppercase font-black tracking-widest text-gray-400 mb-1.5'

export default function StaffSignInForm() {
  const reduceMotion = useReducedMotion()
  const [slug, setSlug] = useState('')
  const [slugLocked, setSlugLocked] = useState(false)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const slugRef = useRef<HTMLInputElement>(null)
  const usernameRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const fromUrl = normalizeSlug(new URLSearchParams(window.location.search).get('negocio') ?? '')
    const initial = SLUG_PATTERN.test(fromUrl) ? fromUrl : readStoredSlug()
    if (initial) {
      setSlug(initial)
      setSlugLocked(true)
    }
    if (window.matchMedia('(pointer: fine)').matches) {
      requestAnimationFrame(() => {
        if (initial) usernameRef.current?.focus()
        else slugRef.current?.focus()
      })
    }
  }, [])

  useEffect(() => {
    const reset = (event: PageTransitionEvent) => {
      if (event.persisted) setLoading(false)
    }
    window.addEventListener('pageshow', reset)
    return () => window.removeEventListener('pageshow', reset)
  }, [])

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (loading) return

    const cleanSlug = normalizeSlug(slug)
    const cleanUsername = normalizeUsername(username)

    if (!SLUG_PATTERN.test(cleanSlug) || !USERNAME_PATTERN.test(cleanUsername) || !password) {
      setError(MESSAGES.invalid)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/auth/staff-sign-in', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug: cleanSlug, username: cleanUsername, password }),
      })

      if (res.ok) {
        const result = await res.json()
        storeSlug(cleanSlug)
        window.location.href = result.data.redirect
        return
      }

      setError(
        res.status === 429
          ? MESSAGES.rate_limited
          : res.status >= 500
            ? MESSAGES.server
            : MESSAGES.invalid,
      )
    } catch {
      setError(MESSAGES.network)
    }

    setLoading(false)
  }

  const unlockSlug = () => {
    setSlugLocked(false)
    requestAnimationFrame(() => slugRef.current?.focus())
  }

  return (
    <main className="min-h-dvh flex items-center justify-center bg-(--clr-bg) px-4 pt-[max(2rem,env(safe-area-inset-top))] pb-[max(2rem,env(safe-area-inset-bottom))]">
      <form
        onSubmit={handleSubmit}
        noValidate
        className="w-full max-w-sm bg-white border border-gray-100 p-6 sm:p-8 space-y-5 [-webkit-tap-highlight-color:transparent]"
      >
        <header>
          <p className="text-[10px] font-black uppercase tracking-[0.25em] text-(--clr-accent) mb-1">
            Equipo
          </p>
          <h1 className="text-2xl font-bold tracking-tight text-(--clr-ink)">Ingreso del equipo</h1>
          <p className="text-sm text-gray-400 mt-2">
            Usá el usuario y la contraseña que te dio el dueño del local.
          </p>
        </header>

        <div aria-live="polite">
          <AnimatePresence initial={false}>
            {error && (
              <motion.div
                key={error}
                role="alert"
                initial={{ opacity: 0, y: reduceMotion ? 0 : -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18, ease: [0.23, 1, 0.32, 1] }}
                className="bg-red-50 border border-red-100 text-red-700 text-sm px-4 py-3"
              >
                {error}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div>
          <label htmlFor="staff-slug" className={labelClass}>
            Negocio
          </label>
          {slugLocked ? (
            <div className="flex items-center justify-between gap-3 h-12 bg-gray-50 border border-gray-100 px-3.5">
              <span className="min-w-0 truncate font-mono text-sm text-(--clr-ink)" title={slug}>
                {slug}
              </span>
              <button
                type="button"
                onClick={unlockSlug}
                className="shrink-0 min-h-11 px-2 -mr-2 text-[10px] font-black uppercase tracking-widest text-gray-400 touch-manipulation select-none active:text-(--clr-ink) hover:text-(--clr-ink)"
              >
                Cambiar
              </button>
            </div>
          ) : (
            <input
              ref={slugRef}
              id="staff-slug"
              className={fieldClass}
              value={slug}
              onChange={(event) => setSlug(event.target.value)}
              placeholder="nombre-del-local"
              maxLength={60}
              autoComplete="organization"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              enterKeyHint="next"
            />
          )}
        </div>

        <div>
          <label htmlFor="staff-username" className={labelClass}>
            Usuario
          </label>
          <input
            ref={usernameRef}
            id="staff-username"
            className={fieldClass}
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            maxLength={24}
            autoComplete="username"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            enterKeyHint="next"
          />
        </div>

        <div>
          <label htmlFor="staff-password" className={labelClass}>
            Contraseña
          </label>
          <div className="relative">
            <input
              id="staff-password"
              type={showPassword ? 'text' : 'password'}
              className={`${fieldClass} pr-12`}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              maxLength={72}
              autoComplete="current-password"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              enterKeyHint="go"
            />
            <button
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              aria-pressed={showPassword}
              className="absolute right-0 top-0 h-12 w-12 flex items-center justify-center text-gray-400 touch-manipulation select-none active:text-(--clr-ink) hover:text-(--clr-ink) transition-colors duration-150"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.75}
                aria-hidden="true"
              >
                {showPassword ? (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88"
                  />
                ) : (
                  <>
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
                  </>
                )}
              </svg>
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className={`w-full min-h-12 py-3.5 bg-(--clr-ink) text-white text-sm font-black uppercase tracking-widest touch-manipulation select-none transition-[transform,background-color,opacity] duration-150 ${EASE} active:scale-[0.97] hover:bg-black disabled:opacity-60 disabled:active:scale-100`}
        >
          {loading ? 'Ingresando…' : 'Ingresar'}
        </button>

        <p className="text-xs text-gray-400 text-center">
          ¿Sos el dueño?{' '}
          <a
            href="/auth/sign-in"
            className="font-bold text-(--clr-ink) underline underline-offset-2"
          >
            Ingresá acá
          </a>
        </p>
      </form>
    </main>
  )
}
