import jwt from 'jsonwebtoken'

export const JWT_SECRET = process.env.JWT_SECRET || 'studenthub-dev-secret-change-in-prod'
export const JWT_EXPIRES = '30d'

export function authMiddleware(req, res, next) {
  const auth = req.headers.authorization
  if (!auth?.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' })
  try {
    const payload = jwt.verify(auth.slice(7), JWT_SECRET)
    req.userId = payload.userId
    req.userName = payload.name
    next()
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' })
  }
}
