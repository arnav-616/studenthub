import { Router } from 'express'
import { v4 as uuid } from 'uuid'
import { getDb } from '../db/schema.js'

const router = Router()

router.get('/', (req, res) => {
  const db = getDb()
  const { status, subject_id, search, sort = 'due_date', order = 'asc' } = req.query
  let query = `
    SELECT a.*, s.name as subject_name, s.color as subject_color,
      (SELECT COUNT(*) FROM subtasks st WHERE st.assignment_id = a.id) as subtask_count,
      (SELECT COUNT(*) FROM subtasks st WHERE st.assignment_id = a.id AND st.completed = 1) as subtasks_done
    FROM assignments a
    LEFT JOIN subjects s ON a.subject_id = s.id
    WHERE 1=1
  `
  const params = []
  if (status) { query += ' AND a.status = ?'; params.push(status) }
  if (subject_id) { query += ' AND a.subject_id = ?'; params.push(subject_id) }
  if (search) { query += ' AND a.title LIKE ?'; params.push(`%${search}%`) }
  const col = ['due_date','title','created_at','difficulty','priority'].includes(sort) ? `a.${sort}` : 'a.due_date'
  query += ` ORDER BY ${col} ${order === 'desc' ? 'DESC' : 'ASC'}`
  res.json(db.prepare(query).all(...params))
})

router.get('/:id', (req, res) => {
  const db = getDb()
  const assignment = db.prepare(`
    SELECT a.*, s.name as subject_name, s.color as subject_color
    FROM assignments a LEFT JOIN subjects s ON a.subject_id = s.id
    WHERE a.id = ?
  `).get(req.params.id)
  if (!assignment) return res.status(404).json({ error: 'Not found' })
  const subtasks = db.prepare('SELECT * FROM subtasks WHERE assignment_id = ? ORDER BY position').all(req.params.id)
  res.json({ ...assignment, subtasks })
})

router.post('/', (req, res) => {
  const db = getDb()
  const id = uuid()
  const {
    title, subject_id, type = 'assignment', difficulty = 'medium',
    due_date, due_time, estimated_hours, grade_weight, notes, url,
    is_recurring = 0, recur_pattern, priority = 0, subtasks = [],
  } = req.body
  if (!title) return res.status(400).json({ error: 'Title is required' })
  db.prepare(`
    INSERT INTO assignments (id,title,subject_id,type,difficulty,due_date,due_time,
      estimated_hours,grade_weight,notes,url,is_recurring,recur_pattern,priority)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)
  `).run(id, title, subject_id || null, type, difficulty, due_date || null, due_time || null,
    estimated_hours || null, grade_weight || null, notes || null, url || null,
    is_recurring ? 1 : 0, recur_pattern || null, priority)

  if (subtasks.length) {
    const insertSt = db.prepare('INSERT INTO subtasks (id,assignment_id,title,position) VALUES (?,?,?,?)')
    subtasks.forEach((st, i) => insertSt.run(uuid(), id, st.title, i))
  }
  const created = db.prepare('SELECT * FROM assignments WHERE id = ?').get(id)
  res.status(201).json(created)
})

router.put('/:id', (req, res) => {
  const db = getDb()
  const existing = db.prepare('SELECT id FROM assignments WHERE id = ?').get(req.params.id)
  if (!existing) return res.status(404).json({ error: 'Not found' })

  const fields = ['title','subject_id','type','difficulty','status','due_date','due_time',
    'estimated_hours','actual_hours','grade_weight','notes','url','is_recurring','recur_pattern','priority']
  const updates = []
  const params = []
  for (const f of fields) {
    if (req.body[f] !== undefined) { updates.push(`${f} = ?`); params.push(req.body[f]) }
  }
  if (req.body.status === 'completed') {
    updates.push('completed_at = ?')
    params.push(Math.floor(Date.now() / 1000))
  }
  updates.push('updated_at = ?')
  params.push(Math.floor(Date.now() / 1000))
  params.push(req.params.id)
  db.prepare(`UPDATE assignments SET ${updates.join(', ')} WHERE id = ?`).run(...params)
  res.json(db.prepare('SELECT * FROM assignments WHERE id = ?').get(req.params.id))
})

router.delete('/:id', (req, res) => {
  const db = getDb()
  db.prepare('DELETE FROM assignments WHERE id = ?').run(req.params.id)
  res.json({ success: true })
})

// Subtasks
router.get('/:id/subtasks', (req, res) => {
  const db = getDb()
  res.json(db.prepare('SELECT * FROM subtasks WHERE assignment_id = ? ORDER BY position').all(req.params.id))
})

router.post('/:id/subtasks', (req, res) => {
  const db = getDb()
  const id = uuid()
  const { title, position = 0 } = req.body
  db.prepare('INSERT INTO subtasks (id,assignment_id,title,position) VALUES (?,?,?,?)').run(id, req.params.id, title, position)
  res.status(201).json(db.prepare('SELECT * FROM subtasks WHERE id = ?').get(id))
})

router.put('/:id/subtasks/:stId', (req, res) => {
  const db = getDb()
  const { title, completed, position } = req.body
  const updates = []; const params = []
  if (title !== undefined) { updates.push('title = ?'); params.push(title) }
  if (completed !== undefined) { updates.push('completed = ?'); params.push(completed ? 1 : 0) }
  if (position !== undefined) { updates.push('position = ?'); params.push(position) }
  params.push(req.params.stId)
  db.prepare(`UPDATE subtasks SET ${updates.join(', ')} WHERE id = ?`).run(...params)
  res.json(db.prepare('SELECT * FROM subtasks WHERE id = ?').get(req.params.stId))
})

router.delete('/:id/subtasks/:stId', (req, res) => {
  const db = getDb()
  db.prepare('DELETE FROM subtasks WHERE id = ?').run(req.params.stId)
  res.json({ success: true })
})

export default router
