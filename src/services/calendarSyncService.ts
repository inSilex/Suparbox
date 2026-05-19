import { GoogleCalendarClient, type GoogleCalendarEvent } from '../api/googleCalendar'
import type { ArboxLesson } from '../api/arbox'
import { getAllMappings, saveMapping, deleteMapping, getCancelledLessons, getUnsyncedLessons, unmarkLessonUnsynced, cleanupExpiredData } from './syncStorage'

export async function reconcileCalendar(
  lessons: ArboxLesson[],
  googleClient: GoogleCalendarClient,
  calendarId: string,
  forceSyncIds?: Set<number>
): Promise<Set<number>> {
  console.log('[sync] reconcileCalendar start:', { lessonCount: lessons.length })
  const synced = new Set<number>()
  
  try {
    const currentMappings = await getAllMappings()
    console.log('[sync] mappings loaded:', Object.keys(currentMappings).length)
    
    const cancelledIds = await getCancelledLessons()
    console.log('[sync] cancelled IDs:', [...cancelledIds])

    const unsyncedIds = await getUnsyncedLessons()
    console.log('[sync] unsynced IDs:', [...unsyncedIds])

    const futureLessons = lessons.filter(l => l.past === 0 || l.past === false)
    const pastLessons = lessons.filter(l => l.past === 1 || l.past === true)
    console.log('[sync] future:', futureLessons.length, 'past:', pastLessons.length)

    const failedCount: number[] = []

    for (const l of futureLessons) {
      const existingEventId = currentMappings[l.id]
      console.log('[sync] processing lesson', l.id, 'existing:', existingEventId)

      try {
        if (existingEventId) {
          synced.add(l.id)
          continue
        }

        if (cancelledIds.has(l.id) && !(forceSyncIds?.has(l.id))) {
          console.log('[sync] skipping cancelled lesson', l.id)
          continue
        }

        if (unsyncedIds.has(l.id)) {
          if (forceSyncIds?.has(l.id)) {
            await unmarkLessonUnsynced(l.id)
          } else {
            console.log('[sync] skipping unsynced lesson', l.id)
            continue
          }
        }

        const eventData: GoogleCalendarEvent = {
          summary: `Arbox: ${l.box_categories?.name || 'Session'}`,
          description: `Coach: ${l.coach?.full_name || 'TBD'}\nLocation: ${l.locations_box?.location || 'TBD'}`,
          start: { dateTime: new Date(`${l.date} ${l.time}`).toISOString() },
          end: { dateTime: new Date(`${l.date} ${l.end_time}`).toISOString() },
          extendedProperties: { private: { arbox_lesson_id: String(l.id) } },
        }

        console.log('[sync] inserting event for lesson', l.id)
        const newEvent = await googleClient.insertEvent(eventData, calendarId)
        if (newEvent.id) {
          await saveMapping(l.id, newEvent.id)
          synced.add(l.id)
          console.log('[sync] inserted event:', newEvent.id)
        }
      } catch (e: any) {
        console.error(`[sync] Failed to sync lesson ${l.id}:`, e)
        failedCount.push(l.id)
      }
    }

    const pastIds = new Set(pastLessons.map(l => l.id))
    
    for (const [arboxIdStr, eventId] of Object.entries(currentMappings)) {
      const aid = Number(arboxIdStr)
      
      if (pastIds.has(aid)) {
        console.log('[sync] deleting past lesson event', aid, eventId)
        try {
          await googleClient.deleteEvent(eventId, calendarId)
        } catch (e: any) {
          console.warn(`[sync] Failed to delete Google event for past lesson ${aid}:`, e)
        }
        await deleteMapping(aid)
      }
    }

    await cleanupExpiredData(lessons)

    if (failedCount.length > 0) {
      console.warn(`[sync] Failed to sync ${failedCount.length} of ${futureLessons.length} lesson(s):`, failedCount)
    }

    console.log('[sync] done, synced:', [...synced])
  } catch (e: any) {
    console.error('[sync] reconcileCalendar error:', e)
    return new Set()
  }

  return synced
}
