const DB_NAME = 'SuparboxSyncDB'
const STORE_NAME = 'lessonMappings'
const TOKEN_STORE = 'googleTokens'

import type { ArboxLesson } from '../api/arbox'

export async function getDb() {
  console.log('[db] opening DB:', DB_NAME, 'v4')
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 4)
    request.onupgradeneeded = () => {
      console.log('[db] upgrade needed')
      const db = request.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME)
      }
      if (!db.objectStoreNames.contains(TOKEN_STORE)) {
        db.createObjectStore(TOKEN_STORE)
      }
    }
    request.onsuccess = () => {
      console.log('[db] opened successfully')
      resolve(request.result)
    }
    request.onerror = () => {
      console.error('[db] open error:', request.error)
      reject(request.error)
    }
  })
}

export async function getMapping(lessonId: number): Promise<string | undefined> {
  const db = await getDb()
  return new Promise((resolve, reject) => {
    console.log('[db] getMapping:', lessonId)
    const transaction = db.transaction(STORE_NAME, 'readonly')
    const store = transaction.objectStore(STORE_NAME)
    const request = store.get(lessonId)
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export async function saveMapping(lessonId: number, eventId: string): Promise<void> {
  const db = await getDb()
  return new Promise((resolve, reject) => {
    console.log('[db] saveMapping:', lessonId, eventId)
    const transaction = db.transaction(STORE_NAME, 'readwrite')
    const store = transaction.objectStore(STORE_NAME)
    const request = store.put(eventId, lessonId)
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

export async function deleteMapping(lessonId: number): Promise<void> {
  const db = await getDb()
  return new Promise((resolve, reject) => {
    console.log('[db] deleteMapping:', lessonId)
    const transaction = db.transaction(STORE_NAME, 'readwrite')
    const store = transaction.objectStore(STORE_NAME)
    const request = store.delete(lessonId)
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

export async function getAllMappings(): Promise<Record<number, string>> {
  console.log('[db] getAllMappings')
  const db = await getDb()
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly')
    const store = transaction.objectStore(STORE_NAME)
    const request = store.openCursor()
    const results: Record<number, string> = {}
    request.onsuccess = () => {
      const cursor = request.result
      if (cursor) {
        results[cursor.key as number] = cursor.value
        cursor.continue()
      } else {
        console.log('[db] getAllMappings done:', Object.keys(results).length, 'entries')
        resolve(results)
      }
    }
    request.onerror = () => reject(request.error)
  })
}

export async function getGoogleToken(key: string): Promise<string | undefined> {
  const db = await getDb()
  return new Promise((resolve, reject) => {
    console.log('[db] getGoogleToken:', key)
    const transaction = db.transaction(TOKEN_STORE, 'readonly')
    const store = transaction.objectStore(TOKEN_STORE)
    const request = store.get(key)
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export async function saveGoogleToken(key: string, value: string): Promise<void> {
  const db = await getDb()
  return new Promise((resolve, reject) => {
    console.log('[db] saveGoogleToken:', key)
    const transaction = db.transaction(TOKEN_STORE, 'readwrite')
    const store = transaction.objectStore(TOKEN_STORE)
    const request = store.put(value, key)
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

export async function deleteGoogleToken(key: string): Promise<void> {
  const db = await getDb()
  return new Promise((resolve, reject) => {
    console.log('[db] deleteGoogleToken:', key)
    const transaction = db.transaction(TOKEN_STORE, 'readwrite')
    const store = transaction.objectStore(TOKEN_STORE)
    const request = store.delete(key)
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

// Calendar ID storage (reuses TOKEN_STORE as a generic key-value store)
const CALENDAR_ID_KEY = 'arbox_calendar_id'

export async function getCalendarId(): Promise<string | undefined> {
  return getGoogleToken(CALENDAR_ID_KEY)
}

export async function saveCalendarId(value: string): Promise<void> {
  return saveGoogleToken(CALENDAR_ID_KEY, value)
}

export async function deleteCalendarId(): Promise<void> {
  return deleteGoogleToken(CALENDAR_ID_KEY)
}

// Persist lessons the user deleted on Google so full sync doesn't re-add them.
// Key format: "cancelled_lesson_{id}", value: "1"
const CANCELLED_PREFIX = 'cancelled_lesson_'

export async function getCancelledLessons(): Promise<Set<number>> {
  console.log('[db] getCancelledLessons')
  const db = await getDb()
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(TOKEN_STORE, 'readonly')
    const store = transaction.objectStore(TOKEN_STORE)
    const request = store.openCursor()
    const results = new Set<number>()
    request.onsuccess = () => {
      const cursor = request.result
      if (cursor) {
        console.log('[db] cursor key:', cursor.key, 'value:', cursor.value)
        if (typeof cursor.key === 'string' && cursor.key.startsWith(CANCELLED_PREFIX)) {
          const id = parseInt(cursor.key.slice(CANCELLED_PREFIX.length), 10)
          if (!isNaN(id)) results.add(id)
        }
        cursor.continue()
      } else {
        console.log('[db] getCancelledLessons done:', [...results])
        resolve(results)
      }
    }
    request.onerror = () => reject(request.error)
  })
}

export async function markLessonCancelled(lessonId: number): Promise<void> {
  return saveGoogleToken(CANCELLED_PREFIX + lessonId, '1')
}

export async function unmarkLessonCancelled(lessonId: number): Promise<void> {
  return deleteGoogleToken(CANCELLED_PREFIX + lessonId)
}

// Persist lessons the user explicitly unsynced so full sync doesn't re-add them.
// Key format: "unsynced_lesson_{id}", value: "1"
const UNSYNCED_PREFIX = 'unsynced_'

export async function getUnsyncedLessons(): Promise<Set<number>> {
  console.log('[db] getUnsyncedLessons')
  const db = await getDb()
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(TOKEN_STORE, 'readonly')
    const store = transaction.objectStore(TOKEN_STORE)
    const request = store.openCursor()
    const results = new Set<number>()
    request.onsuccess = () => {
      const cursor = request.result
      if (cursor) {
        if (typeof cursor.key === 'string' && cursor.key.startsWith(UNSYNCED_PREFIX)) {
          const id = parseInt(cursor.key.slice(UNSYNCED_PREFIX.length), 10)
          if (!isNaN(id)) results.add(id)
        }
        cursor.continue()
      } else {
        console.log('[db] getUnsyncedLessons done:', [...results])
        resolve(results)
      }
    }
    request.onerror = () => reject(request.error)
  })
}

export async function markLessonUnsynced(lessonId: number): Promise<void> {
  return saveGoogleToken(UNSYNCED_PREFIX + lessonId, '1')
}

export async function unmarkLessonUnsynced(lessonId: number): Promise<void> {
  return deleteGoogleToken(UNSYNCED_PREFIX + lessonId)
}

/**
 * Remove cancelled entries whose lesson IDs have passed.
 * Call this periodically during sync to keep storage bounded.
 */
export async function cleanupExpiredData(lessons: ArboxLesson[]): Promise<void> {
  console.log('[db] cleanupExpiredData:', lessons.length, 'lessons')
  const db = await getDb()
  const futureLessonIds = new Set<number>()
  for (const l of lessons) {
    if (l.past === 0 || l.past === false) {
      futureLessonIds.add(l.id)
    }
  }

  // Remove cancelled and unsynced entries for lessons not in the future set
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(TOKEN_STORE, 'readwrite')
    const store = transaction.objectStore(TOKEN_STORE)
    const request = store.openCursor()
    request.onsuccess = () => {
      const cursor = request.result
      if (cursor) {
        const key = cursor.key
        console.log('[db] cleanup cursor:', key, typeof key)
        if (typeof key === 'string' && (key.startsWith(CANCELLED_PREFIX) || key.startsWith(UNSYNCED_PREFIX))) {
          const id = parseInt(key.split('_').pop()!, 10)
          if (!isNaN(id) && !futureLessonIds.has(id)) {
            console.log('[db] deleting expired entry:', key)
            cursor.delete()
          }
        }
        cursor.continue()
      } else {
        console.log('[db] cleanupExpiredData done')
        resolve()
      }
    }
    request.onerror = () => reject(request.error)
  })
}
