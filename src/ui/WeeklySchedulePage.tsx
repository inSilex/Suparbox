import { useCallback, useEffect, useMemo, useState, useRef } from 'react'
import type { ArboxLesson, ArboxBetweenDatesResponse, ArboxApiError, ArboxMembership, ArboxFriendConnection, ArboxScheduleUser } from '../api/arbox'
import { toISODateLocalKey, weekRangeIso, startOfWeekLocal, addDaysLocal, formatMonthDay, formatDayShort } from './WeekUtils'
import { FriendInviteModal } from './FriendInviteModal'
import { createErrorHandler } from './AppErrorDisplay'
import layoutStyles from '../styles/layout.module.css'
import weeklyScheduleStyles from '../styles/weekly_schedule.module.css'
import componentStyles from '../styles/components.module.css'

const DAY_ABBR = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export function WeeklySchedulePage(props: {
  client: any
  boxesId: number | null
  memberships: ArboxMembership[]
  membershipsError: string | null
  selectedMembershipId: number | null
  onMembershipChange: (id: number) => void
  onError?: (msg: string, ctx?: string) => void
  onSubscribe?: (lesson: ArboxLesson) => void
  friends?: ArboxFriendConnection[]
  currentUserId?: number
  onInviteFriend?: (lesson: ArboxLesson, friendUserId: number) => void
  onDataReady?: () => void
  onAction?: (lesson: ArboxLesson) => void
  scheduleKey?: number
}) {
  const {
    client, boxesId, scheduleKey, onInviteFriend,
    onSubscribe, friends, currentUserId, onAction
  } = props

  const friendIds = useMemo(() => {
    if (!friends || !currentUserId) return new Set<number>()
    const ids = new Set<number>()
    for (const fc of friends) {
      if (fc.users_id === currentUserId && fc.friend_user?.is_user) ids.add(fc.friend_users_id)
      else if (fc.friend_users_id === currentUserId && fc.user?.is_user) ids.add(fc.users_id)
    }
    return ids
  }, [friends, currentUserId])

  const [weekAnchor, setWeekAnchor] = useState(() => new Date())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lessons, setLessons] = useState<ArboxLesson[]>([])
  const [highlightedLessonIds, setHighlightedLessonIds] = useState<Set<number>>(new Set())
  const [selectedDayKey, setSelectedDayKey] = useState<string>(() => {
    const now = new Date()
    return toISODateLocalKey(now)
  })
  const [actionBusy, setActionBusy] = useState<Record<number, 'subbing' | 'unsubbing' | 'joining' | 'leaving' | null>>({})

  const showAppError = useCallback((msg: string, ctx?: string) => {
    props.onError?.(msg, ctx)
  }, [props.onError])
  const errorHandler = createErrorHandler(showAppError)
  const abortControllerRef = useRef<AbortController | null>(null)
  const initialLoadDoneRef = useRef(false)
  // Single shared invite modal state — survives re-renders
  const [inviteLesson, setInviteLesson] = useState<ArboxLesson | null>(null)

  const weekDays = useMemo(() => {
    const start = startOfWeekLocal(weekAnchor)
    return Array.from({ length: 7 }, (_, i) => {
      const d = addDaysLocal(start, i)
      const key = toISODateLocalKey(d)
      return { date: d, key }
    })
  }, [weekAnchor])

  useEffect(() => {
    const inWeek = weekDays.some((d) => d.key === selectedDayKey)
    if (!inWeek) setSelectedDayKey(weekDays[0]?.key ?? selectedDayKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekDays])

  // Swipe gesture for mobile day navigation
  const swipeRef = useRef<HTMLDivElement>(null)
  const swipeStart = useRef<{ x: number; y: number } | null>(null)

  useEffect(() => {
    const el = swipeRef.current
    if (!el) return
    function onTouchStart(e: TouchEvent) {
      swipeStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
    }
    function onTouchEnd(e: TouchEvent) {
      if (!swipeStart.current) return
      const dx = e.changedTouches[0].clientX - swipeStart.current.x
      const dy = e.changedTouches[0].clientY - swipeStart.current.y
      swipeStart.current = null
      if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) {
        setSelectedDayKey((prev) => {
          const idx = weekDays.findIndex((d) => d.key === prev)
          if (dx < 0 && idx >= 0 && idx < 6) return weekDays[idx + 1].key
          if (dx > 0 && idx > 0) return weekDays[idx - 1].key
          return prev
        })
      }
    }
    el.addEventListener('touchstart', onTouchStart, { passive: true })
    el.addEventListener('touchend', onTouchEnd, { passive: true })
    return () => {
      el.removeEventListener('touchstart', onTouchStart)
      el.removeEventListener('touchend', onTouchEnd)
    }
  }, [weekDays])

  const fetchWeek = useCallback((options?: { silent?: boolean; highlightId?: number }) => {
    // Fallback — never get stuck forever even if API fails or boxesId is null
    let readyTimer: ReturnType<typeof setTimeout> | null = null
    readyTimer = setTimeout(() => {
      console.log('WeeklySchedulePage: 5s fallback timeout fired')
      if (!initialLoadDoneRef.current) {
        initialLoadDoneRef.current = true
        props.onDataReady?.()
      }
    }, 5000)

    if (!boxesId) {
      console.log('WeeklySchedulePage: boxesId is null, skipping fetch')
      if (readyTimer) clearTimeout(readyTimer)
      return Promise.resolve()
    }
    abortControllerRef.current?.abort()
    const controller = new AbortController()
    abortControllerRef.current = controller
    if (!options?.silent) {
      setLoading(true)
      setLessons([])
    }
    setError(null)

    const { from, to } = weekRangeIso(weekAnchor)
    return client
      .scheduleBetweenDates({ from, to, locations_box_id: null, boxes_id: boxesId })
      .then((res: ArboxBetweenDatesResponse) => {
        if (controller.signal.aborted) return
        const newLessons = Array.isArray(res?.data) ? res.data : []
        setLessons(newLessons)
        
        clearTimeout(readyTimer ?? undefined)
        
        // Notify parent on first successful data load
        if (!initialLoadDoneRef.current && boxesId) {
          initialLoadDoneRef.current = true
          console.log('WeeklySchedulePage: onDataReady fired, lessons:', newLessons.length)
          props.onDataReady?.()
        }

        if (options?.highlightId) {
          setHighlightedLessonIds((prev) => {
            const next = new Set(prev)
            next.add(options.highlightId!)
            return next
          })
          setTimeout(() => {
            setHighlightedLessonIds((prev) => {
              const next = new Set(prev)
              next.delete(options.highlightId!)
              return next
            })
          }, 2000)
        }
      })
      .catch((e: unknown) => {
        if (controller.signal.aborted) return
        if (!initialLoadDoneRef.current && boxesId) {
          initialLoadDoneRef.current = true
          props.onDataReady?.()
        }
        if (readyTimer) clearTimeout(readyTimer)
        const err = e as Partial<ArboxApiError> & { message?: string }
        if (typeof err?.status === 'number' && typeof err?.url === 'string') {
          setError(`HTTP ${err.status} ${err.url}`)
        } else {
          setError(err?.message ?? String(e))
        }
      })
      .finally(() => {
        if (readyTimer) clearTimeout(readyTimer)
        if (!controller.signal.aborted) setLoading(false)
      })
  }, [client, boxesId, weekAnchor])

  const fetchWeekRef = useRef(fetchWeek)
  useEffect(() => {
    fetchWeekRef.current = fetchWeek
  }, [fetchWeek])

  useEffect(() => {
    if (scheduleKey && scheduleKey > 0) {
      fetchWeek({ silent: true })
    }
  }, [scheduleKey])

  useEffect(() => {
    fetchWeek()
    return () => { abortControllerRef.current?.abort() }
  }, [fetchWeek])

  const lessonsByDay = useMemo(() => {
    const map: Record<string, ArboxLesson[]> = {}
    for (const l of lessons) {
      const isActive = !l.status || l.status === 'active'
      const showInApp =
        l.series?.membership_types?.some((mt) => mt?.show_in_app === 1 || mt?.show_in_app === true) ?? false
      if (!isActive || !showInApp) continue
      const key = l.date
      if (!key) continue
      if (!map[key]) map[key] = []
      map[key].push(l)
    }
    for (const key of Object.keys(map)) {
      map[key].sort((a, b) => (a.time ?? '').localeCompare(b.time ?? ''))
    }
    return map
  }, [lessons])

  const selectedLessons = lessonsByDay[selectedDayKey] ?? []
  const weekStart = weekDays[0]?.date
  const weekEnd = weekDays[6]?.date
  const weekLabel = weekStart && weekEnd ? `${formatMonthDay(weekStart)} - ${formatMonthDay(weekEnd)}` : ''

  function coachFullName(l: ArboxLesson) {
    const v = l.coach?.full_name
    if (typeof v === 'string' && v.trim()) return v.trim()
    if (l.coach?.first_name || l.coach?.last_name) return `${l.coach?.first_name ?? ''} ${l.coach?.last_name ?? ''}`.trim()
    if (typeof l.coach_fk === 'number') return `Coach #${l.coach_fk}`
    return 'Instructor'
  }

  function boxLabel(l: ArboxLesson) {
    const name = l.box_categories?.name
    if (typeof name === 'string' && name.trim()) return name.trim()
    return 'Club'
  }

  function bookingsLabel(l: ArboxLesson) {
    const registered = typeof l.registered === 'number' ? l.registered : null
    const max = typeof l.max_users === 'number' ? l.max_users : null
    return registered === null ? '—' : (max !== null ? `${registered} / ${max}` : String(registered))
  }

  function waitlistLabel(l: ArboxLesson) {
    const standbyCount = Array.isArray(l.schedule_stand_by) ? l.schedule_stand_by.length : 0
    return standbyCount > 0 ? `+${standbyCount} waiting` : null
  }

  function isLessonPast(l: ArboxLesson) {
    return l.past === true || l.past === 1
  }

  async function handleSubscribe(l: ArboxLesson) {
    if (!props.selectedMembershipId) return
    setActionBusy((b) => ({ ...b, [l.id]: 'subbing' }))
    try {
      await client.subscribeToLesson({ schedule_id: l.id, membership_user_id: props.selectedMembershipId })
      await fetchWeek({ silent: true, highlightId: l.id })
      onSubscribe?.(l)
      onAction?.(l)
    } catch (e) {
      errorHandler.handleApiError(e, `Join "${l.box_categories?.name}"`)
    } finally {
      setActionBusy((b) => { const n = { ...b }; delete n[l.id]; return n })
    }
  }

  async function handleUnsubscribe(l: ArboxLesson) {
    const scheduleUserId = typeof l.user_booked === 'number' ? l.user_booked : null
    if (!scheduleUserId) return
    setActionBusy((b) => ({ ...b, [l.id]: 'unsubbing' }))
    try {
      await client.unsubscribeFromLesson({ schedule_user_id: scheduleUserId, schedule_id: l.id })
      await fetchWeek({ silent: true, highlightId: l.id })
      onAction?.(l)
    } catch (e) {
      errorHandler.handleApiError(e, `Leave "${l.box_categories?.name}"`)
    } finally {
      setActionBusy((b) => { const n = { ...b }; delete n[l.id]; return n })
    }
  }

  async function handleJoinStandby(l: ArboxLesson) {
    if (!props.selectedMembershipId) return
    setActionBusy((b) => ({ ...b, [l.id]: 'joining' }))
    try {
      await client.joinStandby({ schedule_id: l.id, membership_user_id: props.selectedMembershipId })
      await fetchWeek({ silent: true, highlightId: l.id })
    } catch (e) {
      errorHandler.handleApiError(e, `Waitlist "${l.box_categories?.name}"`)
    } finally {
      setActionBusy((b) => { const n = { ...b }; delete n[l.id]; return n })
    }
  }

  async function handleLeaveStandby(l: ArboxLesson) {
    const standbyId = typeof l.user_in_standby === 'number' ? l.user_in_standby : null
    if (!standbyId) return
    setActionBusy((b) => ({ ...b, [l.id]: 'leaving' }))
    try {
      await client.leaveStandby({ schedule_stand_by_id: standbyId })
      await fetchWeek({ silent: true, highlightId: l.id })
    } catch (e) {
      errorHandler.handleApiError(e, `Leave waitlist "${l.box_categories?.name}"`)
    } finally {
      setActionBusy((b) => { const n = { ...b }; delete n[l.id]; return n })
    }
  }

  function isRegistrationEnabled(lesson: ArboxLesson): boolean {
    if (!lesson.enable_registration_time) return true
    const lessonDate = lesson.date // YYYY-MM-DD
    const lessonTime = lesson.time // HH:mm:ss
    const lessonDateTime = new Date(`${lessonDate}T${lessonTime}`)
    const now = new Date()
    const diffHours = (lessonDateTime.getTime() - now.getTime()) / (1000 * 60 * 60)
    return diffHours <= lesson.enable_registration_time
  }

  return (
    <div className={layoutStyles.page}>
      <div className={weeklyScheduleStyles.scheduleHeader}>
        <button className={weeklyScheduleStyles.scheduleNavBtn} title="Prev" onClick={() => setWeekAnchor((d) => addDaysLocal(d, -7))}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
        </button>
        <div className={weeklyScheduleStyles.scheduleHeaderCenter}>
          <div className={weeklyScheduleStyles.scheduleSubtitle}>{weekLabel}</div >
        </div >
        <button className={weeklyScheduleStyles.scheduleNavBtn} title="Next" onClick={() => setWeekAnchor((d) => addDaysLocal(d, 7))}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 6 6 6-6 6"/></svg>
        </button>
      </div >

      {error ? <div className={componentStyles.errorBox}>{error}</div > : null}

      <div className={weeklyScheduleStyles.weekGrid}>
        {weekDays.map((d) => {
          const dayLessons = lessonsByDay[d.key] ?? []
          return (
            <div key={d.key} className={weeklyScheduleStyles.dayColumn}>
              <div className={weeklyScheduleStyles.dayHeader}>
                <div className={weeklyScheduleStyles.dayHeaderTop}>
                  <span className={weeklyScheduleStyles.dayName}>{formatDayShort(d.date)}</span >
                  <span className={weeklyScheduleStyles.dayDate}>{d.key.slice(5)}</span >
                </div >
              </div >
              <div className={weeklyScheduleStyles.dayLessons}>
                {dayLessons.slice(0, 20).map((l) => (
                  <LessonRow
                    key={`${l.id}-${l.time}-${l.date}`}
                    lesson={l}
                    isPast={isLessonPast(l)}
                    isHighlighted={highlightedLessonIds.has(l.id)}
                    onOpenInvite={() => setInviteLesson(l)}
                    onSubscribe={() => handleSubscribe(l)}
                    onUnsubscribe={() => handleUnsubscribe(l)}
                    onJoinStandby={() => handleJoinStandby(l)}
                    onLeaveStandby={() => handleLeaveStandby(l)}
                    busy={actionBusy[l.id]}
                    boxLabel={boxLabel(l)}
                    coachName={coachFullName(l)}
                    bookingsLabel={bookingsLabel(l)}
                    waitlistLabel={waitlistLabel(l)}
                    hasFriends={!!(friends && friends.length > 0)}
                    friendIds={friendIds}
                    isRegistrationDisabled={!isRegistrationEnabled(l)}
                  />
                ))}
                {dayLessons.length > 20 ? <div className={`${componentStyles.muted} ${componentStyles.small}`}>Showing first 20</div > : null}
              </div >
            </div >
          )
        })}
      </div >

      <div className={weeklyScheduleStyles.mobileSchedule} ref={swipeRef}>
        <div className={weeklyScheduleStyles.mobileDayPicker}>
          {weekDays.map((d, i) => {
            const isSelected = d.key === selectedDayKey
            const dayLessons = lessonsByDay[d.key] ?? []
            const hasAvailable = dayLessons.some(l => !isLessonPast(l))
            return (
              <button key={d.key} className={`${weeklyScheduleStyles.dayChip} ${isSelected ? weeklyScheduleStyles.dayChipSelected : ''} ${!hasAvailable && !isSelected ? weeklyScheduleStyles.dayChipEmpty : ''}`} onClick={() => setSelectedDayKey(d.key)}>
                <span className={weeklyScheduleStyles.dayChipAbbr}>{DAY_ABBR[i]}</span >
                <span className={weeklyScheduleStyles.dayChipDate}>{d.key.slice(8)}</span >
              </button>
            )
          })}
        </div >

        <div className={`${componentStyles.card} ${weeklyScheduleStyles.selectedDayCard}`}>
          <div className={weeklyScheduleStyles.selectedDayTitle}>
            {selectedDayKey} ({selectedLessons.length} sessions)
          </div >
          {loading ? null : selectedLessons.length ? (
            <div className={weeklyScheduleStyles.selectedDayList}>
              {selectedLessons.map((l) => {
                const past = isLessonPast(l)
                const booked = typeof l.user_booked === 'number' && l.user_booked > 0
                const onStandby = typeof l.user_in_standby === 'number' && l.user_in_standby > 0
                const standbyPos = typeof l.stand_by_position === 'number' ? l.stand_by_position : null

                return (
                  <div key={`${l.id}-${l.time}-${l.date}`} className={`${weeklyScheduleStyles.selectedLesson} ${past ? weeklyScheduleStyles.selectedLessonPast : ''} ${booked ? weeklyScheduleStyles.selectedLessonBooked : ''} ${highlightedLessonIds.has(l.id) ? weeklyScheduleStyles.lessonHighlight : ''}`}>
                    <div className={weeklyScheduleStyles.selectedLessonInfo}>
                      <div className={weeklyScheduleStyles.selectedLessonTime}>{l.time?.slice(0, 5) ?? '—'}</div >
                      <div className={weeklyScheduleStyles.selectedLessonDetails}>
                        <div className={weeklyScheduleStyles.selectedLessonInstructor}>{boxLabel(l)}</div >
                        <div className={weeklyScheduleStyles.selectedLessonInstructorName}>{coachFullName(l)}</div >
                        <div className={weeklyScheduleStyles.selectedLessonBookings}>{bookingsLabel(l)}{friendIds.size > 0 && l.booked_users && l.booked_users.length > 0 ? (
                          <span className={weeklyScheduleStyles.friendAvatarsInline}><FriendAvatars bookedUsers={l.booked_users} friendIds={friendIds} /></span>
                        ) : null}</div>
                        {waitlistLabel(l) && <div className={weeklyScheduleStyles.selectedLessonWaitlist}>{waitlistLabel(l)}</div >}
                      </div >
                    </div >
                    {!past && (
                      <div className={weeklyScheduleStyles.selectedLessonActions}>
                        <LessonActions
                          lesson={l}
                          booked={booked}
                          onStandby={onStandby}
                          standbyPos={standbyPos}
                          onOpenInvite={() => setInviteLesson(l)}
                          onSubscribe={() => handleSubscribe(l)}
                          onUnsubscribe={() => handleUnsubscribe(l)}
                          onJoinStandby={() => handleJoinStandby(l)}
                          onLeaveStandby={() => handleLeaveStandby(l)}
                          busy={actionBusy[l.id]}
                          hasFriends={!!(friends && friends.length > 0)}
                          friendIds={friendIds}
                        />
                      </div >
                    )}
                  </div >
                )
              })}
            </div >
          ) : (
            <div className={`${componentStyles.muted} ${componentStyles.small}`}>No sessions found for this day.</div >
          )}
        </div >
      </div >

      {inviteLesson && friends && currentUserId && (
        <FriendInviteModal
          friends={friends}
          currentUserId={currentUserId}
          lessonLabel={`${boxLabel(inviteLesson)} at ${inviteLesson.time?.slice(0, 5)}`}
          bookedUserIds={new Set((inviteLesson.booked_users ?? []).map(u => u.id))}
          onSelect={(friendId) => {
            onInviteFriend?.(inviteLesson, friendId)
            setInviteLesson(null)
          }}
          onClose={() => setInviteLesson(null)}
        />
      )}
    </div >
  )
}

