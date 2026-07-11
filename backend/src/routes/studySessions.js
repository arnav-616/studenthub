import { Router } from 'express'
import { randomUUID } from 'crypto'
import { getDb } from '../db/schema.js'

const router = Router()

router.get('/', (req, res) => {
  const db = getDb()
  const sessions = db.prepare(
    `SELECT id, title, mode, source_preview, assignment_id, mastery, created_at
     FROM study_sessions WHERE user_id = ? ORDER BY created_at DESC LIMIT 50`
  ).all(req.userId)
  res.json(sessions.map(s => ({ ...s, mastery: s.mastery ? JSON.parse(s.mastery) : null })))
})

router.get('/:id', (req, res) => {
  const db = getDb()
  const session = db.prepare(
    'SELECT * FROM study_sessions WHERE id = ? AND user_id = ?'
  ).get(req.params.id, req.userId)
  if (!session) return res.status(404).json({ error: 'Not found' })
  res.json({
    ...session,
    result: JSON.parse(session.result),
    mastery: session.mastery ? JSON.parse(session.mastery) : null,
  })
})

router.post('/', (req, res) => {
  const { title, mode, result, source_preview, assignment_id } = req.body
  if (!title || !mode || !result) return res.status(400).json({ error: 'title, mode, result required' })
  const db = getDb()
  const id = randomUUID()
  db.prepare(
    `INSERT INTO study_sessions (id, user_id, title, mode, result, source_preview, assignment_id)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(id, req.userId, title, mode, JSON.stringify(result), source_preview || null, assignment_id || null)
  res.status(201).json({ id, title, mode, source_preview, assignment_id, created_at: Math.floor(Date.now() / 1000) })
})

router.patch('/:id/mastery', (req, res) => {
  const db = getDb()
  const session = db.prepare('SELECT id FROM study_sessions WHERE id = ? AND user_id = ?').get(req.params.id, req.userId)
  if (!session) return res.status(404).json({ error: 'Not found' })
  db.prepare('UPDATE study_sessions SET mastery = ? WHERE id = ?').run(JSON.stringify(req.body.mastery), req.params.id)
  res.json({ ok: true })
})

router.delete('/:id', (req, res) => {
  const db = getDb()
  db.prepare('DELETE FROM study_sessions WHERE id = ? AND user_id = ?').run(req.params.id, req.userId)
  res.json({ ok: true })
})

export default router
