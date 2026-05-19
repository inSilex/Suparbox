import { useState, useCallback } from 'react'
import type { ArboxBoxMessage } from '../api/arbox'
import { saveSeenMessages, getSeenMessages } from '../ui/storage'

export function useFeed(fetchFeedFn: () => Promise<any>) {
  const [feedMessages, setFeedMessages] = useState<ArboxBoxMessage[]>([])
  const [seenIds, setSeenIds] = useState<number[]>(() => getSeenMessages())

  const fetchFeed = useCallback(async () => {
    try {
      const res = await fetchFeedFn()
      setFeedMessages([...res.waitlistUpgrades, ...res.apiMessages])
    } catch (e) {
      console.error('Failed to fetch feed', e)
    }
  }, [fetchFeedFn])

  const dismissNews = useCallback(async (id: number) => {
    const newSeenIds = Array.from(new Set([...seenIds, id]))
    setSeenIds(newSeenIds)
    saveSeenMessages(newSeenIds)
  }, [seenIds])

  return {
    feedMessages,
    seenIds,
    unreadCount: feedMessages.filter(m => !seenIds.includes(m.id)).length,
    onDismissNews: dismissNews,
    fetchFeed
  }
}
