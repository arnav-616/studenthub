import { Router } from 'express'
import { getDb } from '../db/schema.js'
import { calculateBusyScore } from '../utils/busyScore.js'

const router = Router()

router.get('/', (req, res) => {
  const db = getDb()
  // User-specific settings take precedence over global defaults
  const rows = db.prepare(`
    SELECT key, value FROM settings
    WHERE user_id = ? OR user_id IS NULL
    ORDER BY user_id DESC
  `).all(req.userId)
  // Deduplicate: user-specific value wins (ordered by user_id DESC puts user rows first)
  const seen = new Set()
  const settings = {}
  for (const r of rows) {
    if (!seen.has(r.key)) { settings[r.key] = r.value; seen.add(r.key) }
  }
  res.json(settings)
})

router.put('/', (req, res) => {
  const db = getDb()
  const upsert = db.prepare(`
    INSERT INTO settings (key, value, user_id) VALUES (?,?,?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value
    WHERE settings.user_id = ? OR settings.user_id IS NULL
  `)
  // Use a simpler approach: delete user's existing keys, re-insert
  const uid = req.userId
  const update = db.transaction(entries => {
    for (const [k, v] of entries) {
      const existing = db.prepare('SELECT rowid FROM settings WHERE key = ? AND user_id = ?').get(k, uid)
      if (existing) {
        db.prepare('UPDATE settings SET value = ? WHERE key = ? AND user_id = ?').run(String(v), k, uid)
      } else {
        db.prepare('INSERT INTO settings (key, value, user_id) VALUES (?,?,?)').run(k, String(v), uid)
      }
    }
  })
  update(Object.entries(req.body))
  // Return merged settings
  const rows = db.prepare(`
    SELECT key, value FROM settings WHERE user_id = ? OR user_id IS NULL ORDER BY user_id DESC
  `).all(uid)
  const seen = new Set()
  const settings = {}
  for (const r of rows) {
    if (!seen.has(r.key)) { settings[r.key] = r.value; seen.add(r.key) }
  }
  res.json(settings)
})

// Heatmap data
router.get('/heatmap', (req, res) => {
  const db = getDb()
  const uid = req.userId
  const { start, end } = req.query
  const startTs = start ? Math.floor(new Date(start).getTime() / 1000) : Math.floor(Date.now() / 1000) - 180 * 86400
  const endTs = end ? Math.floor(new Date(end).getTime() / 1000) : Math.floor(Date.now() / 1000)

  const workStyleRow = db.prepare("SELECT value FROM settings WHERE key='work_style' AND (user_id = ? OR user_id IS NULL) ORDER BY user_id DESC LIMIT 1").get(uid)
  const workStyle = workStyleRow?.value ?? 'on_time'
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
  const data = {
    assignments: db.prepare('SELECT * FROM assignments WHERE user_id = ?').all(uid),
    subjects: db.prepare('SELECT * FROM subjects WHERE user_id = ?').all(uid),
    subtasks: db.prepare('SELECT st.* FROM subtasks st JOIN assignments a ON st.assignment_id = a.id WHERE a.user_id = ?').all(uid),
    courses: db.prepare('SELECT * FROM courses WHERE user_id = ?').all(uid),
    grade_components: db.prepare('SELECT gc.* FROM grade_components gc JOIN courses c ON gc.course_id = c.id WHERE c.user_id = ?').all(uid),
    settings: db.prepare('SELECT * FROM settings WHERE user_id = ?').all(uid),
    exported_at: new Date().toISOString(),
  }
  res.json(data)
})

export default router
