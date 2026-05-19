import { useEffect, useMemo, useState, useRef, useCallback } from 'react'
import { createArboxClient, type ArboxApiError, type ArboxProfileResponse, type ArboxUserProfile, type ArboxMembership, type ArboxClubLocation, type ArboxClient } from '../api/arbox'
import type { ArboxBoxMessage, ArboxScheduleInvitation } from '../api/arbox'
import { loadTokens, saveTokens } from '../ui/storage'

function describeError(e: unknown) {
  const err = e as Partial<ArboxApiError> & { message?: string }
  if (typeof err?.status === 'number' && typeof err?.url === 'string') {
    return `HTTP ${err.status} ${err.url}${err.bodyText ? `\n\n${err.bodyText}` : ''}`
  }
  if (err && typeof err === 'object' && 'message' in err && typeof err.message === 'string') return err.message
  return String(e)
}

export interface FeedData {
  apiMessages: ArboxBoxMessage[]
  waitlistUpgrades: ArboxBoxMessage[]
  scheduleInvitations: ArboxScheduleInvitation[]
}

export interface ShellData {
  feedData: FeedData
}

export function useAuth() {
  const client = useMemo<ArboxClient>(() => {
    return createArboxClient({
      getTokens: loadTokens,
      setTokens: saveTokens,
      whiteLabel: 'Arbox',
      refererName: 'app',
      version: '15',
    })
  }, [])

  const [profile, setProfile] = useState<ArboxUserProfile | null>(null)
  const [startupError, setStartupError] = useState<string | null>(null)
  const [booting, setBooting] = useState(true)
  const [retrying, setRetrying] = useState(false)
  const [loadingProgress, setLoadingProgress] = useState(0)
  const [loadingStepLabel, setLoadingStepLabel] = useState('Connecting...')

  const [memberships, setMemberships] = useState<ArboxMembership[]>([])
  const [membershipsError, setMembershipsError] = useState<string | null>(null)
  const [selectedMembershipId, setSelectedMembershipId] = useState<number | null>(null)

  const [locations, setLocations] = useState<ArboxClubLocation[]>([])
  const [locationsError, setLocationsError] = useState<string | null>(null)
  const [selectedLocationId, setSelectedLocationId] = useState<number | null>(null)

  const [boxesId, setBoxesId] = useState<number | null>(null)

  const bootAbortRef = useRef<AbortController | null>(null)

  async function fetchFeed(): Promise<FeedData> {
    try {
      const res = await client.feed()
      const apiMessages = res?.boxMessage ?? []
      
      const topPriorityItems = (res as any)?.topPriority?.items ?? []
      
      // Extract invitations from v15 feed structure
      const scheduleInvitations: ArboxScheduleInvitation[] = topPriorityItems
        .filter((item: any) => item.action === 'scheduleInvitation')
        .map((item: any) => {
          const fcUser = item.friend_connection?.user ?? null
          return {
            id: item.id,
            users_id: item.users_id ?? 0,
            friend_connection_id: item.friend_connection_id ?? 0,
            schedule_id: item.schedule_id,
            action: item.action,
            created_at: item.created_at,
            schedule: item.schedule ? {
              id: item.schedule.id,
              date: item.schedule.date || '',
              time: item.schedule.time || '',
              end_time: item.schedule.end_time ?? null,
              box_category_fk: item.schedule.box_categories?.name ? 1 : null,
              locations_box_fk: item.schedule.locations_box_fk ?? null,
              coach_fk: item.schedule.coach_fk ?? null,
            } : undefined,
            friend_connection: fcUser ? {
              user: fcUser,
              friend_user: fcUser,
            } : undefined,
          } as ArboxScheduleInvitation
        })

      return {
        apiMessages,
        waitlistUpgrades: [],
        scheduleInvitations,
      }
    } catch {
      return { apiMessages: [], waitlistUpgrades: [], scheduleInvitations: [] }
    }
  }

  async function refreshShellData(): Promise<ShellData> {
    setLoadingStepLabel('Loading your profile...')
    setLoadingProgress(40)

    const p = await client.profile() as ArboxProfileResponse
    setProfile(p.data)

    const extractedLocations: ArboxClubLocation[] = []
    if (p.data.users_boxes) {
      for (const ub of p.data.users_boxes) {
        if (ub.locations_box_fk) {
          extractedLocations.push({
            id: ub.locations_box_fk,
            name: ub.box?.name
              ? `${ub.box.name}${ub.locations_box?.location ? ` (${ub.locations_box.location})` : ''}`
              : ub.locations_box?.location || 'Location'
          })
        }
      }
    } else if (p.data.locations?.[0]) {
      extractedLocations.push({ id: p.data.locations[0], name: 'Location' })
    }

    setLocations(extractedLocations)
    if (extractedLocations.length > 0) {
      setSelectedLocationId(prev => prev ?? extractedLocations[0].id)
    }

    const bid = p.data.boxes?.[0] ?? null
    setBoxesId(bid)

    setLoadingStepLabel('Loading feed...')
    setLoadingProgress(60)

    const feedData = await fetchFeed()

    if (bid) {
      try {
        setLoadingStepLabel('Almost ready...')
        setLoadingProgress(80)

        const mRes = await client.memberships(bid)
        const active = (mRes?.data ?? []).filter((m: any) => m.active === 1)
        setMemberships(active)
        if (active.length > 0) {
          setSelectedMembershipId(prev => prev ?? active[0].id)
        }
      } catch (me) {
        setMembershipsError(describeError(me))
      }
    }

    setLoadingProgress(100)
    setLoadingStepLabel('Almost ready...')

    return { feedData }
  }

  useEffect(() => {
    bootAbortRef.current?.abort()
    const controller = new AbortController()
    bootAbortRef.current = controller

    async function boot() {
      setLoadingProgress(25)
      setLoadingStepLabel('Connecting...')

      const existing = loadTokens()
      if (!existing) {
        if (!controller.signal.aborted) setBooting(false)
        return
      }
      try {
        await refreshShellData()
        if (controller.signal.aborted) return
        setBooting(false)
      } catch (e) {
        if (controller.signal.aborted) return
        setLoadingProgress(25)
        setLoadingStepLabel('Connecting...')
        setRetrying(true)
        try {
          await refreshShellData()
          if (controller.signal.aborted) return
          setBooting(false)
        } catch {
          if (controller.signal.aborted) return
          client.logout()
          setStartupError(describeError(e))
          setBooting(false)
          setRetrying(false)
        }
      }
    }

    boot()
    return () => { bootAbortRef.current?.abort() }
  }, [client])

  const handleLogout = useCallback(() => {
    client.logout()
    setProfile(null)
    setBooting(false)
    setLoadingProgress(0)
    setLoadingStepLabel('Connecting...')
    setMemberships([])
    setSelectedMembershipId(null)
    setMembershipsError(null)
    setLocations([])
    setSelectedLocationId(null)
    setLocationsError(null)
    setBoxesId(null)
  }, [client])

  return {
    client,
    profile,
    startupError,
    booting,
    retrying,
    loadingProgress,
    loadingStepLabel,
    memberships,
    membershipsError,
    selectedMembershipId,
    setSelectedMembershipId,
    locations,
    locationsError,
    selectedLocationId,
    setSelectedLocationId,
    boxesId,
    refreshShellData,
    onLogout: handleLogout,
  }
}
