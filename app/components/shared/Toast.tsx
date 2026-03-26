"use client"

import { createContext, useContext, useState, useCallback, ReactNode, useEffect } from "react"
import { CheckCircle, XCircle, Info, X } from "lucide-react"

interface Toast {
  id: string
  message: string
  type: "success" | "error" | "info"
}

interface ToastContextType {
  toast: (message: string, type?: "success" | "error" | "info") => void
  success: (message: string) => void
  error: (message: string) => void
  info: (message: string) => void
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error("useToast must be used within ToastProvider")
  }
  return context
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const toast = useCallback((message: string, type: "success" | "error" | "info" = "info") => {
    const id = Date.now().toString() + Math.random().toString(36).substr(2, 9)
    setToasts((prev) => [...prev, { id, message, type }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 4000)
  }, [])

  const success = useCallback((message: string) => toast(message, "success"), [toast])
  const error = useCallback((message: string) => toast(message, "error"), [toast])
  const info = useCallback((message: string) => toast(message, "info"), [toast])

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const icons = {
    success: CheckCircle,
    error: XCircle,
    info: Info,
  }

  const styles = {
    success: "bg-green-50 border-green-200 text-green-800",
    error: "bg-red-50 border-red-200 text-red-800",
    info: "bg-blue-50 border-blue-200 text-blue-800",
  }

  const iconStyles = {
    success: "text-green-600",
    error: "text-red-600",
    info: "text-blue-600",
  }

  return (
    <ToastContext.Provider value={{ toast, success, error, info }}>
      {children}
      <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2">
        {toasts.map((t) => {
          const Icon = icons[t.type]
          return (
            <div
              key={t.id}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg border shadow-lg animate-in slide-in-from-right ${styles[t.type]}`}
            >
              <Icon className={`h-5 w-5 flex-shrink-0 ${iconStyles[t.type]}`} />
              <p className="text-sm font-medium">{t.message}</p>
              <button
                onClick={() => removeToast(t.id)}
                className="ml-2 hover:opacity-70 transition-opacity"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}
