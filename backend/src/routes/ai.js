import { Router } from 'express'
import { getDb } from '../db/schema.js'
import { calculateBusyScore } from '../utils/busyScore.js'
import {
  generateStudyPlan,
  parseNaturalLanguageAssignment,
  getAssignmentInsights,
  generateWeeklyDebrief,
  parseSyllabus,
  redistributeWorkload,
} from '../ai/claude.js'

const router = Router()

function getUserSettings(db, userId) {
  const defaults = Object.fromEntries(
    db.prepare('SELECT key, value FROM settings WHERE user_id IS NULL').all().map(r => [r.key, r.value])
  )
  const user = Object.fromEntries(
    db.prepare('SELECT key, value FROM user_settings WHERE user_id = ?').all(userId).map(r => [r.key, r.value])
  )
  return { ...defaults, ...user }
}

router.post('/study-plan', async (req, res) => {
  try {
    const db = getDb()
    const uid = req.userId
    const assignments = db.prepare(`
      SELECT a.*, s.name as subject_name FROM assignments a
      LEFT JOIN subjects s ON a.subject_id = s.id
      WHERE a.status != 'completed' AND a.user_id = ?
    `).all(uid)
    const settings = getUserSettings(db, uid)
    const plan = await generateStudyPlan(assignments, settings)
    res.json(plan)
  } catch (err) {
    console.error('Study plan error:', err)
    res.status(500).json({ error: err.message })
  }
})

router.post('/parse-assignment', async (req, res) => {
  try {
    const { input } = req.body
    if (!input) return res.status(400).json({ error: 'Input required' })
    const db = getDb()
    const subjects = db.prepare('SELECT id, name FROM subjects WHERE user_id = ?').all(req.userId)
    const parsed = await parseNaturalLanguageAssignment(input, subjects)

    if (parsed.due_date && typeof parsed.due_date === 'string' && parsed.due_date !== 'null') {
      const ts = Math.floor(new Date(parsed.due_date + 'T12:00:00').getTime() / 1000)
      parsed.due_date = isNaN(ts) ? null : ts
    } else {
      parsed.due_date = null
    }
    if (parsed.difficulty) parsed.difficulty = parsed.difficulty.toLowerCase()

    const typeMap = {
      'problem set': 'problem_set', 'lab report': 'lab', 'lab': 'lab',
      'essay': 'essay', 'exam': 'exam', 'quiz': 'quiz',
      'project': 'project', 'reading': 'reading', 'presentation': 'assignment',
    }
    if (parsed.type) {
      const t = parsed.type.toLowerCase().replace(/-/g, '_')
      parsed.type = typeMap[t] || (
        ['assignment','exam','essay','problem_set','reading','project','quiz','lab'].includes(t) ? t : 'assignment'
      )
    }
    if (parsed.sessions_total !== undefined) parsed.sessions_total = parsed.sessions_total ? parseInt(parsed.sessions_total, 10) : null
    if (parsed.session_duration_mins !== undefined) parsed.session_duration_mins = parsed.session_duration_mins ? parseInt(parsed.session_duration_mins, 10) : null

    res.json(parsed)
  } catch (err) {
    console.error('Parse assignment error:', err)
    res.status(500).json({ error: err.message })
  }
})

router.post('/assignment-insights/:id', async (req, res) => {
  try {
    const db = getDb()
    const uid = req.userId
    const assignment = db.prepare(`
      SELECT a.*, s.name as subject_name FROM assignments a
      LEFT JOIN subjects s ON a.subject_id = s.id WHERE a.id = ? AND a.user_id = ?
    `).get(req.params.id, uid)
    if (!assignment) return res.status(404).json({ error: 'Not found' })
    const allAssignments = db.prepare('SELECT * FROM assignments WHERE status != ? AND user_id = ?').all('completed', uid)
    const settings = getUserSettings(db, uid)
    const workload = calculateBusyScore(allAssignments, settings.work_style ?? 'on_time')
    const insights = await getAssignmentInsights(assignment, workload)
    res.json(insights)
  } catch (err) {
    console.error('Assignment insights error:', err)
    res.status(500).json({ error: err.message })
  }
})

router.get('/weekly-debrief', async (req, res) => {
  try {
    const db = getDb()
    const uid = req.userId
    const now = Math.floor(Date.now() / 1000)
    const assignments = db.prepare('SELECT * FROM assignments WHERE status != ? AND user_id = ?').all('completed', uid)
    const settings = getUserSettings(db, uid)
    const { score, band, breakdown, totalAssignments } = calculateBusyScore(assignments, settings.work_style ?? 'on_time')
    const overdue = db.prepare('SELECT COUNT(*) as count FROM assignments WHERE status != ? AND due_date < ? AND due_date IS NOT NULL AND user_id = ?').get('completed', now, uid)
    const completedThisWeek = db.prepare('SELECT COUNT(*) as count FROM assignments WHERE status = ? AND completed_at >= ? AND user_id = ?').get('completed', now - 7 * 86400, uid)
    const debrief = await generateWeeklyDebrief({
      busyScore: { score, band, breakdown, totalAssignments },
      stats: { overdue: overdue.count, completedThisWeek: completedThisWeek.count, streak: 0 },
    })
    res.json(debrief)
  } catch (err) {
    console.error('Weekly debrief error:', err)
    res.status(500).json({ error: err.message })
  }
})

router.post('/parse-syllabus', async (req, res) => {
  try {
    const { text } = req.body
    if (!text || text.trim().length < 50) return res.status(400).json({ error: 'Syllabus text too short' })
    const db = getDb()
    const subjects = db.prepare('SELECT id, name FROM subjects WHERE user_id = ?').all(req.userId)
    const result = await parseSyllabus(text, subjects)
    const typeValid = ['assignment','exam','essay','problem_set','reading','project','quiz','lab']
    const normalized = (result.assignments || []).map(parsed => {
      if (parsed.due_date && typeof parsed.due_date === 'string' && parsed.due_date !== 'null') {
        const ts = Math.floor(new Date(parsed.due_date + 'T12:00:00').getTime() / 1000)
        parsed.due_date = isNaN(ts) ? null : ts
      } else { parsed.due_date = null }
      if (parsed.difficulty) parsed.difficulty = parsed.difficulty.toLowerCase()
      if (parsed.type) {
        const t = parsed.type.toLowerCase().replace(/-/g, '_').replace(/ /g, '_')
        parsed.type = typeValid.includes(t) ? t : 'assignment'
      }
      return parsed
    })
    res.json({ assignments: normalized, courseName: result.courseName, totalFound: normalized.length })
  } catch (err) {
    console.error('Syllabus parse error:', err)
    res.status(500).json({ error: err.message })
  }
})

router.post('/redistribute', async (req, res) => {
  try {
    const db = getDb()
    const uid = req.userId
    const assignments = db.prepare(`
      SELECT a.*, s.name as subject_name FROM assignments a
      LEFT JOIN subjects s ON a.subject_id = s.id
      WHERE a.status != 'completed' AND a.user_id = ?
    `).all(uid)
    const settings = getUserSettings(db, uid)
    const plan = await redistributeWorkload(assignments, parseFloat(settings.daily_study_hours || '6'))
    res.json(plan)
  } catch (err) {
    console.error('Redistribute error:', err)
    res.status(500).json({ error: err.message })
  }
})

export default router
