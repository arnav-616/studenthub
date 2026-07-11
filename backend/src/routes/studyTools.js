import { Router } from 'express'
import { createRequire } from 'module'
import multer from 'multer'
import { YoutubeTranscript } from 'youtube-transcript'
const require = createRequire(import.meta.url)
const pdfParse = require('pdf-parse')
import { generateNotes, generateStudyGuide, generateFlashcards, generateFollowUp } from '../ai/claude.js'

const router = Router()
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_, file, cb) => {
    const ok = ['application/pdf', 'text/plain', 'text/vtt', 'text/markdown', 'application/octet-stream']
    cb(null, ok.includes(file.mimetype) || file.originalname.match(/\.(txt|vtt|srt|md)$/i))
  },
})

const MAX_CHARS = 15000
const MAX_CHARS_PER_SOURCE = 8000

// ── Extract text from a single uploaded file ───────────────────────────────────
async function fileToText(file) {
  if (file.mimetype === 'application/pdf' || file.originalname?.endsWith('.pdf')) {
    const parsed = await pdfParse(file.buffer)
    return parsed.text
  }
  return file.buffer.toString('utf-8')
}

// ── YouTube transcript ─────────────────────────────────────────────────────────
function extractVideoId(url) {
  for (const p of [/[?&]v=([^&#]+)/, /youtu\.be\/([^?&#]+)/, /embed\/([^?&#]+)/, /shorts\/([^?&#]+)/]) {
    const m = url.match(p)
    if (m) return m[1]
  }
  return null
}

// ── Routes ─────────────────────────────────────────────────────────────────────

router.post('/youtube', async (req, res) => {
  try {
    const { url } = req.body
    if (!url) return res.status(400).json({ error: 'URL required' })
    const videoId = extractVideoId(url)
    if (!videoId) return res.status(400).json({ error: 'Invalid YouTube URL' })

    const segments = await YoutubeTranscript.fetchTranscript(videoId, { lang: 'en' })
    if (!segments?.length) throw new Error('No transcript available for this video. Try a video with captions/subtitles enabled.')

    const text = segments.map(s => s.text).join(' ').replace(/\s+/g, ' ').trim()

    // Get video title from the page
    let title = ''
    try {
      const pageRes = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
        headers: { 'User-Agent': 'Mozilla/5.0', 'Accept-Language': 'en-US,en;q=0.9' },
      })
      const html = await pageRes.text()
      const m = html.match(/<title>([^<]+)<\/title>/)
      if (m) title = m[1].replace(' - YouTube', '').trim()
    } catch {}

    res.json({ text, title, videoId, chars: text.length })
  } catch (err) {
    console.error('YouTube transcript error:', err.message)
    res.status(500).json({ error: err.message })
  }
})

// Accepts up to 3 sources via multipart: source0, source1, source2 (files) or text0, text1, text2 (strings)
const multiUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
}).fields([
  { name: 'file0', maxCount: 1 },
  { name: 'file1', maxCount: 1 },
  { name: 'file2', maxCount: 1 },
])

router.post('/generate', multiUpload, async (req, res) => {
  try {
    const { mode = 'notes', title = '' } = req.body
    const files = req.files || {}
    const sources = []

    for (let i = 0; i < 3; i++) {
      const fileArr = files[`file${i}`]
      const textField = req.body[`text${i}`]
      if (fileArr?.length) {
        const t = await fileToText(fileArr[0])
        if (t?.trim()) sources.push(t.trim())
      } else if (textField?.trim()) {
        sources.push(textField.trim())
      }
    }

    // Legacy single-source support
    if (!sources.length) {
      const legacyText = req.body.text?.trim()
      if (legacyText) sources.push(legacyText)
    }

    if (!sources.length) return res.status(400).json({ error: 'No content provided.' })

    // Combine sources, truncating each proportionally
    const combined = sources.length === 1
      ? sources[0].slice(0, MAX_CHARS)
      : sources.map((s, i) => `[Source ${i + 1}]\n${s.slice(0, MAX_CHARS_PER_SOURCE)}`).join('\n\n---\n\n')

    const text = combined.length > MAX_CHARS
      ? combined.slice(0, MAX_CHARS) + '\n\n[truncated]'
      : combined

    if (text.length < 50) return res.status(400).json({ error: 'Content too short.' })

    let result
    if (mode === 'flashcards') result = await generateFlashcards(text, title)
    else if (mode === 'study_guide') result = await generateStudyGuide(text, title)
    else result = await generateNotes(text, title)

    res.json(result)
  } catch (err) {
    console.error('Study tools error:', err)
    res.status(500).json({ error: err.message })
  }
})

router.post('/followup', async (req, res) => {
  try {
    const { question, originalContent, mode, history = [] } = req.body
    if (!question?.trim()) return res.status(400).json({ error: 'Question required' })
    const result = await generateFollowUp(question, originalContent, mode, history)
    res.json({ answer: result.answer })
  } catch (err) {
    console.error('Follow-up error:', err)
    res.status(500).json({ error: err.message })
  }
})

export default router
