import 'dotenv/config' // Must be first — ESM hoists all imports before body runs
import express from 'express'
import cors from 'cors'
import morgan from 'morgan'
import rateLimit from 'express-rate-limit'
import { getDb } from './src/db/schema.js'
import jwt from 'jsonwebtoken'
import { authMiddleware, JWT_SECRET } from './src/middleware/auth.js'
import authRouter from './src/routes/auth.js'
import assignmentsRouter from './src/routes/assignments.js'
import subjectsRouter from './src/routes/subjects.js'
import dashboardRouter from './src/routes/dashboard.js'
import timerRouter from './src/routes/timer.js'
import gradesRouter from './src/routes/grades.js'
import settingsRouter from './src/routes/settings.js'
import aiRouter from './src/routes/ai.js'
import analyticsRouter from './src/routes/analytics.js'
import canvasRouter from './src/routes/canvas.js'
import studyToolsRouter from './src/routes/studyTools.js'
import studySessionsRouter from './src/routes/studySessions.js'
import extracurricularsRouter from './src/routes/extracurriculars.js'
import applicationsRouter from './src/routes/applications.js'

const app = express()
const PORT = process.env.PORT || 3001

app.use(cors({ origin: [
  process.env.FRONTEND_URL || 'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
] }))
app.use(express.json())
app.use(morgan('dev'))

// Init DB on startup
getDb()

// Rate limiting — auth endpoints only
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many attempts, please try again later.' },
})

// Rate limiting — routes that call external AI APIs (Gemini) or third-party services (Canvas)
const aiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many AI requests, please try again later.' },
})

// Public routes
app.use('/api/auth', authLimiter, authRouter)
app.get('/api/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }))

// File download routes — also accept JWT via ?token= for direct browser navigation
function downloadAuth(req, res, next) {
  const token = req.query.token || req.headers.authorization?.replace('Bearer ', '')
  if (!token) return res.status(401).json({ error: 'Unauthorized' })
  try {
    const payload = jwt.verify(token, JWT_SECRET)
    req.userId = payload.userId
    next()
  } catch {
    res.status(401).json({ error: 'Invalid token' })
  }
}
app.get('/api/assignments/export.ics', downloadAuth, (req, res, next) => { req.url = '/export.ics'; assignmentsRouter(req, res, next) })
app.get('/api/assignments/export.csv', downloadAuth, (req, res, next) => { req.url = '/export.csv'; assignmentsRouter(req, res, next) })

// All data routes require auth
app.use('/api/assignments', authMiddleware, assignmentsRouter)
app.use('/api/subjects', authMiddleware, subjectsRouter)
app.use('/api/dashboard', authMiddleware, dashboardRouter)
app.use('/api/timer', authMiddleware, timerRouter)
app.use('/api/grades', authMiddleware, gradesRouter)
app.use('/api/settings', authMiddleware, settingsRouter)
app.use('/api/ai', authMiddleware, aiLimiter, aiRouter)
app.use('/api/analytics', authMiddleware, analyticsRouter)
app.use('/api/canvas', authMiddleware, aiLimiter, canvasRouter)
app.use('/api/study-tools', authMiddleware, aiLimiter, studyToolsRouter)
app.use('/api/study-sessions', authMiddleware, studySessionsRouter)
app.use('/api/extracurriculars', authMiddleware, extracurricularsRouter)
app.use('/api/applications', authMiddleware, applicationsRouter)

app.get('/api/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }))

// Public share endpoint — no auth, token-gated
app.get('/api/share/:token', (req, res) => {
  const db = getDb()
  const row = db.prepare("SELECT user_id FROM user_settings WHERE key='share_token' AND value=?").get(req.params.token)
  if (!row) return res.status(404).json({ error: 'Share link not found or revoked' })
  const assignments = db.prepare(`
    SELECT a.title, a.type, a.difficulty, a.status, a.due_date, a.estimated_hours, a.notes, a.tags,
           s.name as subject_name, s.color as subject_color
    FROM assignments a
    LEFT JOIN subjects s ON a.subject_id = s.id
    WHERE a.user_id = ? AND a.status != 'completed'
    ORDER BY a.due_date ASC
    LIMIT 100
  `).all(row.user_id)
  res.json({ assignments })
})

app.use((err, req, res, next) => {
  console.error(err.stack)
  res.status(500).json({ error: 'Internal server error' })
})

app.listen(PORT, () => {
  console.log(`Cramr backend running on port ${PORT}`)
})
