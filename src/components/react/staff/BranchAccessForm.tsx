import { useId, useState } from 'react'

const FOCUS =
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--clr-ink)'

const MESSAGES: Record<string, string> = {
  invalid_credentials: 'La contraseña no es correcta o el acceso ya no está disponible.',
  rate_limited: 'Demasiados intentos. Esperá unos minutos y volvé a probar.',
}

export default function BranchAccessForm({ token, name }: { token: string; name: string }) {
  const passwordId = useId()
  const errorId = useId()
  const [password, setPassword] = useState('')
  const [visible, setVisible] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (!password || pending) return
    setPending(true)
    setError(null)
    try {
      const response = await fetch('/api/auth/branch-access', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      })
      const body = await response.json().catch(() => null)
      if (response.ok && body?.success && typeof body.data?.redirect === 'string') {
        window.location.assign(body.data.redirect)
        return
      }
      setError(MESSAGES[body?.error] ?? 'No pudimos ingresar. Probá de nuevo.')
    } catch {
      setError('No pudimos conectarnos. Revisá tu conexión y probá de nuevo.')
    }
    setPending(false)
  }

  return (
    <form onSubmit={submit} noValidate className="mt-8 space-y-5">
      <div>
        <label htmlFor={passwordId} className="block text-sm font-medium text-gray-900">
          Contraseña del turno
        </label>
        <div className="mt-2 flex gap-2">
          <input
            id={passwordId}
            type={visible ? 'text' : 'password'}
            value={password}
            onChange={(event) => {
              setPassword(event.target.value)
              if (error) setError(null)
            }}
            autoComplete="current-password"
            autoFocus
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? errorId : undefined}
            className={`min-h-12 w-full border border-gray-400 bg-white px-3 text-base text-(--clr-ink) ${FOCUS}`}
          />
          <button
            type="button"
            aria-pressed={visible}
            onClick={() => setVisible((current) => !current)}
            className={`min-h-12 shrink-0 border border-gray-400 bg-white px-4 text-sm font-semibold text-(--clr-ink) hover:bg-gray-50 ${FOCUS}`}
          >
            {visible ? 'Ocultar' : 'Mostrar'}
          </button>
        </div>
      </div>

      <div aria-live="polite">
        {error && (
          <p
            id={errorId}
            role="alert"
            className="border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
          >
            {error}
          </p>
        )}
      </div>

      <button
        type="submit"
        disabled={!password || pending}
        className={`min-h-12 w-full bg-(--clr-ink) text-sm font-semibold text-white transition-colors hover:bg-black disabled:cursor-not-allowed disabled:opacity-40 ${FOCUS}`}
      >
        {pending ? 'Ingresando...' : `Ingresar a ${name}`}
      </button>
    </form>
  )
}
