export function startOfWeekLocal(date: Date) {
  // Week starts on Sunday.
  const d = new Date(date)
  const day = d.getDay() // 0 (Sun) - 6 (Sat)
  d.setDate(d.getDate() - day)
  d.setHours(0, 0, 0, 0)
  return d
}

export function addDaysLocal(date: Date, days: number) {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

export function toISODateLocalKey(date: Date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function formatDayShort(date: Date) {
  return new Intl.DateTimeFormat(undefined, { weekday: 'short' }).format(date)
}

export function formatMonthDay(date: Date) {
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(date)
}

export function weekRangeIso(date: Date) {
  const start = startOfWeekLocal(date)
  const end = addDaysLocal(start, 6)
  end.setHours(23, 59, 59, 999)
  return { from: start.toISOString(), to: end.toISOString() }
}

