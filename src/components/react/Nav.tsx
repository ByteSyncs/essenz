import { useState } from 'react'
import { motion, AnimatePresence, useScroll, useTransform, useSpring } from 'framer-motion'
import logo from '../../assets/essenz.webp'

const links = [
  { name: 'Experiencias', href: '#experiences' },
  { name: 'Demos', href: '#demos' },
  { name: 'Planes', href: '#plans' },
]

export default function Nav() {
  const [isOpen, setIsOpen] = useState(false)
  const { scrollY } = useScroll()

  const smoothScroll = useSpring(scrollY, {
    stiffness: 250,
    damping: 35,
    mass: 0.5,
    restDelta: 0.001,
  })

  const navWidth = useTransform(smoothScroll, [0, 80], ['87%', '100%'])
  const navMaxW = useTransform(smoothScroll, [0, 80], ['1024px', '100%'])
  const navPadding = useTransform(smoothScroll, [0, 80], ['20px', '0px'])
  const navRadius = useTransform(smoothScroll, [0, 80], ['100px', '0px'])
  const navBorder = useTransform(
    smoothScroll,
    [0, 80],
    ['1px solid rgba(0,0,0,0.05)', '1px solid rgba(0,0,0,0)'],
  )

  const menuVariants = {
    closed: {
      opacity: 0,
      scale: 0.98,
      y: -10,
      transition: {
        duration: 0.3,
        easeInOut: [0.32, 0, 0.67, 0],
        staggerChildren: 0.03,
        staggerDirection: -1,
      },
    },
    open: {
      opacity: 1,
      scale: 1,
      y: 0,
      transition: {
        type: 'spring' as const,
        stiffness: 300,
        damping: 30,
        staggerChildren: 0.08,
        delayChildren: 0.1,
      },
    },
  }

  const itemVariants = {
    closed: { opacity: 0, y: 15, filter: 'blur(4px)' },
    open: { opacity: 1, y: 0, filter: 'blur(0px)' },
  }

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 bg-black/30 backdrop-blur-md z-40 md:hidden"
          />
        )}
      </AnimatePresence>

      <div className="fixed top-0 left-0 right-0 z-50 flex justify-center pointer-events-none">
        <motion.nav
          style={{
            width: navWidth,
            maxWidth: navMaxW,
            borderRadius: isOpen ? '32px' : navRadius,
            border: navBorder,
            marginTop: navPadding,
          }}
          className="relative overflow-hidden pointer-events-auto bg-white/80 backdrop-blur-2xl shadow-[0_10px_40px_rgba(0,0,0,0.06)] mb-20"
        >
          <div className="flex items-center justify-between px-8 py-5">
            <div className="flex items-center">
              <a
                href="/"
                className="hover:opacity-80 transition-opacity"
                aria-label="Volver al inicio"
              >
                <img
                  src={logo.src}
                  alt="Essenz Logo"
                  width={160}
                  height={80}
                  loading="eager"
                  decoding="sync"
                  className="w-auto h-12 md:h-16 object-contain"
                />
              </a>
            </div>

            <ul className="hidden md:flex gap-10 list-none m-0 p-0">
              {links.map((link) => (
                <li key={link.name}>
                  <a
                    href={link.href}
                    className="text-[11px] font-bold uppercase tracking-[0.15em] text-gray-400 hover:text-(--clr-accent) transition-all duration-500"
                  >
                    {link.name}
                  </a>
                </li>
              ))}
            </ul>

            <div className="flex items-center gap-6">
              <motion.a
                href="#support"
                className="hidden md:block text-[11px] font-bold uppercase tracking-widest text-gray-900 hover:opacity-50 transition-opacity"
              >
                Soporte
              </motion.a>

              <motion.a
                href="#plans"
                whileHover={{ y: -1 }}
                whileTap={{ scale: 0.98 }}
                className="hidden md:block text-[11px] font-bold uppercase tracking-tighter px-7 py-3 bg-gray-950 text-white rounded-full shadow-xl shadow-black/10 active:scale-95 transition-all"
              >
                Empezar ahora
              </motion.a>

              <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex flex-col gap-1.5 md:hidden z-50 p-2 focus:outline-none"
              >
                <motion.span
                  animate={isOpen ? { rotate: 45, y: 7 } : { rotate: 0, y: 0 }}
                  className="w-5 h-0.5 bg-gray-950 block rounded-full origin-center"
                />
                <motion.span
                  animate={isOpen ? { opacity: 0, x: 10 } : { opacity: 1, x: 0 }}
                  className="w-5 h-0.5 bg-gray-950 block rounded-full"
                />
                <motion.span
                  animate={isOpen ? { rotate: -45, y: -7 } : { rotate: 0, y: 0 }}
                  className="w-5 h-0.5 bg-gray-950 block rounded-full origin-center"
                />
              </button>
            </div>
          </div>

          <AnimatePresence>
            {isOpen && (
              <motion.div
                key="mobile-menu"
                initial="closed"
                animate="open"
                exit="closed"
                variants={menuVariants}
                className="md:hidden px-8 pb-12 pt-4 flex flex-col gap-8 items-start"
              >
                <div className="w-full h-px bg-gray-100" />
                {links.map((link) => (
                  <motion.a
                    key={link.name}
                    variants={itemVariants}
                    href={link.href}
                    onClick={() => setIsOpen(false)}
                    className="text-3xl font-medium tracking-tight text-gray-950 hover:text-(--clr-accent)"
                  >
                    {link.name}
                  </motion.a>
                ))}

                <motion.div variants={itemVariants} className="w-full pt-4 flex flex-col gap-6">
                  <a href="#support" className="text-gray-400 font-medium">
                    Soporte
                  </a>
                  <button className="w-full py-5 bg-gray-950 text-white rounded-2xl font-bold text-lg shadow-2xl shadow-black/20">
                    Empezar ahora
                  </button>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.nav>
      </div>
    </>
  )
}
