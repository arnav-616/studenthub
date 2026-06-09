import { Router } from 'express'
import { v4 as uuid } from 'uuid'
import { getDb } from '../db/schema.js'

const router = Router()

router.get('/', (req, res) => {
  const db = getDb()
  const subjects = db.prepare(`
    SELECT s.*,
      COUNT(DISTINCT a.id) as assignment_count,
      COUNT(DISTINCT CASE WHEN a.status='completed' THEN a.id END) as completed_count
    FROM subjects s
    LEFT JOIN assignments a ON a.subject_id = s.id
    WHERE s.user_id = ?
    GROUP BY s.id
    ORDER BY s.name
  `).all(req.userId)
  res.json(subjects)
})

router.post('/', (req, res) => {
  const db = getDb()
  const { name, color = '#6366f1', icon } = req.body
  if (!name) return res.status(400).json({ error: 'Name required' })
  const id = uuid()
  db.prepare('INSERT INTO subjects (id,name,color,icon,user_id) VALUES (?,?,?,?,?)').run(id, name, color, icon || null, req.userId)
  res.status(201).json(db.prepare('SELECT * FROM subjects WHERE id = ?').get(id))
})

router.put('/:id', (req, res) => {
  const db = getDb()
  const { name, color, icon } = req.body
  const updates = []; const params = []
  if (name !== undefined) { updates.push('name = ?'); params.push(name) }
  if (color !== undefined) { updates.push('color = ?'); params.push(color) }
  if (icon !== undefined) { updates.push('icon = ?'); params.push(icon) }
  params.push(req.params.id, req.userId)
  db.prepare(`UPDATE subjects SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`).run(...params)
  res.json(db.prepare('SELECT * FROM subjects WHERE id = ?').get(req.params.id))
})

router.delete('/:id', (req, res) => {
  const db = getDb()
  db.prepare('DELETE FROM subjects WHERE id = ? AND user_id = ?').run(req.params.id, req.userId)
  res.json({ success: true })
})

export default router
