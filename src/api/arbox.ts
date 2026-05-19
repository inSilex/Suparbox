export type ArboxTokens = {
    accessToken: string
    refreshToken: string
}

export type ArboxLoginResponse = {
    data: {
        id: number
        email: string
        first_name: string
        last_name: string
        language: string
        image: string
        token: string
        refreshToken: string
        is_user: boolean
        full_name?: string
        full_name_shorten?: string
        last_name_shorten?: string
    }
}

export type ArboxScheduleUser = {
    id: number
    first_name: string
    last_name: string
    full_name?: string | null
    image?: string | null
    is_user: boolean
}

export type ArboxFriendConnection = {
    id: number
    users_id: number
    friend_users_id: number
    status: number
    user?: {
        id: number
        first_name: string
        last_name: string
        full_name?: string
        full_name_shorten?: string
        last_name_shorten?: string
        image?: string | null
        is_user: boolean
        users_boxes_active?: Array<{
            box_fk: number
            box?: { id: number; name?: string }
        }> | null
    } | null
    friend_user?: {
        id: number
        first_name: string
        last_name: string
        full_name?: string
        full_name_shorten?: string
        last_name_shorten?: string
        image?: string | null
        is_user: boolean
        users_boxes_active?: Array<{
            box_fk: number
            box?: { id: number; name?: string }
        }> | null
    } | null
}

export type ArboxUserProfile = {
    id: number
    email: string
    first_name: string
    last_name: string
    language: string
    image: string
    phone: string | null
    gender: string | null
    birthday: string | null
    last_login: string | null
    time_format_preferred?: string | null
    boxes?: number[] | null
    locations?: number[] | null
    activeLocationsBox?: number[] | null
    friend_connection?: ArboxFriendConnection[] | null
    users_boxes?: Array<{
        box_fk?: number
        locations_box_fk?: number
        box?: {
            id: number
            name?: string
        }
        locations_box?: {
            id: number
            location?: string
        }
    }> | null
}

export type ArboxMembership = {
    id: number
    user_fk: number
    box_fk: number
    active: number
    mt_type?: string | null
    start?: string | null
    end?: string | null
    membership_types?: {
        id: number
        name: string
        type?: string | null
        show_in_app?: number | boolean | null
        [k: string]: unknown
    } | null
    [k: string]: unknown
}

export type ArboxMembershipsResponse = {
    data: ArboxMembership[]
}

export type ArboxProfileResponse = {
    data: ArboxUserProfile
}

// "Boxes" in the API correspond to clubs. This endpoint is locations for clubs.
export type ArboxClubLocation = {
    id: number
    name: string
    address?: string | null
    city?: string | null
    country?: string | null
    phone?: string | null
    email?: string | null
    website?: string | null
    cloudinary_image?: string | null
    external_url_id?: string | number | null
}

export type ArboxBoxLocationsResponse = {
    data: ArboxClubLocation[]
}

export type ArboxLesson = {
    id: number
    date: string // YYYY-MM-DD
    time: string // HH:mm:ss-ish (as returned)
    end_time?: string | null
    date_time?: { date: string; timezone?: string } | null
    day_of_week?: number | null
    coach_fk: number | null
    second_coach_fk?: number | null
    box_fk: number
    locations_box_fk: number | null
    max_users?: number | null
    has_spots?: boolean | number | null
    enable_registration_time?: number | null
    status?: string | null
    past?: boolean | number | null
    user_booked?: boolean | number | null
    user_in_standby?: boolean | number | null
    stand_by_position?: number | null
    schedule_user_id?: number | null
    registered?: number | null
    free?: number | null
    booked_users?: ArboxScheduleUser[] | null
    schedule_stand_by?: unknown[] | null
    // Coach is an object in the HAR sample (contains full_name, etc.).
    coach?: {
        id?: number
        full_name?: string
        first_name?: string
        last_name?: string
    } | null
    second_coach?: {
        id?: number
        full_name?: string
        first_name?: string
        last_name?: string
    } | null
    // "boxes" are clubs; the API returns box category metadata under this object.
    box_categories?: {
        name?: string | null
        [k: string]: unknown
    } | null

    locations_box?: {
        id: number
        location?: string
    } | null
    series?: {
        membership_types?: Array<{
            id?: number
            name?: string
            show_in_app?: number | boolean | null
            [k: string]: unknown
        }> | null
        [k: string]: unknown
    } | null
}

export type ArboxBetweenDatesResponse = {
    data: ArboxLesson[]
}

export type ArboxWeeklyResponse = string[]

