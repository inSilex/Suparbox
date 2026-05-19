import { createContext, useContext, useState, useCallback } from 'react'
import componentStyles from '../styles/components.module.css'

export interface AppError {
  message: string
  context?: string
}

interface ErrorContextValue {
  error: AppError | null
  dismissError: () => void
  showError: (message: string, context?: string) => void
}

const ErrorContext = createContext<ErrorContextValue>({
  error: null,
  dismissError: () => {},
  showError: () => {}
})

export function useAppError() {
  return useContext(ErrorContext)
}

export function ErrorProvider({ children }: { children: React.ReactNode }) {
  const [error, setError] = useState<AppError | null>(null)

  const dismissError = useCallback(() => {
    setError(null)
  }, [])

  const showError = useCallback((message: string, context?: string) => {
    setError({ message, context })
  }, [])

  return (
    <ErrorContext.Provider value={{ error, dismissError, showError }}>
      {children}
    </ErrorContext.Provider>
  )
}

export function AppErrorDisplay() {
  const { error, dismissError } = useAppError()

  if (!error) return null

  return (
    <div className={componentStyles.errorBox}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
        <p style={{ margin: 0, lineHeight: 1.5 }}>{error.message}</p>
        <button onClick={dismissError} style={{ flexShrink: 0, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text)', fontSize: '16px', padding: '4px 8px' }}>✕</button>
      </div>
    </div>
  )
}

export function createErrorHandler(showError: (msg: string, ctx?: string) => void) {
  return {
    handleApiError: useCallback((e: unknown, context: string) => {
      const err = e as Partial<{ message: string; status: number; bodyText: string }> & { message?: string }
      
      if (err?.status === 401 || err?.status === 403) {
        showError('Authentication expired. Please log in again.', context)
      } else if (err?.status === 429) {
        showError('Too many requests. Please wait a moment and try again.', context)
      } else if (err?.bodyText && err.status !== undefined) {
        try {
          const body = JSON.parse(err.bodyText)
          const msg = body?.error?.messageToUser || body?.message || body?.error?.message
          showError(Array.isArray(msg) ? msg[0]?.message || msg[0] : (msg || err.message), context)
        } catch {
          showError(err.bodyText, context)
        }
      } else if (err?.message && typeof err.message === 'string') {
        showError(err.message, context)
      } else {
        showError('An unexpected error occurred. Please try again.', context)
      }
    }, [showError])
  }
}
