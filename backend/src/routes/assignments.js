import { Router } from 'express'
import { v4 as uuid } from 'uuid'
import { getDb } from '../db/schema.js'

const router = Router()

function getNextRecurDate(currentUnix, pattern) {
  const d = new Date(currentUnix * 1000)
  if (pattern === 'daily')    d.setDate(d.getDate() + 1)
  else if (pattern === 'weekly')   d.setDate(d.getDate() + 7)
  else if (pattern === 'biweekly') d.setDate(d.getDate() + 14)
  else if (pattern === 'monthly')  d.setMonth(d.getMonth() + 1)
  return Math.floor(d.getTime() / 1000)
}

// ── Static routes MUST come before /:id to avoid Express shadowing ─────────────

// .ics calendar export
router.get('/export.ics', (req, res) => {
  const db = getDb()
  const assignments = db.prepare(`
    SELECT a.*, s.name as subject_name FROM assignments a
    LEFT JOIN subjects s ON a.subject_id = s.id
    WHERE a.user_id = ? AND a.status != 'completed' AND a.due_date IS NOT NULL
    ORDER BY a.due_date ASC
  `).all(req.userId)

  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//StudentHub//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH']
  for (const a of assignments) {
    const dt = new Date(a.due_date * 1000)
    const pad = n => String(n).padStart(2, '0')
    const icsDate = `${dt.getFullYear()}${pad(dt.getMonth()+1)}${pad(dt.getDate())}`
    const summary = a.title.replace(/[,;\\]/g, ' ')
    const desc = [a.subject_name, a.type, a.difficulty ? `(${a.difficulty})` : ''].filter(Boolean).join(' · ')
    lines.push(
      'BEGIN:VEVENT',
      `UID:${a.id}@studenthub`,
      `DTSTART;VALUE=DATE:${icsDate}`,
      `DTEND;VALUE=DATE:${icsDate}`,
      `SUMMARY:${summary}`,
      desc ? `DESCRIPTION:${desc}` : '',
      'STATUS:CONFIRMED',
      'END:VEVENT',
    )
  }
  lines.push('END:VCALENDAR')
  res.set('Content-Type', 'text/calendar')
  res.set('Content-Disposition', 'attachment; filename="studenthub-assignments.ics"')
  res.send(lines.filter(Boolean).join('\r\n'))
})

// CSV export
router.get('/export.csv', (req, res) => {
  const db = getDb()
  const rows = db.prepare(`
    SELECT a.title, a.type, a.difficulty, a.status, a.estimated_hours, a.actual_hours,
      a.grade_weight, a.notes, a.tags,
      s.name as subject,
      CASE WHEN a.due_date IS NOT NULL THEN date(a.due_date, 'unixepoch') ELSE '' END as due_date,
      CASE WHEN a.completed_at IS NOT NULL THEN date(a.completed_at, 'unixepoch') ELSE '' END as completed_at
    FROM assignments a
    LEFT JOIN subjects s ON a.subject_id = s.id
    WHERE a.user_id = ?
    ORDER BY a.due_date ASC
  `).all(req.userId)

  const headers = ['Title','Subject','Type','Difficulty','Status','Due Date','Est. Hours','Actual Hours','Grade Weight','Completed At','Notes','Tags']
  const escape = v => {
    const s = v == null ? '' : String(v)
    return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s
  }
  const csvLines = [
    headers.join(','),
    ...rows.map(r => [
      r.title, r.subject, r.type, r.difficulty, r.status, r.due_date,
      r.estimated_hours, r.actual_hours, r.grade_weight, r.completed_at, r.notes,
      (() => { try { return JSON.parse(r.tags || '[]').join('; ') } catch { return '' } })(),
    ].map(escape).join(',')),
  ]

  res.set('Content-Type', 'text/csv')
  res.set('Content-Disposition', 'attachment; filename="studenthub-assignments.csv"')
  res.send(csvLines.join('\n'))
})

// Assignment templates
router.get('/templates', (req, res) => {
  const db = getDb()
  res.json(db.prepare('SELECT * FROM assignment_templates WHERE user_id = ? ORDER BY name').all(req.userId))
})

router.post('/templates', (req, res) => {
  const db = getDb()
  const id = uuid()
  const { name, type = 'assignment', difficulty = 'medium', estimated_hours, subject_id, notes, tags = [] } = req.body
  if (!name) return res.status(400).json({ error: 'Name required' })
  db.prepare(`INSERT INTO assignment_templates (id,user_id,name,type,difficulty,estimated_hours,subject_id,notes,tags)
    VALUES (?,?,?,?,?,?,?,?,?)`).run(id, req.userId, name, type, difficulty, estimated_hours || null, subject_id || null, notes || null, JSON.stringify(tags))
  res.status(201).json(db.prepare('SELECT * FROM assignment_templates WHERE id = ?').get(id))
})

router.delete('/templates/:id', (req, res) => {
  const db = getDb()
  db.prepare('DELETE FROM assignment_templates WHERE id = ? AND user_id = ?').run(req.params.id, req.userId)
  res.json({ success: true })
})

