import { Router } from 'express'
import { getDb } from '../db/schema.js'
import { calculateBusyScore, dailyScores } from '../utils/busyScore.js'

function getWorkStyle(db, userId) {
  const user = db.prepare("SELECT value FROM user_settings WHERE user_id = ? AND key = 'work_style'").get(userId)
  if (user) return user.value
  const global = db.prepare("SELECT value FROM settings WHERE key = 'work_style' AND user_id IS NULL").get()
  return global?.value ?? 'on_time'
}

const router = Router()

router.get('/', (req, res) => {
  const db = getDb()
  const uid = req.userId
  const now = Math.floor(Date.now() / 1000)
  const startOfDay = Math.floor(new Date().setHours(0,0,0,0) / 1000)

  const workStyle = getWorkStyle(db, uid)
  const assignments = db.prepare('SELECT * FROM assignments WHERE status != ? AND user_id = ?').all('completed', uid)

  const { score, band, breakdown, totalAssignments, daysWithCluster } = calculateBusyScore(assignments, workStyle)
  const dayStrip = dailyScores(assignments)

  const nextDue = db.prepare(`
    SELECT a.*, s.name as subject_name, s.color as subject_color
    FROM assignments a LEFT JOIN subjects s ON a.subject_id = s.id
    WHERE a.status != 'completed' AND a.due_date IS NOT NULL AND a.due_date > ? AND a.user_id = ?
    ORDER BY a.due_date ASC LIMIT 5
  `).all(now, uid)

  const overdue = db.prepare(`
    SELECT COUNT(*) as count FROM assignments
    WHERE status != 'completed' AND due_date < ? AND due_date IS NOT NULL AND user_id = ?
  `).get(now, uid)

  const todayDue = db.prepare(`
    SELECT COUNT(*) as count FROM assignments
    WHERE status != 'completed' AND due_date >= ? AND due_date < ? AND user_id = ?
  `).get(startOfDay, startOfDay + 86400, uid)

  const completedThisWeek = db.prepare(`
    SELECT COUNT(*) as count FROM assignments
    WHERE status = 'completed' AND completed_at >= ? AND user_id = ?
  `).get(now - 7 * 86400, uid)

  const streak = calculateStreak(db, uid, now)

  const productivity = []
  for (let i = 13; i >= 0; i--) {
    const dayStart = startOfDay - i * 86400
    const dayEnd = dayStart + 86400
    const completed = db.prepare(`
      SELECT COUNT(*) as count FROM assignments
      WHERE completed_at >= ? AND completed_at < ? AND user_id = ?
    `).get(dayStart, dayEnd, uid)
    productivity.push({ date: new Date(dayStart * 1000).toISOString().slice(0, 10), completed: completed.count })
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

function calculateStreak(db, userId, now) {
  let streak = 0
  let day = Math.floor(new Date().setHours(0,0,0,0) / 1000)
  while (true) {
    const count = db.prepare(`
      SELECT COUNT(*) as count FROM assignments
      WHERE completed_at >= ? AND completed_at < ? AND user_id = ?
    `).get(day, day + 86400, userId).count
    if (count === 0) break
    streak++
    day -= 86400
    if (streak > 365) break
  }
  return streak
}

export default router