function LessonRow(props: {
  lesson: ArboxLesson
  isPast: boolean
  isHighlighted?: boolean
  onOpenInvite: () => void
  onSubscribe: () => void
  onUnsubscribe: () => void
  onJoinStandby: () => void
  onLeaveStandby: () => void
  busy: 'subbing' | 'unsubbing' | 'joining' | 'leaving' | null
  boxLabel: string
  coachName: string
  bookingsLabel: string
  waitlistLabel: string | null
  hasFriends: boolean
  friendIds: Set<number>
  isRegistrationDisabled?: boolean
}) {
  const { isPast, onOpenInvite, busy, hasFriends, waitlistLabel, isRegistrationDisabled, friendIds } = props
  const booked = typeof props.lesson.user_booked === 'number' && props.lesson.user_booked > 0
  const onStandby = typeof props.lesson.user_in_standby === 'number' && props.lesson.user_in_standby > 0
  const standbyPos = typeof props.lesson.stand_by_position === 'number' ? props.lesson.stand_by_position : null

  return (
    <div className={`${weeklyScheduleStyles.lessonRow} ${isPast ? weeklyScheduleStyles.lessonRowPast : ''} ${booked ? weeklyScheduleStyles.lessonRowBooked : ''} ${onStandby ? weeklyScheduleStyles.lessonRowStandby : ''} ${props.isHighlighted ? weeklyScheduleStyles.lessonHighlight : ''} ${isRegistrationDisabled ? weeklyScheduleStyles.lessonRowDisabled : ''}`}>
      <div className={weeklyScheduleStyles.lessonInfo}>
        <div className={weeklyScheduleStyles.lessonTime}>{props.lesson.time?.slice(0, 5) ?? '—'}</div >
       <div className={weeklyScheduleStyles.lessonClub}>{props.boxLabel}</div >
       <div className={weeklyScheduleStyles.lessonInstructorName}>{props.coachName}</div >
         <div className={weeklyScheduleStyles.lessonBookings}>
          {onStandby && standbyPos !== null ? (
            <>Waiting... #{standbyPos}{friendIds.size > 0 && props.lesson.booked_users && props.lesson.booked_users.length > 0 ? (
              <span className={weeklyScheduleStyles.friendAvatarsInline}><FriendAvatars bookedUsers={props.lesson.booked_users} friendIds={friendIds} /></span>
            ) : null}</>
          ) : (
            <>
              {props.bookingsLabel}{friendIds.size > 0 && props.lesson.booked_users && props.lesson.booked_users.length > 0 ? (
                <span className={weeklyScheduleStyles.friendAvatarsInline}><FriendAvatars bookedUsers={props.lesson.booked_users} friendIds={friendIds} /></span>
              ) : null}
            </>
          )}
        </div >
        {waitlistLabel && (
          <div className={weeklyScheduleStyles.lessonWaitlist}>{waitlistLabel}</div>
        )}
       </div >
       {!isPast && (
         <div className={weeklyScheduleStyles.lessonActions}>
           <LessonActions
             lesson={props.lesson}
             booked={booked}
             onStandby={onStandby}
             standbyPos={standbyPos}
             onOpenInvite={onOpenInvite}
             onSubscribe={props.onSubscribe}
             onUnsubscribe={props.onUnsubscribe}
             onJoinStandby={props.onJoinStandby}
             onLeaveStandby={props.onLeaveStandby}
             busy={busy}
             hasFriends={hasFriends}
             friendIds={friendIds}
           />
         </div>
       )}
    </div >
  )
}

