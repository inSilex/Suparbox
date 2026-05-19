import { useState, useCallback, useEffect } from 'react'
import type { ArboxLesson } from '../api/arbox'
import {ARBOX_CALENDAR_NAME, GoogleCalendarClient, type GoogleCalendarEvent} from '../api/googleCalendar'
import { reconcileCalendar } from '../services/calendarSyncService'
import { getGoogleToken, saveGoogleToken, deleteGoogleToken, getCalendarId, saveCalendarId, deleteMapping, getMapping, saveMapping, markLessonUnsynced, unmarkLessonUnsynced } from '../services/syncStorage'

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth'
const REDIRECT_PATH = ''

function generateCodeVerifier(): string {
  const array = new Uint32Array(56 / 2)
  window.crypto.getRandomValues(array)
  return Array.from(array, dec => ('0' + dec.toString(16)).slice(-2)).join('')
}

async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(verifier)
  const digest = await window.crypto.subtle.digest('SHA-256', data)
  return btoa(String.fromCharCode.apply(null, Array.from(new Uint8Array(digest))))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

export function useSync() {
  const [googleToken, setGoogleToken] = useState<string | null>(null)
  const [arboxCalendarId, setArboxCalendarId] = useState<string | null>(null)
  const [syncOnLaunch, setSyncOnLaunch] = useState<boolean>(() => {
    try { return localStorage.getItem('suparbox.syncOnLaunch') === '1' } catch { return false }
  })
  const [syncBusy, setSyncBusy] = useState(false)
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'error' | 'connected'>('idle')
  const [oauthError, setOauthError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const token = await getGoogleToken('access_token')
        if (token && !cancelled) setGoogleToken(token)
        const calId = await getCalendarId()
        if (calId && !cancelled) setArboxCalendarId(calId)
      } catch {}
    }
    load()
    return () => { cancelled = true }
  }, [])

  // Handle OAuth code returned to URL and clean up address bar
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const code = params.get('code')
    
    if (code) {
      const storedVerifier = sessionStorage.getItem('_google_code_verifier')
      if (!storedVerifier) return
      
      // Clean up the address bar immediately
      window.history.replaceState({}, '', '/')
      
      exchangeCodeForToken(code, storedVerifier).then(async token => {
        saveGoogleToken('access_token', token)
        setGoogleToken(token)
        
        try {
          const googleClient = new GoogleCalendarClient(token)
          let calendars: any[] = []
          
          try {
            calendars = await googleClient.listCalendars()
            const existing = calendars.find((c: any) => c.summary === ARBOX_CALENDAR_NAME || (c.description && c.description.includes(ARBOX_CALENDAR_NAME)))
            
            if (existing?.id) {
              await saveCalendarId(existing.id)
              setArboxCalendarId(existing.id)
            } else {
              const newCal = await googleClient.createCalendar(ARBOX_CALENDAR_NAME)
              await saveCalendarId(newCal.id || '')
              setArboxCalendarId(newCal.id || null)
            }
          } catch (e: any) {
            const detail = e?.response?.error?.message || e.message || 'Could not access your Google Calendar'
            setOauthError(`Google Calendar communication failed: ${detail}. Please make sure you have granted calendar access in your Google account settings.`)
          }
        } catch (err: any) {
          console.error('[OAuth] Token exchange failed:', err)
          setSyncStatus('error')
          const detail = err?.response?.error?.message || err.message || 'Failed to authenticate with Google'
          setOauthError(`Google authentication failed: ${detail}. Please try again.`)
        } finally {
          sessionStorage.removeItem('_google_code_verifier')
        }
      }).catch(err => {
        console.error('[OAuth] Unhandled error:', err)
        setSyncStatus('error')
        const detail = err?.response?.error?.message || err.message || 'Failed to authenticate with Google'
        setOauthError(`Google authentication failed: ${detail}. Please try again.`)
      })
    }
  }, [])

  async function exchangeCodeForToken(code: string, verifier: string): Promise<string> {
    const clientId = atob(__GOOGLE_CLIENT_ID__)
    if (!clientId) throw new Error('VITE_GOOGLE_CLIENT_ID not set')

    const clientSecret = atob(__GOOGLE_CLIENT_SECRET__)
    if (!clientSecret) throw new Error('VITE_GOOGLE_CLIENT_SECRET not set')

    const redirectUri = window.location.origin + REDIRECT_PATH
    
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
        client_id: clientId,
        client_secret: clientSecret,
        code_verifier: verifier,
      }),
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err?.error_description || 'Token exchange failed')
    }

    const data = await res.json() as { access_token: string; refresh_token?: string }
    
    if (data.refresh_token) {
      saveGoogleToken('refresh_token', data.refresh_token)
    }
    
    return data.access_token
  }

  const toggleSyncOnLaunch = useCallback(() => {
    setSyncOnLaunch(prev => {
      const newValue = !prev
      localStorage.setItem('suparbox.syncOnLaunch', newValue ? '1' : '0')
      return newValue
    })
  }, [])

  const connectGoogle = useCallback(async () => {
    const clientId = atob(__GOOGLE_CLIENT_ID__)
    if (!clientId) throw new Error('VITE_GOOGLE_CLIENT_ID not set')

    try {
      const codeVerifier = generateCodeVerifier()
      sessionStorage.setItem('_google_code_verifier', codeVerifier)

      const codeChallenge = await generateCodeChallenge(codeVerifier)

      const redirectUri = window.location.origin + REDIRECT_PATH

      const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirectUri,
        response_type: 'code',
        scope: 'https://www.googleapis.com/auth/calendar.calendarlist.readonly https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/calendar.app.created',
        code_challenge: codeChallenge,
        code_challenge_method: 'S256',
        access_type: 'offline',
      })

      window.location.href = `${GOOGLE_AUTH_URL}?${params}`
    } catch (e: any) {
      setSyncStatus('error')
      setOauthError(`Google authentication failed: ${e?.message || 'Unknown error'}`)
    }
  }, [])

  const createCalendar = useCallback(async (googleClient: GoogleCalendarClient): Promise<string> => {
    const cal = await googleClient.createCalendar(ARBOX_CALENDAR_NAME)
    await saveCalendarId(cal.id || '')
    setArboxCalendarId(cal.id || null)
    return cal.id!
  }, [])

  const syncNow = useCallback(async (lessons: ArboxLesson[], forceSyncIds?: Set<number>) => {
    console.log('[sync] syncNow called:', { hasToken: !!googleToken, hasCalendarId: !!arboxCalendarId, lessonCount: lessons.length })
    if (!googleToken || !arboxCalendarId) throw new Error('Not connected')
    try {
      setSyncStatus('syncing')
      setSyncBusy(true)
      const googleClient = new GoogleCalendarClient(googleToken)

      let calendarId = arboxCalendarId
      if (!calendarId) {
        console.log('[sync] creating calendar...')
        calendarId = await createCalendar(googleClient)
        console.log('[sync] created calendar:', calendarId)
      }

      const syncedIds = await reconcileCalendar(lessons, googleClient, calendarId, forceSyncIds)
      setSyncStatus('connected')
      return syncedIds
    } catch (e: any) {
      console.error('[sync] syncNow error:', e)
      setSyncStatus('error')
      throw e
    } finally {
      setSyncBusy(false)
    }
  }, [googleToken, arboxCalendarId, createCalendar])

  const disconnectGoogle = useCallback(async () => {
    await deleteGoogleToken('access_token')
    await deleteGoogleToken('refresh_token')
    setGoogleToken(null)
    setArboxCalendarId(null)
    setSyncStatus('idle')
  }, [])

  const unsyncLesson = useCallback(async (lessonId: number) => {
    if (!googleToken || !arboxCalendarId) throw new Error('Not connected')
    const eventId = await getMapping(lessonId)
    if (eventId) {
      const googleClient = new GoogleCalendarClient(googleToken)
      try {
        await googleClient.deleteEvent(eventId, arboxCalendarId)
      } catch (e: any) {
        const isDeleted = e?.response?.error?.errors?.[0]?.reason === 'notFound' ||
          e?.code === 404 ||
          (typeof e?.message === 'string' && /resource.*deleted/i.test(e.message))
        if (isDeleted) return
        console.warn('[sync] Failed to delete Google event:', e)
        throw e
      }
    }
    await deleteMapping(lessonId)
    await markLessonUnsynced(lessonId)
  }, [googleToken, arboxCalendarId])

  const syncLesson = useCallback(async (lesson: ArboxLesson): Promise<Set<number>> => {
    if (!googleToken) throw new Error('Not connected to Google Calendar')
    setSyncStatus('syncing')
    setSyncBusy(true)

    let calendarId = arboxCalendarId
    if (!calendarId) {
      const googleClient = new GoogleCalendarClient(googleToken)
      calendarId = await createCalendar(googleClient)
    }

    try {
      const googleClient = new GoogleCalendarClient(googleToken)
      await unmarkLessonUnsynced(lesson.id)

      const eventData: GoogleCalendarEvent = {
        summary: `Arbox: ${lesson.box_categories?.name || 'Session'}`,
        description: `Coach: ${lesson.coach?.full_name || 'TBD'}\nLocation: ${lesson.locations_box?.location || 'TBD'}`,
        start: { dateTime: new Date(`${lesson.date} ${lesson.time}`).toISOString() },
        end: { dateTime: new Date(`${lesson.date} ${lesson.end_time}`).toISOString() },
        extendedProperties: { private: { arbox_lesson_id: String(lesson.id) } },
      }

      try {
        const newEvent = await googleClient.insertEvent(eventData, calendarId)
        if (newEvent.id) {
          await saveMapping(lesson.id, newEvent.id)
          setSyncStatus('connected')
          return new Set([lesson.id])
        }
      } catch (e: any) {
        const isNotFound = e?.response?.error?.errors?.[0]?.reason === 'notFound' || e?.code === 404
        if (isNotFound) {
          await deleteGoogleToken('arbox_calendar_id')
          setArboxCalendarId(null)
          const freshClient = new GoogleCalendarClient(googleToken)
          calendarId = await createCalendar(freshClient)
          const retryEvent = await freshClient.insertEvent(eventData, calendarId)
          if (retryEvent.id) {
            await saveMapping(lesson.id, retryEvent.id)
            setArboxCalendarId(calendarId)
            setSyncStatus('connected')
            return new Set([lesson.id])
          }
        }
        setSyncStatus('error')
        throw e
      }
    } finally {
      setSyncBusy(false)
    }
    return new Set()
  }, [googleToken, arboxCalendarId, createCalendar])

  return {
    googleToken,
    arboxCalendarId,
    syncOnLaunch,
    toggleSyncOnLaunch,
    syncBusy,
    syncStatus,
    oauthError,
    connectGoogle,
    createCalendar,
    syncNow,
    disconnectGoogle,
    unsyncLesson,
    syncLesson,
  }
}
