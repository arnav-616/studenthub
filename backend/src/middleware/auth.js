import jwt from 'jsonwebtoken'

if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable must be set in production (generate one with: openssl rand -hex 32)')
}

export const JWT_SECRET = process.env.JWT_SECRET || 'cramr-dev-secret-change-in-prod'
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
