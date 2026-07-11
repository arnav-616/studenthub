import { Router } from 'express'
import { v4 as uuid } from 'uuid'
import { getDb } from '../db/schema.js'

const router = Router()

// Strip HTML tags from Canvas description
function stripHtml(html = '') {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 500)
}

function mapCanvasType(types = []) {
  if (types.includes('online_quiz')) return 'quiz'
  if (types.includes('discussion_topic')) return 'assignment'
  if (types.includes('online_text_entry')) return 'essay'
  return 'assignment'
}

// POST /api/canvas/sync  { canvas_url, canvas_token }
router.post('/sync', async (req, res) => {
  const { canvas_url, canvas_token } = req.body
  if (!canvas_url || !canvas_token) {
    return res.status(400).json({ error: 'canvas_url and canvas_token are required' })
  }

  const base = canvas_url.replace(/\/$/, '')
  const headers = { Authorization: `Bearer ${canvas_token}` }

  let coursesData
  try {
    const r = await fetch(`${base}/api/v1/courses?enrollment_state=active&per_page=50`, { headers })
    if (!r.ok) return res.status(400).json({ error: 'Invalid Canvas URL or token. Make sure your URL looks like https://school.instructure.com' })
    coursesData = await r.json()
  } catch {
    return res.status(400).json({ error: 'Could not reach Canvas. Check the URL.' })
  }

  const courses = Array.isArray(coursesData) ? coursesData : []
  const db = getDb()
  const uid = req.userId
  let imported = 0
  let skipped = 0
  const courseNames = []

  for (const course of courses) {
    if (!course.id || course.access_restricted_by_date || course.workflow_state === 'deleted') continue
    courseNames.push(course.name || course.course_code || `Course ${course.id}`)

    let assignments
    try {
      const r = await fetch(`${base}/api/v1/courses/${course.id}/assignments?per_page=100&order_by=due_at`, { headers })
      if (!r.ok) continue
      assignments = await r.json()
      if (!Array.isArray(assignments)) continue
    } catch { continue }

    for (const a of assignments) {
      if (!a.name) continue
      const canvasRef = `canvas:${a.id}`
      const exists = db.prepare('SELECT id FROM assignments WHERE user_id = ? AND url = ?').get(uid, canvasRef)
      if (exists) { skipped++; continue }

      const dueDate = a.due_at ? Math.floor(new Date(a.due_at).getTime() / 1000) : null
      const type = mapCanvasType(a.submission_types || [])
      const notes = a.description ? stripHtml(a.description) : null

      db.prepare(`
        INSERT INTO assignments (id, title, type, difficulty, due_date, notes, url, user_id)
        VALUES (?, ?, ?, 'medium', ?, ?, ?, ?)
      `).run(uuid(), a.name, type, dueDate, notes, canvasRef, uid)
      imported++
    }
  }

  res.json({ imported, skipped, courses: courseNames.length, courseNames: courseNames.slice(0, 10) })
})

