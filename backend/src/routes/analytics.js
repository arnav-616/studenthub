import { Router } from 'express'
import { v4 as uuid } from 'uuid'
import { getDb } from '../db/schema.js'

const router = Router()

router.get('/velocity', (req, res) => {
  const db = getDb()
  const rows = db.prepare(`
    SELECT a.type, a.difficulty, a.estimated_hours, a.actual_hours,
           s.name as subject_name, s.color as subject_color, s.id as subject_id
    FROM assignments a
    LEFT JOIN subjects s ON a.subject_id = s.id
    WHERE a.status = 'completed'
      AND a.estimated_hours IS NOT NULL
      AND a.actual_hours IS NOT NULL
      AND a.user_id = ?
  `).all(req.userId)

  const byType = {}
  for (const r of rows) {
    if (!byType[r.type]) byType[r.type] = { estimated: 0, actual: 0, count: 0 }
    byType[r.type].estimated += r.estimated_hours
    byType[r.type].actual += r.actual_hours
    byType[r.type].count++
  }
  const typeStats = Object.entries(byType).map(([type, s]) => ({
    type, avgEstimated: s.estimated / s.count, avgActual: s.actual / s.count,
    ratio: s.actual / s.estimated, count: s.count,
  }))

  const bySubject = {}
  for (const r of rows) {
    const key = r.subject_id || '__none__'
    if (!bySubject[key]) bySubject[key] = { name: r.subject_name || 'No subject', color: r.subject_color || '#6366f1', estimated: 0, actual: 0, count: 0 }
    bySubject[key].estimated += r.estimated_hours
    bySubject[key].actual += r.actual_hours
    bySubject[key].count++
  }
  const subjectStats = Object.entries(bySubject).map(([id, s]) => ({
    subject_id: id === '__none__' ? null : id,
    subject_name: s.name, subject_color: s.color,
    avgEstimated: s.estimated / s.count, avgActual: s.actual / s.count,
    ratio: s.actual / s.estimated, count: s.count,
  }))

  res.json({ byType: typeStats, bySubject: subjectStats, totalSamples: rows.length })
})

router.get('/subjects', (req, res) => {
  const db = getDb()
  const subjects = db.prepare('SELECT * FROM subjects WHERE user_id = ?').all(req.userId)
  const now = Math.floor(Date.now() / 1000)

  const stats = subjects.map(s => {
    const all = db.prepare('SELECT * FROM assignments WHERE subject_id = ? AND user_id = ?').all(s.id, req.userId)
    const pending = all.filter(a => a.status !== 'completed')
    const completed = all.filter(a => a.status === 'completed')
    const overdue = pending.filter(a => a.due_date && a.due_date < now)
    const totalEstHours = pending.reduce((acc, a) => {
      const h = a.estimated_hours ?? (a.sessions_total && a.session_duration_mins
        ? (a.sessions_total - (a.sessions_completed || 0)) * a.session_duration_mins / 60 : 0)
      return acc + h
    }, 0)
    const completionRate = all.length ? completed.length / all.length : 0
    const avgActual = completed.filter(a => a.actual_hours).reduce((acc, a, _, arr) => acc + a.actual_hours / arr.length, 0)
    const weeklyCompleted = Array.from({ length: 4 }, (_, i) => {
      const weekStart = now - (i + 1) * 7 * 86400
      const weekEnd = now - i * 7 * 86400
      return completed.filter(a => a.completed_at >= weekStart && a.completed_at < weekEnd).length
    }).reverse()

    return {
      ...s, totalAssignments: all.length, pendingCount: pending.length, completedCount: completed.length,
      overdueCount: overdue.length, completionRate: Math.round(completionRate * 100),
      totalEstHours: Math.round(totalEstHours * 10) / 10, avgActualHours: Math.round(avgActual * 10) / 10, weeklyCompleted,
    }
  })

  res.json(stats)
})

router.get('/dependencies/:assignmentId', (req, res) => {
  const db = getDb()
  const deps = db.prepare(`
    SELECT d.*, a.title as dep_title, a.status as dep_status, a.due_date as dep_due_date, a.difficulty as dep_difficulty
    FROM assignment_dependencies d
    JOIN assignments a ON d.depends_on_id = a.id
    WHERE d.assignment_id = ? AND a.user_id = ?
  `).all(req.params.assignmentId, req.userId)
  res.json(deps)
})

router.post('/dependencies', (req, res) => {
  const db = getDb()
  const { assignment_id, depends_on_id } = req.body
  if (!assignment_id || !depends_on_id) return res.status(400).json({ error: 'Both IDs required' })
  if (assignment_id === depends_on_id) return res.status(400).json({ error: 'Cannot depend on itself' })
  try {
    const id = uuid()
    db.prepare('INSERT INTO assignment_dependencies (id, assignment_id, depends_on_id) VALUES (?,?,?)').run(id, assignment_id, depends_on_id)
    res.status(201).json({ id, assignment_id, depends_on_id })
  } catch (e) {
    res.status(409).json({ error: 'Dependency already exists' })
  }
})

router.delete('/dependencies/:id', (req, res) => {
  const db = getDb()
  db.prepare('DELETE FROM assignment_dependencies WHERE id = ?').run(req.params.id)
  res.json({ success: true })
})

export default router
