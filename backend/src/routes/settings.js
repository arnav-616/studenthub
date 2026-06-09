import { Router } from 'express'
import { getDb } from '../db/schema.js'
import { calculateBusyScore } from '../utils/busyScore.js'

const router = Router()

function getSettings(db, userId) {
  // Global defaults from the original settings table
  const defaults = Object.fromEntries(
    db.prepare('SELECT key, value FROM settings WHERE user_id IS NULL').all().map(r => [r.key, r.value])
  )
  // User-specific overrides from user_settings
  const userRows = db.prepare('SELECT key, value FROM user_settings WHERE user_id = ?').all(userId)
  const user = Object.fromEntries(userRows.map(r => [r.key, r.value]))
  return { ...defaults, ...user }
}

router.get('/', (req, res) => {
  const db = getDb()
  res.json(getSettings(db, req.userId))
})

router.put('/', (req, res) => {
  const db = getDb()
  const uid = req.userId
  const upsert = db.prepare(`
    INSERT INTO user_settings (user_id, key, value) VALUES (?,?,?)
    ON CONFLICT(user_id, key) DO UPDATE SET value = excluded.value
  `)
  const updateAll = db.transaction(entries => {
    for (const [k, v] of entries) upsert.run(uid, k, String(v))
  })
  updateAll(Object.entries(req.body))
  res.json(getSettings(db, uid))
})

// Heatmap data
router.get('/heatmap', (req, res) => {
  const db = getDb()
  const uid = req.userId
  const { start, end } = req.query
  const startTs = start ? Math.floor(new Date(start).getTime() / 1000) : Math.floor(Date.now() / 1000) - 180 * 86400
  const endTs = end ? Math.floor(new Date(end).getTime() / 1000) : Math.floor(Date.now() / 1000)
  const settings = getSettings(db, uid)
  const workStyle = settings.work_style ?? 'on_time'
  const assignments = db.prepare('SELECT * FROM assignments WHERE user_id = ?').all(uid)

  const days = []
  let current = startTs
  while (current <= endTs) {
    const dayEnd = current + 86400
    const dayAssignments = assignments.filter(a => a.due_date >= current && a.due_date < dayEnd && a.status !== 'completed')
    const { score } = calculateBusyScore(dayAssignments, workStyle)
    const completed = assignments.filter(a => a.completed_at >= current && a.completed_at < dayEnd).length
    days.push({ date: new Date(current * 1000).toISOString().slice(0, 10), score, completed, due: dayAssignments.length })
    current += 86400
  }
  res.json(days)
})

// Data export
router.get('/export', (req, res) => {
  const db = getDb()
  const uid = req.userId
  res.json({
    assignments: db.prepare('SELECT * FROM assignments WHERE user_id = ?').all(uid),
    subjects: db.prepare('SELECT * FROM subjects WHERE user_id = ?').all(uid),
    subtasks: db.prepare('SELECT st.* FROM subtasks st JOIN assignments a ON st.assignment_id = a.id WHERE a.user_id = ?').all(uid),
    courses: db.prepare('SELECT * FROM courses WHERE user_id = ?').all(uid),
    grade_components: db.prepare('SELECT gc.* FROM grade_components gc JOIN courses c ON gc.course_id = c.id WHERE c.user_id = ?').all(uid),
    settings: getSettings(db, uid),
    exported_at: new Date().toISOString(),
  })
})

export default router
