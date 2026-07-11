import { createRequire } from 'module'
import { Router } from 'express'
import { v4 as uuid } from 'uuid'
import multer from 'multer'
import { getDb } from '../db/schema.js'
import { parseTranscript, parseTranscriptFromImage } from '../ai/claude.js'
const require = createRequire(import.meta.url)
const pdfParse = require('pdf-parse')

const router = Router()
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 15 * 1024 * 1024 } })

function pctToGradeInfo(pct) {
  if (pct >= 93) return { letter: 'A',  points: 4.0 }
  if (pct >= 90) return { letter: 'A-', points: 3.7 }
  if (pct >= 87) return { letter: 'B+', points: 3.3 }
  if (pct >= 83) return { letter: 'B',  points: 3.0 }
  if (pct >= 80) return { letter: 'B-', points: 2.7 }
  if (pct >= 77) return { letter: 'C+', points: 2.3 }
  if (pct >= 73) return { letter: 'C',  points: 2.0 }
  if (pct >= 70) return { letter: 'C-', points: 1.7 }
  if (pct >= 67) return { letter: 'D+', points: 1.3 }
  if (pct >= 60) return { letter: 'D',  points: 1.0 }
  return { letter: 'F', points: 0.0 }
}

function letterToPoints(letter) {
  const map = { 'A': 4.0, 'A-': 3.7, 'A+': 4.0, 'B+': 3.3, 'B': 3.0, 'B-': 2.7, 'C+': 2.3, 'C': 2.0, 'C-': 1.7, 'D+': 1.3, 'D': 1.0, 'D-': 0.7, 'F': 0.0 }
  return map[letter?.toUpperCase()] ?? null
}

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
  const { name, target_grade, credits, semester, drop_lowest } = req.body
  const updates = []; const params = []
  if (name !== undefined) { updates.push('name = ?'); params.push(name) }
  if (target_grade !== undefined) { updates.push('target_grade = ?'); params.push(target_grade) }
  try {
    if (credits !== undefined) { updates.push('credits = ?'); params.push(credits) }
    if (semester !== undefined) { updates.push('semester = ?'); params.push(semester) }
    if (drop_lowest !== undefined) { updates.push('drop_lowest = ?'); params.push(parseInt(drop_lowest) || 0) }
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
  const course = db.prepare('SELECT * FROM courses WHERE id = ?').get(req.params.id)
  const components = db.prepare('SELECT * FROM grade_components WHERE course_id = ?').all(req.params.id)
  const dropN = course?.drop_lowest || 0

  let scored = components.filter(c => c.earned_points !== null && c.max_points !== null && c.max_points > 0)
  const unscored = components.filter(c => c.earned_points === null || c.max_points === null || c.max_points === 0)

  // Drop lowest N scored items by percentage score
  if (dropN > 0 && scored.length > dropN) {
    scored = scored
      .map(c => ({ ...c, _pct: c.earned_points / c.max_points }))
      .sort((a, b) => a._pct - b._pct)
      .slice(dropN)
  }

  let earnedWeight = 0, totalGraded = 0
  for (const c of scored) {
    earnedWeight += (c.earned_points / c.max_points) * c.weight
    totalGraded += c.weight
  }

  const totalRemainingWeight = unscored.reduce((s, c) => s + c.weight, 0)
  const currentGrade = totalGraded > 0 ? (earnedWeight / totalGraded) * 100 : null

  const needed = {}
  for (const [g, t] of Object.entries({ 'A': 93, 'B+': 87, 'B': 83, 'B-': 80, 'C': 73 })) {
    if (totalRemainingWeight === 0) { needed[g] = null; continue }
    needed[g] = Math.round(((t / 100 * (totalGraded + totalRemainingWeight)) - earnedWeight) / totalRemainingWeight * 1000) / 10
  }

  res.json({
    currentGrade: currentGrade !== null ? Math.round(currentGrade * 10) / 10 : null,
    needed,
    droppedCount: Math.max(0, components.filter(c => c.earned_points !== null && c.max_points > 0).length - scored.length),
  })
})

