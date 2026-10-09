import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { CheckCircle2, AlertCircle, Info } from 'lucide-react'
import { cn } from '../../lib/cn'

type ToastKind = 'success' | 'error' | 'info'
interface ToastItem {
  id: number
  kind: ToastKind
  text: string
}

const ToastContext = createContext<(text: string, kind?: ToastKind) => void>(() => {})

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])
  const nextId = useRef(1)

  const push = useCallback((text: string, kind: ToastKind = 'success') => {
    const id = nextId.current++
    setItems((prev) => [...prev.slice(-2), { id, kind, text }])
    window.setTimeout(() => setItems((prev) => prev.filter((t) => t.id !== id)), 3500)
  }, [])

  return (
    <ToastContext.Provider value={push}>
      {children}
      {createPortal(
        <div className="pointer-events-none fixed inset-x-0 top-3 z-[70] flex flex-col items-center gap-2 px-4 lg:bottom-6 lg:left-auto lg:right-6 lg:top-auto lg:items-end">
          {items.map((t) => (
            <div
              key={t.id}
              role="status"
              className={cn(
                'animate-pop pointer-events-auto flex max-w-sm items-start gap-2.5 rounded-2xl border bg-surface-2 px-4 py-3 text-sm text-text-primary shadow-xl',
                t.kind === 'error' ? 'border-danger/30' : 'border-border-strong',
              )}
            >
              {t.kind === 'success' && <CheckCircle2 size={18} className="mt-px shrink-0 text-accent" />}
              {t.kind === 'error' && <AlertCircle size={18} className="mt-px shrink-0 text-danger" />}
              {t.kind === 'info' && <Info size={18} className="mt-px shrink-0 text-info" />}
              <span>{t.text}</span>
            </div>
          ))}
        </div>,
        document.body,
      )}
    </ToastContext.Provider>
  )
}

export function useToast() {
  return useContext(ToastContext)
}
