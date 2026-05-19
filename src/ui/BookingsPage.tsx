 import { useState } from 'react'
import type { ArboxLesson, ArboxFriendConnection } from '../api/arbox'
import { FriendInviteModal } from './FriendInviteModal'
import layoutStyles from '../styles/layout.module.css'
import bookingsStyles from '../styles/bookings.module.css'
import componentStyles from '../styles/components.module.css'

export function BookingsPage(props: {
  lessons: ArboxLesson[]
  onUnsubscribe?: (l: ArboxLesson) => void
  onSyncBooking?: (l: ArboxLesson) => void
  onUnsyncBooking?: (l: ArboxLesson) => void
  onError?: (msg: string, ctx?: string) => void
  onInviteFriend?: (lesson: ArboxLesson, friendUserId: number) => void
  friends?: ArboxFriendConnection[]
  currentUserId?: number
  syncedLessonIds?: Set<number>
  actionBusy?: Record<number, boolean>
  onRefresh?: () => void
  googleConnected?: boolean
  onConnectGoogle?: () => void
  onManualSync?: () => void
  onCancelSync?: () => void
  syncStatus?: 'idle' | 'syncing' | 'error' | 'connected'
  syncBusy?: boolean
  syncCompleteAt?: number | null
  syncOnLaunch?: boolean
  onToggleSyncOnLaunch?: () => void
}) {
  const {
    lessons, onUnsubscribe, onSyncBooking, onUnsyncBooking, onInviteFriend, friends, currentUserId, syncedLessonIds, actionBusy, onRefresh,
    googleConnected, onConnectGoogle, onManualSync, onCancelSync, syncStatus, syncBusy,
    syncOnLaunch, onToggleSyncOnLaunch, syncCompleteAt
  } = props

  const showSyncComplete = syncCompleteAt && (Date.now() - syncCompleteAt < 5000)
  const [showHistory, setShowHistory] = useState(false)
  const [inviteOpenLessonId, setInviteOpenLessonId] = useState<number | null>(null)
  const inviteOpenLesson = lessons.find((l) => l.id === inviteOpenLessonId) || null
  const [bookingError, setBookingError] = useState<string | null>(null)

  // Filter based on checkbox
  const filtered = lessons.filter(l => showHistory ? true : (l.past === 0 || l.past === false))

  // Sort: newest to oldest
  const sorted = [...filtered].sort((a, b) => {
    const da = new Date(`${a.date} ${a.time}`).getTime()
    const db = new Date(`${b.date} ${b.time}`).getTime()
    return db - da
  })

  return (
    <div className={`${layoutStyles.page} ${bookingsStyles.bookingsPage}`}>
      <div className={bookingsStyles.bookingsHeader}>
        <h2 className={bookingsStyles.bookingsTitle}>Sessions & History</h2>
        <div className={bookingsStyles.bookingsControls}>
          <label className={`${componentStyles.label} ${bookingsStyles.customCheckbox}`}>
            <input
              type="checkbox"
              checked={showHistory}
              onChange={e => setShowHistory(e.target.checked)}
            />
            <span>Show History</span>
          </label>
          {onRefresh && (
            <button 
              className={`${componentStyles.btn} ${componentStyles.btnGhost} ${bookingsStyles.smallBtn}`} 
              onClick={onRefresh} 
            >
              Refresh
            </button>
          )}
        </div>
      </div>

      {/* Google Calendar Sync Controls */}
      <div className={bookingsStyles.syncSection}>
        <div className={bookingsStyles.syncSectionHeader}>
          <svg className={bookingsStyles.syncIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
            <line x1="16" y1="2" x2="16" y2="6"/>
            <line x1="8" y1="2" x2="8" y2="6"/>
            <line x1="3" y1="10" x2="21" y2="10"/>
          </svg>
          <h3 className={bookingsStyles.syncSectionTitle}>Google Calendar Sync</h3>
        </div>
        <p className={bookingsStyles.syncDescription}>Automatically sync your Arbox bookings to Google Calendar. Upcoming sessions will appear as calendar events, and cancelled classes will be removed.</p>
          {!googleConnected && (
            <p className={bookingsStyles.syncNote}>You need to connect your Google account first before any syncing can happen.</p>
          )}
        <div className={bookingsStyles.syncControls}>
          {!googleConnected ? (
            <button
              className={`${componentStyles.btn} ${bookingsStyles.btnConnect}`}
              onClick={onConnectGoogle}
            >
              Connect Google
            </button>
          ) : (
            <>
              <div className={bookingsStyles.syncStatus}>
                {showSyncComplete ? (
                  <>
                    <span className={bookingsStyles.syncStatusDot}></span>
                    Sync complete
                  </>
                ) : syncBusy ? (
                  <>
                    <span className={`${bookingsStyles.syncStatusDot} ${bookingsStyles.syncStatusDotPulse}`}></span >
                    Syncing...
                  </>
                ) : syncStatus === 'error' ? (
                  <>
                    <span className={bookingsStyles.syncStatusDot} style={{ backgroundColor: '#ef4444' }}></span >
                    Error — retry
                  </>
                ) : (
                  <>
                    <span className={bookingsStyles.syncStatusDot}></span >
                    Connected
                  </>
                )}
              </div >
              {!syncOnLaunch && onManualSync && (
                <button
                  className={`${componentStyles.btn} ${bookingsStyles.btnGreen}`}
                  disabled={syncBusy}
                  onClick={onManualSync}
                >
                  {syncBusy ? (
                    <>
                      <svg className={componentStyles.spinner} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 12a9 9 0 11-6.219-8.56"/>
                      </svg>
                      Syncing...
                    </>
                  ) : (
                    <>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M 1 4v6h6"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/>
                      </svg>
                      Sync now
                    </>
                  )}
                </button>
              )}
              {onCancelSync && (
                <button
                  className={`${componentStyles.btn} ${bookingsStyles.btnDisconnect}`}
                  onClick={onCancelSync}
                >
                  Disconnect Google Calendar
                </button>
              )}
            </>
          )}
          {googleConnected && onToggleSyncOnLaunch && (
            <label className={`${componentStyles.label} ${bookingsStyles.customCheckbox}`}>
              <input
                type="checkbox"
                checked={syncOnLaunch ?? false}
                onChange={onToggleSyncOnLaunch}
              />
              <span>Sync on launch</span>
            </label>
          )}
        </div >
      </div >

      {bookingError && (
        <div className={componentStyles.errorBox}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
            <p style={{ margin: 0, lineHeight: 1.5 }}>{bookingError}</p>
            <button onClick={() => setBookingError(null)} style={{ flexShrink: 0, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text)', fontSize: '16px', padding: '4px 8px' }}>✕</button>
          </div>
        </div>
      )}

      {sorted.length === 0 ? (
        <div className={`${componentStyles.card} ${componentStyles.muted}`}>
          {showHistory ? "No history or upcoming sessions found." : "No upcoming sessions found. Try 'Show History'."}
        </div >
      ) : (
        <div className={bookingsStyles.bookingsList}>
          {sorted.map((l) => {
            const isPast = l.past === 1 || l.past === true
            const dateStr = new Date(l.date).toLocaleDateString(undefined, {
              weekday: 'short', month: 'short', day: 'numeric'
            })

            return (
              <div key={l.id} className={`${bookingsStyles.bookingCard} ${isPast ? bookingsStyles.bookingCardPast : ''}`}>
                <div className={bookingsStyles.bookingMain}>
                  <div className={bookingsStyles.bookingDateTime}>
                    <div className={bookingsStyles.bookingDate}>{dateStr}</div >
                    <div className={bookingsStyles.bookingTime}>{l.time} - {l.end_time}</div >
                  </div >
                  <div className={bookingsStyles.bookingDetails}>
                    <div className={bookingsStyles.bookingCategory}>{l.box_categories?.name || 'Class'}</div >
                    <div className={bookingsStyles.bookingCoach}>with {l.coach?.full_name || 'Coach'}</div >
                    <div className={bookingsStyles.bookingLocation}>{l.locations_box?.location}</div >
                  </div >
                </div >

                {!isPast && onUnsubscribe && (
                  <div className={bookingsStyles.bookingActions}>
                    {onSyncBooking && (
                      syncedLessonIds?.has(l.id) ? (
                        <button
                          className={`${componentStyles.btn} ${bookingsStyles.bookingActionBtn} ${bookingsStyles.btnGreenOutline}`}
                          disabled={!googleConnected || actionBusy?.[l.id]}
                          onClick={() => onUnsyncBooking ? onUnsyncBooking(l) : onSyncBooking(l)}
                        >
                          {actionBusy?.[l.id] ? 'Removing…' : (
                            <>
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                                <line x1="16" y1="2" x2="16" y2="6"/>
                                <line x1="8" y1="2" x2="8" y2="6"/>
                                <line x1="3" y1="10" x2="21" y2="10"/>
                              </svg>
                              Unsync
                            </>
                          )}
                        </button>
                      ) : (
                        <button
                          className={`${componentStyles.btn} ${bookingsStyles.bookingActionBtn} ${bookingsStyles.btnGreen}`}
                          disabled={!googleConnected || actionBusy?.[l.id]}
                          onClick={() => onSyncBooking(l)}
                        >
                          {actionBusy?.[l.id] ? 'Syncing…' : (
                            <>
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                                <line x1="16" y1="2" x2="16" y2="6"/>
                                <line x1="8" y1="2" x2="8" y2="6"/>
                                <line x1="3" y1="10" x2="21" y2="10"/>
                              </svg>
                              Sync
                            </>
                          )}
                        </button>
                      )
                    )}
                    {friends && friends.length > 0 && onInviteFriend && currentUserId && (
                      <>
                        <button
                          className={`${componentStyles.btn} ${bookingsStyles.bookingActionBtn} ${bookingsStyles.btnInvite}`}
                          onClick={(e) => {
                            e.stopPropagation()
                            setInviteOpenLessonId(inviteOpenLessonId === l.id ? null : l.id)
                          }}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>
                          Invite
                        </button>
                      </>
                    )}
                    <button
                      className={`${componentStyles.btn} ${bookingsStyles.bookingActionBtn} ${bookingsStyles.btnUnsubscribe}`}
                      disabled={actionBusy?.[l.id]}
                      onClick={() => onUnsubscribe(l)}
                    >
                      {actionBusy?.[l.id] ? 'Leaving…' : (
                        <>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M18 6L6 18M6 6l12 12" />
                          </svg>
                          Leave
                        </>
                      )}
                    </button>
                  </div >
                )}
                {isPast && (
                  <div className={bookingsStyles.bookingStatusBadge}>Completed</div >
                )}
              </div >
            )
          })}
        </div >
      )}

      {/* Friend invite modal */}
      {inviteOpenLesson && friends && currentUserId && onInviteFriend && (
        <FriendInviteModal
          friends={friends}
          currentUserId={currentUserId}
          lessonLabel={`${inviteOpenLesson.date} ${inviteOpenLesson.time?.slice(0, 5)} — ${inviteOpenLesson.box_categories?.name || 'Class'}`}
          bookedUserIds={new Set((inviteOpenLesson.booked_users ?? []).map((u: any) => u.id))}
          onSelect={(friendId) => {
            onInviteFriend(inviteOpenLesson, friendId)
            setInviteOpenLessonId(null)
          }}
          onClose={() => setInviteOpenLessonId(null)}
        />
      )}
    </div >
  )
}


