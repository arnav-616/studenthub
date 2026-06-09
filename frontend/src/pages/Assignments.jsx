import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import {
  PlusIcon, MagnifyingGlassIcon, SparklesIcon,
  CheckIcon, TrashIcon, PencilSquareIcon,
  ChevronDownIcon, XMarkIcon, PaperAirplaneIcon,
  FunnelIcon,
} from '@heroicons/react/24/outline'
import Card from '../components/ui/Card'
import { assignments as assignmentsApi, subjects as subjectsApi, ai } from '../api/client'
import { toUnix, formatDueDateFull, getDueStatus, getDueBadgeColor } from '../utils/dates'
import { cn } from '../utils/cn'

const TYPE_OPTIONS = [
  { label: 'Essay', value: 'essay' },
  { label: 'Problem Set', value: 'problem_set' },
  { label: 'Lab', value: 'lab' },
  { label: 'Exam', value: 'exam' },
  { label: 'Quiz', value: 'quiz' },
  { label: 'Project', value: 'project' },
  { label: 'Reading', value: 'reading' },
  { label: 'Other', value: 'assignment' },
]
const DIFFICULTIES = ['low','medium','high']
const STATUSES = ['pending','in_progress','completed']

const DIFF_STYLE = {
  high:   { bg: 'rgba(239,68,68,0.12)',  text: '#f87171', border: 'rgba(239,68,68,0.2)' },
  medium: { bg: 'rgba(245,158,11,0.10)', text: '#fbbf24', border: 'rgba(245,158,11,0.2)' },
  low:    { bg: 'rgba(16,185,129,0.10)', text: '#34d399', border: 'rgba(16,185,129,0.2)' },
}

