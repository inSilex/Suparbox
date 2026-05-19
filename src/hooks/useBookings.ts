import { useState, useCallback, useEffect } from 'react'
import type { ArboxLesson, ArboxClient } from '../api/arbox'
import { getAllMappings } from '../services/syncStorage'

const SYNCED_KEY = '_synced_lesson_ids'

function parseSyncedIds(value: string | null): Set<number> {
  if (!value) return new Set()
  try {
    return new Set(JSON.parse(value).filter((id: number) => typeof id === 'number'))
  } catch {
    return new Set()
  }
}

function saveSyncedIds(ids: Set<number>): void {
  try {
    localStorage.setItem(SYNCED_KEY, JSON.stringify([...ids]))
  } catch {}
}

export function useBookings(client: ArboxClient) {
  const [userClasses, setUserClasses] = useState<ArboxLesson[]>([])
  const [userClassesLoaded, setUserClassesLoaded] = useState(false)
  const [bookingBusy, setBookingBusy] = useState<Record<number, boolean>>({})
  const [syncedLessonIds, setSyncedLessonIds] = useState<Set<number>>(() => {
    try {
      return parseSyncedIds(localStorage.getItem(SYNCED_KEY))
    } catch {
      return new Set()
    }
  })

  useEffect(() => {
    let cancelled = false
    async function loadMappings() {
      try {
        const mappings = await getAllMappings()
        if (!cancelled) {
          setSyncedLessonIds(prev => {
            const next = new Set([...prev, ...Object.keys(mappings).map(Number)])
            saveSyncedIds(next)
            return next
          })
        }
      } catch {}
    }
    loadMappings()
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    const now = Date.now()
    setSyncedLessonIds(prev => {
      const futureIds = new Set<number>()
      for (const l of userClasses) {
        const lessonTime = new Date(`${l.date} ${l.time}`).getTime()
        if (lessonTime > now && (l.past === 0 || l.past === false)) {
          futureIds.add(l.id)
        }
      }
      const next = new Set([...prev].filter(id => futureIds.has(id)))
      if (next.size !== prev.size) {
        saveSyncedIds(next)
      }
      return next
    })
  }, [userClasses])

  const fetchUserClasses = useCallback(async (id: number): Promise<ArboxLesson[]> => {
    try {
      const now = new Date().toISOString().split('T')[0]
      
      const res = await client.getUserClasses({
        date: now,
        locations_box_id: null,
        direction: 'both',
        boxes_id: id
      })

      setUserClasses(res.data ?? [])
      setUserClassesLoaded(true)
      return res.data ?? []
    } catch (e) {
      console.error('Failed to fetch user classes', e)
      return []
    }
  }, [client])

  const unsubscribeFromLesson = useCallback(async (scheduleUserId: number, scheduleId: number): Promise<void> => {
    try {
      await client.unsubscribeFromLesson({ schedule_user_id: scheduleUserId, schedule_id: scheduleId })
    } finally {}
  }, [client])

  return {
    userClasses,
    setUserClasses,
    userClassesLoaded,
    setUserClassesLoaded,
    bookingBusy,
    setBookingBusy,
    syncedLessonIds,
    setSyncedLessonIds,
    fetchUserClasses,
    unsubscribeFromLesson
  }
}
