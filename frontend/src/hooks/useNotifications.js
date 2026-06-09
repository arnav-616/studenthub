import { useEffect, useCallback } from 'react'

const STORAGE_KEY = 'sh_notif_settings'
const LAST_DIGEST_KEY = 'sh_last_digest'

export function getNotifSettings() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') } catch { return {} }
}

export function saveNotifSettings(settings) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
}

export async function requestPermission() {
  if (!('Notification' in window)) return 'unsupported'
  if (Notification.permission === 'granted') return 'granted'
  const result = await Notification.requestPermission()
  return result
}

export function sendNotification(title, body, options = {}) {
  if (Notification.permission !== 'granted') return
  const n = new Notification(title, {
    body,
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    ...options,
  })
  n.onclick = () => { window.focus(); n.close() }
  return n
}

// Schedule a deadline reminder for a specific assignment
export function scheduleDeadlineReminder(assignment, hoursBeforeStr = '24') {
  const hoursBefore = parseInt(hoursBeforeStr, 10) || 24
  if (!assignment.due_date) return
  const dueMs = assignment.due_date * 1000
  const notifyAt = dueMs - hoursBefore * 60 * 60 * 1000
  const now = Date.now()
  if (notifyAt <= now) return
  const delay = notifyAt - now
  if (delay > 7 * 24 * 60 * 60 * 1000) return // don't schedule >7 days out (page reload will reschedule)

  setTimeout(() => {
    sendNotification(
      `📚 Due in ${hoursBefore}h: ${assignment.title}`,
      `${assignment.subject_name || 'No subject'} · ${assignment.type}`,
    )
  }, delay)
}

// Daily digest — fires at 8am if not already shown today
export function scheduleDailyDigest(assignments) {
  const lastDigest = localStorage.getItem(LAST_DIGEST_KEY)
  const today = new Date().toDateString()
  if (lastDigest === today) return

  const now = new Date()
  const digest = new Date()
  digest.setHours(8, 0, 0, 0)
  if (digest <= now) digest.setDate(digest.getDate() + 1)

  const delay = digest.getTime() - now.getTime()

  setTimeout(() => {
    const todayStr = new Date().toDateString()
    const nowTs = Math.floor(Date.now() / 1000)
    const todayStart = Math.floor(new Date().setHours(0,0,0,0) / 1000)
    const todayEnd = todayStart + 86400

    const dueToday = assignments.filter(a => a.due_date >= todayStart && a.due_date < todayEnd && a.status !== 'completed')
    const overdue = assignments.filter(a => a.due_date < nowTs && a.due_date > 0 && a.status !== 'completed')

    if (dueToday.length === 0 && overdue.length === 0) return

    let body = ''
    if (dueToday.length > 0) body += `${dueToday.length} due today`
    if (overdue.length > 0) body += (body ? ' · ' : '') + `${overdue.length} overdue`

    sendNotification('🎓 StudentHub Morning Digest', body)
    localStorage.setItem(LAST_DIGEST_KEY, todayStr)
  }, delay)
}

export default function useNotifications(assignments = []) {
  const settings = getNotifSettings()

  useEffect(() => {
    if (!settings.enabled || Notification.permission !== 'granted') return
    if (!assignments.length) return

    // Schedule deadline reminders for upcoming assignments
    if (settings.deadlineReminders) {
      assignments
        .filter(a => a.status !== 'completed' && a.due_date)
        .forEach(a => scheduleDeadlineReminder(a, settings.reminderHours || '24'))
    }

    // Schedule daily digest
    if (settings.dailyDigest) {
      scheduleDailyDigest(assignments)
    }
  }, [assignments.length, settings.enabled, settings.deadlineReminders, settings.dailyDigest])
}
