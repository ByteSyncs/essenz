import { useCallback, useEffect, useId, useState } from 'react'

interface AccessState {
  enabled: boolean
  accessPath: string
  staffCanEditSettings: boolean
}

type Confirm = 'disable' | 'rotate' | null

const FOCUS =
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--clr-ink)'
const INPUT = `min-h-11 w-full border border-gray-300 bg-white px-3 py-2 text-base text-(--clr-ink) ${FOCUS}`
const PRIMARY = `min-h-11 bg-(--clr-ink) px-5 text-sm font-semibold text-white transition-colors hover:bg-black disabled:cursor-not-allowed disabled:opacity-40 ${FOCUS}`
const SECONDARY = `min-h-11 border border-gray-300 bg-white px-4 text-sm font-semibold text-(--clr-ink) transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 ${FOCUS}`

function errorText(body: unknown, fallback: string) {
  const error = (body as { error?: unknown } | null)?.error
  if (Array.isArray(error) && typeof error[0]?.message === 'string') return error[0].message
  return fallback
}

async function request(slug: string, method: string, body?: unknown) {
  const response = await fetch(`/api/organizations/${slug}/access`, {
    method,
    credentials: 'include',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  })
  let json: unknown = null
  try {
    json = await response.json()
  } catch {
    json = null
  }
  return { ok: response.ok && (json as { success?: boolean } | null)?.success === true, json }
}