function AssignmentModal({ assignment, subjects, onClose, onSave }) {
  const isEdit = !!assignment?.id
  const hasSessionsInitially = !!(assignment?.sessions_total > 1 || assignment?.session_duration_mins)
  const [form, setForm] = useState({
    title: assignment?.title ?? '',
    subject_id: assignment?.subject_id ?? '',
    type: assignment?.type ?? 'essay',
    difficulty: assignment?.difficulty ?? 'medium',
    status: assignment?.status ?? 'pending',
    due_date: assignment?.due_date ? format(new Date(assignment.due_date * 1000), 'yyyy-MM-dd') : '',
    estimated_hours: assignment?.estimated_hours ?? '',
    notes: assignment?.notes ?? '',
    sessions_total: assignment?.sessions_total ?? '',
    sessions_completed: assignment?.sessions_completed ?? 0,
    session_duration_mins: assignment?.session_duration_mins ?? '',
  })
  const [multiSession, setMultiSession] = useState(hasSessionsInitially)

  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

  const sessionHours = (form.sessions_total && form.session_duration_mins)
    ? ((parseInt(form.sessions_total) - parseInt(form.sessions_completed || 0)) * parseInt(form.session_duration_mins) / 60).toFixed(1)
    : null

  function handleSubmit(e) {
    e.preventDefault()
    if (!form.title.trim()) return toast.error('Title is required')
    onSave({
      ...form,
      due_date: form.due_date ? toUnix(form.due_date) : null,
      estimated_hours: form.estimated_hours ? parseFloat(form.estimated_hours) : null,
      sessions_total: multiSession && form.sessions_total ? parseInt(form.sessions_total) : null,
      sessions_completed: multiSession ? parseInt(form.sessions_completed || 0) : 0,
      session_duration_mins: multiSession && form.session_duration_mins ? parseInt(form.session_duration_mins) : null,
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
        transition={{ duration: 0.22, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="relative z-10 w-full max-w-md glass-elevated rounded-2xl p-6"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold">{isEdit ? 'Edit Assignment' : 'New Assignment'}</h2>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg text-white/30 hover:text-white/80 hover:bg-white/[0.06] transition-all">
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
                {subjects?.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
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
              <label className="text-[11px] text-white/40 uppercase tracking-wider font-medium">Status</label>
              <select className="input-field mt-1.5" value={form.status} onChange={e => set('status', e.target.value)}>
                {STATUSES.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] text-white/40 uppercase tracking-wider font-medium">Due Date</label>
              <input type="date" className="input-field mt-1.5" value={form.due_date} onChange={e => set('due_date', e.target.value)} />
            </div>
            <div>
              <label className="text-[11px] text-white/40 uppercase tracking-wider font-medium">Est. Hours</label>
              <input type="number" step="0.5" min="0" className="input-field mt-1.5" value={form.estimated_hours} onChange={e => set('estimated_hours', e.target.value)} placeholder="2.5" />
            </div>
          </div>
          {/* Multi-session toggle */}
          <div className="rounded-xl p-3" style={{ background: 'rgba(99,102,241,0.07)', border: '1px solid rgba(99,102,241,0.15)' }}>
            <label className="flex items-center justify-between cursor-pointer" onClick={() => setMultiSession(v => !v)}>
              <div>
                <p className="text-xs font-semibold text-indigo-300">Multi-session</p>
                <p className="text-[10px] text-white/30 mt-0.5">Videos, chapters, problems spread over time</p>
              </div>
              <div className="w-9 h-5 rounded-full transition-colors flex-shrink-0" style={{ background: multiSession ? '#6366f1' : 'rgba(255,255,255,0.1)' }}>
                <div className="w-3.5 h-3.5 rounded-full bg-white mt-0.75 transition-transform"
                  style={{ transform: multiSession ? 'translateX(18px)' : 'translateX(2px)', marginTop: '3px' }} />
              </div>
            </label>
            {multiSession && (
              <div className="mt-3 grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[10px] text-white/40 uppercase tracking-wider">Total</label>
                  <input type="number" min="1" className="input-field mt-1 text-sm" value={form.sessions_total}
                    onChange={e => set('sessions_total', e.target.value)} placeholder="10" />
                </div>
                <div>
                  <label className="text-[10px] text-white/40 uppercase tracking-wider">Done</label>
                  <input type="number" min="0" className="input-field mt-1 text-sm" value={form.sessions_completed}
                    onChange={e => set('sessions_completed', e.target.value)} placeholder="0" />
                </div>
                <div>
                  <label className="text-[10px] text-white/40 uppercase tracking-wider">Min each</label>
                  <input type="number" min="1" className="input-field mt-1 text-sm" value={form.session_duration_mins}
                    onChange={e => set('session_duration_mins', e.target.value)} placeholder="30" />
                </div>
                {sessionHours && (
                  <p className="col-span-3 text-[10px] text-indigo-300/70 mt-0.5">
                    ≈ {sessionHours}h remaining work
                  </p>
                )}
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
        <input
          className="input-field pl-9"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder='e.g. "Calc problem set due Friday, 3 hours, hard"'
        />
      </div>
      <motion.button
        type="submit"
        disabled={loading || !input.trim()}
        className="btn-primary px-4 disabled:opacity-50"
        whileTap={{ scale: 0.97 }}
      >
        {loading
          ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          : <PaperAirplaneIcon className="w-4 h-4" />
        }
        {loading ? 'Parsing...' : 'Add'}
      </motion.button>
    </form>
  )
}

function AssignmentRow({ assignment, onEdit, onDelete, onToggle, index }) {
  const [expanded, setExpanded] = useState(false)
  const status = getDueStatus(assignment.due_date)
  const isComplete = assignment.status === 'completed'
  const diff = DIFF_STYLE[assignment.difficulty] || DIFF_STYLE.Medium

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, height: 0, marginBottom: 0 }}
      transition={{ duration: 0.2, delay: index * 0.02 }}
      className="rounded-xl overflow-hidden"
      style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)' }}
    >
      <div className="flex items-center gap-3 px-4 py-3.5">
        {/* Checkbox */}
        <motion.button
          onClick={() => onToggle(assignment)}
          className="w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all"
          style={{
            background: isComplete ? '#10b981' : 'transparent',
            borderColor: isComplete ? '#10b981' : 'rgba(255,255,255,0.2)',
          }}
          whileTap={{ scale: 0.9 }}
          whileHover={{ borderColor: isComplete ? '#10b981' : 'rgba(16,185,129,0.6)' }}
        >
          {isComplete && <CheckIcon className="w-3 h-3 text-white" />}
        </motion.button>

        {/* Subject dot */}
        {assignment.subject_color && (
          <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: assignment.subject_color, boxShadow: `0 0 6px ${assignment.subject_color}80` }} />
        )}

        {/* Title + meta */}
        <div className="flex-1 min-w-0">
          <p className={cn('text-sm font-medium truncate', isComplete && 'line-through text-white/35')}>
            {assignment.title}
          </p>
          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
            {assignment.subject_name && <span className="text-xs text-white/30">{assignment.subject_name}</span>}
            <span className="text-white/15 text-xs">·</span>
            <span className="text-xs text-white/25">{assignment.type}</span>
            {assignment.sessions_total > 1 ? (
              <><span className="text-white/15 text-xs">·</span>
              <span className="text-xs text-indigo-400/70">
                {assignment.sessions_completed ?? 0}/{assignment.sessions_total}
                {assignment.session_duration_mins ? ` × ${assignment.session_duration_mins}m` : ' sessions'}
              </span></>
            ) : assignment.estimated_hours ? (
              <><span className="text-white/15 text-xs">·</span><span className="text-xs text-white/25">{assignment.estimated_hours}h</span></>
            ) : null}
          </div>
        </div>

        {/* Badges */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {assignment.due_date && (
            <span className={cn('text-xs px-2 py-0.5 rounded-full', getDueBadgeColor(status))}>
              {formatDueDateFull(assignment.due_date)}
            </span>
          )}
          <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: diff.bg, color: diff.text, border: `1px solid ${diff.border}` }}>
            {assignment.difficulty ? assignment.difficulty.charAt(0).toUpperCase() + assignment.difficulty.slice(1) : '—'}
          </span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-0.5 flex-shrink-0 ml-1">
          {assignment.notes && (
            <button onClick={() => setExpanded(e => !e)} className="w-7 h-7 flex items-center justify-center rounded-lg text-white/25 hover:text-white/60 hover:bg-white/[0.05] transition-all">
              <ChevronDownIcon className={cn('w-3.5 h-3.5 transition-transform', expanded && 'rotate-180')} />
            </button>
          )}
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
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
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

export default function Assignments() {
  const qc = useQueryClient()
  const [modal, setModal] = useState(null)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterSubject, setFilterSubject] = useState('')
  const [sortField, setSortField] = useState('due_date')

  const { data: assignmentData = [], isLoading } = useQuery({
    queryKey: ['assignments', { status: filterStatus, subject_id: filterSubject, search, sort: sortField }],
    queryFn: () => assignmentsApi.list({ status: filterStatus, subject_id: filterSubject, search, sort: sortField }),
  })

  const { data: subjects = [] } = useQuery({
    queryKey: ['subjects'],
    queryFn: () => subjectsApi.list(),
  })

  const createMut = useMutation({
    mutationFn: assignmentsApi.create,
    onSuccess: () => { qc.invalidateQueries(['assignments']); qc.invalidateQueries(['dashboard']); toast.success('Assignment added'); setModal(null) },
    onError: () => toast.error('Failed to add'),
  })

  const updateMut = useMutation({
    mutationFn: ({ id, ...data }) => assignmentsApi.update(id, data),
    onSuccess: () => { qc.invalidateQueries(['assignments']); qc.invalidateQueries(['dashboard']); setModal(null) },
    onError: () => toast.error('Update failed'),
  })

  const deleteMut = useMutation({
    mutationFn: assignmentsApi.delete,
    onSuccess: () => { qc.invalidateQueries(['assignments']); qc.invalidateQueries(['dashboard']) },
  })

  function handleSave(data) {
    modal?.id ? updateMut.mutate({ id: modal.id, ...data }) : createMut.mutate(data)
  }

  function handleToggle(a) {
    updateMut.mutate({ id: a.id, status: a.status === 'completed' ? 'pending' : 'completed' })
  }

  const pending   = assignmentData.filter(a => a.status !== 'completed')
  const completed = assignmentData.filter(a => a.status === 'completed')

  return (
    <div className="space-y-5 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Assignments</h1>
          <p className="text-white/35 text-sm mt-0.5">
            <span className="text-white/70 font-medium">{pending.length}</span> pending
            {completed.length > 0 && <> · <span className="text-emerald-400/70">{completed.length}</span> done</>}
          </p>
        </div>
        <motion.button
          onClick={() => setModal('new')}
          className="btn-primary"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
        >
          <PlusIcon className="w-4 h-4" />
          New Assignment
        </motion.button>
      </div>

      {/* NL Add */}
      <div className="rounded-2xl p-4"
        style={{ background: 'rgba(99,102,241,0.07)', border: '1px solid rgba(99,102,241,0.18)' }}>
        <div className="flex items-center gap-1.5 mb-2.5">
          <SparklesIcon className="w-3.5 h-3.5 text-indigo-400" />
          <span className="text-xs font-semibold text-indigo-300 tracking-wide">Natural Language Add</span>
        </div>
        <NLAddBar subjects={subjects} onAdd={data => createMut.mutate(data)} />
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap items-center">
        <div className="relative flex-1 min-w-48">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25" />
          <input
            className="input-field pl-9 text-sm"
            placeholder="Search assignments..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select className="input-field text-sm min-w-[120px] flex-none" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="">All status</option>
          {STATUSES.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
        </select>
        <select className="input-field text-sm min-w-[120px] flex-none" value={filterSubject} onChange={e => setFilterSubject(e.target.value)}>
          <option value="">All subjects</option>
          {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <select className="input-field text-sm min-w-[130px] flex-none" value={sortField} onChange={e => setSortField(e.target.value)}>
          <option value="due_date">Due Date</option>
          <option value="created_at">Created</option>
          <option value="title">Title</option>
          <option value="difficulty">Difficulty</option>
        </select>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="space-y-2">
          {[1,2,3,4,5].map(i => <div key={i} className="skeleton h-[60px] rounded-xl" />)}
        </div>
      ) : assignmentData.length === 0 ? (
        <div className="text-center py-16 rounded-2xl" style={{ background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.06)' }}>
          <p className="text-4xl mb-3">📋</p>
          <p className="text-white/30">No assignments found</p>
          <p className="text-white/20 text-sm mt-1">Add one above or use the natural language bar!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {pending.length > 0 && (
            <div className="space-y-1.5">
              <AnimatePresence mode="popLayout">
                {pending.map((a, i) => (
                  <AssignmentRow key={a.id} assignment={a} index={i}
                    onEdit={setModal} onDelete={id => deleteMut.mutate(id)} onToggle={handleToggle} />
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
                      onEdit={setModal} onDelete={id => deleteMut.mutate(id)} onToggle={handleToggle} />
                  ))}
                </AnimatePresence>
              </div>
            </div>
          )}
        </div>
      )}

      <AnimatePresence>
        {modal && (
          <AssignmentModal
            assignment={modal === 'new' ? null : modal}
            subjects={subjects}
            onClose={() => setModal(null)}
            onSave={handleSave}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
