import { useState, useEffect } from 'react'
import { getLoginLockout, setLoginLockout } from './storage'
import type { ArboxApiError } from '../api/arbox'
import componentStyles from '../styles/components.module.css'
import { Footer } from './Footer'

export function LoginPage(props: {
  onLogin: (input: { email: string; password: string }) => Promise<void>
  onMfaRequest: (input: { type: 'email' | 'phone'; value: string }) => Promise<number>
  onMfaLogin: (input: { type: 'email' | 'phone'; value: string; code: string; id: number }) => Promise<void>
  install?: { prompt: BeforeInstallPromptEvent | null; dismissed: boolean; install: () => void }
}) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mfaCode, setMfaCode] = useState('')
  const [mfaId, setMfaId] = useState<number | null>(null)
  const [loginMode, setLoginMode] = useState<'mfa' | 'password'>('mfa')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lockoutRemaining, setLockoutRemaining] = useState<number>(0)

  // Track lockout state based on elapsed time
  useEffect(() => {
    // Check immediately on mount
    const checkTimer = () => {
      const lockout = getLoginLockout()
      if (lockout && lockout.lockoutUntil > Date.now()) {
        const remaining = Math.max(0, Math.ceil((lockout.lockoutUntil - Date.now()) / 1000))
        setLockoutRemaining(remaining)
      } else {
        setLockoutRemaining(0)
        // Remove rate limit error message when timer expires
        setError(prev => (prev?.includes('Rate limit exceeded') ? null : prev))
      }
    }
    
    checkTimer()
    const timer = setInterval(checkTimer, 1000)
    return () => clearInterval(timer)
  }, [])

  async function submit(ev?: React.FormEvent) {
    if (ev) ev.preventDefault()
    if (lockoutRemaining > 0) return
    setBusy(true)
    setError(null)
    try {
      if (loginMode === 'password') {
        await props.onLogin({ email, password })
      } else {
        if (mfaId === null) {
          // Step 1: Request MFA code
          try {
            const id = await props.onMfaRequest({ type: 'email', value: email })
            setMfaId(id)
          } catch (e) {
            setError('Request failed, please check your email.')
          }
        } else {
          // Step 2: Verify MFA code
          await props.onMfaLogin({ type: 'email', value: email, code: mfaCode, id: mfaId })
        }
      }
      
      // Reset rate limiting failures on successful login
      const lockout = getLoginLockout()
      if (lockout && lockout.failureCount > 0) {
        setLoginLockout(null)
      }
    } catch (e) {
      const err = e as Partial<ArboxApiError> & { message?: string }
      const isNetworkError = e instanceof TypeError && /failed to fetch|networkerror/i.test((e as any).message)
      
      if (err?.status === 400 && loginMode === 'mfa' && mfaId !== null) {
        setError('Incorrect MFA code.')
      } else if (err?.status === 429 || isNetworkError || (e instanceof Error && e.message.includes('Network Error'))) {
        // Cloudflare rate limit error or CORS/Network failure - increase backoff
        let lockout = getLoginLockout()
        if (!lockout || lockout.lockoutUntil < Date.now()) {
          lockout = { lockoutUntil: 0, failureCount: 0 }
        }
        lockout.failureCount += 1
        
        // Duration: 5 minutes * (2 ^ (failureCount - 1))
        const durationMinutes = 5 * Math.pow(2, lockout.failureCount - 1)
        lockout.lockoutUntil = Date.now() + durationMinutes * 60 * 1000
        setLoginLockout(lockout)
        
        // We set error, but the timer will immediately take over UI lockout
        setError('Rate limit exceeded or network error. Please wait before trying again.')
        // Force an immediate timer update so UI reflects lockdown directly
        const remaining = Math.max(0, Math.ceil((lockout.lockoutUntil - Date.now()) / 1000))
        setLockoutRemaining(remaining)
      } else if (err?.status === 512) {
        // Wrong password from server - just show error, NO backoff
        if (err.bodyText && err.bodyText.includes('Incorrect Login Details')) {
          setError('Incorrect login details.')
        } else {
          setError('Login failed (512).')
        }
      } else if (err?.status === 403 && err.bodyText && err.bodyText.includes('maxLoginTries')) {
        // Server-side max retries lockout
        setError('Too many login failures occurred. Please check your email for further instructions.')
      } else {
        // Other unexpected errors
        const msg = e instanceof Error ? e.message : String(e)
        setError(msg)
      }
    } finally {
      setBusy(false)
    }
  }

  const isLockedOut = lockoutRemaining > 0

  function formatRemaining(seconds: number) {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  return (
    <div className={componentStyles.loginPage}>
      <div className={componentStyles.loginContent}>
        <div className={componentStyles.loginHeader}>
          <img src="/logo.png" alt="" className={componentStyles.loginLogo} />
          <h1 style={{ margin: 0, color: 'var(--accent)' }}>Suparbox</h1>
        </div>
        <p style={{ textAlign: 'center', color: 'var(--text)', marginBottom: '2rem' }}>A frontend for your favourite lesson scheduling app.</p>
        <div className={`${componentStyles.card} ${componentStyles.loginCard}`}>
          <form onSubmit={submit}>
          {mfaId === null && (
            <div className={componentStyles.field}>
              <div className={componentStyles.label}>Email</div >
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={componentStyles.input}
                autoComplete="email"
                placeholder="your@email.com"
                disabled={isLockedOut}
                style={isLockedOut ? { opacity: 0.5, cursor: 'not-allowed', backgroundColor: '#f1f1f1' } : undefined}
              />
            </div >
          )}

          {loginMode === 'password' ? (
            <div className={componentStyles.field}>
              <div className={componentStyles.label}>Password</div >
              <input
                value={password}
                type="password"
                onChange={(e) => setPassword(e.target.value)}
                className={componentStyles.input}
                autoComplete="current-password"
                disabled={isLockedOut}
                style={isLockedOut ? { opacity: 0.5, cursor: 'not-allowed', backgroundColor: '#f1f1f1' } : undefined}
              />
            </div >
          ) : mfaId !== null ? (
            <div className={componentStyles.field}>
              <div className={componentStyles.label}>Verification Code</div >
              <input
                value={mfaCode}
                onChange={(e) => setMfaCode(e.target.value)}
                className={componentStyles.input}
                placeholder="4-digit code"
                disabled={isLockedOut}
                style={isLockedOut ? { opacity: 0.5, cursor: 'not-allowed', backgroundColor: '#f1f1f1' } : undefined}
              />
            </div >
          ) : null}

          {!isLockedOut && error ? <div className={componentStyles.errorBox}>{error}</div > : null}
          {isLockedOut ? (
             <div className={componentStyles.errorBox} style={{ backgroundColor: '#fff3cd', color: '#856404', borderColor: '#ffeeba' }}>
              Login failed. Please try again in <strong>{formatRemaining(lockoutRemaining)}</strong>.
            </div >
         ) : null}

          <button 
            type="submit" 
            className={`${componentStyles.btn} ${componentStyles.btnPrimary}`} 
            style={{ width: '100%' }}
            disabled={isLockedOut || busy || !email || (loginMode === 'password' && !password) || (loginMode === 'mfa' && mfaId !== null && !mfaCode)}
          >
            {busy ? (loginMode === 'mfa' && mfaId === null ? 'Requesting code…' : 'Logging in…') : (loginMode === 'mfa' && mfaId === null ? 'Send code' : 'Login')}
          </button>

          <div style={{ marginTop: '1rem', textAlign: 'center' }}>
            <button
              type="button"
              className={componentStyles.btn}
              style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', textDecoration: 'underline' }}
              onClick={() => {
                setError(null)
                setMfaId(null)
                setMfaCode('')
                setLoginMode(loginMode === 'mfa' ? 'password' : 'mfa')
              }}
            >
              {loginMode === 'mfa' ? 'Login with password' : 'Login with MFA'}
            </button>
          </div >
        </form>
        </div >
      </div>

      <Footer install={props.install} />
    </div >
  )
}