export type ArboxBoxMessage = {
    id: number
    message?: string | null
    subject?: string | null
    created_at?: string
    action?: string
    box?: {
        id?: number
        name?: string
        cloudinary_image?: string
    } | null
    [k: string]: unknown
}

export type ArboxScheduleInvitation = {
    id: number
    users_id: number
    friend_connection_id: number
    schedule_id: number
    action: string
    created_at: string
    schedule?: {
        id: number
        date: string
        time: string
        end_time?: string | null
        box_category_fk?: number | null
        locations_box_fk?: number | null
        coach_fk?: number | null
        status?: string | null
    } | null
    friend_connection?: {
        user?: {
            id: number
            full_name?: string
            full_name_shorten?: string
            image?: string | null
        } | null
        friend_user?: {
            id: number
            full_name?: string
            full_name_shorten?: string
            image?: string | null
        } | null
    } | null
}

export type ArboxFeedResponse = {
    boxMessage?: ArboxBoxMessage[]
    friendRequestAccepted?: unknown[]
    scheduleUserStatus?: unknown | null
    scheduleInvitation?: ArboxScheduleInvitation[]
    standbyEntranceApproval?: unknown[]
    hokRefusal?: unknown[]
    [k: string]: unknown
}

export type ArboxClientConfig = {
    baseUrl?: string
    whiteLabel?: string
    refererName?: string
    version?: string
    getTokens?: () => ArboxTokens | null
    setTokens?: (tokens: ArboxTokens | null) => void
}

export type ArboxApiError = {
    status: number
    url: string
    bodyText?: string
}

function normalizeBaseUrl(baseUrl?: string) {
    const raw = baseUrl?.trim()
    if (!raw) return 'https://apiappv2.arboxapp.com'
    return raw.endsWith('/') ? raw.slice(0, -1) : raw
}

async function readBodyTextSafe(res: Response) {
    try {
        return await res.text()
    } catch {
        return undefined
    }
}

function looksLikeJson(text: string | undefined) {
    if (!text) return false
    const t = text.trim()
    return t.startsWith('{') || t.startsWith('[')
}

async function parseJsonLoose<T>(res: Response): Promise<T> {
    const text = await res.text()
    // `messagesCenter/count` in the HAR is literally a number (e.g. "75")
    if (text.trim() && /^[+-]?\d+(\.\d+)?$/.test(text.trim())) {
        return Number(text.trim()) as T
    }
    if (!looksLikeJson(text)) {
        // Some endpoints in the HAR claim text/html but still return JSON at runtime.
        // If it’s not JSON, surface a helpful error with the raw body.
        throw Object.assign(new Error('Response was not JSON'), {
            status: res.status,
            url: res.url,
            bodyText: text,
        } satisfies ArboxApiError)
    }
    return JSON.parse(text) as T
}

function buildHeaders(config: Required<Pick<ArboxClientConfig, 'whiteLabel' | 'refererName' | 'version'>> & { tokens: ArboxTokens | null }) {
    const h: Record<string, string> = {
        accept: 'application/json, text/plain, */*',
        whitelabel: config.whiteLabel,
        referername: config.refererName,
        version: config.version,
    }
    if (config.tokens?.accessToken) h.accesstoken = config.tokens.accessToken
    if (config.tokens?.refreshToken) h.refreshtoken = config.tokens.refreshToken
    return h
}

