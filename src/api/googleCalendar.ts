export interface GoogleCalendar {
  id?: string
  summary: string
  description?: string
  timeZone?: string
}

export interface GoogleCalendarEvent {
  id?: string
  status?: string
  summary: string
  description?: string
  start: { dateTime: string; timeZone?: string }
  end: { dateTime: string; timeZone?: string }
  extendedProperties?: {
    private?: {
      arbox_lesson_id?: string
    }
  }
}

export const ARBOX_CALENDAR_NAME = 'Arbox'

export class GoogleCalendarClient {
  private baseUrl = 'https://www.googleapis.com/calendar/v3'
  private accessToken: string

  constructor(accessToken: string) {
    this.accessToken = accessToken
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      ...options,
      headers: {
        ...options.headers,
        Authorization: `Bearer ${this.accessToken}`,
        Accept: 'application/json',
      },
    })
    if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        const msg = err?.error?.message || `Google Calendar API error: ${res.status}`
        const e = new Error(msg) as Error & { response?: any; code?: number }
        e.response = err
        e.code = res.status
        throw e
    }
    if (res.status === 204) return {} as T
    return res.json()
  }

  // -- Calendar management --

  async listCalendars(): Promise<GoogleCalendar[]> {
    return this.request<{ items: GoogleCalendar[] }>('/users/me/calendarList').then(res => res.items ?? [])
  }

  async createCalendar(name: string): Promise<GoogleCalendar> {
    return this.request<GoogleCalendar>('/calendars', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ summary: name }),
    })
  }

  // -- Event CRUD --

  async getEvent(eventId: string, calendarId: string): Promise<GoogleCalendarEvent> {
    return this.request<GoogleCalendarEvent>(`/calendars/${encodeURIComponent(calendarId)}/events/${eventId}`)
  }

  async listEvents(calendarId: string): Promise<{ items: GoogleCalendarEvent[] }> {
    return this.request<{ items: GoogleCalendarEvent[] }>(`/calendars/${encodeURIComponent(calendarId)}/events`)
  }

  async insertEvent(event: GoogleCalendarEvent, calendarId: string): Promise<GoogleCalendarEvent> {
    return this.request<GoogleCalendarEvent>(`/calendars/${encodeURIComponent(calendarId)}/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(event),
    })
  }

  async patchEvent(eventId: string, event: Partial<GoogleCalendarEvent>, calendarId: string): Promise<GoogleCalendarEvent> {
    return this.request<GoogleCalendarEvent>(`/calendars/${encodeURIComponent(calendarId)}/events/${eventId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(event),
    })
  }

  async deleteEvent(eventId: string, calendarId: string): Promise<void> {
    await this.request<void>(`/calendars/${encodeURIComponent(calendarId)}/events/${eventId}`, {
      method: 'DELETE',
    })
  }
}
