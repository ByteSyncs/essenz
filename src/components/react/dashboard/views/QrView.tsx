export default function QRView({ slug }: { slug: string }) {
  const publicUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/${slug}`

  return (
    <div className="px-6 md:px-10 py-8 max-w-2xl">
      <div className="mb-8">
        <p className="text-[10px] font-black uppercase tracking-[0.25em] text-(--clr-accent) mb-1">
          QR
        </p>
        <h2 className="text-2xl font-bold text-(--clr-ink) tracking-tight">Código QR</h2>
        <p className="text-sm text-gray-400 mt-1">
          Generá y descargá el QR de tu carta para poner en las mesas.
        </p>
      </div>

      <div className="bg-gray-50 border border-gray-100 flex flex-col items-center justify-center py-16 gap-5">
        <div className="w-40 h-40 bg-white border-2 border-dashed border-gray-200 flex items-center justify-center">
          <svg
            className="w-16 h-16 text-gray-200"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5zM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5zM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0113.5 9.375v-4.5z"
            />
          </svg>
        </div>
        <div className="text-center">
          <p className="text-sm font-bold text-gray-400">Próximamente</p>
          <p className="text-xs text-gray-300 mt-1">Esta sección estará disponible pronto</p>
        </div>
        <div className="flex items-center gap-2 bg-white border border-gray-200 px-4 py-2.5 max-w-xs w-full">
          <span className="text-xs text-gray-400 truncate flex-1 font-mono">{publicUrl}</span>
          <button
            onClick={() => navigator.clipboard.writeText(publicUrl)}
            className="shrink-0 text-gray-400 hover:text-(--clr-ink) transition-colors"
            title="Copiar URL"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 011.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 00-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 01-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5a3.375 3.375 0 00-3.375-3.375H9.75"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}