export function createArboxClient(cfg: ArboxClientConfig = {}) {
    const baseUrl = normalizeBaseUrl(cfg.baseUrl)
    const whiteLabel = cfg.whiteLabel ?? 'Arbox'
    const refererName = cfg.refererName ?? 'app'
    const version = cfg.version ?? '15'
    const getTokens = cfg.getTokens ?? (() => null)
    const setTokens = cfg.setTokens ?? (() => { })

    async function requestJson<T>(path: string, init: RequestInit = {}): Promise<T> {
        const url = `${baseUrl}${path}`
        const tokens = getTokens()
        const headers = new Headers(init.headers)
        for (const [k, v] of Object.entries(buildHeaders({ whiteLabel, refererName, version, tokens }))) {
            if (!headers.has(k)) headers.set(k, v)
        }
        const res = await fetch(url, { ...init, headers })
        if (!res.ok) {
            const bodyText = await readBodyTextSafe(res)
            throw { status: res.status, url, bodyText } satisfies ArboxApiError
        }
        return await parseJsonLoose<T>(res)
    }

    return {
        config: { baseUrl, whiteLabel, refererName, version },

        getAccessToken() { return getTokens()?.accessToken },
        getRefreshToken() { return getTokens()?.refreshToken },

        async whiteLabelProperties() {
            return requestJson<{ data: unknown }>('/api/v2/whiteLabel/properties', { method: 'POST' })
        },

        async login(input: { email: string; password: string }) {
            const res = await requestJson<ArboxLoginResponse>('/api/v2/user/login', {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify(input),
            })

            if (res?.data?.token && res?.data?.refreshToken) {
                setTokens({ accessToken: res.data.token, refreshToken: res.data.refreshToken })
            }
            return res
        },

        async requestMfaCode(input: { type: 'email' | 'phone'; value: string }) {
            // Returns a number (mfa_id)
            return requestJson<number>('/api/v2/mfa', {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify(input),
            })
        },

        async loginMfa(input: { type: 'email' | 'phone'; value: string; code: string; id: number }) {
            const res = await requestJson<ArboxLoginResponse>('/api/v2/user/mfa/login', {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify(input),
            })

            if (res?.data?.token && res?.data?.refreshToken) {
                setTokens({ accessToken: res.data.token, refreshToken: res.data.refreshToken })
            }
            return res
        },

        async profile() {
            return requestJson<ArboxProfileResponse>('/api/v2/user/profile', { method: 'GET' })
        },

        async feed() {
            return requestJson<ArboxFeedResponse>('/api/v2/user/feed', { method: 'GET' })
        },

        async messagesCount() {
            // HAR response is plain text (e.g. "75")
            return requestJson<number>('/api/v2/messagesCenter/count', { method: 'GET' })
        },

        async deviceToken(input: { token: string; device_native_token?: string | null }) {
            return requestJson<unknown>('/api/v2/user/deviceToken', {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify(input),
            })
        },

        async boxLocations() {
            return requestJson<ArboxBoxLocationsResponse>('/api/v2/boxes/locations', { method: 'GET' })
        },

        async scheduleWeekly(input: { from: string; to: string; locations_box_id: number | null }) {
            return requestJson<ArboxWeeklyResponse>('/api/v2/schedule/weekly', {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify(input),
            })
        },

        async scheduleBetweenDates(input: { from: string; to: string; locations_box_id: number | null; boxes_id: number }) {
            return requestJson<ArboxBetweenDatesResponse>('/api/v2/schedule/betweenDates', {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify(input),
            })
        },

        async getUserClasses(input: { date: string; locations_box_id: number | null; direction: 'both' | 'next' | 'prev'; boxes_id: number }) {
            return requestJson<ArboxBetweenDatesResponse>('/api/v2/schedule/getUserClasses', {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify(input),
            })
        },

        logout() {
            setTokens(null)
        },

        async memberships(boxes_id: number) {
            return requestJson<ArboxMembershipsResponse>(`/api/v2/boxes/${boxes_id}/memberships/1/false`, { method: 'GET' })
        },

        async subscribeToLesson(input: { schedule_id: number; membership_user_id: number }) {
            return requestJson<{ data: unknown }>('/api/v2/scheduleUser/insert', {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({ ...input, extras: { spot: null } }),
            })
        },

        async unsubscribeFromLesson(input: { schedule_user_id: number; schedule_id: number; late_cancel?: boolean }) {
            return requestJson<{ data: unknown }>('/api/v2/scheduleUser/delete', {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({ late_cancel: false, ...input }),
            })
        },

        async joinStandby(input: { schedule_id: number; membership_user_id: number }) {
            return requestJson<{ data: unknown }>('/api/v2/scheduleStandBy/insert', {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({ ...input, extras: { spot: null } }),
            })
        },

        async leaveStandby(input: { schedule_stand_by_id: number }) {
            return requestJson<{ data: unknown }>('/api/v2/scheduleStandBy/delete', {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify(input),
            })
        },

        async inviteFriend(input: { schedule_id: number; friend_users_id: number }) {
            return requestJson<string>('/api/v2/userToUser/schedule/invite', {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify(input),
            })
        },

        async joinStandbyFromFeed(input: { schedule_id: number; membership_user_id: number }) {
            return requestJson<{ data: unknown }>('/api/v2/scheduleStandBy/insert', {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({ ...input, extras: 'feed' }),
            })
        },

        async dismissFeedItem(input: { id: number }) {
            return requestJson<number>('/api/v2/user/feed', {
                method: 'DELETE',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify(input),
            })
        },
    }
}

export type ArboxClient = ReturnType<typeof createArboxClient>