const MAX_AVATARS = 3

function FriendAvatars(props: { bookedUsers: ArboxScheduleUser[]; friendIds: Set<number> }) {
  const friends = props.bookedUsers.filter(u => u.is_user && props.friendIds.has(u.id))
  if (friends.length === 0) return null
  
  const visible = friends.slice(0, MAX_AVATARS)
  const overflow = friends.length - MAX_AVATARS

  return (
    <div className={weeklyScheduleStyles.friendAvatars}>
      {visible.map((u) => (
        <div key={u.id} className={weeklyScheduleStyles.friendAvatarWrapper}>
          {u.image ? (
            <img src={u.image} alt="" className={weeklyScheduleStyles.friendAvatarImg} />
          ) : (
            <div className={weeklyScheduleStyles.friendAvatarFallback}>{(u.first_name?.[0] ?? '') + (u.last_name?.[0] ?? '')}</div>
          )}
          {u.full_name && <span className={weeklyScheduleStyles.friendTooltip}>{u.full_name}</span>}
        </div>
      ))}
      {overflow > 0 && (
        <div className={weeklyScheduleStyles.friendAvatarWrapper}>
          <div className={`${weeklyScheduleStyles.friendAvatarFallback} ${weeklyScheduleStyles.friendAvatarOverflow}`}>+{overflow}</div>
        </div>
      )}
    </div>
  )
}

