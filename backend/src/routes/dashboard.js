import { Router } from 'express'
import { getDb } from '../db/schema.js'
import { calculateBusyScore, dailyScores, freeTimeFinder, scoreBand } from '../utils/busyScore.js'

function getSettings(db, userId) {
  const rows = db.prepare('SELECT key, value FROM user_settings WHERE user_id = ?').all(userId)
  const out = {}
  for (const r of rows) out[r.key] = r.value
  // fallback to global settings
  const globals = db.prepare("SELECT key, value FROM settings WHERE user_id IS NULL").all()
  for (const r of globals) if (out[r.key] === undefined) out[r.key] = r.value
  return out
}

const router = Router()

router.get('/', (req, res) => {
  const db = getDb()
  const uid = req.userId
  const now = Math.floor(Date.now() / 1000)
  const startOfToday = Math.floor(new Date().setHours(0, 0, 0, 0) / 1000)
  const endOfToday = startOfToday + 86400
  const in48h = now + 48 * 3600

  const settings = getSettings(db, uid)

  // Attach logged hours to each assignment (sum of timer_sessions durations)
  const loggedByAssignment = {}
  const timerRows = db.prepare(
    'SELECT assignment_id, SUM(duration_minutes) as total_mins FROM timer_sessions WHERE user_id = ? AND assignment_id IS NOT NULL GROUP BY assignment_id'
  ).all(uid)
  for (const row of timerRows) {
    loggedByAssignment[row.assignment_id] = (row.total_mins || 0) / 60
  }

  const rawAssignments = db.prepare('SELECT * FROM assignments WHERE status != ? AND user_id = ?').all('completed', uid)
  const assignments = rawAssignments.map(a => ({ ...a, logged_hours: loggedByAssignment[a.id] || 0 }))

  const extracurriculars = db.prepare('SELECT * FROM extracurriculars WHERE user_id = ? AND active = 1').all(uid)

  // Busy score — now uses remaining hours and capacity
  const { score, band, breakdown, totalAssignments, daysWithCluster, weeklyStudyCapacity, remainingHours } =
    calculateBusyScore(assignments, settings.work_style || 'on_time', settings)

  const dayStrip = dailyScores(assignments, settings)
  const freeTime = freeTimeFinder(assignments, extracurriculars, settings)

  // Today view — what's actually happening today + next 48h
  const todayAssignments = db.prepare(`
    SELECT a.*, s.name as subject_name, s.color as subject_color
    FROM assignments a LEFT JOIN subjects s ON a.subject_id = s.id
    WHERE a.status != 'completed' AND a.due_date >= ? AND a.due_date < ? AND a.user_id = ?
    ORDER BY a.due_date ASC
  `).all(startOfToday, endOfToday, uid)

  const upcoming48h = db.prepare(`
    SELECT a.*, s.name as subject_name, s.color as subject_color
    FROM assignments a LEFT JOIN subjects s ON a.subject_id = s.id
    WHERE a.status != 'completed' AND a.due_date > ? AND a.due_date <= ? AND a.user_id = ?
    ORDER BY a.due_date ASC LIMIT 6
  `).all(endOfToday, in48h, uid)

  // Suggested focus: highest urgency incomplete assignment
  const suggestedFocus = assignments
    .filter(a => a.due_date)
    .sort((a, b) => {
      const ua = urgencySort(a, now)
      const ub = urgencySort(b, now)
      return ub - ua
    })[0] || null

  const nextDue = db.prepare(`
    SELECT a.*, s.name as subject_name, s.color as subject_color
    FROM assignments a LEFT JOIN subjects s ON a.subject_id = s.id
    WHERE a.status != 'completed' AND a.due_date IS NOT NULL AND a.due_date > ? AND a.user_id = ?
    ORDER BY a.due_date ASC LIMIT 5
  `).all(now, uid)

  const overdue = db.prepare(
    'SELECT COUNT(*) as count FROM assignments WHERE status != ? AND due_date < ? AND due_date IS NOT NULL AND user_id = ?'
  ).get('completed', now, uid)

  const todayDue = db.prepare(
    'SELECT COUNT(*) as count FROM assignments WHERE status != ? AND due_date >= ? AND due_date < ? AND user_id = ?'
  ).get('completed', startOfToday, endOfToday, uid)

  const completedThisWeek = db.prepare(
    'SELECT COUNT(*) as count FROM assignments WHERE status = ? AND completed_at >= ? AND user_id = ?'
  ).get('completed', now - 7 * 86400, uid)

  const streak = calculateStreak(db, uid, now)

  const productivity = []
  for (let i = 13; i >= 0; i--) {
    const dayStart = startOfToday - i * 86400
    const dayEnd = dayStart + 86400
    const completed = db.prepare(
      'SELECT COUNT(*) as count FROM assignments WHERE completed_at >= ? AND completed_at < ? AND user_id = ?'
    ).get(dayStart, dayEnd, uid)
    productivity.push({ date: new Date(dayStart * 1000).toISOString().slice(0, 10), completed: completed.count })
  }

  // Application follow-ups due this week
  const followUps = db.prepare(
    'SELECT * FROM applications WHERE user_id = ? AND follow_up_date >= ? AND follow_up_date <= ? ORDER BY follow_up_date ASC'
  ).all(uid, now, now + 7 * 86400)

  res.json({
    busyScore: { score, band, breakdown, totalAssignments, daysWithCluster, weeklyStudyCapacity, remainingHours },
    dayStrip,
    freeTime,
    today: { assignments: todayAssignments, upcoming48h, suggestedFocus },
    nextDue,
    stats: {
      overdue: overdue.count,
      todayDue: todayDue.count,
      completedThisWeek: completedThisWeek.count,
      streak,
    },
    productivity,
    followUps,
  })
})

// Higher = more urgent (used for suggested focus task)
function urgencySort(a, now) {
  if (!a.due_date) return 0
  const hoursUntil = (a.due_date * 1000 - now) / 3_600_000
  const typeBoost = { exam: 3, essay: 1.5, project: 1.3, quiz: 1.2, lab: 1.1, problem_set: 1.1, assignment: 1, reading: 0.7 }
  const diffBoost = { high: 1.5, medium: 1, low: 0.7 }
  const urgency = hoursUntil <= 0 ? 10 : hoursUntil <= 24 ? 8 : hoursUntil <= 48 ? 5 : hoursUntil <= 72 ? 3 : 1
  return urgency * (typeBoost[a.type] ?? 1) * (diffBoost[a.difficulty] ?? 1)
}

function calculateStreak(db, userId, now) {
  let streak = 0
  let day = Math.floor(new Date().setHours(0, 0, 0, 0) / 1000)
  while (streak < 365) {
    const count = db.prepare(
      'SELECT COUNT(*) as count FROM assignments WHERE completed_at >= ? AND completed_at < ? AND user_id = ?'
    ).get(day, day + 86400, userId).count
    if (count === 0) break
    streak++
    day -= 86400
  }
  return streak
}

export default router
