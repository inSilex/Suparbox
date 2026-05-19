import { useEffect, useState } from 'react'
import loadingStyles from '../styles/loading.module.css'

interface LoadingOverlayProps {
  message?: string
  progress?: number
  label?: string
}

export function LoadingOverlay({ message, progress = 0, label }: LoadingOverlayProps) {
  const [displayProgress, setDisplayProgress] = useState(0)
  const [displayLabel, setDisplayLabel] = useState('Connecting...')

  useEffect(() => {
    setDisplayProgress(progress)
    if (label) {
      setDisplayLabel(label)
    }
  }, [progress, label])

  return (
    <div className={loadingStyles.overlay}>
      <div className={loadingStyles.card}>
        <div className={loadingStyles.logoSection}>
          <img src="/logo.png" alt="" className={loadingStyles.logoIcon} />
          <span className={loadingStyles.brand}>Suparbox</span>
        </div>

        <div className={loadingStyles.spinnerSection}>
          <div className={loadingStyles.spinner} />
        </div>

        <div className={loadingStyles.progressSection}>
          <div className={loadingStyles.progressBar}>
            <div 
              className={loadingStyles.progressFill} 
              style={{ width: `${displayProgress}%` }}
            />
          </div>
          <span className={loadingStyles.stepText}>{displayLabel}</span>
        </div>

        {message && (
          <div className={loadingStyles.errorText}>{message}</div>
        )}
      </div>
    </div>
  )
}
