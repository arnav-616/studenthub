import { useState, useEffect, useRef, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import confetti from 'canvas-confetti'
import {
  PlusIcon, MagnifyingGlassIcon, SparklesIcon,
  CheckIcon, TrashIcon, PencilSquareIcon,
  ChevronDownIcon, XMarkIcon, PaperAirplaneIcon,
  DocumentTextIcon, ArrowDownTrayIcon, ArrowPathIcon,
  Squares2X2Icon, Bars3Icon, ExclamationTriangleIcon,
  EllipsisHorizontalIcon, FunnelIcon, AdjustmentsHorizontalIcon,
} from '@heroicons/react/24/outline'
import Card from '../components/ui/Card'
import AssignmentDrawer from '../components/ui/AssignmentDrawer'
import { assignments as assignmentsApi, subjects as subjectsApi, ai } from '../api/client'
import { CalendarDaysIcon, TableCellsIcon, ShareIcon, LinkIcon } from '@heroicons/react/24/outline'
import { toUnix, formatDueDateFull, getDueStatus, getDueBadgeColor } from '../utils/dates'
import { cn } from '../utils/cn'

const STATUSES = ['pending', 'in_progress', 'completed']

const DIFF_STYLE = {
  high:   { bg: 'rgba(239,68,68,0.12)',  text: '#f87171', border: 'rgba(239,68,68,0.2)' },
  medium: { bg: 'rgba(245,158,11,0.10)', text: '#fbbf24', border: 'rgba(245,158,11,0.2)' },
  low:    { bg: 'rgba(16,185,129,0.10)', text: '#34d399', border: 'rgba(16,185,129,0.2)' },
}

function fireConfetti() {
  confetti({
    particleCount: 80,
    spread: 60,
    origin: { y: 0.7 },
    colors: ['#6366f1', '#8b5cf6', '#10b981', '#f59e0b', '#ec4899'],
    zIndex: 9999,
  })
}

// ── Syllabus importer modal ───────────────────────────────────────────────────
function SyllabusModal({ onClose, onImport }) {
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [selected, setSelected] = useState([])

  async function handleParse() {
    if (!text.trim()) return
    setLoading(true)
    try {
      const data = await ai.parseSyllabus(text)
      setResult(data)
      setSelected(data.assignments.map((_, i) => i))
    } catch (err) {
      toast.error(err?.message || 'Failed to parse syllabus')
    } finally {
      setLoading(false)
    }
  }

  function toggleSelect(i) {
    setSelected(s => s.includes(i) ? s.filter(x => x !== i) : [...s, i])
  }

  function handleImport() {
    const toImport = result.assignments.filter((_, i) => selected.includes(i))
    onImport(toImport)
    onClose()
    toast.success(`Imported ${toImport.length} assignments!`)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }} onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 8 }}
        className="relative z-10 w-full max-w-2xl glass-elevated rounded-2xl p-6 max-h-[90vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <DocumentTextIcon className="w-5 h-5 text-indigo-400" />
            <h2 className="font-semibold">Syllabus Importer</h2>
          </div>
          <button onClick={onClose} className="text-white/30 hover:text-white/80"><XMarkIcon className="w-5 h-5" /></button>
        </div>

        {!result ? (
          <>
            <p className="text-sm text-white/40 mb-3">Paste your course syllabus below. AI will extract every assignment, exam, reading, and deadline.</p>
            <textarea
              className="input-field flex-1 resize-none text-sm min-h-[200px]"
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder="Paste syllabus text here — course schedule, assignment list, exam dates..."
            />
            <div className="flex gap-3 mt-4">
              <button onClick={onClose} className="btn-ghost flex-1 justify-center py-2.5">Cancel</button>
              <button onClick={handleParse} disabled={loading || text.trim().length < 50} className="btn-primary flex-1 justify-center py-2.5 disabled:opacity-50">
                {loading
                  ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Parsing...</>
                  : <><SparklesIcon className="w-4 h-4" />Extract Assignments</>
                }
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-white/60">
                Found <span className="text-white font-semibold">{result.totalFound}</span> items
                {result.courseName && <> in <span className="text-indigo-300">{result.courseName}</span></>}
              </p>
              <div className="flex gap-2">
                <button onClick={() => setSelected(result.assignments.map((_, i) => i))} className="text-xs text-indigo-400 hover:text-indigo-300">All</button>
                <button onClick={() => setSelected([])} className="text-xs text-white/30 hover:text-white/60">None</button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
              {result.assignments.map((a, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.02 }}
                  onClick={() => toggleSelect(i)}
                  className={cn('flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all',
                    selected.includes(i)
                      ? 'bg-indigo-500/10 border border-indigo-500/25'
                      : 'bg-white/[0.02] border border-white/[0.04] opacity-50'
                  )}
                >
                  <div className={cn('w-4 h-4 rounded border-2 flex-shrink-0 flex items-center justify-center',
                    selected.includes(i) ? 'border-indigo-400 bg-indigo-500' : 'border-white/20'
                  )}>
                    {selected.includes(i) && <CheckIcon className="w-2.5 h-2.5 text-white" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{a.title}</p>
                    <p className="text-xs text-white/30 mt-0.5">
                      {a.type} · {a.difficulty}
                      {a.due_date && ` · Due ${format(new Date(a.due_date * 1000), 'MMM d')}`}
                      {a.estimated_hours && ` · ${a.estimated_hours}h`}
                    </p>
                  </div>
                  {a.notes && <p className="text-xs text-white/25 max-w-[120px] truncate">{a.notes}</p>}
                </motion.div>
              ))}
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={() => setResult(null)} className="btn-ghost px-4 py-2.5">← Re-parse</button>
              <button onClick={handleImport} disabled={selected.length === 0} className="btn-primary flex-1 justify-center py-2.5 disabled:opacity-50">
                <ArrowDownTrayIcon className="w-4 h-4" /> Import {selected.length} Assignment{selected.length !== 1 ? 's' : ''}
              </button>
            </div>
          </>
        )}
      </motion.div>
    </div>
  )
}

