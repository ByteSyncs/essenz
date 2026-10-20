import { useEffect, useRef, useState } from 'react'
import { Menu, X } from 'lucide-react'
import logo from '../../assets/essenz.webp'

const links = [
  { name: 'Plataforma', href: '/#platform' },
  { name: 'Demos', href: '/#templates' },
  { name: 'Planes', href: '/#plans' },
]

const SIGN_IN_PATH = '/auth/sign-in'
const PLANS_PATH = '/plans'
const CONTACT_PATH = '/#contact'
const DESKTOP_QUERY = '(min-width: 80rem)'

const pressable =
  'touch-manipulation select-none transition-[transform,color,background-color,opacity] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] active:scale-[0.97] motion-reduce:transition-none'
const focusRing =
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--clr-accent)'
const barLabel = 'text-[11px] font-bold uppercase tracking-[0.12em] whitespace-nowrap'

interface NavProps {
  currentPath?: string
}

export default function Nav({ currentPath }: NavProps) {
  const [isOpen, setIsOpen] = useState(false)
  const navRef = useRef<HTMLElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  const close = () => setIsOpen(false)

  useEffect(() => {
    if (!isOpen) return
    const root = document.documentElement
    const previous = root.style.overflow
    root.style.overflow = 'hidden'
    return () => {
      root.style.overflow = previous
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      setIsOpen(false)
      buttonRef.current?.focus()
    }
    const onPointerDown = (event: PointerEvent) => {
      if (navRef.current && !navRef.current.contains(event.target as Node)) setIsOpen(false)
    }

    document.addEventListener('keydown', onKeyDown)
    document.addEventListener('pointerdown', onPointerDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.removeEventListener('pointerdown', onPointerDown)
    }
  }, [isOpen])

  useEffect(() => {
    const query = window.matchMedia(DESKTOP_QUERY)
    const onChange = (event: MediaQueryListEvent) => {
      if (event.matches) setIsOpen(false)
    }
    query.addEventListener('change', onChange)
    return () => query.removeEventListener('change', onChange)
  }, [])

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-0 z-50 flex justify-center"
      style={{ WebkitTapHighlightColor: 'transparent' }}
    >
      <nav
        ref={navRef}
        aria-label="Navegación principal"
        className="pointer-events-auto relative mt-[max(0.75rem,env(safe-area-inset-top,0px))] w-[calc(100%-2rem)] max-w-6xl overflow-hidden rounded-4xl border border-black/5 bg-white/90 shadow-[0_10px_40px_rgba(0,0,0,0.06)] backdrop-blur-xl [@media(prefers-reduced-transparency:reduce)]:bg-white [@media(prefers-reduced-transparency:reduce)]:backdrop-blur-none"
      >
        <div className="flex items-center justify-between gap-4 px-5 py-3 sm:px-8 sm:py-4">
          <a
            href="/"
            aria-label="Essenz, volver al inicio"
            onClick={close}
            className={`shrink-0 rounded-full ${pressable} ${focusRing}`}
          >
            <img
              src={logo.src}
              alt=""
              width={160}
              height={80}
              loading="eager"
              decoding="async"
              draggable={false}
              className="h-11 w-auto object-contain sm:h-14"
            />
          </a>

          <ul className="m-0 hidden list-none gap-8 p-0 xl:flex">
            {links.map((link) => (
              <li key={link.name}>
                <a
                  href={link.href}
                  aria-current={currentPath === link.href ? 'page' : undefined}
                  className={`${barLabel} ${pressable} ${focusRing} ${
                    currentPath === link.href
                      ? 'text-(--clr-ink)'
                      : 'text-gray-500 hover:text-(--clr-accent)'
                  }`}
                >
                  {link.name}
                </a>
              </li>
            ))}
          </ul>

          <div className="flex shrink-0 items-center gap-2 sm:gap-3 xl:gap-5">
            <a
              href={CONTACT_PATH}
              className={`${barLabel} ${pressable} ${focusRing} hidden text-gray-900 hover:opacity-60 xl:block`}
            >
              Contacto
            </a>
            <a
              href={SIGN_IN_PATH}
              className={`${barLabel} ${pressable} ${focusRing} hidden min-h-10 items-center rounded-full px-3 text-gray-900 hover:bg-black/5 xl:inline-flex`}
            >
              Iniciar sesión
            </a>
            <a
              href={PLANS_PATH}
              className={`${barLabel} ${pressable} ${focusRing} hidden min-h-10 items-center justify-center rounded-full bg-gray-950 px-5 text-white hover:bg-(--clr-accent) xl:inline-flex`}
            >
              Elegir plan
            </a>
            <button
              ref={buttonRef}
              type="button"
              onClick={() => setIsOpen((open) => !open)}
              aria-label={isOpen ? 'Cerrar menú' : 'Abrir menú'}
              aria-expanded={isOpen}
              aria-controls="mobile-menu"
              className={`inline-flex size-11 shrink-0 items-center justify-center rounded-full text-gray-950 xl:hidden ${pressable} ${focusRing}`}
            >
              {isOpen ? <X aria-hidden="true" size={20} /> : <Menu aria-hidden="true" size={20} />}
            </button>
          </div>
        </div>

        <div
          id="mobile-menu"
          className={`grid transition-[grid-template-rows,opacity,visibility] duration-250 ease-[cubic-bezier(0.23,1,0.32,1)] motion-reduce:transition-none xl:hidden ${
            isOpen ? 'visible grid-rows-[1fr] opacity-100' : 'invisible grid-rows-[0fr] opacity-0'
          }`}
        >
          <div className="min-h-0 overflow-hidden">
            <div className="max-h-[calc(100dvh-7.5rem)] overflow-y-auto overscroll-contain border-t border-stone-200 px-6 pb-6 pt-3">
              <ul className="m-0 flex list-none flex-col p-0">
                {links.map((link) => (
                  <li key={link.name}>
                    <a
                      href={link.href}
                      onClick={close}
                      aria-current={currentPath === link.href ? 'page' : undefined}
                      className={`flex min-h-12 items-center text-lg font-medium text-(--clr-ink) ${pressable} ${focusRing}`}
                    >
                      {link.name}
                    </a>
                  </li>
                ))}
                <li>
                  <a
                    href={CONTACT_PATH}
                    onClick={close}
                    className={`flex min-h-12 items-center text-lg font-medium text-stone-600 ${pressable} ${focusRing}`}
                  >
                    Contacto
                  </a>
                </li>
              </ul>

              <div className="mt-3 flex flex-col gap-3 border-t border-stone-200 pt-5">
                <a
                  href={PLANS_PATH}
                  onClick={close}
                  className={`inline-flex min-h-12 items-center justify-center rounded-full bg-gray-950 px-5 text-sm font-semibold text-white ${pressable} ${focusRing}`}
                >
                  Elegir plan
                </a>
                <p className="text-center text-sm text-stone-600">
                  ¿Ya tenés cuenta?
                  <a
                    href={SIGN_IN_PATH}
                    onClick={close}
                    className={`ml-1 inline-flex min-h-11 items-center font-semibold text-(--clr-ink) underline underline-offset-4 ${pressable} ${focusRing}`}
                  >
                    Iniciar sesión
                  </a>
                </p>
              </div>
            </div>
          </div>
        </div>
      </nav>
    </div>
  )
}
