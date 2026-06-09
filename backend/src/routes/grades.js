import { Router } from 'express'
import { v4 as uuid } from 'uuid'
import { getDb } from '../db/schema.js'

const router = Router()

function componentWithScore(c) {
  const score = c.max_points > 0 && c.earned_points !== null
    ? Math.round((c.earned_points / c.max_points) * 1000) / 10
    : null
  return { ...c, score }
}

router.get('/courses', (req, res) => {
  const db = getDb()
  const courses = db.prepare(`
    SELECT c.*, s.name as subject_name, s.color as subject_color,
      (SELECT COUNT(*) FROM grade_components gc WHERE gc.course_id = c.id) as component_count
    FROM courses c LEFT JOIN subjects s ON c.subject_id = s.id
    WHERE c.user_id = ?
    ORDER BY c.name
  `).all(req.userId)
  res.json(courses)
})

router.post('/courses', (req, res) => {
  const db = getDb()
  const id = uuid()
  const { subject_id, name, credits = 3, semester = '', target_grade = 90 } = req.body
  db.prepare(`
    INSERT INTO courses (id,subject_id,name,target_grade,user_id)
    VALUES (?,?,?,?,?)
  `).run(id, subject_id || null, name, target_grade, req.userId)

  // Also add credits/semester if columns exist (safe)
  try { db.exec(`ALTER TABLE courses ADD COLUMN credits INTEGER DEFAULT 3`) } catch (_) {}
  try { db.exec(`ALTER TABLE courses ADD COLUMN semester TEXT DEFAULT ''`) } catch (_) {}
  try {
    db.prepare('UPDATE courses SET credits = ?, semester = ? WHERE id = ?').run(credits, semester, id)
  } catch (_) {}

  res.status(201).json(db.prepare('SELECT * FROM courses WHERE id = ?').get(id))
})

router.put('/courses/:id', (req, res) => {
  const db = getDb()
  const { name, target_grade, credits, semester } = req.body
  const updates = []; const params = []
  if (name !== undefined) { updates.push('name = ?'); params.push(name) }
  if (target_grade !== undefined) { updates.push('target_grade = ?'); params.push(target_grade) }
  try {
    if (credits !== undefined) { updates.push('credits = ?'); params.push(credits) }
    if (semester !== undefined) { updates.push('semester = ?'); params.push(semester) }
  } catch (_) {}
  params.push(req.params.id, req.userId)
  if (updates.length) db.prepare(`UPDATE courses SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`).run(...params)
  res.json(db.prepare('SELECT * FROM courses WHERE id = ?').get(req.params.id))
})

router.delete('/courses/:id', (req, res) => {
  const db = getDb()
  db.prepare('DELETE FROM courses WHERE id = ? AND user_id = ?').run(req.params.id, req.userId)
  res.json({ success: true })
})

router.get('/courses/:id/components', (req, res) => {
  const db = getDb()
  const comps = db.prepare('SELECT * FROM grade_components WHERE course_id = ? ORDER BY created_at').all(req.params.id)
  res.json(comps.map(componentWithScore))
})

router.post('/courses/:id/components', (req, res) => {
  const db = getDb()
  const id = uuid()
  const { name, weight, score } = req.body
  const earned = score != null ? parseFloat(score) : null
  const max = score != null ? 100 : null
  db.prepare(`
    INSERT INTO grade_components (id,course_id,name,weight,earned_points,max_points)
    VALUES (?,?,?,?,?,?)
  `).run(id, req.params.id, name, weight, earned, max)
  const comp = db.prepare('SELECT * FROM grade_components WHERE id = ?').get(id)
  res.status(201).json(componentWithScore(comp))
})

router.put('/components/:id', (req, res) => {
  const db = getDb()
  const { name, weight, score } = req.body
  const updates = []; const params = []
  if (name !== undefined) { updates.push('name = ?'); params.push(name) }
  if (weight !== undefined) { updates.push('weight = ?'); params.push(weight) }
  if (score !== undefined) {
    if (score === null || score === '') {
      updates.push('earned_points = ?', 'max_points = ?')
      params.push(null, null)
    } else {
      updates.push('earned_points = ?', 'max_points = ?')
      params.push(parseFloat(score), 100)
    }
  }
  if (!updates.length) return res.json(db.prepare('SELECT * FROM grade_components WHERE id = ?').get(req.params.id))
  params.push(req.params.id)
  db.prepare(`UPDATE grade_components SET ${updates.join(', ')} WHERE id = ?`).run(...params)
  const comp = db.prepare('SELECT * FROM grade_components WHERE id = ?').get(req.params.id)
  res.json(componentWithScore(comp))
})

router.delete('/components/:id', (req, res) => {
  const db = getDb()
  db.prepare('DELETE FROM grade_components WHERE id = ?').run(req.params.id)
  res.json({ success: true })
})

router.get('/courses/:id/calculate', (req, res) => {
  const db = getDb()
  const components = db.prepare('SELECT * FROM grade_components WHERE course_id = ?').all(req.params.id)

  let earnedWeight = 0, totalGraded = 0, totalRemainingWeight = 0

  for (const c of components) {
    if (c.earned_points !== null && c.max_points !== null && c.max_points > 0) {
      earnedWeight += (c.earned_points / c.max_points) * c.weight
      totalGraded += c.weight
    } else {
      totalRemainingWeight += c.weight
    }
  }

  const currentGrade = totalGraded > 0 ? (earnedWeight / totalGraded) * 100 : null

  // needed[target] = score needed on remaining work
  const needed = {}
  for (const g of ['A','B+','B','B-','C']) {
    const targets = { 'A': 93, 'B+': 87, 'B': 83, 'B-': 80, 'C': 73 }
    const t = targets[g]
    if (totalRemainingWeight === 0) { needed[g] = null; continue }
    needed[g] = Math.round(((t / 100 * (totalGraded + totalRemainingWeight)) - earnedWeight) / totalRemainingWeight * 1000) / 10
  }

  res.json({
    currentGrade: currentGrade !== null ? Math.round(currentGrade * 10) / 10 : null,
    needed,
  })
})

export default router
