import logo from '../../assets/essenz.webp'

export default function Footer() {
  return (
    <footer className="relative bg-[#050505] text-white overflow-hidden border-t border-white/5">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-px bg-linear-to-r from-transparent via-(--clr-accent)/50 to-transparent" />
      <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-150 h-50 bg-(--clr-accent)/10 blur-[120px] rounded-full pointer-events-none" />

      <div className="max-w-7xl mx-auto px-8 py-20 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-16 mb-24">
          <div className="md:col-span-5 lg:col-span-6">
            <div className="mb-8">
              <img
                src={logo.src}
                alt="Essenz"
                className="w-30 h-auto brightness-0 invert opacity-90"
              />
            </div>
            <p className="text-gray-400 text-lg max-w-sm leading-relaxed font-light">
              Sitio y menú digital para tus clientes. Herramientas para que tu equipo gestione el
              trabajo cotidiano del local.
            </p>
          </div>

          <div className="md:col-span-3 lg:col-span-3">
            <h4 className="text-[10px] uppercase tracking-[0.3em] font-bold text-gray-500 mb-8">
              Plataforma
            </h4>
            <ul className="space-y-4 text-sm list-none p-0">
              <li>
                <a
                  href="/#templates"
                  className="text-gray-400 hover:text-white transition-colors duration-300"
                >
                  Plantillas visuales
                </a>
              </li>
              <li>
                <a
                  href="/plans"
                  className="text-gray-400 hover:text-white transition-colors duration-300"
                >
                  Suscripciones
                </a>
              </li>
            </ul>
          </div>

          <div className="md:col-span-4 lg:col-span-3">
            <h4 className="text-[10px] uppercase tracking-[0.3em] font-bold text-gray-500 mb-8">
              ByteSyncs Lab
            </h4>
            <ul className="space-y-4 text-sm list-none p-0">
              <li>
                <a
                  href="mailto:info@bytesyncs.com"
                  className="text-gray-400 hover:text-white transition-colors duration-300"
                >
                  Contacto
                </a>
              </li>
              <li>
                <a
                  href="mailto:info@bytesyncs.com"
                  className="text-gray-400 hover:text-white transition-colors duration-300"
                >
                  Escribir al equipo
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-12 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex flex-wrap justify-center gap-x-8 gap-y-3 text-[10px] tracking-[0.2em] font-medium text-gray-600">
            <a href="/#platform" className="hover:text-gray-400 transition-colors">
              PLATAFORMA
            </a>
            <a href="/plans" className="hover:text-gray-400 transition-colors">
              PLANES
            </a>
            <a href="/#contact" className="hover:text-gray-400 transition-colors">
              CONTACTO
            </a>
          </div>

          <div className="text-[10px] text-gray-600 font-bold tracking-widest uppercase">
            © 2026 ESSENZ — TECNOLOGÍA PARA LOCALES GASTRONÓMICOS
          </div>
        </div>
      </div>
    </footer>
  )
}