// POST /api/canvas/sync-grades — fetch assignment scores from Canvas and create grade courses/components
router.post('/sync-grades', async (req, res) => {
  const { canvas_url, canvas_token } = req.body
  if (!canvas_url || !canvas_token) return res.status(400).json({ error: 'canvas_url and canvas_token required' })

  const base = canvas_url.replace(/\/$/, '')
  const headers = { Authorization: `Bearer ${canvas_token}` }

  let courses
  try {
    const r = await fetch(`${base}/api/v1/courses?enrollment_state=active&per_page=50`, { headers })
    if (!r.ok) return res.status(400).json({ error: 'Invalid Canvas URL or token' })
    courses = await r.json()
  } catch {
    return res.status(400).json({ error: 'Could not reach Canvas' })
  }

  if (!Array.isArray(courses)) return res.status(400).json({ error: 'Unexpected Canvas response' })

  const db = getDb()
  const uid = req.userId
  const { v4: uuidv4 } = await import('uuid')

  let created = 0
  let itemsCreated = 0

  for (const course of courses.slice(0, 20)) {
    if (!course.id || course.access_restricted_by_date) continue

    let assignments = []
    let submissions = []
    try {
      const [ar, sr] = await Promise.all([
        fetch(`${base}/api/v1/courses/${course.id}/assignments?per_page=100`, { headers }),
        fetch(`${base}/api/v1/courses/${course.id}/submissions?student_ids[]=self&per_page=100`, { headers }),
      ])
      if (ar.ok) assignments = await ar.json()
      if (sr.ok) submissions = await sr.json()
    } catch { continue }

    if (!Array.isArray(assignments) || assignments.length === 0) continue

    const submissionMap = {}
    if (Array.isArray(submissions)) {
      for (const s of submissions) submissionMap[s.assignment_id] = s
    }

    // Check if a grade course already exists for this Canvas course
    const courseName = course.name || `Course ${course.id}`
    let gradesCourse = db.prepare('SELECT * FROM courses WHERE name = ? AND user_id = ?').get(courseName, uid)
    if (!gradesCourse) {
      const cid = uuidv4()
      try { db.exec(`ALTER TABLE courses ADD COLUMN credits INTEGER DEFAULT 3`) } catch(_) {}
      try { db.exec(`ALTER TABLE courses ADD COLUMN semester TEXT`) } catch(_) {}
      db.prepare('INSERT INTO courses (id,name,user_id,target_grade) VALUES (?,?,?,?)').run(cid, courseName, uid, 90)
      try { db.prepare('UPDATE courses SET credits = 3 WHERE id = ?').run(cid) } catch(_) {}
      gradesCourse = db.prepare('SELECT * FROM courses WHERE id = ?').get(cid)
      created++
    }

    const courseId = gradesCourse.id
    // Remove old auto-synced components for this course
    db.prepare('DELETE FROM grade_components WHERE course_id = ? AND name LIKE ?').run(courseId, '% (Canvas)')

    const scoredAssignments = assignments.filter(a => {
      const sub = submissionMap[a.id]
      return sub && sub.score !== null && sub.score !== undefined && a.points_possible > 0
    })

    if (scoredAssignments.length === 0) continue

    // Group by assignment group (category) - canvas provides assignment_group_id
    // We'll fetch assignment groups for weights
    let groupWeights = {}
    try {
      const gr = await fetch(`${base}/api/v1/courses/${course.id}/assignment_groups`, { headers })
      if (gr.ok) {
        const groups = await gr.json()
        if (Array.isArray(groups)) {
          for (const g of groups) groupWeights[g.id] = { name: g.name, weight: g.group_weight || 0 }
        }
      }
    } catch(_) {}

    // Figure out per-item weights
    const hasGroupWeights = Object.values(groupWeights).some(g => g.weight > 0)

    // Group assignments by assignment_group_id
    const byGroup = {}
    for (const a of scoredAssignments) {
      const gid = a.assignment_group_id || 'default'
      if (!byGroup[gid]) byGroup[gid] = []
      byGroup[gid].push(a)
    }

    for (const [gid, items] of Object.entries(byGroup)) {
      const catWeight = hasGroupWeights ? (groupWeights[gid]?.weight || 0) : (100 / Object.keys(byGroup).length)
      const perItemWeight = Math.round((catWeight / items.length) * 10) / 10

      for (const a of items) {
        const sub = submissionMap[a.id]
        const earned = parseFloat(sub.score)
        const max = parseFloat(a.points_possible)
        const compId = uuidv4()
        db.prepare(`INSERT INTO grade_components (id,course_id,name,weight,earned_points,max_points)
          VALUES (?,?,?,?,?,?)`).run(compId, courseId, `${a.name} (Canvas)`, perItemWeight, earned, max)
        itemsCreated++
      }
    }
  }

  res.json({ created, itemsCreated, message: `Synced ${created} new courses, ${itemsCreated} grade items` })
})

export default router
