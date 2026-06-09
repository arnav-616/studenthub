import { Router } from 'express'
import { getDb } from '../db/schema.js'
import { calculateBusyScore } from '../utils/busyScore.js'
import {
  generateStudyPlan,
  parseNaturalLanguageAssignment,
  getAssignmentInsights,
  generateWeeklyDebrief,
} from '../ai/claude.js'

const router = Router()

router.post('/study-plan', async (req, res) => {
  try {
    const db = getDb()
    const assignments = db.prepare(`
      SELECT a.*, s.name as subject_name FROM assignments a
      LEFT JOIN subjects s ON a.subject_id = s.id
      WHERE a.status != 'completed'
    `).all()
    const settings = Object.fromEntries(
      db.prepare('SELECT key, value FROM settings').all().map(r => [r.key, r.value])
    )
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
    const subjects = db.prepare('SELECT id, name FROM subjects').all()
    const parsed = await parseNaturalLanguageAssignment(input, subjects)

    // Convert due_date string (YYYY-MM-DD) → unix timestamp so it matches the DB schema
    if (parsed.due_date && typeof parsed.due_date === 'string' && parsed.due_date !== 'null') {
      const ts = Math.floor(new Date(parsed.due_date + 'T12:00:00').getTime() / 1000)
      parsed.due_date = isNaN(ts) ? null : ts
    } else {
      parsed.due_date = null
    }

    // Ensure difficulty is lowercase to match DB CHECK constraint
    if (parsed.difficulty) {
      parsed.difficulty = parsed.difficulty.toLowerCase()
    }

    // Ensure type is snake_case lowercase to match DB CHECK constraint
    const typeMap = {
      'problem set': 'problem_set',
      'lab report': 'lab_report',
      'lab': 'lab',
      'essay': 'essay',
      'exam': 'exam',
      'quiz': 'quiz',
      'project': 'project',
      'reading': 'reading',
      'presentation': 'assignment',
    }
    if (parsed.type) {
      const t = parsed.type.toLowerCase().replace(/-/g, '_')
      parsed.type = typeMap[t] || (
        ['assignment','exam','essay','problem_set','reading','project','quiz','lab'].includes(t) ? t : 'assignment'
      )
    }

    // Sanitize session fields
    if (parsed.sessions_total !== undefined) {
      parsed.sessions_total = parsed.sessions_total ? parseInt(parsed.sessions_total, 10) : null
    }
    if (parsed.session_duration_mins !== undefined) {
      parsed.session_duration_mins = parsed.session_duration_mins ? parseInt(parsed.session_duration_mins, 10) : null
    }

    res.json(parsed)
  } catch (err) {
    console.error('Parse assignment error:', err)
    res.status(500).json({ error: err.message })
  }
})

router.post('/assignment-insights/:id', async (req, res) => {
  try {
    const db = getDb()
    const assignment = db.prepare(`
      SELECT a.*, s.name as subject_name FROM assignments a
      LEFT JOIN subjects s ON a.subject_id = s.id WHERE a.id = ?
    `).get(req.params.id)
    if (!assignment) return res.status(404).json({ error: 'Not found' })
    const allAssignments = db.prepare('SELECT * FROM assignments WHERE status != ?').all('completed')
    const workStyle = db.prepare("SELECT value FROM settings WHERE key='work_style'").get()?.value ?? 'on_time'
    const workload = calculateBusyScore(allAssignments, workStyle)
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
    const now = Math.floor(Date.now() / 1000)
    const assignments = db.prepare('SELECT * FROM assignments WHERE status != ?').all('completed')
    const workStyle = db.prepare("SELECT value FROM settings WHERE key='work_style'").get()?.value ?? 'on_time'
    const { score, band, breakdown, totalAssignments } = calculateBusyScore(assignments, workStyle)
    const overdue = db.prepare('SELECT COUNT(*) as count FROM assignments WHERE status != ? AND due_date < ? AND due_date IS NOT NULL').get('completed', now)
    const completedThisWeek = db.prepare('SELECT COUNT(*) as count FROM assignments WHERE status = ? AND completed_at >= ?').get('completed', now - 7 * 86400)

    const dashboardData = {
      busyScore: { score, band, breakdown, totalAssignments },
      stats: { overdue: overdue.count, completedThisWeek: completedThisWeek.count, streak: 0 },
    }
    const debrief = await generateWeeklyDebrief(dashboardData)
    res.json(debrief)
  } catch (err) {
    console.error('Weekly debrief error:', err)
    res.status(500).json({ error: err.message })
  }
})

export default router