// ── Templates Modal ──────────────────────────────────────────────────────────
function TemplatesModal({ onClose, onSelect }) {
  const qc = useQueryClient()
  const { data: templates = [] } = useQuery({
    queryKey: ['assignment-templates'],
    queryFn: () => assignmentsApi.getTemplates(),
  })
  const deleteMut = useMutation({
    mutationFn: id => assignmentsApi.deleteTemplate(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['assignment-templates'] }),
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        className="relative z-10 glass-elevated rounded-2xl p-6 w-full max-w-md max-h-[70vh] flex flex-col"
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold">Assignment Templates</h2>
          <button onClick={onClose} className="text-white/30 hover:text-white/60"><XMarkIcon className="w-5 h-5" /></button>
        </div>
        {templates.length === 0 ? (
          <p className="text-white/30 text-sm text-center py-8">No templates yet. Save an assignment as a template from the assignment drawer.</p>
        ) : (
          <div className="overflow-y-auto flex-1 space-y-2">
            {templates.map(t => (
              <div key={t.id} className="flex items-center gap-3 p-3 rounded-xl border border-white/[0.06] hover:bg-white/[0.03] cursor-pointer group"
                onClick={() => { onSelect(t); onClose() }}>
                <div className="flex-1">
                  <p className="text-sm font-medium text-white/80">{t.name}</p>
                  <p className="text-xs text-white/30 mt-0.5">{t.type} · {t.difficulty} · {t.estimated_hours ? `${t.estimated_hours}h` : 'no time est.'}</p>
                </div>
                <button onClick={e => { e.stopPropagation(); deleteMut.mutate(t.id) }}
                  className="opacity-0 group-hover:opacity-100 text-white/25 hover:text-red-400 p-1">
                  <TrashIcon className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  )
}

// ── NL Add bar ────────────────────────────────────────────────────────────────
function NLAddBar({ subjects, onAdd }) {
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!input.trim()) return
    setLoading(true)
    try {
      const parsed = await ai.parseNL(input, subjects)
      onAdd(parsed)
      setInput('')
      toast.success('Parsed by AI!')
    } catch (err) {
      const msg = err?.message || ''
      if (msg.includes('authentication') || msg.includes('API key') || msg.includes('apiKey')) {
        toast.error('Add your Gemini API key to backend/.env to use AI features')
      } else {
        toast.error(msg ? `AI error: ${msg}` : 'Could not parse — try the manual form')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <div className="flex-1 relative">
        <SparklesIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-400" />
        <input className="input-field pl-9" value={input} onChange={e => setInput(e.target.value)}
          placeholder='e.g. "Calc problem set due Friday, 3 hours, hard"' />
      </div>
      <motion.button type="submit" disabled={loading || !input.trim()} className="btn-primary px-4 disabled:opacity-50" whileTap={{ scale: 0.97 }}>
        {loading ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <PaperAirplaneIcon className="w-4 h-4" />}
        {loading ? 'Parsing...' : 'Add'}
      </motion.button>
    </form>
  )
}

// ── Assignment row ────────────────────────────────────────────────────────────
function AssignmentRow({ assignment, onEdit, onDelete, onToggle, onView, onDuplicate, index, isFocused, bulkMode, isSelected, onSelect, editingDateId, onDateClick, onDateSave }) {
  const [expanded, setExpanded] = useState(false)
  const [dateVal, setDateVal] = useState('')
  const [hovered, setHovered] = useState(false)
  const [justCompleted, setJustCompleted] = useState(false)
  const dateInputRef = useRef(null)
  const prevCompleteRef = useRef(assignment.status === 'completed')
  const status = getDueStatus(assignment.due_date)
  const isComplete = assignment.status === 'completed'
  const diff = DIFF_STYLE[assignment.difficulty] || DIFF_STYLE.medium
  const progress = assignment.progress ?? 0
  const isEditingDate = editingDateId === assignment.id

  useEffect(() => {
    if (!prevCompleteRef.current && isComplete) {
      setJustCompleted(true)
      const t = setTimeout(() => setJustCompleted(false), 700)
      return () => clearTimeout(t)
    }
    prevCompleteRef.current = isComplete
  }, [isComplete])

  useEffect(() => {
    if (isEditingDate) {
      setDateVal(assignment.due_date ? new Date(assignment.due_date * 1000).toISOString().slice(0, 10) : '')
      setTimeout(() => dateInputRef.current?.focus(), 30)
    }
  }, [isEditingDate])

  const glowColor = assignment.subject_color || '#6366f1'

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, height: 0, marginBottom: 0 }}
      transition={{ duration: 0.2, delay: index * 0.02 }}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      className="assignment-row rounded-xl overflow-hidden relative"
      style={{
        background: justCompleted
          ? 'rgba(16,185,129,0.1)'
          : isFocused
          ? 'rgba(99,102,241,0.08)'
          : hovered
          ? `color-mix(in srgb, ${glowColor} 6%, var(--c-surface-lo))`
          : 'var(--c-surface-lo)',
        border: justCompleted
          ? '1px solid rgba(16,185,129,0.35)'
          : isFocused
          ? '1px solid rgba(99,102,241,0.35)'
          : hovered
          ? `1px solid color-mix(in srgb, ${glowColor} 35%, transparent)`
          : '1px solid var(--c-border-subtle)',
        borderLeft: `3px solid ${glowColor}`,
        boxShadow: justCompleted
          ? '0 4px 20px rgba(16,185,129,0.15)'
          : hovered && assignment.subject_color
          ? `0 4px 24px color-mix(in srgb, ${glowColor} 20%, transparent)`
          : undefined,
        transition: 'background 0.18s, border 0.18s, box-shadow 0.18s',
      }}
    >
      {justCompleted && (
        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className="absolute inset-0 pointer-events-none rounded-xl"
          style={{ background: 'rgba(16,185,129,0.08)', transformOrigin: 'left' }}
        />
      )}
      <div className="flex items-center gap-3 px-4 py-3.5">
        {bulkMode ? (
          <button onClick={() => onSelect(assignment.id)}
            className={cn('w-5 h-5 rounded border-2 flex-shrink-0 flex items-center justify-center transition-all',
              isSelected ? 'bg-indigo-500 border-indigo-500' : 'border-white/20 hover:border-indigo-400')}>
            {isSelected && <CheckIcon className="w-3 h-3 text-white" />}
          </button>
        ) : (
          <motion.button onClick={() => onToggle(assignment)}
            className="w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all"
            style={{ background: isComplete ? '#10b981' : 'transparent', borderColor: isComplete ? '#10b981' : 'var(--c-text-muted)' }}
            whileTap={{ scale: 0.9 }} whileHover={{ borderColor: isComplete ? '#10b981' : 'rgba(16,185,129,0.6)' }}>
            {isComplete && <CheckIcon className="w-3 h-3 text-white" />}
          </motion.button>
        )}

        <button className="flex-1 min-w-0 text-left" onClick={() => onView(assignment)}>
          <p className={cn('text-sm font-medium truncate', isComplete && 'line-through text-white/35')}>
            {assignment.title}
            {assignment.is_recurring ? <ArrowPathIcon className="w-3 h-3 inline ml-1.5 text-emerald-400/60" /> : null}
          </p>
          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
            {assignment.subject_name && <span className="text-xs text-white/30">{assignment.subject_name}</span>}
            <span className="text-white/15 text-xs">·</span>
            <span className="text-xs text-white/25">{assignment.type}</span>
            {assignment.estimated_hours && (
              <><span className="text-white/15 text-xs">·</span><span className="text-xs text-white/25">{assignment.estimated_hours}h</span></>
            )}
            {/* Tags display */}
            {assignment.tags && (() => {
              try {
                const tags = typeof assignment.tags === 'string' ? JSON.parse(assignment.tags) : assignment.tags
                return Array.isArray(tags) && tags.length > 0 ? tags.map(tag => (
                  <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded-full bg-indigo-500/15 text-indigo-300">{tag}</span>
                )) : null
              } catch { return null }
            })()}
          </div>
          {!isComplete && progress > 0 && (
            <div className="mt-1.5 h-1 bg-white/[0.06] rounded-full overflow-hidden w-full max-w-[160px]">
              <div className="h-full rounded-full transition-all" style={{ width: `${progress}%`, background: 'var(--accent)' }} />
            </div>
          )}
        </button>

        <div className="flex items-center gap-2 flex-shrink-0">
          {isEditingDate ? (
            <input ref={dateInputRef} type="date" value={dateVal}
              className="text-xs rounded-full px-2 py-0.5 bg-white/10 border border-indigo-400/40 text-white outline-none"
              onChange={e => setDateVal(e.target.value)}
              onBlur={() => { onDateSave(assignment.id, dateVal); }}
              onKeyDown={e => { if (e.key === 'Enter') { onDateSave(assignment.id, dateVal) } else if (e.key === 'Escape') onDateSave(assignment.id, null) }} />
          ) : (
            <button onClick={() => onDateClick(assignment.id)}
              className={cn('text-xs px-2 py-0.5 rounded-full transition-all hover:opacity-80', assignment.due_date ? getDueBadgeColor(status) : 'text-white/20 hover:text-white/40')}>
              {assignment.due_date ? formatDueDateFull(assignment.due_date) : '+ date'}
            </button>
          )}
          <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: diff.bg, color: diff.text, border: `1px solid ${diff.border}` }}>
            {assignment.difficulty ? assignment.difficulty.charAt(0).toUpperCase() + assignment.difficulty.slice(1) : '—'}
          </span>
        </div>

        <div className={cn(
          'flex items-center gap-0.5 flex-shrink-0 ml-1 transition-all duration-150',
          (hovered || isFocused) ? 'opacity-100' : 'opacity-0 pointer-events-none'
        )}>
          {assignment.notes && (
            <button onClick={() => setExpanded(e => !e)} className="w-7 h-7 flex items-center justify-center rounded-lg text-white/25 hover:text-white/60 hover:bg-white/[0.05] transition-all">
              <ChevronDownIcon className={cn('w-3.5 h-3.5 transition-transform', expanded && 'rotate-180')} />
            </button>
          )}
          <button onClick={() => onDuplicate(assignment)} className="w-7 h-7 flex items-center justify-center rounded-lg text-white/25 hover:text-white/60 hover:bg-white/[0.05] transition-all" title="Duplicate">
            <DocumentTextIcon className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => onEdit(assignment)} className="w-7 h-7 flex items-center justify-center rounded-lg text-white/25 hover:text-indigo-400 hover:bg-indigo-500/10 transition-all">
            <PencilSquareIcon className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => onDelete(assignment.id)} className="w-7 h-7 flex items-center justify-center rounded-lg text-white/25 hover:text-red-400 hover:bg-red-500/10 transition-all">
            <TrashIcon className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="px-4 pb-3 pt-0">
              <div className="h-px bg-white/[0.05] mb-3" />
              <p className="text-sm text-white/45 leading-relaxed">{assignment.notes}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// ── Kanban card ───────────────────────────────────────────────────────────────
