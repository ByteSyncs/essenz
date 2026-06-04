import React, { useState, useId } from 'react'
import { errorMessages } from '../../libs/errorMessages'

type FieldError = {
  email?: string
  password?: string
}

export default function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [errors, setErrors] = useState<FieldError>({})
  const [touched, setTouched] = useState({ email: false, password: false })
  const [apiError, setApiError] = useState<string | null>(null)

  const [isEmailFocused, setIsEmailFocused] = useState(false)
  const [isPasswordFocused, setIsPasswordFocused] = useState(false)

  const emailId = useId()
  const passwordId = useId()

  const validate = (): FieldError => {
    const newErrors: FieldError = {}
    if (!email) {
      newErrors.email = 'El correo es requerido.'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = 'Ingresá un correo válido.'
    }
    if (!password) {
      newErrors.password = 'La contraseña es requerida.'
    } else if (password.length < 6) {
      newErrors.password = 'Mínimo 6 caracteres.'
    }
    return newErrors
  }

  const handleBlur = (field: 'email' | 'password') => {
    if (field === 'email') setIsEmailFocused(false)
    if (field === 'password') setIsPasswordFocused(false)

    setTouched((prev) => ({ ...prev, [field]: true }))
    const result = validate()
    setErrors((prev) => ({ ...prev, [field]: result[field] }))
  }

  const handleInputChange = (field: 'email' | 'password', value: string) => {
    if (field === 'email') setEmail(value)
    if (field === 'password') setPassword(value)

    if (apiError) setApiError(null)
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setApiError(null)
    setTouched({ email: true, password: true })

    const result = validate()
    setErrors(result)
    if (Object.keys(result).length > 0) return

    setIsLoading(true)

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      })

      const data = await res.json()

      if (!res.ok) {
        const backendErrorKey = data.error || 'internal_server_error'
        setApiError(backendErrorKey)
        setIsLoading(false)
        return
      }

      if (data && data.url) {
        window.location.href = data.url
      }
    } catch (err) {
      console.error('Network error:', err)
      setApiError('internal_server_error')
    } finally {
      setIsLoading(false)
    }
  }

  const getInputStyle = (isFocused: boolean, hasError: boolean) => ({
    width: '100%',
    padding: '0.875rem 1rem',
    borderRadius: '4px',
    background: 'rgba(255,255,255,0.6)',
    color: 'var(--clr-ink-dark)',
    fontSize: '0.9rem',
    outline: 'none',
    boxSizing: 'border-box' as const,
    transition: 'border-color 0.2s, box-shadow 0.2s',
    border: hasError
      ? '1px solid var(--clr-accent)'
      : isFocused
        ? '1px solid var(--clr-accent)'
        : '1px solid rgba(44,30,22,0.2)',
    boxShadow: isFocused ? '0 0 0 3px rgba(139,90,43,0.1)' : 'none',
  })

  return (
    <>
      <div style={{ fontFamily: "'DM Sans', sans-serif" }}>
        <div style={{ marginBottom: '2.5rem' }}>
          <p
            style={{
              fontSize: '0.7rem',
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              color: 'var(--clr-accent)',
              marginBottom: '0.75rem',
            }}
          >
            Acceso exclusivo
          </p>
          <h2
            style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontSize: '2.25rem',
              fontWeight: 300,
              color: 'var(--clr-ink-dark)',
              lineHeight: 1.2,
              marginBottom: '0.5rem',
            }}
          >
            Bienvenido de vuelta
          </h2>
          <p
            style={{
              fontSize: '0.875rem',
              color: 'var(--clr-accent-light)',
              fontWeight: 300,
            }}
          >
            Ingresá tus credenciales para continuar.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          noValidate
          style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}
        >
          {apiError && (
            <div
              style={{
                padding: '0.875rem 1rem',
                fontSize: '0.875rem',
                color: '#ef4444',
                backgroundColor: 'color-mix(in srgb, #ef4444 6%, transparent)',
                border: '1px solid color-mix(in srgb, #ef4444 20%, transparent)',
                borderRadius: '4px',
                lineHeight: '1.4',
              }}
            >
              {errorMessages[apiError] || errorMessages['internal_server_error']}
            </div>
          )}

          <div>
            <label
              htmlFor={emailId}
              style={{
                display: 'block',
                fontSize: '0.7rem',
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: 'var(--clr-ink)',
                marginBottom: '0.5rem',
                fontWeight: 500,
              }}
            >
              Correo electrónico
            </label>
            <input
              id={emailId}
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              onFocus={() => setIsEmailFocused(true)}
              onBlur={() => handleBlur('email')}
              placeholder="hola@tucafeteria.com"
              aria-invalid={!!(touched.email && errors.email)}
              aria-describedby={touched.email && errors.email ? `${emailId}-error` : undefined}
              style={getInputStyle(isEmailFocused, !!(touched.email && errors.email))}
            />
            {touched.email && errors.email && (
              <p
                id={`${emailId}-error`}
                role="alert"
                style={{
                  marginTop: '0.375rem',
                  fontSize: '0.75rem',
                  color: 'var(--clr-accent)',
                }}
              >
                {errors.email}
              </p>
            )}
          </div>

          <div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '0.5rem',
              }}
            >
              <label
                htmlFor={passwordId}
                style={{
                  fontSize: '0.7rem',
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  color: 'var(--clr-ink)',
                  fontWeight: 500,
                }}
              >
                Contraseña
              </label>
            </div>
            <div style={{ position: 'relative' }}>
              <input
                id={passwordId}
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={(e) => handleInputChange('password', e.target.value)}
                onFocus={() => setIsPasswordFocused(true)}
                onBlur={() => handleBlur('password')}
                placeholder="••••••••"
                aria-invalid={!!(touched.password && errors.password)}
                aria-describedby={
                  touched.password && errors.password ? `${passwordId}-error` : undefined
                }
                style={{
                  ...getInputStyle(isPasswordFocused, !!(touched.password && errors.password)),
                  paddingRight: '3rem',
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                style={{
                  position: 'absolute',
                  right: '0.75rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '4px',
                  color: 'var(--clr-accent-light)',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                {showPassword ? (
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
            {touched.password && errors.password && (
              <p
                id={`${passwordId}-error`}
                role="alert"
                style={{
                  marginTop: '0.375rem',
                  fontSize: '0.75rem',
                  color: 'var(--clr-accent)',
                }}
              >
                {errors.password}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoading}
            style={{
              marginTop: '0.5rem',
              width: '100%',
              padding: '1rem',
              background: isLoading ? 'var(--clr-accent-light)' : 'var(--clr-ink-dark)',
              color: 'var(--clr-bg)',
              border: 'none',
              borderRadius: '4px',
              fontSize: '0.75rem',
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              fontWeight: 500,
              cursor: isLoading ? 'not-allowed' : 'pointer',
              transition: 'background 0.25s, transform 0.1s',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.625rem',
              fontFamily: "'DM Sans', sans-serif",
            }}
            onMouseEnter={(e) => {
              if (!isLoading) e.currentTarget.style.background = 'var(--clr-accent)'
            }}
            onMouseLeave={(e) => {
              if (!isLoading) e.currentTarget.style.background = 'var(--clr-ink-dark)'
            }}
          >
            {isLoading ? (
              <>
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  style={{ animation: 'spin 0.8s linear infinite' }}
                >
                  <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                </svg>
                Verificando...
              </>
            ) : (
              'Ingresar al panel'
            )}
          </button>
        </form>
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </>
  )
}
