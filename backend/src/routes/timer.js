import { Router } from 'express'
import { v4 as uuid } from 'uuid'
import { getDb } from '../db/schema.js'

const router = Router()

router.get('/sessions', (req, res) => {
  const db = getDb()
  const { assignment_id, limit = 50 } = req.query
  let query = `
    SELECT ts.*, a.title as assignment_title
    FROM timer_sessions ts LEFT JOIN assignments a ON ts.assignment_id = a.id
    WHERE ts.user_id = ?
  `
  const params = [req.userId]
  if (assignment_id) { query += ' AND ts.assignment_id = ?'; params.push(assignment_id) }
  query += ' ORDER BY ts.started_at DESC LIMIT ?'
  params.push(Number(limit))
  res.json(db.prepare(query).all(...params))
})

router.post('/sessions', (req, res) => {
  const db = getDb()
  const id = uuid()
  const { assignment_id, started_at, ended_at, duration_minutes, session_type = 'focus' } = req.body
  db.prepare(`
    INSERT INTO timer_sessions (id,assignment_id,started_at,ended_at,duration_minutes,session_type,user_id)
    VALUES (?,?,?,?,?,?,?)
  `).run(id, assignment_id || null, started_at, ended_at || null, duration_minutes || null, session_type, req.userId)

  if (assignment_id && duration_minutes) {
    const hours = duration_minutes / 60
    db.prepare(`
      UPDATE assignments SET actual_hours = COALESCE(actual_hours, 0) + ?, updated_at = ?
      WHERE id = ? AND user_id = ?
    `).run(hours, Math.floor(Date.now() / 1000), assignment_id, req.userId)
  }
  res.status(201).json(db.prepare('SELECT * FROM timer_sessions WHERE id = ?').get(id))
})

router.get('/stats', (req, res) => {
  const db = getDb()
  const now = Math.floor(Date.now() / 1000)
  const weekStart = now - 7 * 86400
  const stats = db.prepare(`
    SELECT
      COUNT(*) as total_sessions,
      SUM(duration_minutes) as total_minutes,
      AVG(duration_minutes) as avg_session_minutes,
      COUNT(DISTINCT DATE(started_at,'unixepoch')) as active_days
    FROM timer_sessions
    WHERE started_at >= ? AND session_type = 'focus' AND user_id = ?
  `).get(weekStart, req.userId)
  res.json(stats)
})

export default router
