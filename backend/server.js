import express from 'express'
import cors from 'cors'
import morgan from 'morgan'
import dotenv from 'dotenv'
import { getDb } from './src/db/schema.js'

dotenv.config()

import assignmentsRouter from './src/routes/assignments.js'
import subjectsRouter from './src/routes/subjects.js'
import dashboardRouter from './src/routes/dashboard.js'
import timerRouter from './src/routes/timer.js'
import gradesRouter from './src/routes/grades.js'
import settingsRouter from './src/routes/settings.js'
import aiRouter from './src/routes/ai.js'

const app = express()
const PORT = process.env.PORT || 3001

app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173' }))
app.use(express.json())
app.use(morgan('dev'))

// Init DB on startup
getDb()

app.use('/api/assignments', assignmentsRouter)
app.use('/api/subjects', subjectsRouter)
app.use('/api/dashboard', dashboardRouter)
app.use('/api/timer', timerRouter)
app.use('/api/grades', gradesRouter)
app.use('/api/settings', settingsRouter)
app.use('/api/ai', aiRouter)

app.get('/api/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }))

app.use((err, req, res, next) => {
  console.error(err.stack)
  res.status(500).json({ error: 'Internal server error' })
})

app.listen(PORT, () => {
  console.log(`StudentHub backend running on port ${PORT}`)
})
