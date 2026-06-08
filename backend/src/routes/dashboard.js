import { Router } from 'express'
import { getDb } from '../db/schema.js'
import { calculateBusyScore, dailyScores } from '../utils/busyScore.js'

const router = Router()

router.get('/', (req, res) => {
  const db = getDb()
  const now = Math.floor(Date.now() / 1000)
  const in7days = now + 7 * 24 * 60 * 60
  const startOfDay = Math.floor(new Date().setHours(0,0,0,0) / 1000)

  const workStyle = db.prepare("SELECT value FROM settings WHERE key='work_style'").get()?.value ?? 'on_time'
  const assignments = db.prepare('SELECT * FROM assignments WHERE status != ?').all('completed')

  const { score, band, breakdown, totalAssignments, daysWithCluster } = calculateBusyScore(assignments, workStyle)
  const dayStrip = dailyScores(assignments)

  const nextDue = db.prepare(`
    SELECT a.*, s.name as subject_name, s.color as subject_color
    FROM assignments a LEFT JOIN subjects s ON a.subject_id = s.id
    WHERE a.status != 'completed' AND a.due_date IS NOT NULL AND a.due_date > ?
    ORDER BY a.due_date ASC LIMIT 1
  `).get(now)

  const overdue = db.prepare(`
    SELECT COUNT(*) as count FROM assignments
    WHERE status != 'completed' AND due_date < ? AND due_date IS NOT NULL
  `).get(now)

  const todayDue = db.prepare(`
    SELECT COUNT(*) as count FROM assignments
    WHERE status != 'completed' AND due_date >= ? AND due_date < ?
  `).get(startOfDay, startOfDay + 86400)

  const completedThisWeek = db.prepare(`
    SELECT COUNT(*) as count FROM assignments
    WHERE status = 'completed' AND completed_at >= ?
  `).get(now - 7 * 86400)

  const streak = calculateStreak(db, now)

  // Productivity data last 14 days
  const productivity = []
  for (let i = 13; i >= 0; i--) {
    const dayStart = startOfDay - i * 86400
    const dayEnd = dayStart + 86400
    const completed = db.prepare(`
      SELECT COUNT(*) as count FROM assignments
      WHERE completed_at >= ? AND completed_at < ?
    `).get(dayStart, dayEnd)
    const date = new Date(dayStart * 1000).toISOString().slice(0, 10)
    productivity.push({ date, completed: completed.count })
  }

  res.json({
    busyScore: { score, band, breakdown, totalAssignments, daysWithCluster },
    dayStrip,
    nextDue,
    stats: {
      overdue: overdue.count,
      todayDue: todayDue.count,
      completedThisWeek: completedThisWeek.count,
      streak,
    },
    productivity,
  })
})

function calculateStreak(db, now) {
  let streak = 0
  let day = Math.floor(new Date().setHours(0,0,0,0) / 1000)
  while (true) {
    const count = db.prepare(`
      SELECT COUNT(*) as count FROM assignments
      WHERE completed_at >= ? AND completed_at < ?
    `).get(day, day + 86400).count
    if (count === 0) break
    streak++
    day -= 86400
    if (streak > 365) break
  }
  return streak
}

export default router
