import layoutStyles from '../styles/layout.module.css'
import { useState, useEffect, useRef, useCallback } from 'react'
import { MenuBar } from './MenuBar'
import { LoginPage } from './LoginPage'
import { WeeklySchedulePage } from './WeeklySchedulePage'
import { BookingsPage } from './BookingsPage'
import { AnnouncementBanner } from './AnnouncementBanner'
import { useAuth } from '../hooks/useAuth'
import { useFeed } from '../hooks/useFeed'
import { useBookings } from '../hooks/useBookings'
import { useSync } from '../hooks/useSync'
import { useInvitations } from '../hooks/useInvitations'
import { LoadingOverlay } from './LoadingOverlay'
import { AppTabBar } from './AppTabBar'
import { SyncErrorModal } from './SyncErrorModal'
import type { ArboxLesson } from '../api/arbox'
import { useAppError, AppErrorDisplay } from './AppErrorDisplay'
import { ErrorProvider } from './AppErrorDisplay'
import { Footer } from './Footer'

function useInstallPrompt() {
  const [prompt, setPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [dismissed, setDismissed] = useState(false)
  const [showInstalledMessage, setShowInstalledMessage] = useState(false)

  useEffect(() => {
    const handler = (e: BeforeInstallPromptEvent) => {
      e.preventDefault()
      setPrompt(e)
    }
    window.addEventListener('beforeinstallprompt', handler as EventListener)
    return () => window.removeEventListener('beforeinstallprompt', handler as EventListener)
  }, [])

  useEffect(() => {
    const stored = localStorage.getItem('suparbox.installDismissed')
    if (stored === '1') setDismissed(true)
  }, [])

  function install() {
    if (!prompt) return
    prompt.prompt().catch(() => {})
    prompt.userChoice.then((choice) => {
      setPrompt(null)
      if (choice.outcome === 'accepted') {
        localStorage.setItem('suparbox.installAccepted', '1')
        setShowInstalledMessage(true)
      }
    }).finally(() => setPrompt(null))
  }

  function dismiss() {
    setDismissed(true)
    localStorage.setItem('suparbox.installDismissed', '1')
    setPrompt(null)
  }

  function closeInstalledMessage() {
    setShowInstalledMessage(false)
  }

  return { prompt, dismissed, install, dismiss, showInstalledMessage, closeInstalledMessage }
}

export function App() {
  return (
    <ErrorProvider>
      <div className={layoutStyles.app}>
        <AppInner />
      </div>
    </ErrorProvider>
  )
}

function AppInner() {
  const { showError } = useAppError()
  const auth = useAuth()
  const {
    client, profile, startupError, booting, retrying, loadingProgress, loadingStepLabel,
    memberships, membershipsError,
    selectedMembershipId, setSelectedMembershipId,
    locations, selectedLocationId, setSelectedLocationId,
    boxesId, refreshShellData, onLogout,
  } = auth

  const [activeTab, setActiveTab] = useState<'schedule' | 'bookings'>('schedule')
  const [scheduleLoading, setScheduleLoading] = useState(true)
  const [syncError, setSyncError] = useState<{ message: string; lesson: ArboxLesson | null }>({ message: '', lesson: null })
  const [syncCompleteAt, setSyncCompleteAt] = useState<number | null>(null)
  const [scheduleKey, setScheduleKey] = useState(0)

  function dismissSyncError() {
    setSyncError({ message: '', lesson: null })
  }

  // Initialize domain-specific hooks
  const feed = useFeed(() => client.feed())
  const bookings = useBookings(client)
  const sync = useSync()
  const invitations = useInvitations(client, selectedMembershipId)

  // Surface OAuth errors from the sync hook into the modal (only once)
  const oauthShownRef = useRef(false)
  
  useEffect(() => {
    if (sync.oauthError && !oauthShownRef.current) {
      setSyncError({ message: sync.oauthError, lesson: null })
      oauthShownRef.current = true
    }
  }, [sync.oauthError])

  // Surface startup errors into the global error display
  useEffect(() => {
    if (startupError) showError(startupError)
  }, [startupError, showError])

  // Preload bookings on startup if auto-sync is enabled
  useEffect(() => {
    if (sync.syncOnLaunch && boxesId && !bookings.userClassesLoaded) {
      bookings.fetchUserClasses(boxesId)
    }
  }, [sync.syncOnLaunch, boxesId, bookings.userClassesLoaded])

  // Auto-sync after bookings are loaded
  useEffect(() => {
    if (!sync.syncOnLaunch || !sync.googleToken || !sync.arboxCalendarId) return
    if (!bookings.userClassesLoaded || !bookings.userClasses.length) return

    const timer = setTimeout(async () => {
      try {
        const synced = await sync.syncNow(bookings.userClasses)
        if (synced?.size) {
          bookings.setSyncedLessonIds(prev => new Set([...prev, ...synced]))
        }

        // Unsync lessons that are no longer in active bookings
        const currentLessonIds = new Set(bookings.userClasses.map(l => l.id))
        for (const syncedId of bookings.syncedLessonIds) {
          if (!currentLessonIds.has(syncedId)) {
            try {
              await sync.unsyncLesson(syncedId)
              bookings.setSyncedLessonIds(prev => {
                const next = new Set(prev)
                next.delete(syncedId)
                return next
              })
            } catch (e: any) {
              console.warn(`[auto-sync] Failed to unsync lesson ${syncedId}:`, e)
            }
          }
        }

        setSyncCompleteAt(Date.now())
      } catch (e: any) {
        console.error('Auto-sync failed:', e)
        setSyncError({ message: e?.message || 'Auto-sync failed. Some lessons could not be synced to Google Calendar.', lesson: null })
      }
    }, 500)
    return () => clearTimeout(timer)
  }, [bookings.userClassesLoaded, bookings.userClasses.length])

  // Clear sync complete indicator after 5 seconds
  useEffect(() => {
    if (!syncCompleteAt) return
    const timer = setTimeout(() => setSyncCompleteAt(null), 5000)
    return () => clearTimeout(timer)
  }, [syncCompleteAt])

  function onScheduleDataReady() {
    setScheduleLoading(false)
  }

  async function handleConnectGoogle() {
    try {
      await sync.connectGoogle()
    } catch (e: any) {
      showError(e.message || 'Failed to connect Google Calendar', 'Google Calendar')
    }
  }

  async function handleSyncLesson(lesson: any) {
    try {
      const synced = await sync.syncLesson(lesson)
      if (synced?.size) {
        bookings.setSyncedLessonIds(prev => new Set([...prev, ...synced]))
      }
    } catch (e: any) {
      setSyncError({ message: e.message || 'Failed to sync lesson', lesson })
      console.error('Lesson sync failed:', e)
    }
  }

  async function handleUnsyncLesson(lesson: any) {
    try {
      await sync.unsyncLesson(lesson.id)
      bookings.setSyncedLessonIds(prev => {
        const next = new Set(prev)
        next.delete(lesson.id)
        return next
      })
    } catch (e: any) {
      console.error('Unsync failed:', e)
      setSyncError({ message: e?.message || 'Failed to unsync lesson', lesson })
    }
  }

  async function handleActionOnLesson(_lesson: any) {
    if (boxesId) {
      await bookings.fetchUserClasses(boxesId)
    }
    setScheduleKey(prev => prev + 1)
  }

  async function handleManualSync() {
    try {
      const synced = await sync.syncNow(bookings.userClasses)
      if (synced?.size) {
        bookings.setSyncedLessonIds(prev => new Set([...prev, ...synced]))
      }
      setSyncCompleteAt(Date.now())
    } catch (e: any) {
      setSyncError({ message: e.message || 'Manual sync failed', lesson: null })
      console.error('Sync failed:', e)
    }
  }

  async function handleDisconnectGoogle() {
    try {
      await sync.disconnectGoogle()
    } catch (e: any) {
      setSyncError({ message: e.message || 'Failed to disconnect Google Calendar', lesson: null })
    }
  }

  const handleScheduleError = useCallback((msg: string, ctx?: string) => {
    showError(msg, ctx)
  }, [showError])

  const install = useInstallPrompt()

  if (booting || retrying) {
    return (<div className={layoutStyles.app}><LoadingOverlay message={startupError ?? undefined} progress={loadingProgress} label={loadingStepLabel} /></div>)
  }

  if (!profile) {
    return (
      <div className={layoutStyles.app} style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <>
          <AppErrorDisplay />
          <LoginPage
            onLogin={async (input) => {
              await client.login(input)
              await refreshShellData()
            }}
            onMfaRequest={(input) => client.requestMfaCode(input)}
            onMfaLogin={async (input) => {
              await client.loginMfa(input)
              await refreshShellData()
            }}
            install={install}
          />
        </>
      </div>
    )
  }

  return (
    <div className={layoutStyles.app}>
      <>
      {scheduleLoading && activeTab === 'schedule' ? (
        <LoadingOverlay progress={100} label="Loading weekly schedule..." />
      ) : null}
      <AnnouncementBanner
        messages={feed.feedMessages}
        invitations={invitations.scheduleInvitations}
        seenIds={feed.seenIds}
        onDismissNews={feed.onDismissNews}
        onAcceptInvite={invitations.onAcceptInvite}
        onDismissInvite={invitations.onDismissInvite}
        inviteBusy={invitations.inviteBusy}
      />          <MenuBar 
            profile={profile} 
            onLogout={onLogout}
            memberships={memberships}
            selectedMembershipId={selectedMembershipId}
            onMembershipChange={setSelectedMembershipId}
            locations={locations}
            selectedLocationId={selectedLocationId}
            onLocationChange={setSelectedLocationId}
          />

          <AppTabBar 
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            userClassesLoaded={bookings.userClassesLoaded}
            boxesId={boxesId}
            fetchUserClasses={async (id) => bookings.fetchUserClasses(id)}
            syncBusy={sync.syncBusy}
            syncCompleteAt={syncCompleteAt}
          />

          <AppErrorDisplay />

          {syncError.message && (
            <SyncErrorModal
              message={syncError.message}
              lesson={syncError.lesson}
              onClose={dismissSyncError}
            />
          )}

          <div className={activeTab === 'schedule' ? '' : layoutStyles.hiddenTab}>
            <WeeklySchedulePage
              client={client}
              boxesId={boxesId}
              memberships={memberships}
              membershipsError={membershipsError}
              selectedMembershipId={selectedMembershipId}
              onMembershipChange={setSelectedMembershipId}
              onError={handleScheduleError}
              onSubscribe={() => {}}
              friends={profile?.friend_connection ?? undefined}
              currentUserId={profile?.id}
              onInviteFriend={async () => {}}
              onDataReady={onScheduleDataReady}
              onAction={handleActionOnLesson}
              scheduleKey={scheduleKey}
            />
          </div>

          <div className={activeTab === 'bookings' ? '' : layoutStyles.hiddenTab}>
            <BookingsPage
              lessons={bookings.userClasses}
              onUnsubscribe={(l) => {
                const scheduleUserId = typeof l.user_booked === 'number' ? l.user_booked : null
                if (!scheduleUserId) return
                bookings.setBookingBusy(prev => ({ ...prev, [l.id]: true }))
                bookings.unsubscribeFromLesson(scheduleUserId, l.id).catch(e => {
                  const err = e as Partial<{ message: string; status?: number; bodyText?: string }> & { message?: string }
                  let msg = 'Failed to leave class.'
                  if (err.status === 401 || err.status === 403) {
                    msg = 'Authentication expired. Please log in again and try leaving.'
                  } else if (err.status === 429) {
                    msg = 'Too many requests. Please wait a moment before trying to leave.'
                  } else if (err.bodyText && err.status !== undefined) {
                    try {
                      const body = JSON.parse(err.bodyText)
                      const apiMsg = body?.error?.messageToUser || body?.message || body?.error?.message
                      msg = Array.isArray(apiMsg) ? (apiMsg[0]?.message || apiMsg[0]) : (apiMsg || 'Failed to leave class.')
                    } catch { /* ignore */ }
                  } else if (err.message && typeof err.message === 'string') {
                    msg = err.message
                  }
                  showError(msg, `Leave "${l.box_categories?.name}"`)
                }).finally(() => {
                  bookings.setBookingBusy(prev => ({ ...prev, [l.id]: false }))
                  handleActionOnLesson(l)
                })
              }}
              onSyncBooking={handleSyncLesson}
              onUnsyncBooking={handleUnsyncLesson}
              syncedLessonIds={bookings.syncedLessonIds}
              actionBusy={bookings.bookingBusy}
              onRefresh={() => boxesId && bookings.fetchUserClasses(boxesId)}
              googleConnected={!!sync.googleToken}
              onConnectGoogle={handleConnectGoogle}
              onManualSync={handleManualSync}
              onCancelSync={handleDisconnectGoogle}
              syncStatus={sync.syncStatus}
              syncBusy={sync.syncBusy}
              syncCompleteAt={syncCompleteAt}
              syncOnLaunch={sync.syncOnLaunch}
              onToggleSyncOnLaunch={sync.toggleSyncOnLaunch}
              friends={profile?.friend_connection ?? undefined}
              currentUserId={profile?.id}
              onInviteFriend={async () => {}}
            />
          </div>

          <Footer install={install} />

          {install.showInstalledMessage && (
            <div style={{ position: 'fixed', top: 0, left: 0, right: 0, background: '#1a1a2e', borderBottom: '1px solid var(--border)', padding: '12px 24px', color: 'var(--text-h)', fontSize: 14, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span>Successfully installed!</span>
              <button onClick={install.closeInstalledMessage} style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', fontSize: 16, padding: 0 }}>✕</button>
            </div>
          )}
        </>
    </div>
  )
}