// ── Public share link ────────────────────────────────────────────────────────
// POST /api/assignments/share  → generates/returns a share token
router.post('/share', (req, res) => {
  const db = getDb()
  const existing = db.prepare("SELECT value FROM user_settings WHERE user_id = ? AND key = 'share_token'").get(req.userId)
  if (existing) return res.json({ token: existing.value })
  const token = uuid()
  db.prepare("INSERT INTO user_settings (user_id,key,value) VALUES (?,?,?)").run(req.userId, 'share_token', token)
  res.json({ token })
})

// DELETE /api/assignments/share  → revokes the share token
router.delete('/share', (req, res) => {
  const db = getDb()
  db.prepare("DELETE FROM user_settings WHERE user_id = ? AND key = 'share_token'").run(req.userId)
  res.json({ success: true })
})

// Completion rate stats by subject
router.get('/stats/subjects', (req, res) => {
  const db = getDb()
  const rows = db.prepare(`
    SELECT s.id as subject_id, s.name as subject_name, s.color,
      COUNT(a.id) as total,
      SUM(CASE WHEN a.status = 'completed' THEN 1 ELSE 0 END) as completed
    FROM subjects s
    LEFT JOIN assignments a ON a.subject_id = s.id AND a.user_id = s.user_id
    WHERE s.user_id = ?
    GROUP BY s.id
    HAVING total > 0
    ORDER BY s.name
  `).all(req.userId)
  res.json(rows.map(r => ({ ...r, pct: r.total > 0 ? Math.round((r.completed / r.total) * 100) : 0 })))
})

// ── List / CRUD ────────────────────────────────────────────────────────────────

router.get('/', (req, res) => {
  const db = getDb()
  const { status, subject_id, search, sort = 'due_date', order = 'asc' } = req.query
  let query = `
    SELECT a.*, s.name as subject_name, s.color as subject_color,
      (SELECT COUNT(*) FROM subtasks st WHERE st.assignment_id = a.id) as subtask_count,
      (SELECT COUNT(*) FROM subtasks st WHERE st.assignment_id = a.id AND st.completed = 1) as subtasks_done
    FROM assignments a
    LEFT JOIN subjects s ON a.subject_id = s.id
    WHERE a.user_id = ?
  `
  const params = [req.userId]
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
    WHERE a.id = ? AND a.user_id = ?
  `).get(req.params.id, req.userId)
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
    sessions_total, sessions_completed = 0, session_duration_mins,
    tags = '[]',
  } = req.body
  if (!title) return res.status(400).json({ error: 'Title is required' })
  db.prepare(`
    INSERT INTO assignments (id,title,subject_id,type,difficulty,due_date,due_time,
      estimated_hours,grade_weight,notes,url,is_recurring,recur_pattern,priority,
      sessions_total,sessions_completed,session_duration_mins,user_id,tags)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
  `).run(id, title, subject_id || null, type, difficulty, due_date || null, due_time || null,
    estimated_hours || null, grade_weight || null, notes || null, url || null,
    is_recurring ? 1 : 0, recur_pattern || null, priority,
    sessions_total || null, sessions_completed || 0, session_duration_mins || null,
    req.userId, JSON.stringify(Array.isArray(tags) ? tags : []))

  if (subtasks.length) {
    const insertSt = db.prepare('INSERT INTO subtasks (id,assignment_id,title,position) VALUES (?,?,?,?)')
    subtasks.forEach((st, i) => insertSt.run(uuid(), id, st.title, i))
  }
  const created = db.prepare('SELECT * FROM assignments WHERE id = ?').get(id)
  res.status(201).json(created)
})

router.put('/:id', (req, res) => {
  const db = getDb()
  const existing = db.prepare('SELECT id FROM assignments WHERE id = ? AND user_id = ?').get(req.params.id, req.userId)
  if (!existing) return res.status(404).json({ error: 'Not found' })

  const fields = ['title','subject_id','type','difficulty','status','due_date','due_time',
    'estimated_hours','actual_hours','grade_weight','notes','url','is_recurring','recur_pattern','priority',
    'sessions_total','sessions_completed','session_duration_mins','tags']
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

  // Auto-create next recurring instance when completed
  if (req.body.status === 'completed') {
    const updated = db.prepare('SELECT * FROM assignments WHERE id = ?').get(req.params.id)
    if (updated.is_recurring && updated.due_date && updated.recur_pattern) {
      const nextDue = getNextRecurDate(updated.due_date, updated.recur_pattern)
      const pastEnd = updated.recur_end && nextDue > updated.recur_end
      if (!pastEnd) {
        const newId = uuid()
        db.prepare(`
          INSERT INTO assignments (id,title,subject_id,type,difficulty,due_date,
            estimated_hours,grade_weight,notes,url,is_recurring,recur_pattern,recur_end,priority,
            sessions_total,session_duration_mins,user_id,tags,status)
          VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,'pending')
        `).run(newId, updated.title, updated.subject_id, updated.type, updated.difficulty, nextDue,
          updated.estimated_hours, updated.grade_weight, updated.notes, updated.url,
          1, updated.recur_pattern, updated.recur_end || null, updated.priority,
          updated.sessions_total, updated.session_duration_mins, req.userId, updated.tags || '[]')
      }
    }
  }

  res.json(db.prepare('SELECT * FROM assignments WHERE id = ?').get(req.params.id))
})

router.delete('/:id', (req, res) => {
  const db = getDb()
  db.prepare('DELETE FROM assignments WHERE id = ? AND user_id = ?').run(req.params.id, req.userId)
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
