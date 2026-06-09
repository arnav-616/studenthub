import { Router } from 'express'
import { v4 as uuid } from 'uuid'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { getDb } from '../db/schema.js'
import { JWT_SECRET, JWT_EXPIRES, authMiddleware } from '../middleware/auth.js'

const router = Router()

router.post('/signup', async (req, res) => {
  const { email, password, name } = req.body
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' })
  if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' })

  const db = getDb()
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase().trim())
  if (existing) return res.status(409).json({ error: 'An account with this email already exists' })

  const passwordHash = await bcrypt.hash(password, 10)
  const userId = uuid()
  db.prepare('INSERT INTO users (id, email, password_hash, name) VALUES (?,?,?,?)')
    .run(userId, email.toLowerCase().trim(), passwordHash, name?.trim() || '')

  // Claim any existing un-owned data (first user signup migration)
  db.prepare("UPDATE subjects SET user_id = ? WHERE user_id IS NULL").run(userId)
  db.prepare("UPDATE assignments SET user_id = ? WHERE user_id IS NULL").run(userId)
  db.prepare("UPDATE courses SET user_id = ? WHERE user_id IS NULL").run(userId)
  db.prepare("UPDATE timer_sessions SET user_id = ? WHERE user_id IS NULL").run(userId)

  const token = jwt.sign({ userId, name: name?.trim() || '', email: email.toLowerCase().trim() }, JWT_SECRET, { expiresIn: JWT_EXPIRES })
  res.status(201).json({ token, user: { id: userId, email: email.toLowerCase().trim(), name: name?.trim() || '' } })
})

router.post('/login', async (req, res) => {
  const { email, password } = req.body
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' })

  const db = getDb()
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase().trim())
  if (!user) return res.status(401).json({ error: 'Invalid email or password' })

  const valid = await bcrypt.compare(password, user.password_hash)
  if (!valid) return res.status(401).json({ error: 'Invalid email or password' })

  const token = jwt.sign({ userId: user.id, name: user.name, email: user.email }, JWT_SECRET, { expiresIn: JWT_EXPIRES })
  res.json({ token, user: { id: user.id, email: user.email, name: user.name } })
})

router.get('/me', authMiddleware, (req, res) => {
  const db = getDb()
  const user = db.prepare('SELECT id, email, name, created_at FROM users WHERE id = ?').get(req.userId)
  if (!user) return res.status(404).json({ error: 'User not found' })
  res.json(user)
})

export default router
