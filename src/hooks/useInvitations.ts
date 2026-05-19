import { useState, useCallback } from 'react'
import type { ArboxClient, ArboxScheduleInvitation } from '../api/arbox'

export function useInvitations(client: ArboxClient | null, membershipUserId: number | null) {
  const [scheduleInvitations, setScheduleInvitations] = useState<ArboxScheduleInvitation[]>([])
  const [inviteBusy, setInviteBusy] = useState<Set<number>>(new Set())

  const setInvitations = useCallback((invitations: ArboxScheduleInvitation[]) => {
    setScheduleInvitations(invitations)
  }, [])

  const markInviteBusy = useCallback((id: number) => {
    setInviteBusy(prev => new Set(prev).add(id))
  }, [])

  const markInviteNotBusy = useCallback((id: number) => {
    setInviteBusy(prev => {
      const next = new Set(prev)
      next.delete(id)
      return next
    })
  }, [])

  const onAcceptInvite = useCallback(async (inv: ArboxScheduleInvitation) => {
    if (!client || !membershipUserId || !inv.schedule_id) return
    markInviteBusy(inv.id)
    try {
      await client.subscribeToLesson({
        schedule_id: inv.schedule_id,
        membership_user_id: membershipUserId,
      })
      setScheduleInvitations(prev => prev.filter(i => i.id !== inv.id))
    } catch (e) {
      console.error('Failed to accept invitation:', e)
    } finally {
      markInviteNotBusy(inv.id)
    }
  }, [client, membershipUserId, markInviteBusy, markInviteNotBusy])

  const onDismissInvite = useCallback(async (inv: ArboxScheduleInvitation) => {
    if (!client) return
    markInviteBusy(inv.id)
    try {
      await client.dismissFeedItem({ id: inv.id })
      setScheduleInvitations(prev => prev.filter(i => i.id !== inv.id))
    } catch (e) {
      console.error('Failed to dismiss invitation:', e)
    } finally {
      markInviteNotBusy(inv.id)
    }
  }, [client, markInviteBusy, markInviteNotBusy])

  return {
    scheduleInvitations,
    setScheduleInvitations,
    inviteBusy,
    markInviteBusy,
    markInviteNotBusy,
    setInvitations,
    onAcceptInvite,
    onDismissInvite
  }
}
