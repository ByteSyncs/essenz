import { motion, AnimatePresence } from 'framer-motion'
import { useState } from 'react'

export default function CtaFinal() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)

  const handleSubmit = (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (email) setSent(true)
  }

  return (
    <section className="px-4 py-12 mb-8 md:mb-24 md:py-20">
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="relative max-w-4xl mx-auto overflow-hidden shadow-2xl"
        style={{
          background: 'var(--clr-ink)',
          borderRadius: '3rem',
          padding: '6rem 2rem',
        }}
      >
        <div className="absolute top-0 right-0 w-125 h-125 bg-(--clr-accent) opacity-10 blur-[120px] -translate-y-1/2 translate-x-1/4 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-100 h-100 bg-[#2E7A5F] opacity-5 blur-[100px] translate-y-1/2 -translate-x-1/4 pointer-events-none" />

        <div className="relative z-10 max-w-2xl mx-auto text-center">
          <motion.span className="text-(--clr-accent) text-xs font-bold uppercase tracking-[0.3em] mb-6 block">
            Únete al ecosistema Essenz
          </motion.span>

          <motion.h2
            className="font-bold leading-[1.1] mb-6 text-white"
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(2.5rem, 5vw, 4rem)',
            }}
          >
            Despertá el antojo
            <br />
            <span className="italic font-normal text-(--clr-accent2)">antes del primer sorbo</span>
          </motion.h2>

          <motion.p className="mb-10 text-lg text-gray-400 font-light max-w-md mx-auto">
            Estamos listos para desplegar tu plataforma. Sin contratos largos, solo tecnología de
            alto nivel.
          </motion.p>

          <AnimatePresence mode="wait">
            {sent ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white/5 border border-(--clr-accent)/30 p-6 rounded-2xl backdrop-blur-sm"
              >
                <p className="text-white font-medium mb-2">¡Recibido! 🚀</p>
                <p className="text-sm text-gray-400">
                  En breve ByteSyncs se pondrá en contacto con vos para coordinar la demo.
                </p>
              </motion.div>
            ) : (
              <form
                onSubmit={handleSubmit}
                className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto"
              >
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Tu email"
                  className="flex-1 px-6 py-4 rounded-2xl text-white outline-none transition-all focus:ring-2 focus:ring-(--clr-accent)/50"
                  style={{
                    background: 'rgba(255,255,255,0.05)',
                    border: '1.5px solid rgba(255,255,255,0.1)',
                  }}
                />
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  type="submit"
                  className="px-8 py-4 bg-white text-black font-bold rounded-2xl"
                >
                  Contáctanos
                </motion.button>
              </form>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </section>
  )
}
