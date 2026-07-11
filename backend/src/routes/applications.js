import { Router } from 'express'
import { randomUUID } from 'crypto'
import { getDb } from '../db/schema.js'

const router = Router()

router.get('/', (req, res) => {
  const db = getDb()
  res.json(db.prepare('SELECT * FROM applications WHERE user_id = ? ORDER BY updated_at DESC').all(req.userId))
})

router.post('/', (req, res) => {
  const { company, role, type = 'internship', status = 'applied', applied_date, follow_up_date, deadline, url, notes, salary, location } = req.body
  if (!company?.trim() || !role?.trim()) return res.status(400).json({ error: 'Company and role required' })
  const db = getDb()
  const id = randomUUID()
  const now = Math.floor(Date.now() / 1000)
  db.prepare(`
    INSERT INTO applications (id, user_id, company, role, type, status, applied_date, follow_up_date, deadline, url, notes, salary, location, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, req.userId, company.trim(), role.trim(), type, status, applied_date || null, follow_up_date || null, deadline || null, url || null, notes || null, salary || null, location || null, now, now)
  res.status(201).json(db.prepare('SELECT * FROM applications WHERE id = ?').get(id))
})

router.put('/:id', (req, res) => {
  const db = getDb()
  const existing = db.prepare('SELECT id FROM applications WHERE id = ? AND user_id = ?').get(req.params.id, req.userId)
  if (!existing) return res.status(404).json({ error: 'Not found' })
  const fields = ['company','role','type','status','applied_date','follow_up_date','deadline','url','notes','salary','location']
  const sets = [...fields.filter(f => req.body[f] !== undefined).map(f => `${f} = ?`), 'updated_at = ?'].join(', ')
  const vals = [...fields.filter(f => req.body[f] !== undefined).map(f => req.body[f] || null), Math.floor(Date.now() / 1000)]
  db.prepare(`UPDATE applications SET ${sets} WHERE id = ?`).run(...vals, req.params.id)
  res.json(db.prepare('SELECT * FROM applications WHERE id = ?').get(req.params.id))
})

router.delete('/:id', (req, res) => {
  const db = getDb()
  db.prepare('DELETE FROM applications WHERE id = ? AND user_id = ?').run(req.params.id, req.userId)
  res.json({ ok: true })
})

export default router
