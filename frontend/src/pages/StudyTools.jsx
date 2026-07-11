import { useState, useRef, useEffect, useMemo } from 'react'
import katex from 'katex'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import {
  DocumentTextIcon, BookOpenIcon, RectangleStackIcon,
  CloudArrowUpIcon, SparklesIcon, ClipboardDocumentIcon,
  ChevronDownIcon, XMarkIcon, DocumentArrowUpIcon,
  ClockIcon, TrashIcon, LinkIcon, PlusIcon,
  PaperAirplaneIcon, ArrowDownTrayIcon, PrinterIcon,
  CheckCircleIcon, PlayIcon, PencilSquareIcon,
} from '@heroicons/react/24/outline'
import { studyToolsApi, studySessionsApi, assignments as assignmentsApi, ai as aiApi } from '../api/client'
import { cn } from '../utils/cn'

// ── Constants ──────────────────────────────────────────────────────────────────
const ACCEPTED = '.txt,.vtt,.srt,.md,.pdf'
const MODES = [
  { value: 'notes',       label: 'Quick Notes',    icon: DocumentTextIcon,   desc: 'Key points by topic',    color: '#6366f1', bg: 'rgba(99,102,241,0.1)',  border: 'rgba(99,102,241,0.25)' },
  { value: 'study_guide', label: 'Study Guide',    icon: BookOpenIcon,       desc: 'Deep dive + exam prep',  color: '#10b981', bg: 'rgba(16,185,129,0.1)',  border: 'rgba(16,185,129,0.25)' },
  { value: 'flashcards',  label: 'Flashcards',     icon: RectangleStackIcon, desc: '15–25 recall cards',     color: '#f59e0b', bg: 'rgba(245,158,11,0.1)',  border: 'rgba(245,158,11,0.25)' },
  { value: 'writing',     label: 'Writing Review', icon: PencilSquareIcon,   desc: 'AI essay feedback',      color: '#ec4899', bg: 'rgba(236,72,153,0.1)',  border: 'rgba(236,72,153,0.25)' },
]

// ── Strip markdown artifacts from AI output ────────────────────────────────────
function md(str = '') {
  return str
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*\n]+)\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/_([^_\n]+)_/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^[-*•]\s+/gm, '')
    .replace(/^\d+\.\s+/gm, '')
    .trim()
}

// ── Helpers ────────────────────────────────────────────────────────────────────
function FadeIn({ children, delay = 0 }) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: [0.25, 0.46, 0.45, 0.94], delay }}>
      {children}
    </motion.div>
  )
}

function Divider() {
  return <div style={{ height: '1px', background: 'var(--c-border-subtle)', margin: '1.75rem 0' }} />
}

