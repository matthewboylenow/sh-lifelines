'use client'

import { createContext, useContext, useState, useCallback, ReactNode } from 'react'
import * as ToastPrimitive from '@radix-ui/react-toast'
import { X, CheckCircle, AlertTriangle, XCircle, Info } from 'lucide-react'

type ToastType = 'success' | 'error' | 'warning' | 'info'

interface Toast {
  id: string
  title: string
  description?: string
  type: ToastType
}

interface ToastContextValue {
  toast: (opts: { title: string; description?: string; type?: ToastType }) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}

const icons: Record<ToastType, typeof CheckCircle> = {
  success: CheckCircle,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
}

const styles: Record<ToastType, string> = {
  success: 'border-green-300 bg-green-50',
  error: 'border-red-300 bg-red-50',
  warning: 'border-amber-300 bg-amber-50',
  info: 'border-blue-300 bg-blue-50',
}

const iconStyles: Record<ToastType, string> = {
  success: 'text-green-600',
  error: 'text-red-600',
  warning: 'text-amber-600',
  info: 'text-blue-600',
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const addToast = useCallback(({ title, description, type = 'info' }: { title: string; description?: string; type?: ToastType }) => {
    const id = Math.random().toString(36).slice(2)
    setToasts(prev => [...prev, { id, title, description, type }])
    // Auto-remove after animation
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 5000)
  }, [])

  return (
    <ToastContext.Provider value={{ toast: addToast }}>
      <ToastPrimitive.Provider swipeDirection="right" duration={4000}>
        {children}
        {toasts.map(t => {
          const Icon = icons[t.type]
          return (
            <ToastPrimitive.Root
              key={t.id}
              className={`border rounded-lg shadow-lg p-4 flex items-start gap-3 ${styles[t.type]} data-[state=open]:animate-slideIn data-[state=closed]:animate-fadeOut`}
              onOpenChange={(open) => {
                if (!open) setToasts(prev => prev.filter(x => x.id !== t.id))
              }}
            >
              <Icon className={`h-5 w-5 flex-shrink-0 mt-0.5 ${iconStyles[t.type]}`} />
              <div className="flex-1 min-w-0">
                <ToastPrimitive.Title className="text-sm font-semibold text-gray-900">
                  {t.title}
                </ToastPrimitive.Title>
                {t.description && (
                  <ToastPrimitive.Description className="text-sm text-gray-600 mt-0.5">
                    {t.description}
                  </ToastPrimitive.Description>
                )}
              </div>
              <ToastPrimitive.Close className="text-gray-400 hover:text-gray-600 flex-shrink-0">
                <X className="h-4 w-4" />
              </ToastPrimitive.Close>
            </ToastPrimitive.Root>
          )
        })}
        <ToastPrimitive.Viewport className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 w-96 max-w-[calc(100vw-2rem)]" />
      </ToastPrimitive.Provider>
    </ToastContext.Provider>
  )
}