function KanbanCard({ assignment, onEdit, onDelete, onToggle, onView }) {
  const status = getDueStatus(assignment.due_date)
  const isComplete = assignment.status === 'completed'
  const diff = DIFF_STYLE[assignment.difficulty] || DIFF_STYLE.medium
  return (
    <motion.div layout initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
      className="rounded-2xl p-3 group cursor-pointer"
      style={{ background: 'var(--c-surface-lo)', border: '1px solid var(--c-border-subtle)' }}
      onClick={() => onView(assignment)}>
      <div className="flex items-start justify-between gap-2 mb-2">
        <p className={cn('text-[13px] font-semibold leading-snug flex-1', isComplete && 'line-through text-white/35')}>
          {assignment.title}
        </p>
        <button onClick={e => { e.stopPropagation(); onDelete(assignment.id) }}
          className="opacity-0 group-hover:opacity-100 p-1 rounded text-white/20 hover:text-red-400 transition-all flex-shrink-0">
          <TrashIcon className="w-3 h-3" />
        </button>
      </div>
      <div className="flex flex-wrap items-center gap-1.5 mb-3">
        {assignment.subject_color && (
          <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: assignment.subject_color }} />
        )}
        {assignment.subject_name && <span className="text-[10px] text-white/30">{assignment.subject_name}</span>}
        <span className="text-[10px] px-1.5 py-0.5 rounded-md" style={{ background: diff.bg, color: diff.text }}>
          {assignment.difficulty}
        </span>
      </div>
      <div className="flex items-center justify-between">
        {assignment.due_date ? (
          <span className={cn('text-[11px] px-2 py-0.5 rounded-full', getDueBadgeColor(status))}>
            {formatDueDateFull(assignment.due_date)}
          </span>
        ) : <span />}
        <div className="flex items-center gap-1">
          <button onClick={e => { e.stopPropagation(); onEdit(assignment) }}
            className="p-1 rounded text-white/20 hover:text-indigo-400 transition-colors">
            <PencilSquareIcon className="w-3.5 h-3.5" />
          </button>
          <button onClick={e => { e.stopPropagation(); onToggle(assignment) }}
            className={cn('w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all',
              isComplete ? 'bg-emerald-500 border-emerald-500' : 'border-white/20 hover:border-emerald-500/60')}>
            {isComplete && <CheckIcon className="w-2.5 h-2.5 text-white" />}
          </button>
        </div>
      </div>
    </motion.div>
  )
}

