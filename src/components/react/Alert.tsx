import { motion, AnimatePresence } from 'framer-motion'

interface AlertProps {
  message: string
  error: string | null
  onClose: () => void
}

export default function Alert({ message, error, onClose }: AlertProps) {
  return (
    <AnimatePresence>
      {error && (
        <motion.div
          key="alert"
          initial={{ opacity: 0, scale: 0.95, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 16 }}
          transition={{ duration: 0.15 }}
          className="fixed bottom-6 right-6 z-9999 max-w-sm md:max-w-lg"
        >
          <div className="bg-[#111111] border border-red-900 rounded-xl p-6 shadow-[0_24px_64px_rgba(224,69,53,0.15)] relative group">
            <button
              onClick={onClose}
              className="absolute top-3 right-3 text-gray-600 hover:text-white transition-colors opacity-0 group-hover:opacity-100"
            >
              <svg className="w-4 h-4" viewBox="0 0 16 16" fill="currentColor">
                <path d="M13.2 2.8a.8.8 0 0 1 0 1.1L8.9 8l4.3 4.1a.8.8 0 0 1-1.1 1.1L8 8.9 3.9 13.2a.8.8 0 0 1-1.1-1.1L6.9 8 2.8 3.9a.8.8 0 0 1 1.1-1.1L8 6.9l4.1-4.1a.8.8 0 0 1 1.1 0Z" />
              </svg>
            </button>

            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-3">
                <svg
                  className="w-5 h-5 text-red-500 shrink-0"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3Z"
                  />
                </svg>
                <h4 className="font-black text-sm uppercase tracking-widest text-red-500">
                  Action Failed
                </h4>
              </div>

              <p className="text-xs text-gray-400 font-medium leading-relaxed mt-1">
                Error details:{' '}
                <span className="bg-[#1a1a1a] border border-gray-800 rounded px-1.5 py-0.5 text-gray-200 font-mono text-[11px] shadow-inner">
                  {message}
                </span>
                <span className="text-gray-600">.</span>
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