function LessonActions(props: {
  lesson: ArboxLesson
  booked: boolean
  onStandby: boolean
  standbyPos: number | null
  onOpenInvite: () => void
  onSubscribe: () => void
  onUnsubscribe: () => void
  onJoinStandby: () => void
  onLeaveStandby: () => void
  busy: 'subbing' | 'unsubbing' | 'joining' | 'leaving' | null
  hasFriends: boolean
  friendIds: Set<number>
  isRegistrationDisabled?: boolean
}) {
  const { booked, onStandby, standbyPos, busy, hasFriends, isRegistrationDisabled } = props

  return (
    <div className={weeklyScheduleStyles.lessonActionsRow}>
      {booked ? (
        <>
          {hasFriends && (
            <button className={`${componentStyles.btn} ${weeklyScheduleStyles.btnMobile} ${componentStyles.btnInvite}`} disabled={!!busy} onClick={(e) => { e.stopPropagation(); props.onOpenInvite() }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>
              <span >Invite</span >
            </button>
          )}
          <button className={`${componentStyles.btn} ${weeklyScheduleStyles.btnMobile} ${componentStyles.btnUnsubscribe}`} disabled={busy === 'unsubbing'} onClick={(e) => { e.stopPropagation(); props.onUnsubscribe() }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            <span >{busy === 'unsubbing' ? 'Leaving…' : (
              <>
                <span >Leave</span >
              </>
            )}</span >
          </button>
        </>
      ) : onStandby ? (
        <button className={`${componentStyles.btn} ${weeklyScheduleStyles.btnMobile} ${componentStyles.btnWaitlist}`} disabled={busy === 'leaving'} onClick={(e) => { e.stopPropagation(); props.onLeaveStandby() }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="9 12 11 14 15 10"/></svg>
          <span >{busy === 'leaving' ? 'Leaving…' : (
            <>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="9 12 11 14 15 10"/></svg>
              <span >Waitlist{standbyPos !== null ? ` #${standbyPos}` : ''}</span >
            </>
          )}</span >
        </button>
      ) : props.lesson.free !== undefined && typeof props.lesson.free === 'number' && (props.lesson.free as number) > 0 ? (
        <button className={`${componentStyles.btn} ${weeklyScheduleStyles.btnMobile} ${componentStyles.btnJoin}`} disabled={busy === 'subbing' || isRegistrationDisabled} onClick={(e) => { e.stopPropagation(); props.onSubscribe() }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          <span >{busy === 'subbing' ? 'Joining…' : isRegistrationDisabled ? 'Locked' : 'Join'}</span >
        </button>
      ) : (
        <button className={`${componentStyles.btn} ${weeklyScheduleStyles.btnMobile} ${componentStyles.btnWaitlistJoin}`} disabled={busy === 'joining' || isRegistrationDisabled} onClick={(e) => { e.stopPropagation(); props.onJoinStandby() }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          <span >{busy === 'joining' ? 'Joining…' : isRegistrationDisabled ? 'Locked' : 'Waitlist'}</span >
        </button>
      )}
    </div >
  )
}
