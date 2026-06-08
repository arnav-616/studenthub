import { Router } from 'express'
import { getDb } from '../db/schema.js'
import { calculateBusyScore } from '../utils/busyScore.js'

const router = Router()

router.get('/', (req, res) => {
  const db = getDb()
  const rows = db.prepare('SELECT key, value FROM settings').all()
  const settings = Object.fromEntries(rows.map(r => [r.key, r.value]))
  res.json(settings)
})

router.put('/', (req, res) => {
  const db = getDb()
  const update = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?,?)')
  const updateMany = db.transaction(pairs => {
    for (const [k, v] of pairs) update.run(k, String(v))
  })
  updateMany(Object.entries(req.body))
  const rows = db.prepare('SELECT key, value FROM settings').all()
  res.json(Object.fromEntries(rows.map(r => [r.key, r.value])))
})

// Heatmap data
router.get('/heatmap', (req, res) => {
  const db = getDb()
  const { start, end } = req.query
  const startTs = start ? Math.floor(new Date(start).getTime() / 1000) : Math.floor(Date.now() / 1000) - 180 * 86400
  const endTs = end ? Math.floor(new Date(end).getTime() / 1000) : Math.floor(Date.now() / 1000)
  const workStyle = db.prepare("SELECT value FROM settings WHERE key='work_style'").get()?.value ?? 'on_time'

  const assignments = db.prepare('SELECT * FROM assignments').all()

  const days = []
  let current = startTs
  while (current <= endTs) {
    const dayEnd = current + 86400
    const dayAssignments = assignments.filter(a => a.due_date >= current && a.due_date < dayEnd && a.status !== 'completed')
    const { score } = calculateBusyScore(dayAssignments, workStyle)
    const completed = assignments.filter(a => a.completed_at >= current && a.completed_at < dayEnd).length
    days.push({
      date: new Date(current * 1000).toISOString().slice(0, 10),
      score,
      completed,
      due: dayAssignments.length,
    })
    current += 86400
  }
  res.json(days)
})

// Data export
router.get('/export', (req, res) => {
  const db = getDb()
  const data = {
    assignments: db.prepare('SELECT * FROM assignments').all(),
    subjects: db.prepare('SELECT * FROM subjects').all(),
    subtasks: db.prepare('SELECT * FROM subtasks').all(),
    courses: db.prepare('SELECT * FROM courses').all(),
    grade_components: db.prepare('SELECT * FROM grade_components').all(),
    settings: db.prepare('SELECT * FROM settings').all(),
    exported_at: new Date().toISOString(),
  }
  res.json(data)
})

export default router