function formatDate(ts) {
  const d = new Date(ts * 1000)
  const now = new Date()
  const diffDays = Math.floor((now - d) / 86400000)
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays}d ago`
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// ── Source input block ─────────────────────────────────────────────────────────
function SourceBlock({ index, source, onChange, onRemove, canRemove, fileRef }) {
  const [dragOver, setDragOver] = useState(false)
  const localRef = useRef()
  const ref = index === 0 ? fileRef : localRef

  function handleFile(f) {
    if (!f) return
    const ext = f.name.split('.').pop().toLowerCase()
    if (!['txt', 'vtt', 'srt', 'md', 'pdf'].includes(ext)) {
      toast.error('Use PDF, TXT, VTT, SRT, or MD')
      return
    }
    onChange({ ...source, file: f, text: '' })
    if (ext !== 'pdf') {
      const reader = new FileReader()
      reader.onload = e => onChange({ ...source, file: f, text: e.target.result })
      reader.readAsText(f)
    }
  }

  if (source.inputMode === 'file') {
    return (
      <div>
        <div onDragOver={e => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={e => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0]) }}
          onClick={() => ref.current?.click()}
          className="cursor-pointer rounded-xl transition-all"
          style={{
            height: '140px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            border: `2px dashed ${dragOver ? 'var(--accent)' : 'var(--c-input-toggle-off)'}`,
            background: dragOver ? 'color-mix(in srgb, var(--accent) 6%, transparent)' : 'var(--c-surface-lo)',
          }}>
          {source.file ? (
            <div className="text-center">
              <DocumentArrowUpIcon className="w-8 h-8 mx-auto mb-1.5" style={{ color: 'var(--accent)' }} />
              <p className="text-sm font-medium text-white/80">{source.file.name}</p>
              <p className="text-xs text-white/35 mt-0.5">{(source.file.size / 1024).toFixed(0)} KB</p>
              <button onClick={e => { e.stopPropagation(); onChange({ ...source, file: null, text: '' }) }}
                className="mt-1.5 text-xs text-white/30 hover:text-white/60 underline">remove</button>
            </div>
          ) : (
            <div className="text-center">
              <CloudArrowUpIcon className="w-8 h-8 mx-auto mb-1.5 text-white/20" />
              <p className="text-sm text-white/45">Drop file or click to browse</p>
              <p className="text-xs text-white/25 mt-0.5">PDF, TXT, VTT, SRT, MD · 10 MB max</p>
            </div>
          )}
        </div>
        <input ref={ref} type="file" accept={ACCEPTED} className="hidden" onChange={e => handleFile(e.target.files[0])} />
      </div>
    )
  }

  return (
    <div className="relative">
      <textarea className="input-field resize-none text-sm leading-relaxed"
        style={{ height: '140px' }}
        value={source.text}
        onChange={e => onChange({ ...source, text: e.target.value })}
        placeholder={index === 0 ? 'Paste lecture notes, transcript, or article…' : `Source ${index + 1}: paste additional text…`} />
      {source.text && (
        <button onClick={() => onChange({ ...source, text: '' })}
          className="absolute top-2 right-2 w-5 h-5 rounded flex items-center justify-center text-white/30 hover:text-white/60 hover:bg-white/[0.06]">
          <XMarkIcon className="w-3 h-3" />
        </button>
      )}
      <p className="text-[10px] text-white/20 mt-1 text-right">{source.text.length.toLocaleString()} chars</p>
    </div>
  )
}

// ── localStorage recent sessions ──────────────────────────────────────────────
const LS_KEY = 'sh_studytools_recent'
const MAX_RECENT = 5

function loadRecent() {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || '[]') } catch { return [] }
}
function saveRecent(entry) {
  const existing = loadRecent().filter(e => e.id !== entry.id)
  localStorage.setItem(LS_KEY, JSON.stringify([entry, ...existing].slice(0, MAX_RECENT)))
}
function deleteRecent(id) {
  localStorage.setItem(LS_KEY, JSON.stringify(loadRecent().filter(e => e.id !== id)))
}

// ── History panel ──────────────────────────────────────────────────────────────
function HistoryPanel({ onLoad }) {
  const qc = useQueryClient()
  const [recent, setRecent] = useState(loadRecent)
  const { data: sessions = [], isLoading } = useQuery({ queryKey: ['study-sessions'], queryFn: studySessionsApi.list })
  const deleteMut = useMutation({
    mutationFn: id => studySessionsApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['study-sessions'] }),
  })

  async function handleLoad(s) {
    try {
      const full = await studySessionsApi.get(s.id)
      onLoad(full)
    } catch { toast.error('Failed to load session') }
  }

  function handleDeleteRecent(id) {
    deleteRecent(id)
    setRecent(loadRecent())
  }

  const MODE_COLORS = { notes: '#6366f1', study_guide: '#10b981', flashcards: '#f59e0b', writing: '#ec4899' }
  const MODE_LABELS = { notes: 'Notes', study_guide: 'Guide', flashcards: 'Cards', writing: 'Writing' }

  if (isLoading) return (
    <div className="flex items-center justify-center h-48 text-white/30 text-sm">Loading history…</div>
  )

  const hasSaved = sessions.length > 0
  const hasRecent = recent.length > 0

  if (!hasSaved && !hasRecent) return (
    <div className="flex flex-col items-center justify-center h-48 text-center">
      <ClockIcon className="w-10 h-10 text-white/10 mb-3" />
      <p className="text-white/30 text-sm">No sessions yet</p>
      <p className="text-white/18 text-xs mt-1">Generate something — it auto-saves here</p>
    </div>
  )

  return (
    <div className="space-y-4">
      {hasRecent && (
        <div>
          <p className="text-[10px] text-white/30 uppercase tracking-widest mb-2">Recent (auto-saved)</p>
          <div className="space-y-2">
            {recent.map(s => (
              <div key={s.id} className="flex items-center gap-3 p-3 rounded-xl group cursor-pointer transition-all hover:bg-white/[0.04]"
                style={{ border: '1px solid var(--c-border-subtle)' }}
                onClick={() => onLoad({ result: s.result, mode: s.mode, title: s.title, mastery: s.mastery || {} })}>
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: MODE_COLORS[s.mode] || '#6366f1' }} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white/80 truncate">{s.title || 'Untitled'}</p>
                  <p className="text-[11px] text-white/30 mt-0.5">{MODE_LABELS[s.mode] || s.mode} · {s.timeLabel}</p>
                </div>
                <button onClick={e => { e.stopPropagation(); handleDeleteRecent(s.id) }}
                  className="opacity-0 group-hover:opacity-100 p-1 text-white/25 hover:text-red-400 transition-all">
                  <XMarkIcon className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
      {hasSaved && (
        <div>
          {hasRecent && <p className="text-[10px] text-white/30 uppercase tracking-widest mb-2">Saved Sessions</p>}
    <div className="space-y-2">
      {sessions.map(s => (
        <motion.div key={s.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="flex items-center gap-3 px-4 py-3 rounded-xl group cursor-pointer transition-all hover:bg-white/[0.04]"
          style={{ border: '1px solid var(--c-border-subtle)' }}
          onClick={() => handleLoad(s)}>
          <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: MODE_COLORS[s.mode] }} />
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-medium text-white/85 truncate">{s.title}</p>
            <p className="text-[11px] text-white/35 mt-0.5">{MODE_LABELS[s.mode]} · {formatDate(s.created_at)}</p>
          </div>
          <button onClick={e => { e.stopPropagation(); deleteMut.mutate(s.id) }}
            className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded text-white/25 hover:text-red-400">
            <TrashIcon className="w-3.5 h-3.5" />
          </button>
        </motion.div>
      ))}
        </div>
        </div>
      )}
    </div>
  )
}

// ── Save modal ─────────────────────────────────────────────────────────────────
function SaveModal({ result, mode, sourcePreview, onClose, onSaved }) {
  const [title, setTitle] = useState(result?.title || result?.topic || '')
  const [assignmentId, setAssignmentId] = useState('')
  const { data: assignments = [] } = useQuery({ queryKey: ['assignments'], queryFn: () => assignmentsApi.list() })
  const qc = useQueryClient()

  async function handleSave() {
    if (!title.trim()) { toast.error('Add a title'); return }
    try {
      const session = await studySessionsApi.create({
        title: title.trim(), mode, result,
        source_preview: sourcePreview?.slice(0, 200) || '',
        assignment_id: assignmentId || null,
      })
      qc.invalidateQueries({ queryKey: ['study-sessions'] })
      toast.success('Session saved!')
      onSaved(session.id)
      onClose()
    } catch { toast.error('Failed to save') }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}
        onClick={onClose} />
      <motion.div initial={{ opacity: 0, scale: 0.96, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97 }}
        className="relative z-10 w-full max-w-sm glass-elevated rounded-2xl p-6"
        onClick={e => e.stopPropagation()}>
        <h3 className="text-base font-semibold text-white mb-4">Save study session</h3>
        <div className="space-y-3">
          <div>
            <label className="text-[11px] text-white/35 uppercase tracking-wider font-medium">Title</label>
            <input className="input-field mt-1.5 text-sm" value={title}
              onChange={e => setTitle(e.target.value)} placeholder="e.g. Cell Biology Lecture 4" autoFocus />
          </div>
          <div>
            <label className="text-[11px] text-white/35 uppercase tracking-wider font-medium">Link to assignment (optional)</label>
            <select className="input-field mt-1.5 text-sm" value={assignmentId} onChange={e => setAssignmentId(e.target.value)}>
              <option value="">None</option>
              {assignments.filter(a => a.status !== 'completed').map(a => (
                <option key={a.id} value={a.id}>{a.title}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex gap-2 mt-5">
          <button onClick={onClose} className="btn-ghost flex-1 justify-center py-2.5 text-sm">Cancel</button>
          <button onClick={handleSave} className="btn-primary flex-1 justify-center py-2.5 text-sm">Save</button>
        </div>
      </motion.div>
    </div>
  )
}

// ── KaTeX math renderer ────────────────────────────────────────────────────────
function renderMath(str, displayMode = false) {
  try {
    return katex.renderToString(str, { displayMode, throwOnError: false, output: 'html' })
  } catch { return str }
}

// Split text into plain / inline-math / block-math segments and render
function MathText({ text, className = '' }) {
  const parts = useMemo(() => {
    const segments = []
    // Split on $$...$$ (display) and $...$ (inline), keeping delimiters
    const re = /(\$\$[\s\S]+?\$\$|\$[^$\n]+?\$)/g
    let last = 0, m
    while ((m = re.exec(text)) !== null) {
      if (m.index > last) segments.push({ type: 'text', content: text.slice(last, m.index) })
      const raw = m[0]
      if (raw.startsWith('$$')) {
        segments.push({ type: 'block', content: raw.slice(2, -2).trim() })
      } else {
        segments.push({ type: 'inline', content: raw.slice(1, -1).trim() })
      }
      last = m.index + raw.length
    }
    if (last < text.length) segments.push({ type: 'text', content: text.slice(last) })
    return segments
  }, [text])

  return (
    <span className={className}>
      {parts.map((p, i) => {
        if (p.type === 'inline') return (
          <span key={i} dangerouslySetInnerHTML={{ __html: renderMath(p.content, false) }} />
        )
        if (p.type === 'block') return (
          <span key={i} className="block my-2 text-center overflow-x-auto"
            dangerouslySetInnerHTML={{ __html: renderMath(p.content, true) }} />
        )
        return <span key={i}>{p.content}</span>
      })}
    </span>
  )
}

// ── Render formatted AI text (paragraphs + numbered lists + math) ──────────────
function FormattedText({ text }) {
  const blocks = text.split(/\n{2,}/).filter(Boolean)
  return (
    <div className="space-y-2.5">
      {blocks.map((block, bi) => {
        const lines = block.split('\n').filter(Boolean)
        const isNumberedList = lines.length > 1 && lines.every(l => /^\d+\.\s/.test(l))
        if (isNumberedList) {
          return (
            <ol key={bi} className="space-y-2">
              {lines.map((line, li) => {
                const num = line.match(/^(\d+)\.\s/)?.[1]
                const content = line.replace(/^\d+\.\s/, '')
                return (
                  <li key={li} className="flex items-start gap-2.5">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold mt-[2px]"
                      style={{ background: 'color-mix(in srgb, var(--accent) 22%, transparent)', color: 'color-mix(in srgb, var(--accent) 90%, #fff)' }}>
                      {num}
                    </span>
                    <MathText text={content} className="text-[13px] leading-[1.65] text-white/80" />
                  </li>
                )
              })}
            </ol>
          )
        }
        return (
          <p key={bi} className="text-[13px] leading-[1.65] text-white/78">
            <MathText text={lines.join(' ')} />
          </p>
        )
      })}
    </div>
  )
}

// ── Follow-up chat ─────────────────────────────────────────────────────────────
function FollowUpChat({ result, mode }) {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef()

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  async function send() {
    const q = input.trim()
    if (!q || loading) return
    setInput('')
    const newMessages = [...messages, { role: 'user', content: q }]
    setMessages(newMessages)
    setLoading(true)
    try {
      const { answer } = await studyToolsApi.followup({
        question: q, originalContent: result, mode,
        history: newMessages.slice(-6),
      })
      setMessages(m => [...m, { role: 'assistant', content: answer }])
    } catch (err) {
      toast.error(err?.message || 'Failed to get answer')
      setMessages(m => m.slice(0, -1))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mt-6 rounded-2xl overflow-hidden" style={{ border: '1px solid var(--c-border-dim)' }}>
      <div className="flex items-center gap-2.5 px-4 py-3" style={{ background: 'var(--c-surface-lo)', borderBottom: '1px solid var(--c-border-subtle)' }}>
        <SparklesIcon className="w-4 h-4" style={{ color: 'var(--accent)' }} />
        <span className="text-[13px] font-semibold text-white/80">Ask a follow-up</span>
      </div>
      <div className="px-4 py-4 space-y-4 max-h-96 overflow-y-auto">
        {!messages.length && (
          <p className="text-[12.5px] text-white/25 italic text-center py-4">
            Ask anything — explain a concept, give more examples, make more cards, etc.
          </p>
        )}
        {messages.map((m, i) => (
          <div key={i} className={cn('flex gap-2.5', m.role === 'user' ? 'justify-end' : 'justify-start items-start')}>
            {m.role === 'assistant' && (
              <div className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center mt-0.5"
                style={{ background: 'color-mix(in srgb, var(--accent) 20%, transparent)', border: '1px solid color-mix(in srgb, var(--accent) 30%, transparent)' }}>
                <SparklesIcon className="w-3 h-3" style={{ color: 'var(--accent)' }} />
              </div>
            )}
            <div className={cn('max-w-[88%] rounded-2xl px-4 py-3')}
              style={m.role === 'user'
                ? { background: 'color-mix(in srgb, var(--accent) 18%, transparent)', border: '1px solid color-mix(in srgb, var(--accent) 28%, transparent)' }
                : { background: 'var(--c-surface-lo)', border: '1px solid var(--c-border-dim)' }
              }>
              {m.role === 'user'
                ? <p className="text-[13px] leading-relaxed text-white/90">{m.content}</p>
                : <FormattedText text={m.content} />
              }
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex gap-2.5 items-start">
            <div className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center"
              style={{ background: 'color-mix(in srgb, var(--accent) 20%, transparent)', border: '1px solid color-mix(in srgb, var(--accent) 30%, transparent)' }}>
              <SparklesIcon className="w-3 h-3" style={{ color: 'var(--accent)' }} />
            </div>
            <div className="px-4 py-3 rounded-2xl" style={{ background: 'var(--c-surface-lo)', border: '1px solid var(--c-border-dim)' }}>
              <div className="flex gap-1 items-center h-4">
                {[0, 1, 2].map(i => (
                  <motion.div key={i} className="w-1.5 h-1.5 rounded-full"
                    style={{ background: 'var(--accent)', opacity: 0.5 }}
                    animate={{ opacity: [0.2, 0.8, 0.2], scale: [0.8, 1.1, 0.8] }}
                    transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.18 }} />
                ))}
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>
      <div className="flex gap-2 px-3 py-2.5" style={{ borderTop: '1px solid var(--c-border-subtle)' }}>
        <input className="input-field text-sm py-2 flex-1"
          value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
          placeholder="Ask a follow-up question…" />
        <button onClick={send} disabled={!input.trim() || loading}
          className="btn-primary px-3 py-2 disabled:opacity-40">
          <PaperAirplaneIcon className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

// ── Notes result ───────────────────────────────────────────────────────────────
function NotesResult({ data, mastery, onMasteryChange }) {
  function toggleMastery(key) {
    const next = { ...mastery }
    next[key] = !next[key]
    onMasteryChange(next)
  }
  const known = Object.values(mastery || {}).filter(Boolean).length
  const total = (data.sections || []).reduce((acc, s) => acc + (s.points?.length || 0), 0)
  const hasStartedMastery = known > 0

  return (
    <div>
      <FadeIn delay={0}>
        <div className="flex items-start justify-between mb-3">
          <h2 className="text-[22px] font-bold text-white leading-tight">{md(data.title)}</h2>
          {hasStartedMastery && total > 0 && (
            <div className="text-right flex-shrink-0 ml-4">
              <p className="text-[22px] font-bold tabular-nums leading-none" style={{ color: '#10b981' }}>
                {known}<span className="text-[14px] text-white/25 font-normal">/{total}</span>
              </p>
              <p className="text-[10px] text-white/30 uppercase tracking-wider mt-0.5">mastered</p>
            </div>
          )}
        </div>
        {hasStartedMastery && total > 0 && (
          <div className="h-1 rounded-full mb-4 overflow-hidden" style={{ background: 'var(--c-border-subtle)' }}>
            <motion.div className="h-full rounded-full" style={{ background: 'linear-gradient(90deg, #10b981, #34d399)' }}
              animate={{ width: `${(known / total) * 100}%` }}
              transition={{ duration: 0.4 }} />
          </div>
        )}
        <div style={{ background: 'color-mix(in srgb, var(--accent) 8%, transparent)', borderTop: '1px solid color-mix(in srgb, var(--accent) 20%, transparent)', borderRight: '1px solid color-mix(in srgb, var(--accent) 20%, transparent)', borderBottom: '1px solid color-mix(in srgb, var(--accent) 20%, transparent)', borderLeft: '3px solid var(--accent)', borderRadius: '0 0.75rem 0.75rem 0', padding: '0.875rem 1.125rem' }}>
          <p className="text-[13.5px] text-white/70 leading-[1.7]">{md(data.summary)}</p>
        </div>
      </FadeIn>

      {data.sections?.map((s, si) => (
        <FadeIn key={si} delay={0.06 * (si + 1)}>
          <Divider />
          <div className="flex items-center gap-2.5 mb-3">
            <div style={{ width: '3px', height: '18px', borderRadius: '2px', background: 'var(--accent)', flexShrink: 0 }} />
            <h3 className="text-[14px] font-semibold text-white/95 tracking-[-0.01em]">{md(s.heading)}</h3>
          </div>
          {s.detail && <p className="text-[12.5px] text-white/45 italic mb-3 ml-[23px] leading-relaxed">{md(s.detail)}</p>}
          <ul className="space-y-1.5 ml-[23px]">
            {s.points?.map((p, pi) => {
              const key = `${si}-${pi}`
              const known = mastery?.[key]
              return (
                <li key={pi} className="flex items-start gap-3 group">
                  <button onClick={() => toggleMastery(key)}
                    className="flex-shrink-0 mt-[5px] transition-all"
                    title={known ? 'Mark as fuzzy' : 'Mark as known'}>
                    {known
                      ? <CheckCircleIcon className="w-4 h-4" style={{ color: '#10b981' }} />
                      : <span style={{ width: '5px', height: '5px', borderRadius: '50%', display: 'block', marginTop: '4px', background: 'color-mix(in srgb, var(--accent) 70%, #fff)', boxShadow: '0 0 6px color-mix(in srgb, var(--accent) 50%, transparent)' }} />
                    }
                  </button>
                  <span className={cn('text-[13.5px] leading-[1.65] transition-all', known ? 'text-white/30 line-through' : 'text-white/75')}>
                    {md(p)}
                  </span>
                </li>
              )
            })}
          </ul>
        </FadeIn>
      ))}

      {data.keyTerms?.length > 0 && (
        <FadeIn delay={0.06 * ((data.sections?.length || 0) + 1)}>
          <Divider />
          <div className="flex items-center gap-2.5 mb-4">
            <div style={{ width: '3px', height: '18px', borderRadius: '2px', background: '#f59e0b', flexShrink: 0 }} />
            <h3 className="text-[14px] font-semibold text-white/95">Key Terms</h3>
          </div>
          <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--c-border-subtle)' }}>
            {data.keyTerms.map((t, i) => (
              <div key={i} className="flex gap-4 px-4 py-3 hover:bg-white/[0.03] transition-colors"
                style={{ borderBottom: i < data.keyTerms.length - 1 ? '1px solid var(--c-surface-lo)' : 'none' }}>
                <span className="text-[13px] font-semibold text-white/90 w-36 flex-shrink-0 leading-[1.5]">{md(t.term)}</span>
                <span className="text-[13px] text-white/55 leading-[1.6]">{md(t.definition)}</span>
              </div>
            ))}
          </div>
        </FadeIn>
      )}

      {data.takeaways?.length > 0 && (
        <FadeIn delay={0.06 * ((data.sections?.length || 0) + 2)}>
          <Divider />
          <div className="flex items-center gap-2.5 mb-4">
            <div style={{ width: '3px', height: '18px', borderRadius: '2px', background: '#10b981', flexShrink: 0 }} />
            <h3 className="text-[14px] font-semibold text-white/95">Top Takeaways</h3>
          </div>
          <div className="space-y-2.5">
            {data.takeaways.map((t, i) => (
              <div key={i} className="flex items-start gap-4 rounded-xl px-4 py-3"
                style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.14)' }}>
                <span className="text-[13px] font-bold tabular-nums flex-shrink-0 mt-[1px]"
                  style={{ color: '#10b981', minWidth: '20px' }}>{String(i + 1).padStart(2, '0')}</span>
                <span className="text-[13.5px] text-white/75 leading-[1.65]">{md(t)}</span>
              </div>
            ))}
          </div>
        </FadeIn>
      )}
    </div>
  )
}

// ── Writing Feedback ───────────────────────────────────────────────────────────
function WritingFeedbackResult({ data }) {
  const gradeColor = { A: '#10b981', B: '#6366f1', C: '#f59e0b', D: '#f97316', F: '#ef4444' }
  const color = gradeColor[data.grade?.charAt(0)] || '#6366f1'
  const checks = [
    ['Thesis clear', data.thesisClear],
    ['Evidence strong', data.evidenceStrong],
    ['Flow good', data.flowGood],
  ]
  return (
    <div className="space-y-4">
      <FadeIn delay={0}>
        <div className="flex items-start gap-5">
          <div className="flex-shrink-0 text-center">
            <p className="text-[52px] font-black leading-none" style={{ color }}>{data.grade}</p>
            <p className="text-[13px] font-bold tabular-nums" style={{ color }}>{data.score}/100</p>
          </div>
          <div className="flex-1">
            <p className="text-[13.5px] text-white/68 leading-[1.72]">{md(data.overall)}</p>
            <div className="flex gap-3 mt-3">
              {checks.map(([label, val]) => (
                <div key={label} className="flex items-center gap-1.5">
                  <span className="text-[12px]" style={{ color: val ? '#10b981' : '#ef4444' }}>{val ? '✓' : '✕'}</span>
                  <span className="text-[11px] text-white/40">{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </FadeIn>

      <FadeIn delay={0.08}>
        <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(16,185,129,0.2)', background: 'rgba(16,185,129,0.04)' }}>
          <div className="flex items-center gap-3 px-5 py-3" style={{ borderBottom: '1px solid rgba(16,185,129,0.12)' }}>
            <div style={{ width: '3px', height: '14px', borderRadius: '2px', background: '#10b981', flexShrink: 0 }} />
            <span className="text-[13px] font-semibold text-white/90">Strengths</span>
          </div>
          <div className="px-5 py-3 space-y-2">
            {data.strengths?.map((s, i) => (
              <div key={i} className="flex items-start gap-3">
                <span className="text-emerald-400 flex-shrink-0 font-bold text-sm mt-[1px]">✓</span>
                <span className="text-[13px] text-white/68 leading-[1.65]">{md(s)}</span>
              </div>
            ))}
          </div>
        </div>
      </FadeIn>

      <FadeIn delay={0.14}>
        <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(239,68,68,0.2)', background: 'rgba(239,68,68,0.04)' }}>
          <div className="flex items-center gap-3 px-5 py-3" style={{ borderBottom: '1px solid rgba(239,68,68,0.1)' }}>
            <div style={{ width: '3px', height: '14px', borderRadius: '2px', background: '#ef4444', flexShrink: 0 }} />
            <span className="text-[13px] font-semibold text-white/90">Needs Improvement</span>
          </div>
          <div className="px-5 py-3 space-y-2">
            {data.improvements?.map((s, i) => (
              <div key={i} className="flex items-start gap-3">
                <span className="text-red-400 flex-shrink-0 font-bold text-sm mt-[1px]">!</span>
                <span className="text-[13px] text-white/68 leading-[1.65]">{md(s)}</span>
              </div>
            ))}
          </div>
        </div>
      </FadeIn>

      <FadeIn delay={0.2}>
        <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(236,72,153,0.2)', background: 'rgba(236,72,153,0.04)' }}>
          <div className="flex items-center gap-3 px-5 py-3" style={{ borderBottom: '1px solid rgba(236,72,153,0.1)' }}>
            <div style={{ width: '3px', height: '14px', borderRadius: '2px', background: '#ec4899', flexShrink: 0 }} />
            <span className="text-[13px] font-semibold text-white/90">Actionable Suggestions</span>
          </div>
          <div className="px-5 py-3 space-y-2">
            {data.suggestions?.map((s, i) => (
              <div key={i} className="flex items-start gap-3">
                <span className="text-[12px] font-bold tabular-nums flex-shrink-0 mt-[1px]"
                  style={{ color: '#ec4899', minWidth: '20px' }}>{String(i + 1).padStart(2, '0')}</span>
                <span className="text-[13px] text-white/68 leading-[1.65]">{md(s)}</span>
              </div>
            ))}
          </div>
        </div>
      </FadeIn>
    </div>
  )
}

// ── Study Guide ────────────────────────────────────────────────────────────────
function GuideSection({ heading, content, bullets, accentColor = '#10b981', delay = 0 }) {
  const [open, setOpen] = useState(true)
  return (
    <FadeIn delay={delay}>
      <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--c-border-dim)' }}>
        <button onClick={() => setOpen(o => !o)}
          className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-white/[0.025] transition-colors"
          style={{ background: 'var(--c-surface-lo)' }}>
          <div className="flex items-center gap-3">
            <div style={{ width: '3px', height: '16px', borderRadius: '2px', background: accentColor, flexShrink: 0 }} />
            <span className="text-[14px] font-semibold text-white/90 tracking-[-0.01em]">{md(heading)}</span>
          </div>
          <ChevronDownIcon className={cn('w-4 h-4 text-white/30 transition-transform flex-shrink-0', open && 'rotate-180')} />
        </button>
        <AnimatePresence initial={false}>
          {open && (
            <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }}
              transition={{ duration: 0.22 }} className="overflow-hidden">
              <div className="px-5 pb-4 pt-3 space-y-3">
                {content && <p className="text-[13.5px] text-white/62 leading-[1.72]">{md(content)}</p>}
                {bullets?.length > 0 && (
                  <ul className="space-y-2">
                    {bullets.map((b, j) => (
                      <li key={j} className="flex items-start gap-3">
                        <span className="flex-shrink-0 mt-[7px]" style={{ width: '5px', height: '5px', borderRadius: '50%', background: accentColor, opacity: 0.7 }} />
                        <span className="text-[13.5px] text-white/72 leading-[1.65]">{md(b)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </FadeIn>
  )
}

// ── Practice Quiz ──────────────────────────────────────────────────────────────
function PracticeQuiz({ questions, onClose }) {
  const [idx, setIdx] = useState(0)
  const [revealed, setRevealed] = useState(false)
  const [score, setScore] = useState({ correct: 0, wrong: 0 })
  const done = idx >= questions.length

  function answer(correct) {
    setScore(s => ({ ...s, correct: s.correct + (correct ? 1 : 0), wrong: s.wrong + (correct ? 0 : 1) }))
    setRevealed(false)
    setIdx(i => i + 1)
  }

  if (done) return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0"
        style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }} onClick={onClose} />
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        className="relative z-10 w-full max-w-sm glass-elevated rounded-2xl p-8 text-center">
        <p className="text-4xl font-bold text-white mb-2">
          {score.correct}/{questions.length}
        </p>
        <p className="text-white/50 text-sm mb-1">
          {Math.round((score.correct / questions.length) * 100)}% correct
        </p>
        <p className="text-white/35 text-xs mb-6">
          {score.correct === questions.length ? 'Perfect! You nailed it.' : score.correct >= questions.length * 0.7 ? 'Great job — almost there.' : 'Keep reviewing and try again.'}
        </p>
        <button onClick={onClose} className="btn-primary w-full justify-center py-2.5">Done</button>
      </motion.div>
    </div>
  )

  const q = questions[idx]
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0"
        style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }} />
      <motion.div key={idx} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
        className="relative z-10 w-full max-w-lg glass-elevated rounded-2xl p-6">
        <div className="flex items-center justify-between mb-6">
          <span className="text-xs text-white/35">Question {idx + 1} of {questions.length}</span>
          <button onClick={onClose} className="text-white/25 hover:text-white/60">
            <XMarkIcon className="w-4 h-4" />
          </button>
        </div>
        <div className="h-1 rounded-full mb-6 overflow-hidden" style={{ background: 'var(--c-border-dim)' }}>
          <div className="h-full rounded-full" style={{ width: `${(idx / questions.length) * 100}%`, background: '#f59e0b', transition: 'width 0.3s' }} />
        </div>
        <p className="text-[16px] font-medium text-white leading-[1.6] mb-6 text-center">{md(q)}</p>
        {!revealed ? (
          <button onClick={() => setRevealed(true)} className="btn-ghost w-full justify-center py-3 text-sm">
            Think about it… then reveal
          </button>
        ) : (
          <div className="space-y-3">
            <p className="text-[12px] text-white/40 text-center mb-2">How well did you know this?</p>
            <div className="flex gap-3">
              <button onClick={() => answer(false)}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-all hover:scale-[1.02]"
                style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)', color: '#f87171' }}>
                Didn't know
              </button>
              <button onClick={() => answer(true)}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-all hover:scale-[1.02]"
                style={{ background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.25)', color: '#34d399' }}>
                Got it
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  )
}

function StudyGuideResult({ data }) {
  const [quizOpen, setQuizOpen] = useState(false)
  const nSections = data.sections?.length || 0
  return (
    <div className="space-y-3">
      <FadeIn delay={0}>
        <div className="flex items-start justify-between mb-3">
          <h2 className="text-[22px] font-bold text-white leading-tight">{md(data.title)}</h2>
          {data.examQuestions?.length > 0 && (
            <button onClick={() => setQuizOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold flex-shrink-0 ml-3 transition-all hover:scale-[1.03]"
              style={{ background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.25)', color: '#f59e0b' }}>
              <PlayIcon className="w-3.5 h-3.5" />
              Practice Quiz
            </button>
          )}
        </div>
        <div style={{ background: 'rgba(16,185,129,0.07)', borderTop: '1px solid rgba(16,185,129,0.18)', borderRight: '1px solid rgba(16,185,129,0.18)', borderBottom: '1px solid rgba(16,185,129,0.18)', borderLeft: '3px solid #10b981', borderRadius: '0 0.75rem 0.75rem 0', padding: '1rem 1.125rem' }}>
          <p className="text-[10px] font-semibold text-emerald-400 uppercase tracking-widest mb-2">Overview</p>
          <p className="text-[13.5px] text-white/68 leading-[1.72]">{md(data.overview)}</p>
        </div>
      </FadeIn>

      {data.sections?.map((s, i) => (
        <GuideSection key={i} heading={s.heading} content={s.content} bullets={s.bullets} delay={0.05 * (i + 1)} />
      ))}

      {data.keyTerms?.length > 0 && (
        <FadeIn delay={0.05 * (nSections + 1)}>
          <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--c-border-dim)' }}>
            <div className="flex items-center gap-3 px-5 py-4" style={{ background: 'var(--c-surface-lo)', borderBottom: '1px solid var(--c-border-subtle)' }}>
              <div style={{ width: '3px', height: '16px', borderRadius: '2px', background: '#f59e0b', flexShrink: 0 }} />
              <span className="text-[14px] font-semibold text-white/90">Key Terms</span>
            </div>
            {data.keyTerms.map((t, i) => (
              <div key={i} className="flex gap-4 px-5 py-3 hover:bg-white/[0.025] transition-colors"
                style={{ borderBottom: i < data.keyTerms.length - 1 ? '1px solid var(--c-surface-lo)' : 'none' }}>
                <span className="text-[13px] font-semibold text-white/88 w-36 flex-shrink-0 leading-relaxed">{md(t.term)}</span>
                <span className="text-[13px] text-white/55 leading-relaxed">{md(t.definition)}</span>
              </div>
            ))}
          </div>
        </FadeIn>
      )}

      {data.examQuestions?.length > 0 && (
        <FadeIn delay={0.05 * (nSections + 2)}>
          <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(245,158,11,0.2)', background: 'rgba(245,158,11,0.04)' }}>
            <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid rgba(245,158,11,0.12)' }}>
              <div className="flex items-center gap-3">
                <div style={{ width: '3px', height: '16px', borderRadius: '2px', background: '#f59e0b', flexShrink: 0 }} />
                <span className="text-[14px] font-semibold text-white/90">Practice Questions</span>
              </div>
            </div>
            <div className="px-5 py-4 space-y-3">
              {data.examQuestions.map((q, i) => (
                <div key={i} className="flex items-start gap-4">
                  <span className="text-[12px] font-bold tabular-nums flex-shrink-0 mt-[2px]"
                    style={{ color: '#f59e0b', minWidth: '24px' }}>{i + 1}</span>
                  <span className="text-[13.5px] text-white/75 leading-[1.65]">{md(q)}</span>
                </div>
              ))}
            </div>
          </div>
        </FadeIn>
      )}

      {data.commonMistakes?.length > 0 && (
        <FadeIn delay={0.05 * (nSections + 3)}>
          <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(239,68,68,0.18)', background: 'rgba(239,68,68,0.04)' }}>
            <div className="flex items-center gap-3 px-5 py-4" style={{ borderBottom: '1px solid rgba(239,68,68,0.1)' }}>
              <div style={{ width: '3px', height: '16px', borderRadius: '2px', background: '#ef4444', flexShrink: 0 }} />
              <span className="text-[14px] font-semibold text-white/90">Common Mistakes</span>
            </div>
            <div className="px-5 py-4 space-y-2.5">
              {data.commonMistakes.map((m, i) => (
                <div key={i} className="flex items-start gap-3">
                  <span className="text-red-400 flex-shrink-0 font-bold text-sm mt-[1px]">✕</span>
                  <span className="text-[13.5px] text-white/65 leading-[1.65]">{md(m)}</span>
                </div>
              ))}
            </div>
          </div>
        </FadeIn>
      )}

      {data.summary && (
        <FadeIn delay={0.05 * (nSections + 4)}>
          <p className="text-[13px] text-white/38 italic px-1 pt-1 leading-relaxed">{md(data.summary)}</p>
        </FadeIn>
      )}

      <AnimatePresence>
        {quizOpen && <PracticeQuiz questions={data.examQuestions} onClose={() => setQuizOpen(false)} />}
      </AnimatePresence>
    </div>
  )
}

// ── Flashcard Quiz Mode ────────────────────────────────────────────────────────
function FlashcardQuiz({ cards, onClose }) {
  const [idx, setIdx] = useState(0)
  const [revealed, setRevealed] = useState(false)
  const [score, setScore] = useState({ correct: 0, wrong: 0 })
  const done = idx >= cards.length

  function answer(correct) {
    setScore(s => ({ ...s, correct: s.correct + (correct ? 1 : 0), wrong: s.wrong + (correct ? 0 : 1) }))
    setRevealed(false)
    setIdx(i => i + 1)
  }

  if (done) return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0"
        style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }} onClick={onClose} />
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        className="relative z-10 w-full max-w-sm glass-elevated rounded-2xl p-8 text-center">
        <p className="text-4xl font-bold text-white mb-2">{score.correct}/{cards.length}</p>
        <p className="text-white/50 text-sm mb-1">{Math.round((score.correct / cards.length) * 100)}% correct</p>
        <p className="text-white/35 text-xs mb-6">
          {score.correct === cards.length ? 'Perfect! You nailed every card.' : score.correct >= cards.length * 0.7 ? 'Great — almost there.' : 'Keep reviewing and try again.'}
        </p>
        <button onClick={onClose} className="btn-primary w-full justify-center py-2.5">Done</button>
      </motion.div>
    </div>
  )

  const card = cards[idx]
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0"
        style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }} />
      <motion.div key={idx} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
        className="relative z-10 w-full max-w-lg glass-elevated rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs text-white/35">Card {idx + 1} of {cards.length}</span>
          <button onClick={onClose} className="text-white/25 hover:text-white/60"><XMarkIcon className="w-4 h-4" /></button>
        </div>
        <div className="h-1 rounded-full mb-5 overflow-hidden" style={{ background: 'var(--c-border-dim)' }}>
          <div className="h-full rounded-full" style={{ width: `${(idx / cards.length) * 100}%`, background: '#f59e0b', transition: 'width 0.3s' }} />
        </div>

        {/* 3D flip card */}
        <div style={{ perspective: '1200px', height: 180, marginBottom: '1.25rem' }}
          onClick={() => !revealed && setRevealed(true)}>
          <div style={{
            position: 'relative', width: '100%', height: '100%',
            transformStyle: 'preserve-3d',
            transition: 'transform 0.5s cubic-bezier(0.4,0,0.2,1)',
            transform: revealed ? 'rotateY(180deg)' : 'none',
            cursor: revealed ? 'default' : 'pointer',
          }}>
            {/* Front — question */}
            <div style={{
              backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden',
              position: 'absolute', inset: 0,
              background: 'var(--c-surface-lo)', border: '1px solid var(--c-border-dim)',
              borderRadius: '1rem', padding: '1.25rem',
              display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
            }}>
              <p className="text-[10px] font-semibold text-white/30 uppercase tracking-widest">Question</p>
              <p className="text-[15px] font-medium text-white leading-[1.65] text-center">{md(card.front)}</p>
              <p className="text-[10px] text-white/20 text-center">tap to flip</p>
            </div>
            {/* Back — answer */}
            <div style={{
              backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden',
              transform: 'rotateY(180deg)',
              position: 'absolute', inset: 0,
              background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.22)',
              borderRadius: '1rem', padding: '1.25rem',
              display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
            }}>
              <p className="text-[10px] font-semibold text-indigo-400 uppercase tracking-widest">Answer</p>
              <p className="text-[14px] text-white/85 leading-[1.65] text-center">{md(card.back)}</p>
              <div />
            </div>
          </div>
        </div>

        {!revealed ? (
          <button onClick={() => setRevealed(true)} className="btn-ghost w-full justify-center py-3 text-sm">
            Tap card or click to reveal
          </button>
        ) : (
          <div className="flex gap-3">
            <button onClick={() => answer(false)}
              className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-all hover:scale-[1.02] active:scale-95"
              style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)', color: '#f87171' }}>
              Missed it
            </button>
            <button onClick={() => answer(true)}
              className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-all hover:scale-[1.02] active:scale-95"
              style={{ background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.25)', color: '#34d399' }}>
              Got it ✓
            </button>
          </div>
        )}
      </motion.div>
    </div>
  )
}

// ── Flashcard + spaced repetition ─────────────────────────────────────────────
function FlashCard({ front, back, index, bucket, onRate }) {
  const [flipped, setFlipped] = useState(false)

  function handleFlip() { setFlipped(f => !f) }

  const bucketColors = { know: '#10b981', almost: '#f59e0b', forgot: '#ef4444' }
  const bucketBg = { know: 'rgba(16,185,129,0.1)', almost: 'rgba(245,158,11,0.1)', forgot: 'rgba(239,68,68,0.1)' }

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03, duration: 0.25 }}>
      <div onClick={handleFlip} style={{ perspective: '1000px', height: '160px', cursor: 'pointer' }}
        className="group">
        <motion.div style={{ position: 'relative', width: '100%', height: '100%', transformStyle: 'preserve-3d', transition: 'transform 0.42s cubic-bezier(0.4,0,0.2,1)', transform: flipped ? 'rotateY(180deg)' : 'none' }}
          whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
          {/* Front */}
          <div style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden', position: 'absolute', inset: 0, background: bucket ? bucketBg[bucket] : 'var(--c-surface-lo)', border: `1px solid ${bucket ? bucketColors[bucket] + '33' : 'var(--c-border-dim)'}`, borderRadius: '1rem', padding: '1rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '10px', color: 'var(--c-text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600 }}>{index + 1}</span>
            <p style={{ fontSize: '13px', color: 'var(--c-text-main)', textAlign: 'center', lineHeight: 1.6, fontWeight: 500 }}>{md(front)}</p>
            <div className="flex justify-end">
              <span style={{ fontSize: '10px', color: 'var(--c-text-muted)', background: 'var(--c-border-subtle)', padding: '2px 8px', borderRadius: '99px' }}>flip</span>
            </div>
          </div>
          {/* Back */}
          <div style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden', transform: 'rotateY(180deg)', position: 'absolute', inset: 0, background: 'color-mix(in srgb, var(--accent) 12%, rgba(0,0,0,0.2))', border: '1px solid color-mix(in srgb, var(--accent) 28%, transparent)', borderRadius: '1rem', padding: '1rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '10px', color: 'color-mix(in srgb, var(--accent) 70%, #fff)', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600 }}>Answer</span>
            <p style={{ fontSize: '13px', color: 'var(--c-text-main)', textAlign: 'center', lineHeight: 1.6 }}>{md(back)}</p>
            {onRate && (
              <div className="flex gap-1.5 justify-center" onClick={e => e.stopPropagation()}>
                {[['forgot', '✕', '#ef4444'], ['almost', '~', '#f59e0b'], ['know', '✓', '#10b981']].map(([b, label, color]) => (
                  <button key={b} onClick={() => onRate(b)}
                    className="px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all hover:scale-110"
                    style={{ background: `${color}20`, border: `1px solid ${color}40`, color }}>
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </motion.div>
  )
}

function FlashcardsResult({ data }) {
  const cards = data.cards || []
  const [buckets, setBuckets] = useState({})
  const [srMode, setSrMode] = useState(false)
  const [srQueue, setSrQueue] = useState([])
  const [srIdx, setSrIdx] = useState(0)
  const [srDone, setSrDone] = useState(false)
  const [quizOpen, setQuizOpen] = useState(false)

  function startSR() {
    const queue = cards.map((_, i) => i).sort(() => Math.random() - 0.5)
    setSrQueue(queue)
    setSrIdx(0)
    setSrDone(false)
    setSrMode(true)
  }

  function rateSR(cardIdx, bucket) {
    setBuckets(b => ({ ...b, [cardIdx]: bucket }))
    const nextIdx = srIdx + 1
    if (nextIdx >= srQueue.length) { setSrDone(true); return }
    setSrIdx(nextIdx)
  }

  const know = Object.values(buckets).filter(v => v === 'know').length
  const almost = Object.values(buckets).filter(v => v === 'almost').length
  const forgot = Object.values(buckets).filter(v => v === 'forgot').length
  const reviewed = know + almost + forgot

  if (srMode) {
    const currentCardIdx = srQueue[srIdx]
    const card = cards[currentCardIdx]
    if (srDone) return (
      <FadeIn delay={0}>
        <div className="text-center py-8">
          <p className="text-3xl font-bold text-white mb-4">{know}/{cards.length} known</p>
          <div className="flex justify-center gap-4 mb-6 text-sm">
            <span style={{ color: '#10b981' }}>✓ {know} know</span>
            <span style={{ color: '#f59e0b' }}>~ {almost} almost</span>
            <span style={{ color: '#ef4444' }}>✕ {forgot} forgot</span>
          </div>
          <div className="flex gap-3 justify-center">
            {forgot + almost > 0 && (
              <button onClick={() => {
                const retry = Object.entries(buckets).filter(([, v]) => v !== 'know').map(([k]) => parseInt(k)).sort(() => Math.random() - 0.5)
                setSrQueue(retry); setSrIdx(0); setSrDone(false)
                setBuckets(b => { const n = { ...b }; retry.forEach(i => delete n[i]); return n })
              }} className="btn-ghost py-2.5 px-5 text-sm">Review missed</button>
            )}
            <button onClick={() => { setSrMode(false); setBuckets({}) }} className="btn-primary py-2.5 px-5 text-sm">Done</button>
          </div>
        </div>
      </FadeIn>
    )
    return (
      <FadeIn delay={0}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-lg font-bold text-white">{data.topic}</p>
            <p className="text-sm text-white/40 mt-0.5">Card {srIdx + 1} of {srQueue.length} · flip then rate yourself</p>
          </div>
          <button onClick={() => setSrMode(false)} className="text-white/30 hover:text-white/60"><XMarkIcon className="w-5 h-5" /></button>
        </div>
        <div className="h-1 rounded-full mb-5 overflow-hidden" style={{ background: 'var(--c-border-subtle)' }}>
          <div className="h-full rounded-full" style={{ width: `${(srIdx / srQueue.length) * 100}%`, background: 'var(--accent)', transition: 'width 0.3s' }} />
        </div>
        <FlashCard front={card.front} back={card.back} index={currentCardIdx} onRate={b => rateSR(currentCardIdx, b)} />
        <div className="flex justify-center gap-6 mt-4 text-xs text-white/30">
          <span style={{ color: '#10b981' }}>✓ {know}</span>
          <span style={{ color: '#f59e0b' }}>~ {almost}</span>
          <span style={{ color: '#ef4444' }}>✕ {forgot}</span>
        </div>
      </FadeIn>
    )
  }

  return (
    <div>
      <FadeIn delay={0}>
        <div className="flex items-end justify-between mb-4">
          <div>
            <h2 className="text-[22px] font-bold text-white leading-tight">{data.topic}</h2>
            <p className="text-[13px] text-white/40 mt-1">{cards.length} cards · tap to flip</p>
          </div>
          <div className="flex items-center gap-2">
            {reviewed > 0 && <span className="text-[13px] font-semibold" style={{ color: '#10b981' }}>{know}/{cards.length} known</span>}
            <button onClick={() => setQuizOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all hover:scale-[1.03]"
              style={{ background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.25)', color: '#818cf8' }}>
              <PlayIcon className="w-3.5 h-3.5" />Quiz Mode
            </button>
            <button onClick={startSR}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all hover:scale-[1.03]"
              style={{ background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.25)', color: '#f59e0b' }}>
              <PlayIcon className="w-3.5 h-3.5" />Study Mode
            </button>
          </div>
        </div>
        <div className="h-1 rounded-full mb-5 overflow-hidden" style={{ background: 'var(--c-border-subtle)' }}>
          <motion.div className="h-full rounded-full"
            style={{ background: 'linear-gradient(90deg, #f59e0b, #fbbf24)' }}
            animate={{ width: `${cards.length ? (reviewed / cards.length) * 100 : 0}%` }}
            transition={{ duration: 0.4 }} />
        </div>
      </FadeIn>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '0.75rem' }}>
        {cards.map((card, i) => (
          <FlashCard key={i} front={card.front} back={card.back} index={i} bucket={buckets[i]}
            onRate={b => setBuckets(prev => ({ ...prev, [i]: b }))} />
        ))}
      </div>
      <AnimatePresence>
        {quizOpen && <FlashcardQuiz cards={cards} onClose={() => setQuizOpen(false)} />}
      </AnimatePresence>
    </div>
  )
}

// ── Export helpers ─────────────────────────────────────────────────────────────
function exportAnki(cards, topic) {
  const rows = cards.map(c => `"${c.front.replace(/"/g, '""')}"\t"${c.back.replace(/"/g, '""')}"`).join('\n')
  const blob = new Blob([rows], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${(topic || 'flashcards').replace(/[^a-z0-9]/gi, '_').toLowerCase()}_anki.txt`
  a.click()
  URL.revokeObjectURL(url)
  toast.success('Anki file downloaded — import as Text in Anki')
}

// ── Main page ──────────────────────────────────────────────────────────────────
const EMPTY_SOURCE = { inputMode: 'paste', text: '', file: null }

export default function StudyTools() {
  const fileRef = useRef()

  // Input state
  const [inputTab, setInputTab] = useState('paste') // 'paste' | 'file' | 'youtube'
  const [ytUrl, setYtUrl] = useState('')
  const [ytLoading, setYtLoading] = useState(false)
  const [sources, setSources] = useState([{ ...EMPTY_SOURCE }])
  const [title, setTitle] = useState('')
  const [mode, setMode] = useState('notes')
  const [writingText, setWritingText] = useState('')
  const [writingRequirements, setWritingRequirements] = useState('')

  // Result state
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [resultMode, setResultMode] = useState(null)
  const [sourcePreview, setSourcePreview] = useState('')
  const [savedId, setSavedId] = useState(null)
  const [mastery, setMastery] = useState({})

  // UI state
  const [showSave, setShowSave] = useState(false)
  const [rightTab, setRightTab] = useState('result') // 'result' | 'history'

  function updateSource(i, val) {
    setSources(s => s.map((src, idx) => idx === i ? val : src))
  }

  function addSource() {
    if (sources.length < 3) setSources(s => [...s, { ...EMPTY_SOURCE }])
  }

  function removeSource(i) {
    setSources(s => s.filter((_, idx) => idx !== i))
  }

  async function fetchYouTube() {
    if (!ytUrl.trim()) return
    setYtLoading(true)
    try {
      const { text, title: ytTitle } = await studyToolsApi.youtube(ytUrl.trim())
      setSources([{ inputMode: 'paste', text, file: null }])
      if (!title && ytTitle) setTitle(ytTitle)
      setInputTab('paste')
      toast.success(`Transcript fetched — ${text.length.toLocaleString()} chars`)
    } catch (err) {
      toast.error(err?.message || 'Could not fetch transcript')
    } finally {
      setYtLoading(false)
    }
  }

  async function handleGenerate() {
    if (mode === 'writing') {
      if (writingText.trim().length < 50) { toast.error('Paste your essay or writing sample first'); return }
      setLoading(true); setResult(null); setSavedId(null); setMastery({})
      try {
        const data = await aiApi.reviewWriting({ text: writingText.trim(), requirements: writingRequirements.trim() })
        setResult(data)
        setResultMode('writing')
        setRightTab('result')
        saveRecent({ id: crypto.randomUUID(), mode: 'writing', title: 'Writing Review', result: data, mastery: {}, timeLabel: 'Just now' })
      } catch (err) {
        toast.error(err?.message || 'Writing review failed')
      } finally {
        setLoading(false)
      }
      return
    }
    const hasSomething = sources.some(s => s.text.trim().length > 20 || s.file)
    if (!hasSomething) { toast.error('Add some content first'); return }
    setLoading(true); setResult(null); setSavedId(null); setMastery({})
    try {
      const fd = new FormData()
      fd.append('mode', mode)
      fd.append('title', title)
      let preview = ''
      sources.forEach((s, i) => {
        if (s.file) { fd.append(`file${i}`, s.file) }
        else if (s.text.trim()) {
          fd.append(`text${i}`, s.text)
          if (!preview) preview = s.text.slice(0, 200)
        }
      })
      setSourcePreview(preview)
      const data = await studyToolsApi.generate(fd)
      setResult(data)
      setResultMode(mode)
      setRightTab('result')
      saveRecent({ id: crypto.randomUUID(), mode, title: title || data.title || data.topic || 'Untitled', result: data, mastery: {}, timeLabel: 'Just now' })
    } catch (err) {
      toast.error(err?.message || 'Generation failed')
    } finally {
      setLoading(false)
    }
  }

  function handleCopy() {
    if (!result) return
    const lines = []
    if (resultMode === 'flashcards') {
      result.cards?.forEach((c, i) => { lines.push(`Q${i + 1}: ${md(c.front)}`); lines.push(`A: ${md(c.back)}`); lines.push('') })
    } else {
      lines.push(result.title || result.topic || '', '')
      if (result.summary || result.overview) lines.push(result.summary || result.overview, '')
      result.sections?.forEach(s => {
        lines.push(`## ${md(s.heading)}`)
        s.points?.forEach(p => lines.push(`  • ${md(p)}`))
        s.bullets?.forEach(b => lines.push(`  • ${md(b)}`))
        lines.push('')
      })
    }
    navigator.clipboard.writeText(lines.join('\n'))
    toast.success('Copied to clipboard')
  }

  const hasInput = mode === 'writing'
    ? writingText.trim().length >= 50
    : sources.some(s => s.text.trim().length > 20 || s.file)
  const selectedMode = MODES.find(m2 => m2.value === mode)

  return (
    <div className="max-w-6xl mx-auto print:max-w-none">
      {/* Header — hidden in print */}
      <div className="mb-7 print:hidden">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, var(--accent), color-mix(in srgb, var(--accent) 70%, #000))' }}>
            <SparklesIcon className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Study Tools</h1>
            <p className="text-sm text-white/40">Turn any lecture, transcript, or document into notes, guides, or flashcards</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[400px_1fr]">
        {/* ── LEFT: Input panel ── */}
        <div className="space-y-4 print:hidden">
          {/* Input tab */}
          {mode !== 'writing' && (
            <div className="flex gap-1 p-1 rounded-xl" style={{ background: 'var(--c-surface-lo)', border: '1px solid var(--c-border-subtle)' }}>
              {[['paste','Paste Text'],['file','Upload File'],['youtube','YouTube']].map(([v, label]) => (
                <button key={v} onClick={() => setInputTab(v)}
                  className={cn('flex-1 py-1.5 rounded-lg text-[12.5px] font-medium transition-all', inputTab === v ? 'bg-white/[0.08] text-white' : 'text-white/40 hover:text-white/70')}>
                  {label}
                </button>
              ))}
            </div>
          )}

          {/* YouTube input */}
          {inputTab === 'youtube' && mode !== 'writing' && (
            <div className="space-y-2">
              <input className="input-field text-sm" value={ytUrl} onChange={e => setYtUrl(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && fetchYouTube()}
                placeholder="https://youtube.com/watch?v=..." />
              <button onClick={fetchYouTube} disabled={!ytUrl.trim() || ytLoading}
                className="btn-primary w-full justify-center py-2.5 text-sm disabled:opacity-40">
                {ytLoading ? <><div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" /> Fetching…</> : 'Fetch Transcript'}
              </button>
              <p className="text-[11px] text-white/25 text-center">Works on most videos with subtitles/captions. Auto-loads into Paste tab.</p>
            </div>
          )}

          {/* Writing mode input */}
          {mode === 'writing' && (
            <div className="space-y-3">
              <div>
                <label className="text-[11px] text-white/35 uppercase tracking-wider font-medium">Essay / Writing Sample</label>
                <textarea
                  className="input-field mt-1.5 text-sm w-full resize-none"
                  rows={10}
                  value={writingText}
                  onChange={e => setWritingText(e.target.value)}
                  placeholder="Paste your essay, paragraph, or writing sample here…"
                />
              </div>
              <div>
                <label className="text-[11px] text-white/35 uppercase tracking-wider font-medium">Assignment Requirements (optional)</label>
                <input
                  className="input-field mt-1.5 text-sm w-full"
                  value={writingRequirements}
                  onChange={e => setWritingRequirements(e.target.value)}
                  placeholder="e.g. 5-page argumentative essay on climate policy, MLA format"
                />
              </div>
            </div>
          )}

          {/* Sources */}
          {inputTab !== 'youtube' && mode !== 'writing' && (
            <div className="space-y-3">
              {sources.map((src, i) => (
                <div key={i}>
                  {sources.length > 1 && (
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[11px] text-white/35 uppercase tracking-wider font-medium">Source {i + 1}</span>
                      <button onClick={() => removeSource(i)} className="text-[11px] text-white/25 hover:text-red-400 transition-colors">remove</button>
                    </div>
                  )}
                  {inputTab === 'file'
                    ? <SourceBlock index={i} source={{ ...src, inputMode: 'file' }} onChange={v => updateSource(i, v)} fileRef={fileRef} canRemove={sources.length > 1} onRemove={() => removeSource(i)} />
                    : <SourceBlock index={i} source={{ ...src, inputMode: 'paste' }} onChange={v => updateSource(i, v)} fileRef={fileRef} canRemove={sources.length > 1} onRemove={() => removeSource(i)} />
                  }
                </div>
              ))}
              {sources.length < 3 && (
                <button onClick={addSource}
                  className="w-full py-2 rounded-xl text-[12px] text-white/35 hover:text-white/60 flex items-center justify-center gap-1.5 transition-all hover:bg-white/[0.03]"
                  style={{ border: '1px dashed var(--c-input-toggle-off)' }}>
                  <PlusIcon className="w-3.5 h-3.5" /> Add another source
                </button>
              )}
            </div>
          )}

          {/* Title */}
          {mode !== 'writing' && (
            <div>
              <label className="text-[11px] text-white/35 uppercase tracking-wider font-medium">Topic / Title (optional)</label>
              <input className="input-field mt-1.5 text-sm" value={title} onChange={e => setTitle(e.target.value)}
                placeholder="e.g. Cell Biology Lecture 4" />
            </div>
          )}

          {/* Mode */}
          <div>
            <label className="text-[11px] text-white/35 uppercase tracking-wider font-medium mb-2 block">Output type</label>
            <div className="grid grid-cols-2 gap-2">
              {MODES.map(m2 => (
                <button key={m2.value} onClick={() => setMode(m2.value)}
                  className="rounded-xl p-3 text-left transition-all"
                  style={{ background: mode === m2.value ? m2.bg : 'var(--c-surface-lo)', border: `1px solid ${mode === m2.value ? m2.border : 'var(--c-border-subtle)'}` }}>
                  <m2.icon className="w-4 h-4 mb-1.5" style={{ color: mode === m2.value ? m2.color : 'var(--c-text-muted)' }} />
                  <p className="text-[12px] font-semibold" style={{ color: mode === m2.value ? 'var(--c-text-main)' : 'var(--c-text-dim)' }}>{m2.label}</p>
                  <p className="text-[10px] mt-0.5" style={{ color: mode === m2.value ? 'var(--c-text-dim)' : 'var(--c-text-muted)' }}>{m2.desc}</p>
                </button>
              ))}
            </div>
          </div>

          <button onClick={handleGenerate} disabled={loading || !hasInput}
            className="btn-primary w-full justify-center py-3 text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed">
            {loading
              ? <><div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" /> Generating {selectedMode?.label}…</>
              : <><SparklesIcon className="w-4 h-4" /> Generate {selectedMode?.label}</>}
          </button>
        </div>

        {/* ── RIGHT: Result / History ── */}
        <div className="min-h-[420px]">
          {/* Tab bar */}
          <div className="flex items-center justify-between mb-4 print:hidden">
            <div className="flex gap-1 p-1 rounded-xl" style={{ background: 'var(--c-surface-lo)', border: '1px solid var(--c-border-subtle)' }}>
              {[['result', 'Result'], ['history', 'History']].map(([v, label]) => (
                <button key={v} onClick={() => setRightTab(v)}
                  className={cn('px-4 py-1.5 rounded-lg text-[12.5px] font-medium transition-all', rightTab === v ? 'bg-white/[0.08] text-white' : 'text-white/40 hover:text-white/70')}>
                  {label}
                </button>
              ))}
            </div>

            {result && rightTab === 'result' && (
              <div className="flex items-center gap-1.5">
                {/* Save — not available for writing reviews */}
                {!savedId && resultMode !== 'writing' && (
                  <button onClick={() => setShowSave(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-all hover:bg-white/[0.06]"
                    style={{ border: '1px solid var(--c-border-dim)', color: 'var(--c-text-dim)' }}>
                    <ArrowDownTrayIcon className="w-3.5 h-3.5" />Save
                  </button>
                )}
                {savedId && (
                  <span className="text-xs text-emerald-400 flex items-center gap-1">
                    <CheckCircleIcon className="w-3.5 h-3.5" />Saved
                  </span>
                )}
                {/* Anki export for flashcards */}
                {resultMode === 'flashcards' && (
                  <button onClick={() => exportAnki(result.cards, result.topic)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-all hover:bg-white/[0.06]"
                    style={{ border: '1px solid var(--c-border-dim)', color: 'var(--c-text-dim)' }}>
                    <ArrowDownTrayIcon className="w-3.5 h-3.5" />Anki
                  </button>
                )}
                {/* Print */}
                <button onClick={() => window.print()}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-all hover:bg-white/[0.06]"
                  style={{ border: '1px solid var(--c-border-dim)', color: 'var(--c-text-dim)' }}>
                  <PrinterIcon className="w-3.5 h-3.5" />Print
                </button>
                {/* Copy */}
                <button onClick={handleCopy}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-all hover:bg-white/[0.06]"
                  style={{ border: '1px solid var(--c-border-dim)', color: 'var(--c-text-dim)' }}>
                  <ClipboardDocumentIcon className="w-3.5 h-3.5" />Copy
                </button>
              </div>
            )}
          </div>

          {/* History tab */}
          {rightTab === 'history' && (
            <HistoryPanel onLoad={session => {
              setResult(session.result)
              setResultMode(session.mode)
              setSavedId(session.id)
              setMastery(session.mastery || {})
              setTitle(session.title)
              setRightTab('result')
            }} />
          )}

          {/* Result tab */}
          {rightTab === 'result' && (
            <AnimatePresence mode="wait">
              {!result && !loading && (
                <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="h-full flex flex-col items-center justify-center text-center rounded-2xl"
                  style={{ border: '1px dashed var(--c-border-subtle)', background: 'var(--c-surface-lo)', minHeight: '400px' }}>
                  <SparklesIcon className="w-12 h-12 text-white/10 mb-3" />
                  <p className="text-white/30 text-sm font-medium">Your {mode === 'flashcards' ? 'flashcards' : mode === 'study_guide' ? 'study guide' : 'notes'} will appear here</p>
                  <p className="text-white/18 text-xs mt-1">Or switch to History to load a saved session</p>
                </motion.div>
              )}

              {loading && (
                <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="h-full flex flex-col items-center justify-center rounded-2xl"
                  style={{ border: '1px solid var(--c-border-subtle)', background: 'var(--c-surface-lo)', minHeight: '400px' }}>
                  <div className="w-10 h-10 rounded-full border-2 border-white/10 border-t-white/60 animate-spin mb-4" />
                  <p className="text-white/50 text-sm">AI is reading your content…</p>
                  <p className="text-white/25 text-xs mt-1">Usually 5–15 seconds</p>
                </motion.div>
              )}

              {result && !loading && (
                <motion.div key="result" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }} transition={{ duration: 0.28 }}>
                  {/* print header */}
                  <div className="hidden print:block mb-6">
                    <h1 className="text-2xl font-bold">{result.title || result.topic}</h1>
                    <p className="text-sm text-gray-500 mt-1">StudentHub Study Tools · {new Date().toLocaleDateString()}</p>
                  </div>

                  {resultMode === 'notes' && (
                    <NotesResult data={result} mastery={mastery} onMasteryChange={m => {
                      setMastery(m)
                      if (savedId) studySessionsApi.updateMastery(savedId, m).catch(() => {})
                    }} />
                  )}
                  {resultMode === 'study_guide' && <StudyGuideResult data={result} />}
                  {resultMode === 'flashcards' && <FlashcardsResult data={result} />}
                  {resultMode === 'writing' && <WritingFeedbackResult data={result} />}

                  {/* Follow-up chat */}
                  <div className="print:hidden">
                    <FollowUpChat result={result} mode={resultMode} />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          )}
        </div>
      </div>

      {/* Save modal */}
      <AnimatePresence>
        {showSave && (
          <SaveModal result={result} mode={resultMode} sourcePreview={sourcePreview}
            onClose={() => setShowSave(false)} onSaved={id => setSavedId(id)} />
        )}
      </AnimatePresence>
    </div>
  )
}