function Switch({
  checked,
  onChange,
  label,
  disabled,
}: {
  checked: boolean
  onChange: (value: boolean) => void
  label: string
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center transition-colors disabled:opacity-50 ${FOCUS} ${
        checked ? 'bg-(--clr-ink)' : 'bg-gray-300'
      }`}
    >
      <span
        className={`inline-block h-4.5 w-4.5 bg-white shadow-sm transition-transform ${
          checked ? 'translate-x-6' : 'translate-x-0.5'
        }`}
      />
    </button>
  )
}

function PasswordField({
  value,
  onChange,
  label,
  hint,
}: {
  value: string
  onChange: (value: string) => void
  label: string
  hint: string
}) {
  const id = useId()
  const [visible, setVisible] = useState(false)
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-gray-900">
        {label}
      </label>
      <div className="mt-2 flex gap-2">
        <input
          id={id}
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          autoComplete="new-password"
          minLength={8}
          maxLength={72}
          aria-describedby={`${id}-hint`}
          className={INPUT}
        />
        <button
          type="button"
          aria-pressed={visible}
          onClick={() => setVisible((current) => !current)}
          className={`${SECONDARY} shrink-0`}
        >
          {visible ? 'Ocultar' : 'Mostrar'}
        </button>
      </div>
      <p id={`${id}-hint`} className="mt-1.5 text-sm text-gray-600">
        {hint}
      </p>
    </div>
  )
}

export default function AccessView({ slug }: { slug: string; isOwner?: boolean }) {
  const [state, setState] = useState<AccessState | null>(null)
  const [loadError, setLoadError] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState<Confirm>(null)
  const [copied, setCopied] = useState(false)
  const [origin, setOrigin] = useState('')

  useEffect(() => {
    setOrigin(window.location.origin)
  }, [])

  const load = useCallback(async () => {
    setLoadError(false)
    try {
      const result = await request(slug, 'GET')
      if (!result.ok) throw new Error('load')
      setState((result.json as { data: AccessState }).data)
    } catch {
      setLoadError(true)
    }
  }, [slug])

  useEffect(() => {
    load()
  }, [load])

  async function apply(
    run: () => Promise<{ ok: boolean; json: unknown }>,
    success: string,
    fallback: string,
  ) {
    setBusy(true)
    setMessage(null)
    try {
      const result = await run()
      if (!result.ok) {
        setMessage({ kind: 'error', text: errorText(result.json, fallback) })
        return false
      }
      setState((result.json as { data: AccessState }).data)
      setMessage({ kind: 'ok', text: success })
      return true
    } catch {
      setMessage({ kind: 'error', text: fallback })
      return false
    } finally {
      setBusy(false)
      setConfirm(null)
    }
  }

  async function enableOrChangePassword(event: React.FormEvent) {
    event.preventDefault()
    const enabling = !state?.enabled
    const done = await apply(
      () => request(slug, 'PUT', { enabled: true, password }),
      enabling
        ? 'Acceso activado. Compartí el link y la contraseña con tu personal.'
        : 'Contraseña actualizada. Las sesiones anteriores se cerraron.',
      'No pudimos guardar la contraseña.',
    )
    if (done) setPassword('')
  }

  async function copyLink() {
    if (!state) return
    try {
      await navigator.clipboard.writeText(`${origin}${state.accessPath}`)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch {
      setMessage({ kind: 'error', text: 'No pudimos copiar. Seleccioná el link y copialo.' })
    }
  }

  if (loadError) {
    return (
      <div className="max-w-2xl px-5 py-8 sm:px-8" role="alert">
        <p className="text-sm text-gray-800">No pudimos cargar el acceso del personal.</p>
        <button type="button" onClick={load} className={`${SECONDARY} mt-4`}>
          Reintentar
        </button>
      </div>
    )
  }

  if (!state) {
    return (
      <div className="max-w-2xl px-5 py-8 sm:px-8" aria-busy="true">
        <div className="h-7 w-56 animate-pulse bg-gray-100" />
        <div className="mt-6 h-40 animate-pulse bg-gray-100" />
      </div>
    )
  }

  const link = `${origin}${state.accessPath}`

  return (
    <div className="max-w-2xl px-5 py-8 sm:px-8 md:px-10">
      <h2 className="text-2xl font-bold tracking-tight text-(--clr-ink)">Acceso del personal</h2>
      <p className="mt-2 text-sm text-gray-700">
        El personal entra con un link privado y la contraseña que elijas. Ese acceso solo sirve para
        esta sucursal: carta, pedidos, inventario, gastos, estadísticas, QR y configuración.
      </p>

      <div aria-live="polite" className="mt-5 min-h-6">
        {message && (
          <p
            role={message.kind === 'error' ? 'alert' : 'status'}
            className={`border px-4 py-3 text-sm ${
              message.kind === 'error'
                ? 'border-red-200 bg-red-50 text-red-800'
                : 'border-green-200 bg-green-50 text-green-900'
            }`}
          >
            {message.text}
          </p>
        )}
      </div>

      {!state.enabled ? (
        <form onSubmit={enableOrChangePassword} className="mt-6 space-y-5">
          <PasswordField
            value={password}
            onChange={setPassword}
            label="Contraseña del personal"
            hint="Entre 8 y 72 caracteres. Se la pasás vos al personal; no la podemos mostrar después."
          />
          <button type="submit" disabled={busy || password.length < 8} className={PRIMARY}>
            {busy ? 'Activando...' : 'Activar acceso'}
          </button>
        </form>
      ) : (
        <div className="mt-6 space-y-8">
          <section aria-labelledby="access-link">
            <h3 id="access-link" className="text-base font-bold text-(--clr-ink)">
              Link de acceso
            </h3>
            <p className="mt-1 text-sm text-gray-700">
              No vence. Cualquiera que lo tenga necesita además la contraseña.
            </p>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <input
                readOnly
                value={link}
                aria-label="Link de acceso del personal"
                onFocus={(event) => event.currentTarget.select()}
                className={`${INPUT} font-mono text-sm`}
              />
              <button type="button" onClick={copyLink} className={`${SECONDARY} shrink-0`}>
                {copied ? 'Copiado' : 'Copiar link'}
              </button>
            </div>
            {confirm === 'rotate' ? (
              <div className="mt-3 border border-gray-300 p-4" role="group" aria-label="Confirmar">
                <p className="text-sm text-gray-800">
                  El link actual dejará de funcionar. Quienes ya iniciaron sesión siguen adentro.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={busy}
                    className={PRIMARY}
                    onClick={() =>
                      apply(
                        () => request(slug, 'POST'),
                        'Generamos un link nuevo. Compartilo con tu personal.',
                        'No pudimos generar el link.',
                      )
                    }
                  >
                    Generar link nuevo
                  </button>
                  <button type="button" className={SECONDARY} onClick={() => setConfirm(null)}>
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirm('rotate')}
                className={`${SECONDARY} mt-3`}
              >
                Generar un link nuevo
              </button>
            )}
          </section>

          <section aria-labelledby="access-permissions" className="border-t border-gray-200 pt-6">
            <h3 id="access-permissions" className="text-base font-bold text-(--clr-ink)">
              Permisos
            </h3>
            <div className="mt-3 flex items-center justify-between gap-5">
              <div>
                <p className="text-sm font-semibold text-(--clr-ink)">Editar la configuración</p>
                <p className="mt-1 text-sm text-gray-700">
                  Si está apagado, el personal ve la configuración pero no puede cambiarla.
                </p>
              </div>
              <Switch
                checked={state.staffCanEditSettings}
                disabled={busy}
                label="Permitir que el personal edite la configuración"
                onChange={(value) =>
                  apply(
                    () => request(slug, 'PUT', { staffCanEditSettings: value }),
                    value
                      ? 'El personal ahora puede editar la configuración.'
                      : 'La configuración quedó en solo lectura para el personal.',
                    'No pudimos guardar el permiso.',
                  )
                }
              />
            </div>
          </section>

          <section aria-labelledby="access-password" className="border-t border-gray-200 pt-6">
            <h3 id="access-password" className="text-base font-bold text-(--clr-ink)">
              Cambiar la contraseña
            </h3>
            <form onSubmit={enableOrChangePassword} className="mt-3 space-y-4">
              <PasswordField
                value={password}
                onChange={setPassword}
                label="Contraseña nueva"
                hint="Al cambiarla se cierran todas las sesiones del personal."
              />
              <button type="submit" disabled={busy || password.length < 8} className={SECONDARY}>
                {busy ? 'Guardando...' : 'Cambiar contraseña'}
              </button>
            </form>
          </section>

          <section aria-labelledby="access-off" className="border-t border-gray-200 pt-6">
            <h3 id="access-off" className="text-base font-bold text-(--clr-ink)">
              Desactivar el acceso
            </h3>
            <p className="mt-1 text-sm text-gray-700">
              Cierra todas las sesiones y el link deja de funcionar hasta que lo actives otra vez
              con una contraseña.
            </p>
            {confirm === 'disable' ? (
              <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Confirmar">
                <button
                  type="button"
                  disabled={busy}
                  className={`min-h-11 bg-red-700 px-5 text-sm font-semibold text-white hover:bg-red-800 disabled:opacity-40 ${FOCUS}`}
                  onClick={() =>
                    apply(
                      () => request(slug, 'PUT', { enabled: false }),
                      'Acceso desactivado. Se cerraron las sesiones del personal.',
                      'No pudimos desactivar el acceso.',
                    )
                  }
                >
                  Sí, desactivar
                </button>
                <button type="button" className={SECONDARY} onClick={() => setConfirm(null)}>
                  Cancelar
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirm('disable')}
                className={`${SECONDARY} mt-3`}
              >
                Desactivar acceso
              </button>
            )}
          </section>
        </div>
      )}
    </div>
  )
}
