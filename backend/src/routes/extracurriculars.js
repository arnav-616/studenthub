import { Router } from 'express'
import { randomUUID } from 'crypto'
import { getDb } from '../db/schema.js'

const router = Router()

router.get('/', (req, res) => {
  const db = getDb()
  res.json(db.prepare('SELECT * FROM extracurriculars WHERE user_id = ? ORDER BY active DESC, name ASC').all(req.userId))
})

router.post('/', (req, res) => {
  const { name, category = 'club', role, hours_per_week = 0, meeting_days, meeting_time, location, notes, color = '#6366f1' } = req.body
  if (!name?.trim()) return res.status(400).json({ error: 'Name required' })
  const db = getDb()
  const id = randomUUID()
  db.prepare(`
    INSERT INTO extracurriculars (id, user_id, name, category, role, hours_per_week, meeting_days, meeting_time, location, notes, color)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, req.userId, name.trim(), category, role || null, hours_per_week, meeting_days || null, meeting_time || null, location || null, notes || null, color)
  res.status(201).json(db.prepare('SELECT * FROM extracurriculars WHERE id = ?').get(id))
})

router.put('/:id', (req, res) => {
  const db = getDb()
  const existing = db.prepare('SELECT id FROM extracurriculars WHERE id = ? AND user_id = ?').get(req.params.id, req.userId)
  if (!existing) return res.status(404).json({ error: 'Not found' })
  const fields = ['name','category','role','hours_per_week','meeting_days','meeting_time','location','notes','color','active']
  const sets = fields.filter(f => req.body[f] !== undefined).map(f => `${f} = ?`).join(', ')
  const vals = fields.filter(f => req.body[f] !== undefined).map(f => req.body[f])
  if (!sets) return res.status(400).json({ error: 'Nothing to update' })
  db.prepare(`UPDATE extracurriculars SET ${sets} WHERE id = ?`).run(...vals, req.params.id)
  res.json(db.prepare('SELECT * FROM extracurriculars WHERE id = ?').get(req.params.id))
})

router.delete('/:id', (req, res) => {
  const db = getDb()
  db.prepare('DELETE FROM extracurriculars WHERE id = ? AND user_id = ?').run(req.params.id, req.userId)
  res.json({ ok: true })
})

export default router
