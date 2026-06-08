import { Router } from 'express'
import { v4 as uuid } from 'uuid'
import { getDb } from '../db/schema.js'

const router = Router()

router.get('/courses', (req, res) => {
  const db = getDb()
  const courses = db.prepare(`
    SELECT c.*, s.name as subject_name, s.color as subject_color,
      (SELECT COUNT(*) FROM grade_components gc WHERE gc.course_id = c.id) as component_count
    FROM courses c LEFT JOIN subjects s ON c.subject_id = s.id
    ORDER BY c.name
  `).all()
  res.json(courses)
})

router.post('/courses', (req, res) => {
  const db = getDb()
  const id = uuid()
  const { subject_id, name, target_grade = 90 } = req.body
  db.prepare('INSERT INTO courses (id,subject_id,name,target_grade) VALUES (?,?,?,?)').run(id, subject_id || null, name, target_grade)
  res.status(201).json(db.prepare('SELECT * FROM courses WHERE id = ?').get(id))
})

router.put('/courses/:id', (req, res) => {
  const db = getDb()
  const { name, target_grade } = req.body
  const updates = []; const params = []
  if (name !== undefined) { updates.push('name = ?'); params.push(name) }
  if (target_grade !== undefined) { updates.push('target_grade = ?'); params.push(target_grade) }
  params.push(req.params.id)
  db.prepare(`UPDATE courses SET ${updates.join(', ')} WHERE id = ?`).run(...params)
  res.json(db.prepare('SELECT * FROM courses WHERE id = ?').get(req.params.id))
})

router.delete('/courses/:id', (req, res) => {
  const db = getDb()
  db.prepare('DELETE FROM courses WHERE id = ?').run(req.params.id)
  res.json({ success: true })
})

router.get('/courses/:id/components', (req, res) => {
  const db = getDb()
  res.json(db.prepare('SELECT * FROM grade_components WHERE course_id = ? ORDER BY created_at').all(req.params.id))
})

router.post('/courses/:id/components', (req, res) => {
  const db = getDb()
  const id = uuid()
  const { name, weight, earned_points, max_points, assignment_id } = req.body
  db.prepare(`
    INSERT INTO grade_components (id,course_id,name,weight,earned_points,max_points,assignment_id)
    VALUES (?,?,?,?,?,?,?)
  `).run(id, req.params.id, name, weight, earned_points ?? null, max_points ?? null, assignment_id || null)
  res.status(201).json(db.prepare('SELECT * FROM grade_components WHERE id = ?').get(id))
})

router.put('/components/:id', (req, res) => {
  const db = getDb()
  const { name, weight, earned_points, max_points } = req.body
  const updates = []; const params = []
  if (name !== undefined) { updates.push('name = ?'); params.push(name) }
  if (weight !== undefined) { updates.push('weight = ?'); params.push(weight) }
  if (earned_points !== undefined) { updates.push('earned_points = ?'); params.push(earned_points) }
  if (max_points !== undefined) { updates.push('max_points = ?'); params.push(max_points) }
  params.push(req.params.id)
  db.prepare(`UPDATE grade_components SET ${updates.join(', ')} WHERE id = ?`).run(...params)
  res.json(db.prepare('SELECT * FROM grade_components WHERE id = ?').get(req.params.id))
})

router.delete('/components/:id', (req, res) => {
  const db = getDb()
  db.prepare('DELETE FROM grade_components WHERE id = ?').run(req.params.id)
  res.json({ success: true })
})

// Calculate current grade + what's needed
router.get('/courses/:id/calculate', (req, res) => {
  const db = getDb()
  const components = db.prepare('SELECT * FROM grade_components WHERE course_id = ?').all(req.params.id)
  const course = db.prepare('SELECT * FROM courses WHERE id = ?').get(req.params.id)

  let earnedWeight = 0
  let totalGraded = 0
  let totalRemainingWeight = 0

  for (const c of components) {
    if (c.earned_points !== null && c.max_points !== null && c.max_points > 0) {
      earnedWeight += (c.earned_points / c.max_points) * c.weight
      totalGraded += c.weight
    } else {
      totalRemainingWeight += c.weight
    }
  }

  const currentGrade = totalGraded > 0 ? (earnedWeight / totalGraded) * 100 : null
  const targets = [90, 85, 80, 75, 70]
  const needed = targets.map(target => {
    if (totalRemainingWeight === 0) return { target, needed: null }
    const needed = ((target / 100 * (totalGraded + totalRemainingWeight)) - earnedWeight) / totalRemainingWeight * 100
    return { target, needed: Math.round(needed * 10) / 10 }
  })

  res.json({
    currentGrade: currentGrade !== null ? Math.round(currentGrade * 10) / 10 : null,
    earnedWeight: Math.round(earnedWeight * 10) / 10,
    totalGraded: Math.round(totalGraded * 10) / 10,
    totalRemainingWeight: Math.round(totalRemainingWeight * 10) / 10,
    neededForGrades: needed,
    targetGrade: course?.target_grade,
  })
})

export default router
