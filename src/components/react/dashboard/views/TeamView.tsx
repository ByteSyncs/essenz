import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface Member {
  id: string
  client_name: string | null
  username: string | null
  created_at: string
}

const ERROR_MESSAGES: Record<string, string> = {
  username_taken: 'Ese usuario ya existe.',
  invalid_username:
    'Usuario inválido: de 3 a 24 caracteres, solo letras, números, guion o guion bajo.',
  invalid_password: 'La contraseña debe tener entre 8 y 72 caracteres.',
  invalid_name: 'El nombre debe tener entre 2 y 60 caracteres.',
  member_limit_reached: 'Alcanzaste el máximo de empleados.',
}

const fieldClass =
  'w-full bg-white border border-gray-200 px-3 py-2.5 text-sm text-(--clr-ink) placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-(--clr-accent)/30 focus:border-(--clr-accent) transition-all'
const labelClass = 'block text-[10px] uppercase font-black tracking-widest text-gray-400 mb-1.5'

export default function TeamView({ slug }: { slug: string }) {
  const [members, setMembers] = useState<Member[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [resetId, setResetId] = useState<string | null>(null)
  const [resetPassword, setResetPassword] = useState('')
  const [loginUrl, setLoginUrl] = useState('')

  useEffect(() => {
    setLoginUrl(`${window.location.origin}/auth/staff?negocio=${slug}`)
  }, [slug])

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/organizations/${slug}/team`, { credentials: 'include' })
      const result = await res.json()
      if (!res.ok || !result.success) throw new Error('No pudimos cargar el equipo.')
      setMembers(result.data ?? [])
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setIsLoading(false)
    }
  }, [slug])

  useEffect(() => {
    load()
  }, [load])

  const flash = (message: string) => {
    setSuccess(message)
    setTimeout(() => setSuccess(null), 3000)
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)
    try {
      const res = await fetch(`/api/organizations/${slug}/team`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, username, password }),
      })
      const result = await res.json()
      if (!res.ok || !result.success) {
        throw new Error(ERROR_MESSAGES[result.error] ?? 'No pudimos crear el empleado.')
      }
      setMembers((prev) => [result.data, ...prev])
      setName('')
      setUsername('')
      setPassword('')
      flash('Empleado creado.')
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (id: string) => {
    setError(null)
    try {
      const res = await fetch(`/api/organizations/${slug}/team?id=${id}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      if (!res.ok) throw new Error('No pudimos eliminar al empleado.')
      setMembers((prev) => prev.filter((m) => m.id !== id))
      flash('Empleado eliminado. Su acceso quedó revocado.')
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setConfirmDelete(null)
    }
  }

  const handleReset = async (id: string) => {
    setError(null)
    try {
      const res = await fetch(`/api/organizations/${slug}/team`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, password: resetPassword }),
      })
      const result = await res.json()
      if (!res.ok || !result.success) {
        throw new Error(ERROR_MESSAGES[result.error] ?? 'No pudimos cambiar la contraseña.')
      }
      setResetId(null)
      setResetPassword('')
      flash('Contraseña actualizada.')
    } catch (err) {
      setError((err as Error).message)
    }
  }

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
    <div className="px-6 md:px-10 py-8 max-w-3xl">
      <div className="mb-8">
        <p className="text-[10px] font-black uppercase tracking-[0.25em] text-(--clr-accent) mb-1">
          Equipo
        </p>
        <h2 className="text-2xl font-bold text-(--clr-ink) tracking-tight">Empleados</h2>
        <p className="text-sm text-gray-400 mt-1">
          Crean pedidos y manejan stock, pero no ven estadísticas, gastos ni configuración.
        </p>
        {loginUrl && (
          <p className="text-xs text-gray-400 mt-3">
            Ingreso para empleados:{' '}
            <span className="font-mono text-(--clr-ink) break-all">{loginUrl}</span>
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
            className="mb-6 bg-green-50 border border-green-100 text-green-700 text-sm px-4 py-3"
            role="status"
          >
            {success}
          </motion.div>
        )}
      </AnimatePresence>

      <form
        onSubmit={handleCreate}
        className="bg-gray-50 border border-gray-100 p-6 mb-8 space-y-4"
      >
        <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-400">
          Nuevo empleado
        </h3>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className={labelClass}>Nombre</label>
            <input
              className={fieldClass}
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={60}
              placeholder="Ej: Lucía"
              required
            />
          </div>
          <div>
            <label className={labelClass}>Usuario</label>
            <input
              className={fieldClass}
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase())}
              maxLength={24}
              placeholder="Ej: lucia"
              autoComplete="off"
              required
            />
          </div>
          <div>
            <label className={labelClass}>Contraseña</label>
            <input
              type="text"
              className={fieldClass}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              maxLength={72}
              placeholder="Mínimo 8 caracteres"
              autoComplete="off"
              required
            />
          </div>
        </div>
        <motion.button
          whileTap={{ scale: 0.97 }}
          type="submit"
          disabled={isSubmitting}
          className="px-5 py-2.5 bg-(--clr-ink) text-white text-xs font-black uppercase tracking-widest hover:bg-black transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? 'Creando...' : 'Crear empleado'}
        </motion.button>
      </form>

      {members.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-gray-200">
          <p className="text-sm text-gray-400">Todavía no creaste empleados.</p>
        </div>
      ) : (
        <div className="divide-y divide-gray-100 border border-gray-100">
          {members.map((member) => (
            <div key={member.id} className="px-5 py-4">
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-(--clr-ink) truncate">
                    {member.client_name}
                  </p>
                  <p className="text-xs text-gray-400 font-mono truncate">{member.username}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => {
                      setResetId(resetId === member.id ? null : member.id)
                      setResetPassword('')
                    }}
                    className="px-3 py-1.5 border border-gray-200 text-[10px] font-black uppercase tracking-widest text-gray-500 hover:bg-gray-50 transition-all"
                  >
                    Contraseña
                  </button>
                  {confirmDelete === member.id ? (
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-gray-400">¿Eliminar?</span>
                      <button
                        onClick={() => handleDelete(member.id)}
                        className="px-2 py-1 bg-red-500 text-white text-[10px] font-black hover:bg-red-600 transition-colors"
                      >
                        Sí
                      </button>
                      <button
                        onClick={() => setConfirmDelete(null)}
                        className="px-2 py-1 bg-gray-100 text-gray-600 text-[10px] font-black hover:bg-gray-200 transition-colors"
                      >
                        No
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmDelete(member.id)}
                      className="px-3 py-1.5 border border-gray-200 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-red-500 hover:border-red-200 hover:bg-red-50 transition-all"
                    >
                      Eliminar
                    </button>
                  )}
                </div>
              </div>

              <AnimatePresence>
                {resetId === member.id && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="flex gap-2 pt-4">
                      <input
                        className={fieldClass}
                        value={resetPassword}
                        onChange={(e) => setResetPassword(e.target.value)}
                        maxLength={72}
                        placeholder="Nueva contraseña"
                        autoComplete="off"
                      />
                      <button
                        onClick={() => handleReset(member.id)}
                        className="px-4 bg-(--clr-ink) text-white text-[10px] font-black uppercase tracking-widest hover:bg-black transition-colors shrink-0"
                      >
                        Guardar
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
