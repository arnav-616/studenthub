import { useEffect } from 'react'

const STORAGE_KEY = 'sh_notif_settings'
const SENT_KEY = 'sh_notif_sent'       // { tag: timestamp } — never resets, pruned after 7d
const LAST_DIGEST_KEY = 'sh_last_digest'
const POLL_INTERVAL_MS = 3 * 60 * 1000

export function getNotifSettings() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') } catch { return {} }
}

export function saveNotifSettings(s) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(s))
}

export async function requestPermission() {
  if (!('Notification' in window)) return 'unsupported'
  if (Notification.permission === 'granted') return 'granted'
  return Notification.requestPermission()
}

export function sendNotification(title, body, tag) {
  if (Notification.permission !== 'granted') return
  const n = new Notification(title, { body, icon: '/favicon.ico', badge: '/favicon.ico', tag })
  n.onclick = () => { window.focus(); n.close() }
  return n
}

// ── Sent-set helpers ─────────────────────────────────────────────────────────
// Persists across days/reloads. Prunes entries older than 7 days automatically.

function getSent() {
  try { return JSON.parse(localStorage.getItem(SENT_KEY) || '{}') } catch { return {} }
}

function hasSent(tag) {
  return !!getSent()[tag]
}

function markSent(tag) {
  const sent = getSent()
  sent[tag] = Date.now()
  // Prune entries older than 7 days
  const cutoff = Date.now() - 7 * 86400_000
  for (const [k, ts] of Object.entries(sent)) {
    if (ts < cutoff) delete sent[k]
  }
  localStorage.setItem(SENT_KEY, JSON.stringify(sent))
}

// ── Core check ───────────────────────────────────────────────────────────────

function checkAndFireNotifications(assignments, settings) {
  if (!settings.enabled || Notification.permission !== 'granted') return

  const now = Math.floor(Date.now() / 1000)
  const todayStr = new Date().toDateString()
  const hour = new Date().getHours()

  for (const a of assignments) {
    if (!a.due_date || a.status === 'completed') continue
    const secsUntilDue = a.due_date - now
    const dueDateStr = new Date(a.due_date * 1000).toDateString()
    const dueTimeStr = new Date(a.due_date * 1000).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
    const subject = a.subject_name || 'No subject'

    if (settings.deadlineReminders) {
      // ── Tier 1: "Due today" — fires once per day as soon as we see it's due within 24h ──
      if (secsUntilDue > 0 && secsUntilDue <= 24 * 3600) {
        const tag = `due-today-${a.id}-${todayStr}`
        if (!hasSent(tag)) {
          sendNotification(
            `📅 Due today: ${a.title}`,
            `${subject} · Due at ${dueTimeStr}`,
            tag,
          )
          markSent(tag)
        }
      }

      // ── Tier 2: 12 hours before — fires when 10.5h–13h remain ──
      if (secsUntilDue >= 10.5 * 3600 && secsUntilDue <= 13 * 3600) {
        const tag = `12h-before-${a.id}-${dueDateStr}`
        if (!hasSent(tag)) {
          sendNotification(
            `⏰ Due in 12 hours: ${a.title}`,
            `${subject} · Due at ${dueTimeStr}`,
            tag,
          )
          markSent(tag)
        }
      }

      // ── Tier 3: 1 hour before — fires when 40–75 min remain ──
      if (secsUntilDue >= 40 * 60 && secsUntilDue <= 75 * 60) {
        const tag = `1h-before-${a.id}-${dueDateStr}`
        if (!hasSent(tag)) {
          sendNotification(
            `🚨 Due in 1 hour: ${a.title}`,
            `${subject} · Due at ${dueTimeStr}`,
            tag,
          )
          markSent(tag)
        }
      }
    }

    // ── Overdue alert — once per day per assignment ──
    if (settings.overdueAlerts !== false && secsUntilDue < 0 && secsUntilDue > -7 * 86400) {
      const tag = `overdue-${a.id}-${todayStr}`
      if (!hasSent(tag)) {
        sendNotification(
          `⚠️ Overdue: ${a.title}`,
          `Was due ${dueDateStr} · ${subject}`,
          tag,
        )
        markSent(tag)
      }
    }
  }

  // ── Morning digest — once per day, fires any time after 7am ──
  if (settings.dailyDigest) {
    const lastDigest = localStorage.getItem(LAST_DIGEST_KEY)
    if (lastDigest !== todayStr && hour >= 7) {
      const todayStart = Math.floor(new Date().setHours(0, 0, 0, 0) / 1000)
      const todayEnd = todayStart + 86400
      const dueToday = assignments.filter(a => a.due_date >= todayStart && a.due_date < todayEnd && a.status !== 'completed')
      const overdue = assignments.filter(a => a.due_date < now && a.due_date > 0 && a.status !== 'completed')
      if (dueToday.length > 0 || overdue.length > 0) {
        let body = ''
        if (dueToday.length > 0) body += `${dueToday.length} due today`
        if (overdue.length > 0) body += (body ? ' · ' : '') + `${overdue.length} overdue`
        sendNotification('🎓 StudentHub Morning Digest', body, 'daily-digest')
      }
      localStorage.setItem(LAST_DIGEST_KEY, todayStr)
    }
  }
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export default function useNotifications(assignments = []) {
  useEffect(() => {
    const settings = getNotifSettings()
    if (!settings.enabled || Notification.permission !== 'granted') return
    if (!assignments.length) return

    checkAndFireNotifications(assignments, settings)

    const interval = setInterval(() => {
      checkAndFireNotifications(assignments, getNotifSettings())
    }, POLL_INTERVAL_MS)

    return () => clearInterval(interval)
  }, [assignments])
}
