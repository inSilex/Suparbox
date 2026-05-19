import type { ArboxTokens } from '../api/arbox'

const KEY = 'suparbox.tokens.v1'

export function loadTokens(): ArboxTokens | null {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    const v = JSON.parse(raw) as Partial<ArboxTokens>
    if (!v.accessToken || !v.refreshToken) return null
    return { accessToken: v.accessToken, refreshToken: v.refreshToken }
  } catch {
    return null
  }
}

export function saveTokens(tokens: ArboxTokens | null) {
  try {
    if (!tokens) localStorage.removeItem(KEY)
    else localStorage.setItem(KEY, JSON.stringify(tokens))
  } catch {
    // ignore storage failures (private mode, quotas, etc.)
  }
}

export type LoginLockout = {
  lockoutUntil: number
  failureCount: number
}

const LOCKOUT_KEY = 'suparbox.login.lockout.v1'

export function getLoginLockout(): LoginLockout | null {
  try {
    const raw = localStorage.getItem(LOCKOUT_KEY)
    if (!raw) return null
    return JSON.parse(raw) as LoginLockout
  } catch {
    return null
  }
}

export function setLoginLockout(lockout: LoginLockout | null) {
  try {
    if (!lockout) localStorage.removeItem(LOCKOUT_KEY)
    else localStorage.setItem(LOCKOUT_KEY, JSON.stringify(lockout))
  } catch {
    // ignore storage failures
  }
}

const SEEN_MESSAGES_KEY = 'suparbox.seen.messages.v1'

export function getSeenMessages(): number[] {
  try {
    const raw = localStorage.getItem(SEEN_MESSAGES_KEY)
    if (!raw) return []
    const arr = JSON.parse(raw)
    return Array.isArray(arr) ? arr : []
  } catch {
    return []
  }
}

export function saveSeenMessages(ids: number[]) {
  try {
    localStorage.setItem(SEEN_MESSAGES_KEY, JSON.stringify(ids))
  } catch {
    // ignore
  }
}