const KANBAN_COLS = [
  { key: 'pending',     label: 'Not Started', color: '#64748b' },
  { key: 'in_progress', label: 'In Progress',  color: '#6366f1' },
  { key: 'completed',   label: 'Done',         color: '#10b981' },
]

function KanbanView({ assignments, onEdit, onDelete, onToggle, onView }) {
  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {KANBAN_COLS.map(col => {
        const cards = assignments.filter(a => a.status === col.key)
        return (
          <div key={col.key} className="flex-shrink-0 w-72">
            <div className="flex items-center gap-2 mb-3 px-1">
              <div className="w-2 h-2 rounded-full" style={{ background: col.color }} />
              <span className="text-[11px] font-semibold text-white/45 uppercase tracking-wider">{col.label}</span>
              <span className="text-[11px] text-white/25 ml-auto">{cards.length}</span>
            </div>
            <div className="space-y-2">
              <AnimatePresence>
                {cards.map(a => (
                  <KanbanCard key={a.id} assignment={a}
                    onEdit={onEdit} onDelete={onDelete} onToggle={onToggle} onView={onView} />
                ))}
              </AnimatePresence>
              {cards.length === 0 && (
                <div className="rounded-2xl py-8 text-center" style={{ border: '1px dashed var(--c-border-subtle)' }}>
                  <p className="text-[11px] text-white/20">Empty</p>
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Empty state ───────────────────────────────────────────────────────────────
function EmptyAssignments({ hasFilters }) {
  return (
    <div className="text-center py-16 rounded-2xl" style={{ background: 'var(--c-surface-lo)', border: '1px dashed var(--c-border-subtle)' }}>
      <svg className="w-16 h-16 mx-auto mb-4 opacity-20" viewBox="0 0 64 64" fill="none">
        <rect x="8" y="12" width="48" height="40" rx="6" stroke="white" strokeWidth="2" />
        <line x1="18" y1="24" x2="46" y2="24" stroke="white" strokeWidth="2" strokeLinecap="round" />
        <line x1="18" y1="32" x2="40" y2="32" stroke="white" strokeWidth="2" strokeLinecap="round" />
        <line x1="18" y1="40" x2="34" y2="40" stroke="white" strokeWidth="2" strokeLinecap="round" />
        <circle cx="14" cy="24" r="2" fill="white" opacity="0.5" />
        <circle cx="14" cy="32" r="2" fill="white" opacity="0.5" />
        <circle cx="14" cy="40" r="2" fill="white" opacity="0.5" />
      </svg>
      <p className="text-white/40 font-medium">
        {hasFilters ? 'No assignments match your filters' : 'No assignments yet'}
      </p>
      <p className="text-white/20 text-sm mt-1">
        {hasFilters ? 'Try clearing filters' : 'Add one above or use the natural language bar!'}
      </p>
    </div>
  )
}

// Inline assignment modal (for this worktree version)
const TYPE_OPTIONS = [
  { label: 'Essay',       value: 'essay' },
  { label: 'Problem Set', value: 'problem_set' },
  { label: 'Lab',         value: 'lab' },
  { label: 'Exam',        value: 'exam' },
  { label: 'Quiz',        value: 'quiz' },
  { label: 'Project',     value: 'project' },
  { label: 'Reading',     value: 'reading' },
  { label: 'Other',       value: 'assignment' },
]
const DIFFICULTIES = ['low', 'medium', 'high']

function AssignmentModal({ assignment, subjects = [], onClose, onSave }) {
  const isEdit = !!assignment?.id
  const [form, setForm] = useState({
    title: assignment?.title ?? '',
    subject_id: assignment?.subject_id ?? '',
    type: assignment?.type ?? 'essay',
    difficulty: assignment?.difficulty ?? 'medium',
    status: assignment?.status ?? 'pending',
    due_date: assignment?.due_date ? format(new Date(assignment.due_date * 1000), 'yyyy-MM-dd') : '',
    estimated_hours: assignment?.estimated_hours ?? '',
    notes: assignment?.notes ?? '',
    tags: (() => {
      try {
        const t = assignment?.tags
        if (!t) return ''
        return (typeof t === 'string' ? JSON.parse(t) : t).join(', ')
      } catch { return '' }
    })(),
  })

  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

  function handleSubmit(e) {
    e.preventDefault()
    if (!form.title.trim()) return toast.error('Title is required')
    const tags = form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : []
    onSave({
      ...form,
      subject_id: form.subject_id || null,
      due_date: form.due_date ? toUnix(form.due_date) : null,
      estimated_hours: form.estimated_hours ? parseFloat(form.estimated_hours) : null,
      tags,
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}
        onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 8 }}
        className="relative z-10 w-full max-w-md glass-elevated rounded-2xl p-6 overflow-y-auto max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold">{isEdit ? 'Edit Assignment' : 'New Assignment'}</h2>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg text-white/30 hover:text-white/80 hover:bg-white/[0.06]">
            <XMarkIcon className="w-4 h-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="text-[11px] text-white/40 uppercase tracking-wider font-medium">Title *</label>
            <input className="input-field mt-1.5" value={form.title} onChange={e => set('title', e.target.value)} placeholder="Assignment title" autoFocus />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] text-white/40 uppercase tracking-wider font-medium">Subject</label>
              <select className="input-field mt-1.5" value={form.subject_id} onChange={e => set('subject_id', e.target.value)}>
                <option value="">None</option>
                {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[11px] text-white/40 uppercase tracking-wider font-medium">Type</label>
              <select className="input-field mt-1.5" value={form.type} onChange={e => set('type', e.target.value)}>
                {TYPE_OPTIONS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] text-white/40 uppercase tracking-wider font-medium">Difficulty</label>
              <select className="input-field mt-1.5" value={form.difficulty} onChange={e => set('difficulty', e.target.value)}>
                {DIFFICULTIES.map(d => <option key={d} value={d}>{d.charAt(0).toUpperCase() + d.slice(1)}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[11px] text-white/40 uppercase tracking-wider font-medium">Due Date</label>
              <input type="date" className="input-field mt-1.5" value={form.due_date} onChange={e => set('due_date', e.target.value)} />
            </div>
          </div>
          <div>
            <label className="text-[11px] text-white/40 uppercase tracking-wider font-medium">Est. Hours</label>
            <input type="number" step="0.5" min="0" className="input-field mt-1.5" value={form.estimated_hours} onChange={e => set('estimated_hours', e.target.value)} placeholder="2.5" />
          </div>
          <div>
            <label className="text-[11px] text-white/40 uppercase tracking-wider font-medium">Tags</label>
            <input className="input-field mt-1.5 text-sm" value={form.tags} onChange={e => set('tags', e.target.value)} placeholder="e.g. midterm, lab, research (comma-separated)" />
            {form.tags && (
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {form.tags.split(',').map(t => t.trim()).filter(Boolean).map(tag => (
                  <span key={tag} className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-300">{tag}</span>
                ))}
              </div>
            )}
          </div>
          <div>
            <label className="text-[11px] text-white/40 uppercase tracking-wider font-medium">Notes</label>
            <textarea className="input-field mt-1.5 h-20 resize-none" value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Optional notes..." />
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="btn-ghost flex-1 justify-center py-2.5">Cancel</button>
            <button type="submit" className="btn-primary flex-1 justify-center py-2.5">{isEdit ? 'Save Changes' : 'Add Assignment'}</button>
          </div>
        </form>
      </motion.div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function Assignments() {
  const qc = useQueryClient()
  const [modal, setModal] = useState(null)
  const [drawer, setDrawer] = useState(null)
  const [syllabusOpen, setSyllabusOpen] = useState(false)
  const [templatesOpen, setTemplatesOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterSubject, setFilterSubject] = useState('')
  const [filterTag, setFilterTag] = useState('')
  const [sortField, setSortField] = useState('due_date')
  const [viewMode, setViewMode] = useState('list') // 'list' | 'kanban'
  const [focusedIdx, setFocusedIdx] = useState(-1)
  const [bulkMode, setBulkMode] = useState(false)
  const [selected, setSelected] = useState(new Set())
  const [editingDateId, setEditingDateId] = useState(null)
  const [showFilters, setShowFilters] = useState(false)
  const [moreMenuOpen, setMoreMenuOpen] = useState(false)
  const [shareLink, setShareLink] = useState(null)
  const [shareLoading, setShareLoading] = useState(false)
  const moreMenuRef = useRef(null)

  const { data: allAssignments = [], isLoading } = useQuery({
    queryKey: ['assignments', { status: filterStatus, subject_id: filterSubject, search, sort: sortField }],
    queryFn: () => assignmentsApi.list({ status: filterStatus, subject_id: filterSubject, search, sort: sortField }),
  })

  const allTags = useMemo(() => {
    const tags = new Set()
    for (const a of allAssignments) {
      const t = typeof a.tags === 'string' ? JSON.parse(a.tags || '[]') : (a.tags || [])
      t.forEach(tag => tags.add(tag))
    }
    return [...tags].sort()
  }, [allAssignments])

  const assignmentData = useMemo(() => {
    if (!filterTag) return allAssignments
    return allAssignments.filter(a => {
      const t = typeof a.tags === 'string' ? JSON.parse(a.tags || '[]') : (a.tags || [])
      return t.includes(filterTag)
    })
  }, [allAssignments, filterTag])

  const { data: subjects = [] } = useQuery({ queryKey: ['subjects'], queryFn: () => subjectsApi.list() })

  // Conflict detector — 3+ assignments due within 48 hours of each other
  const conflictDates = useMemo(() => {
    const pending = allAssignments.filter(a => a.due_date && a.status !== 'completed')
    const conflicts = []
    for (const a of pending) {
      const window48 = pending.filter(b => b.id !== a.id && Math.abs(b.due_date - a.due_date) <= 48 * 3600)
      if (window48.length >= 2) {
        const dateStr = new Date(a.due_date * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        if (!conflicts.find(c => c.dateStr === dateStr)) {
          conflicts.push({ dateStr, count: window48.length + 1, date: a.due_date })
        }
      }
    }
    return conflicts.sort((a, b) => a.date - b.date).slice(0, 3)
  }, [allAssignments])

  const createMut = useMutation({
    mutationFn: assignmentsApi.create,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['assignments'] }); qc.invalidateQueries({ queryKey: ['dashboard'] }); toast.success('Assignment added'); setModal(null) },
    onError: () => toast.error('Failed to add'),
  })

  const updateMut = useMutation({
    mutationFn: ({ id, ...data }) => assignmentsApi.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['assignments'] }); qc.invalidateQueries({ queryKey: ['dashboard'] }); setModal(null) },
    onError: (err) => toast.error(err?.message || 'Update failed'),
  })

  const deleteMut = useMutation({
    mutationFn: assignmentsApi.delete,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['assignments'] }); qc.invalidateQueries({ queryKey: ['dashboard'] }) },
  })

  function handleDuplicate(a) {
    const { id, status, completed_at, created_at, updated_at, subject_name, subject_color, ...rest } = a
    createMut.mutate({ ...rest, status: 'pending' })
    toast.success('Duplicated')
  }

  function handleDateClick(id) { setEditingDateId(id) }
  function handleDateSave(id, dateStr) {
    setEditingDateId(null)
    if (dateStr === null) return
    const due_date = dateStr ? Math.floor(new Date(dateStr).getTime() / 1000) : null
    updateMut.mutate({ id, due_date })
  }

  function toggleSelect(id) {
    setSelected(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })
  }

  async function handleBulkComplete() {
    for (const id of selected) await assignmentsApi.update(id, { status: 'completed' })
    qc.invalidateQueries({ queryKey: ['assignments'] }); qc.invalidateQueries({ queryKey: ['dashboard'] })
    setSelected(new Set()); setBulkMode(false); toast.success(`${selected.size} assignments completed`)
  }

  async function handleBulkDelete() {
    for (const id of selected) await assignmentsApi.delete(id)
    qc.invalidateQueries({ queryKey: ['assignments'] }); qc.invalidateQueries({ queryKey: ['dashboard'] })
    setSelected(new Set()); setBulkMode(false); toast.success(`${selected.size} deleted`)
  }

  const visibleList = assignmentData.filter(a => a.status !== 'completed')
  useEffect(() => {
    function onKey(e) {
      if (modal || drawer || syllabusOpen || templatesOpen) return
      const tag = document.activeElement?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
      if (e.key === 'j') { e.preventDefault(); setFocusedIdx(i => Math.min(i + 1, visibleList.length - 1)) }
      else if (e.key === 'k') { e.preventDefault(); setFocusedIdx(i => Math.max(i - 1, 0)) }
      else if (e.key === 'Escape') { setFocusedIdx(-1); setBulkMode(false); setSelected(new Set()) }
      else if (focusedIdx >= 0 && visibleList[focusedIdx]) {
        const a = visibleList[focusedIdx]
        if (e.key === 'Enter') { e.preventDefault(); setDrawer(a) }
        else if (e.key === 'e') { e.preventDefault(); setModal(a) }
        else if (e.key === 'x') { e.preventDefault(); handleToggle(a) }
        else if (e.key === 'd') { e.preventDefault(); handleDuplicate(a) }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [modal, drawer, syllabusOpen, templatesOpen, focusedIdx, visibleList])

  useEffect(() => {
    function onClickOutside(e) {
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target)) setMoreMenuOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  async function handleShare() {
    setShareLoading(true)
    try {
      const { token } = await assignmentsApi.createShareLink()
      const url = `${window.location.origin}/share/${token}`
      setShareLink(url)
      setMoreMenuOpen(false)
      await navigator.clipboard.writeText(url).catch(() => {})
      toast.success('Share link copied to clipboard!')
    } catch {
      toast.error('Could not generate share link')
    } finally {
      setShareLoading(false)
    }
  }

  async function handleBulkImport(items) {
    let count = 0
    for (const item of items) {
      try { await assignmentsApi.create(item); count++ } catch (_) {}
    }
    qc.invalidateQueries({ queryKey: ['assignments'] })
    qc.invalidateQueries({ queryKey: ['dashboard'] })
    toast.success(`Imported ${count} assignments`)
  }

  function handleSave(data) {
    modal?.id ? updateMut.mutate({ id: modal.id, ...data }) : createMut.mutate(data)
  }

  function handleToggle(a) {
    const completing = a.status !== 'completed'
    updateMut.mutate({ id: a.id, status: completing ? 'completed' : 'pending' })
    if (completing) {
      fireConfetti()
      toast.success('Nice work! Assignment complete 🎉')
    }
  }

  // Handle template selection — pre-fill the modal
  function handleTemplateSelect(template) {
    setModal({
      title: template.name || '',
      type: template.type || 'essay',
      difficulty: template.difficulty || 'medium',
      estimated_hours: template.estimated_hours || '',
      subject_id: template.subject_id || '',
      notes: template.notes || '',
      tags: template.tags || '',
    })
  }

  const hasFilters = !!(search || filterStatus || filterSubject || filterTag)
  const pending   = assignmentData.filter(a => a.status !== 'completed')
  const completed = assignmentData.filter(a => a.status === 'completed')
  const activeFilterCount = [filterStatus, filterSubject, filterTag, sortField !== 'due_date' ? sortField : ''].filter(Boolean).length
  const pendingHours = pending.reduce((acc, a) => acc + (a.estimated_hours || 0), 0)

  return (
    <div className="space-y-5 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Assignments</h1>
          <p className="text-white/35 text-sm mt-0.5">
            <span className="text-white/70 font-medium">{pending.length}</span> pending
            {completed.length > 0 && <> · <span className="text-emerald-400/70">{completed.length}</span> done</>}
          </p>
        </div>
        <div className="flex gap-2 items-center">
          <div className="flex glass rounded-xl overflow-hidden p-0.5 gap-0.5">
            <button onClick={() => setViewMode('list')} title="List view"
              className={cn('p-2 rounded-lg transition-all', viewMode === 'list' ? 'bg-white/10 text-white' : 'text-white/30 hover:text-white/60')}>
              <Bars3Icon className="w-4 h-4" />
            </button>
            <button onClick={() => setViewMode('kanban')} title="Kanban view"
              className={cn('p-2 rounded-lg transition-all', viewMode === 'kanban' ? 'bg-white/10 text-white' : 'text-white/30 hover:text-white/60')}>
              <Squares2X2Icon className="w-4 h-4" />
            </button>
            <button onClick={() => { setBulkMode(b => !b); setSelected(new Set()) }} title="Select mode"
              className={cn('px-2.5 py-1.5 rounded-lg transition-all text-xs font-medium', bulkMode ? 'bg-indigo-500/20 text-indigo-300' : 'text-white/30 hover:text-white/60')}>
              Select
            </button>
          </div>
          {/* ··· overflow menu */}
          <div className="relative" ref={moreMenuRef}>
            <button
              onClick={() => setMoreMenuOpen(o => !o)}
              title="Templates, import &amp; export"
              className={cn('flex items-center gap-1 px-2.5 py-1.5 rounded-xl transition-all text-xs font-medium', moreMenuOpen ? 'bg-white/10 text-white' : 'text-white/35 hover:text-white/70 hover:bg-white/[0.05]')}
              style={{ border: '1px solid var(--c-border-dim)' }}>
              <EllipsisHorizontalIcon className="w-4 h-4" />
              <span className="hidden sm:inline">More</span>
            </button>
            <AnimatePresence>
              {moreMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: -4 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -4 }}
                  transition={{ duration: 0.12 }}
                  className="absolute right-0 top-full mt-1.5 w-52 rounded-xl z-30 overflow-hidden"
                  style={{ background: 'var(--c-dropdown-bg)', border: '1px solid var(--c-input-toggle-off)', backdropFilter: 'blur(20px)', boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}>
                  <button
                    onClick={() => { setTemplatesOpen(true); setMoreMenuOpen(false) }}
                    className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-white/60 hover:text-white hover:bg-white/[0.05] transition-colors text-left">
                    <DocumentTextIcon className="w-4 h-4 flex-shrink-0 text-indigo-400" /> Templates
                  </button>
                  <div className="h-px bg-white/[0.05]" />
                  <button
                    onClick={() => { setSyllabusOpen(true); setMoreMenuOpen(false) }}
                    className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-white/60 hover:text-white hover:bg-white/[0.05] transition-colors text-left">
                    <ArrowDownTrayIcon className="w-4 h-4 flex-shrink-0 text-emerald-400" /> Import Syllabus
                  </button>
                  <div className="h-px bg-white/[0.05]" />
                  <button
                    onClick={() => { assignmentsApi.exportIcs().catch(() => toast.error('Export failed')); setMoreMenuOpen(false) }}
                    className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-white/60 hover:text-white hover:bg-white/[0.05] transition-colors text-left">
                    <CalendarDaysIcon className="w-4 h-4 flex-shrink-0 text-sky-400" /> Export to Calendar (.ics)
                  </button>
                  <button
                    onClick={() => { assignmentsApi.exportCsv().catch(() => toast.error('Export failed')); setMoreMenuOpen(false) }}
                    className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-white/60 hover:text-white hover:bg-white/[0.05] transition-colors text-left">
                    <TableCellsIcon className="w-4 h-4 flex-shrink-0 text-amber-400" /> Export to CSV
                  </button>
                  <div className="h-px bg-white/[0.05]" />
                  <button
                    onClick={handleShare}
                    disabled={shareLoading}
                    className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-white/60 hover:text-white hover:bg-white/[0.05] transition-colors text-left disabled:opacity-50">
                    <ShareIcon className="w-4 h-4 flex-shrink-0 text-violet-400" /> Share (read-only link)
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <motion.button onClick={() => setModal('new')} className="btn-primary" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
            <PlusIcon className="w-4 h-4" /> New
          </motion.button>
        </div>
      </div>

      {/* Share link banner */}
      <AnimatePresence>
        {shareLink && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="rounded-xl p-3 flex items-center gap-3"
            style={{ background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.25)' }}>
            <LinkIcon className="w-4 h-4 text-violet-400 flex-shrink-0" />
            <p className="text-sm text-white/70 flex-1 truncate">
              <span className="text-violet-300 font-medium">Read-only link: </span>
              <span className="text-white/50 text-xs">{shareLink}</span>
            </p>
            <button
              onClick={async () => { await navigator.clipboard.writeText(shareLink); toast.success('Copied!') }}
              className="text-xs text-violet-400 hover:text-violet-300 flex-shrink-0 px-2 py-1 rounded-lg hover:bg-violet-500/10 transition-colors">
              Copy
            </button>
            <button
              onClick={async () => { await assignmentsApi.revokeShareLink(); setShareLink(null); toast.success('Link revoked') }}
              className="text-xs text-white/25 hover:text-red-400 flex-shrink-0 transition-colors">
              Revoke
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* NL Add */}
      <div className="rounded-2xl p-4" style={{ background: 'rgba(99,102,241,0.07)', border: '1px solid rgba(99,102,241,0.18)' }}>
        <div className="flex items-center gap-1.5 mb-2.5">
          <SparklesIcon className="w-3.5 h-3.5 text-indigo-400" />
          <span className="text-xs font-semibold text-indigo-300 tracking-wide">Natural Language Add</span>
        </div>
        <NLAddBar subjects={subjects} onAdd={data => createMut.mutate(data)} />
      </div>

      {/* Conflict banner */}
      {conflictDates.length > 0 && (
        <div className="rounded-xl p-3 border border-amber-400/20 bg-amber-400/5 flex items-start gap-3">
          <ExclamationTriangleIcon className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-amber-300">Deadline crunch detected</p>
            <p className="text-xs text-white/50 mt-0.5">
              {conflictDates.map(c => `${c.count} due around ${c.dateStr}`).join(' · ')}
            </p>
          </div>
        </div>
      )}

      {/* Search + filter toggle */}
      <div className="flex gap-2 items-center">
        <div className="relative flex-1 min-w-48">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25" />
          <input className="input-field pl-9 text-sm" placeholder="Search assignments..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <button
          onClick={() => setShowFilters(f => !f)}
          className={cn('flex items-center gap-2 px-3 py-2 rounded-xl text-sm transition-all flex-none',
            (showFilters || activeFilterCount > 0)
              ? 'bg-indigo-500/15 text-indigo-300 border border-indigo-500/25'
              : 'text-white/40 hover:text-white/70 hover:bg-white/[0.05]',
          )}
          style={(showFilters || activeFilterCount > 0) ? {} : { border: '1px solid var(--c-border-dim)' }}>
          <FunnelIcon className="w-4 h-4" />
          Filters
          {activeFilterCount > 0 && (
            <span className="w-4 h-4 rounded-full text-[10px] font-bold bg-indigo-500 text-white flex items-center justify-center leading-none">
              {activeFilterCount}
            </span>
          )}
        </button>
      </div>

      {/* Collapsible filter panel */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.18 }}
            className="overflow-hidden">
            <div className="flex gap-2 flex-wrap pb-1">
              <select className="input-field text-sm min-w-[120px] flex-none" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                <option value="">All status</option>
                {STATUSES.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
              </select>
              <select className="input-field text-sm min-w-[120px] flex-none" value={filterSubject} onChange={e => setFilterSubject(e.target.value)}>
                <option value="">All subjects</option>
                {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              {allTags.length > 0 && (
                <select className="input-field text-sm min-w-[110px] flex-none" value={filterTag} onChange={e => setFilterTag(e.target.value)}>
                  <option value="">All tags</option>
                  {allTags.map(tag => <option key={tag} value={tag}>{tag}</option>)}
                </select>
              )}
              <select className="input-field text-sm min-w-[130px] flex-none" value={sortField} onChange={e => setSortField(e.target.value)}>
                <option value="due_date">Sort: Due Date</option>
                <option value="created_at">Sort: Created</option>
                <option value="title">Sort: Title</option>
                <option value="difficulty">Sort: Difficulty</option>
              </select>
              {activeFilterCount > 0 && (
                <button
                  onClick={() => { setFilterStatus(''); setFilterSubject(''); setFilterTag(''); setSortField('due_date') }}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm text-white/30 hover:text-white/60 transition-colors flex-none"
                  style={{ border: '1px solid var(--c-border-subtle)' }}>
                  <XMarkIcon className="w-3.5 h-3.5" /> Clear
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* List / Kanban */}
      {isLoading ? (
        <div className="space-y-2">{[1,2,3,4,5].map(i => <div key={i} className="skeleton h-[60px] rounded-xl" />)}</div>
      ) : assignmentData.length === 0 ? (
        <EmptyAssignments hasFilters={hasFilters} />
      ) : viewMode === 'kanban' ? (
        <KanbanView assignments={assignmentData}
          onEdit={setModal} onDelete={id => deleteMut.mutate(id)}
          onToggle={handleToggle} onView={setDrawer} />
      ) : (
        <div className="space-y-4">
          {pending.length > 0 && (
            <div className="space-y-1.5">
              <div className="flex items-center gap-2.5 mb-3">
                <span className="text-[11px] font-semibold text-white/35 uppercase tracking-wider">Pending</span>
                <span className="text-[11px] text-white/20">{pending.length} task{pending.length !== 1 ? 's' : ''}</span>
                {pendingHours > 0 && <span className="text-[11px] text-white/15">· ~{pendingHours % 1 === 0 ? pendingHours : pendingHours.toFixed(1)}h</span>}
                <div className="h-px flex-1 bg-white/[0.04]" />
              </div>
              <AnimatePresence mode="popLayout">
                {pending.map((a, i) => (
                  <AssignmentRow key={a.id} assignment={a} index={i}
                    isFocused={viewMode === 'list' && focusedIdx === i}
                    bulkMode={bulkMode} isSelected={selected.has(a.id)} onSelect={toggleSelect}
                    editingDateId={editingDateId} onDateClick={handleDateClick} onDateSave={handleDateSave}
                    onEdit={setModal} onDelete={id => deleteMut.mutate(id)}
                    onToggle={handleToggle} onView={setDrawer} onDuplicate={handleDuplicate} />
                ))}
              </AnimatePresence>
            </div>
          )}
          {completed.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="h-px flex-1 bg-white/[0.05]" />
                <span className="text-[11px] text-white/25 font-medium uppercase tracking-widest">Completed · {completed.length}</span>
                <div className="h-px flex-1 bg-white/[0.05]" />
              </div>
              <div className="space-y-1.5 opacity-60">
                <AnimatePresence mode="popLayout">
                  {completed.map((a, i) => (
                    <AssignmentRow key={a.id} assignment={a} index={i}
                      isFocused={false}
                      bulkMode={bulkMode} isSelected={selected.has(a.id)} onSelect={toggleSelect}
                      editingDateId={editingDateId} onDateClick={handleDateClick} onDateSave={handleDateSave}
                      onEdit={setModal} onDelete={id => deleteMut.mutate(id)}
                      onToggle={handleToggle} onView={setDrawer} onDuplicate={handleDuplicate} />
                  ))}
                </AnimatePresence>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Bulk action bar */}
      <AnimatePresence>
        {bulkMode && selected.size > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-5 py-3 rounded-2xl shadow-2xl"
            style={{ background: 'var(--c-dropdown-bg)', border: '1px solid var(--c-border-dim)', backdropFilter: 'blur(20px)' }}
          >
            <span className="text-sm text-white/60 font-medium">{selected.size} selected</span>
            <div className="w-px h-4 bg-white/10" />
            <button onClick={handleBulkComplete}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 transition-all">
              <CheckIcon className="w-3.5 h-3.5" /> Complete all
            </button>
            <button onClick={handleBulkDelete}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium bg-red-500/15 text-red-400 hover:bg-red-500/25 transition-all">
              <TrashIcon className="w-3.5 h-3.5" /> Delete all
            </button>
            <button onClick={() => { setBulkMode(false); setSelected(new Set()) }}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-white/30 hover:text-white/70 hover:bg-white/[0.06] transition-all">
              <XMarkIcon className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {modal && (
          <AssignmentModal
            assignment={modal === 'new' ? null : modal}
            subjects={subjects}
            onClose={() => setModal(null)}
            onSave={handleSave}
          />
        )}
        {syllabusOpen && (
          <SyllabusModal onClose={() => setSyllabusOpen(false)} onImport={handleBulkImport} />
        )}
        {templatesOpen && (
          <TemplatesModal onClose={() => setTemplatesOpen(false)} onSelect={handleTemplateSelect} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {drawer && (
          <AssignmentDrawer
            assignment={drawer}
            subjects={subjects}
            onClose={() => setDrawer(null)}
            onEdit={a => { setDrawer(null); setModal(a) }}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
