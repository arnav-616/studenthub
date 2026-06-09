import 'dotenv/config' // Must be first — ESM hoists all imports before body runs
import express from 'express'
import cors from 'cors'
import morgan from 'morgan'
import { getDb } from './src/db/schema.js'
import { authMiddleware } from './src/middleware/auth.js'
import authRouter from './src/routes/auth.js'
import assignmentsRouter from './src/routes/assignments.js'
import subjectsRouter from './src/routes/subjects.js'
import dashboardRouter from './src/routes/dashboard.js'
import timerRouter from './src/routes/timer.js'
import gradesRouter from './src/routes/grades.js'
import settingsRouter from './src/routes/settings.js'
import aiRouter from './src/routes/ai.js'
import analyticsRouter from './src/routes/analytics.js'

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

// Public routes
app.use('/api/auth', authRouter)
app.get('/api/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }))

// All data routes require auth
app.use('/api/assignments', authMiddleware, assignmentsRouter)
app.use('/api/subjects', authMiddleware, subjectsRouter)
app.use('/api/dashboard', authMiddleware, dashboardRouter)
app.use('/api/timer', authMiddleware, timerRouter)
app.use('/api/grades', authMiddleware, gradesRouter)
app.use('/api/settings', authMiddleware, settingsRouter)
app.use('/api/ai', authMiddleware, aiRouter)
app.use('/api/analytics', authMiddleware, analyticsRouter)

app.get('/api/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }))

app.use((err, req, res, next) => {
  console.error(err.stack)
  res.status(500).json({ error: 'Internal server error' })
})

app.listen(PORT, () => {
  console.log(`StudentHub backend running on port ${PORT}`)
})