router.get('/courses/:id/forgiveness', (req, res) => {
  const db = getDb()
  const components = db.prepare('SELECT * FROM grade_components WHERE course_id = ?').all(req.params.id)
  const scored = components.filter(c => c.earned_points !== null && c.max_points > 0)
  const unscored = components.filter(c => c.earned_points === null || !c.max_points)

  if (scored.length === 0) return res.json({ items: [] })

  // Current grade with all scored items
  const totalGraded = scored.reduce((s, c) => s + c.weight, 0)
  const earnedBase = scored.reduce((s, c) => s + (c.earned_points / c.max_points) * c.weight, 0)
  const currentGrade = totalGraded > 0 ? (earnedBase / totalGraded) * 100 : null

  // For each unscored item: what if you skip it (score 0) vs perfect (score 100)?
  const items = unscored.map(c => {
    const totalWithThis = totalGraded + c.weight
    const gradeIfZero = ((earnedBase + 0) / totalWithThis) * 100
    const gradeIfPerfect = ((earnedBase + c.weight) / totalWithThis) * 100
    const gradeIfAvg = ((earnedBase + c.weight * 0.75) / totalWithThis) * 100
    return {
      id: c.id,
      name: c.name,
      weight: c.weight,
      currentGrade: currentGrade ? Math.round(currentGrade * 10) / 10 : null,
      gradeIfZero: Math.round(gradeIfZero * 10) / 10,
      gradeIfPerfect: Math.round(gradeIfPerfect * 10) / 10,
      gradeIfAvg: Math.round(gradeIfAvg * 10) / 10,
      maxImpact: Math.round((gradeIfPerfect - gradeIfZero) * 10) / 10,
    }
  })

  items.sort((a, b) => b.maxImpact - a.maxImpact)
  res.json({ items, currentGrade: currentGrade ? Math.round(currentGrade * 10) / 10 : null })
})

// ── GPA summary ────────────────────────────────────────────────────────────────
router.get('/gpa', (req, res) => {
  const db = getDb()
  const courses = db.prepare('SELECT * FROM courses WHERE user_id = ?').all(req.userId)

  const enriched = courses.map(c => {
    // Try to compute grade from grade_components
    const comps = db.prepare('SELECT * FROM grade_components WHERE course_id = ?').all(c.id)
    const scored = comps.filter(x => x.earned_points !== null && x.max_points > 0)

    let currentGrade = null
    let gradeInfo = null

    if (scored.length > 0) {
      const totalWeight = scored.reduce((s, x) => s + x.weight, 0)
      const earned = scored.reduce((s, x) => s + (x.earned_points / x.max_points) * x.weight, 0)
      currentGrade = totalWeight > 0 ? Math.round((earned / totalWeight) * 1000) / 10 : null
      if (currentGrade !== null) gradeInfo = pctToGradeInfo(currentGrade)
    }

    // Fall back to stored current_gpa (set by transcript import)
    const gpaPoints = gradeInfo?.points ?? c.current_gpa ?? null
    const grade = gradeInfo?.letter ?? (c.current_gpa !== null ? Object.entries({ 'A': 4.0, 'A-': 3.7, 'B+': 3.3, 'B': 3.0, 'B-': 2.7, 'C+': 2.3, 'C': 2.0, 'C-': 1.7, 'D': 1.0, 'F': 0.0 }).find(([, v]) => Math.abs(v - c.current_gpa) < 0.05)?.[0] ?? null : null)

    return { ...c, currentGrade, gradePoints: gpaPoints, gpaPoints, grade }
  }).filter(c => c.gradePoints !== null)

  const totalCr = enriched.reduce((s, c) => s + (c.credits || 3), 0)
  const totalQP = enriched.reduce((s, c) => s + c.gradePoints * (c.credits || 3), 0)
  const gpa = totalCr > 0 ? Math.round((totalQP / totalCr) * 100) / 100 : null

  res.json({ gpa, totalCredits: totalCr, courses: enriched })
})

// ── Transcript import ──────────────────────────────────────────────────────────
router.post('/parse-transcript', upload.single('file'), async (req, res) => {
  try {
    const { file } = req
    if (!file) return res.status(400).json({ error: 'No file uploaded' })

    const isImage = file.mimetype.startsWith('image/')
    const isPDF = file.mimetype === 'application/pdf' || file.originalname?.endsWith('.pdf')

    let result
    if (isImage) {
      result = await parseTranscriptFromImage(file.buffer, file.mimetype)
    } else if (isPDF) {
      const parsed = await pdfParse(file.buffer)
      if (!parsed.text?.trim()) return res.status(400).json({ error: 'Could not extract text from PDF' })
      result = await parseTranscript(parsed.text)
    } else {
      const text = file.buffer.toString('utf-8')
      if (!text.trim()) return res.status(400).json({ error: 'File appears to be empty' })
      result = await parseTranscript(text)
    }

    if (!result?.courses?.length) return res.status(400).json({ error: 'No courses found in this file' })

    // Enrich gradePoints from letter if missing
    result.courses = result.courses.map(c => ({
      ...c,
      gradePoints: c.gradePoints ?? letterToPoints(c.grade),
    }))

    res.json(result)
  } catch (err) {
    console.error('Parse transcript error:', err)
    res.status(500).json({ error: err.message })
  }
})

export default router
