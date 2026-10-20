import { useState, useEffect, useRef } from 'react'
import { QRCodeSVG } from 'qrcode.react'

export default function QRView({ slug }: { slug: string }) {
  const [publicUrl, setPublicUrl] = useState('')
  const qrRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const host = window.location.host
      const protocol = window.location.protocol

      const isMainHost =
        host.includes('localhost') ||
        host.includes('127.0.0.1') ||
        host.includes('ngrok-free.dev') ||
        host.includes('bytesyncs.com')

      if (isMainHost) {
        setPublicUrl(`${protocol}//${host}/${slug}`)
      } else {
        setPublicUrl(`${protocol}//${host}`)
      }
    }
  }, [slug])

  const handlePrint = () => {
    const printWindow = window.open('', '_blank')
    if (!printWindow || !qrRef.current) return

    const qrSvgHtml = qrRef.current.innerHTML

    printWindow.document.write(`
      <html>
        <head>
          <title>Imprimir QR - ${slug}</title>
          <style>
            body { 
              display: flex; 
              flex-direction: column;
              align-items: center; 
              justify-content: center; 
              height: 100vh; 
              margin: 0; 
              font-family: sans-serif;
              background-color: #ffffff;
            }
            .container { text-align: center; border: 2px dashed #ccc; padding: 40px; border-radius: 16px; }
            svg { width: 280px; height: 280px; }
            h1 { margin-top: 24px; font-size: 28px; color: #111; margin-bottom: 4px; }
            p { font-size: 16px; color: #666; margin: 0; font-weight: 500; }
          </style>
        </head>
        <body>
          <div class="container">
            ${qrSvgHtml}
            <h1>Escaneá el menú</h1>
            <p>¡Bienvenidos!</p>
          </div>
          <script>
            window.onload = function() {
              window.print();
              window.close();
            };
          </script>
        </body>
      </html>
    `)
    printWindow.document.close()
  }

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

      <div className="bg-gray-50 border border-gray-100 flex flex-col items-center justify-center py-16 gap-6 rounded-xl">
        <div
          ref={qrRef}
          className="w-48 h-48 bg-white border border-gray-200 flex flex-col items-center justify-center p-4 shadow-sm rounded-xl"
        >
          {publicUrl ? (
            <QRCodeSVG value={publicUrl} size={160} level="H" marginSize={0} />
          ) : (
            <div className="animate-pulse bg-gray-200 w-full h-full rounded" />
          )}
        </div>

        <div className="text-center px-4">
          <p className="text-sm font-bold text-gray-700">Tu código QR está listo</p>
          <p className="text-xs text-gray-400 mt-1">Listo para imprimir en alta definición</p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3 w-full max-w-md px-4">
          <div className="flex items-center gap-2 bg-white border border-gray-200 px-4 py-2.5 flex-1 w-full rounded-lg min-w-0">
            <span className="text-xs text-gray-400 truncate flex-1 font-mono">
              {publicUrl || 'Cargando...'}
            </span>
            <button
              onClick={() => navigator.clipboard.writeText(publicUrl)}
              className="shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
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

          <button
            onClick={handlePrint}
            disabled={!publicUrl}
            className="w-full sm:w-auto bg-white border border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-gray-800 text-xs font-semibold uppercase tracking-wider px-5 py-3 rounded-lg inline-flex items-center justify-center gap-2 transition-all disabled:opacity-40 disabled:pointer-events-none shrink-0"
          >
            <svg
              className="w-3.5 h-3.5 text-gray-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
              />
            </svg>
            Imprimir
          </button>
        </div>
      </div>
    </div>
  )
}
