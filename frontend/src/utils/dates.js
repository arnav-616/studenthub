import { format, formatDistanceToNow, isToday, isTomorrow, isPast, addDays, startOfDay } from 'date-fns'

export function fromUnix(ts) {
  return ts ? new Date(ts * 1000) : null
}

export function toUnix(date) {
  if (!date) return null
  // 'YYYY-MM-DD' strings are parsed as UTC midnight by new Date(), which shifts
  // the date backwards in negative-offset timezones. Parse them as local noon instead.
  if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
    const [y, m, d] = date.split('-').map(Number)
    return Math.floor(new Date(y, m - 1, d, 12, 0, 0).getTime() / 1000)
  }
  return Math.floor(new Date(date).getTime() / 1000)
}

export function formatDueDate(ts) {
  if (!ts) return null
  const d = fromUnix(ts)
  if (isToday(d)) return 'Today'
  if (isTomorrow(d)) return 'Tomorrow'
  return format(d, 'MMM d')
}

export function formatDueDateFull(ts) {
  if (!ts) return '—'
  return format(fromUnix(ts), 'MMM d, yyyy')
}

export function getDueStatus(ts) {
  if (!ts) return 'no-date'
  const d = fromUnix(ts)
  if (isPast(d) && !isToday(d)) return 'overdue'
  if (isToday(d)) return 'today'
  if (isTomorrow(d)) return 'tomorrow'
  const diff = (d.getTime() - Date.now()) / 86400000
  if (diff <= 3) return 'soon'
  return 'upcoming'
}

export function getDueColor(status) {
  const colors = {
    overdue: 'text-red-400',
    today: 'text-amber-400',
    tomorrow: 'text-amber-300',
    soon: 'text-yellow-400',
    upcoming: 'text-white/50',
    'no-date': 'text-white/25',
  }
  return colors[status] || 'text-white/50'
}

export function getDueBadgeColor(status) {
  const colors = {
    overdue: 'bg-red-500/15 text-red-400 border border-red-500/20',
    today: 'bg-amber-500/15 text-amber-400 border border-amber-500/20',
    tomorrow: 'bg-yellow-500/15 text-yellow-400 border border-yellow-500/20',
    soon: 'bg-orange-500/15 text-orange-400 border border-orange-500/20',
    upcoming: 'bg-white/5 text-white/50',
    'no-date': 'bg-white/5 text-white/25',
  }
  return colors[status] || 'bg-white/5 text-white/50'
}

export function getWeekDays() {
  const today = startOfDay(new Date())
  return Array.from({ length: 7 }, (_, i) => {
    const d = addDays(today, i)
    return {
      date: format(d, 'yyyy-MM-dd'),
      dayName: format(d, 'EEE'),
      dayNum: format(d, 'd'),
      isToday: i === 0,
    }
  })
}
