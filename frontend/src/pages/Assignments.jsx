import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import {
  PlusIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  SparklesIcon,
  CheckIcon,
  TrashIcon,
  PencilSquareIcon,
  ChevronDownIcon,
  XMarkIcon,
  PaperAirplaneIcon,
} from '@heroicons/react/24/outline'
import Card from '../components/ui/Card'
import { assignments as assignmentsApi, subjects as subjectsApi, ai } from '../api/client'
import { toUnix, formatDueDateFull, getDueStatus, getDueBadgeColor } from '../utils/dates'
import { cn } from '../utils/cn'

const TYPES = ['Essay', 'Problem Set', 'Lab Report', 'Exam', 'Quiz', 'Project', 'Reading', 'Presentation', 'Other']
const DIFFICULTIES = ['Low', 'Medium', 'High']
const STATUSES = ['pending', 'in_progress', 'completed']

function StatusDot({ status }) {
  const colors = { pending: 'bg-white/20', in_progress: 'bg-amber-400', completed: 'bg-emerald-400' }
  return <span className={cn('inline-block w-2 h-2 rounded-full', colors[status] || colors.pending)} />
}

function AssignmentModal({ assignment, subjects, onClose, onSave }) {
  const isEdit = !!assignment?.id
  const [form, setForm] = useState({
    title: assignment?.title ?? '',
    subject_id: assignment?.subject_id ?? '',
    type: assignment?.type ?? 'Essay',
    difficulty: assignment?.difficulty ?? 'Medium',
    status: assignment?.status ?? 'pending',
    due_date: assignment?.due_date ? format(new Date(assignment.due_date * 1000), 'yyyy-MM-dd') : '',
    estimated_hours: assignment?.estimated_hours ?? '',
    notes: assignment?.notes ?? '',
  })

  function handleChange(k, v) {
    setForm(f => ({ ...f, [k]: v }))
  }

  function handleSubmit(e) {
    e.preventDefault()
    if (!form.title.trim()) return toast.error('Title is required')
    onSave({
      ...form,
      due_date: form.due_date ? toUnix(form.due_date) : null,
      estimated_hours: form.estimated_hours ? parseFloat(form.estimated_hours) : null,
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative glass rounded-2xl p-6 w-full max-w-lg z-10"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold">{isEdit ? 'Edit Assignment' : 'New Assignment'}</h2>
          <button onClick={onClose} className="text-white/40 hover:text-white/80 transition-colors">
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs text-white/40 uppercase tracking-wide">Title *</label>
            <input
              className="input-field mt-1"
              value={form.title}
              onChange={e => handleChange('title', e.target.value)}
              placeholder="Assignment title"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-white/40 uppercase tracking-wide">Subject</label>
              <select className="input-field mt-1" value={form.subject_id} onChange={e => handleChange('subject_id', e.target.value)}>
                <option value="">None</option>
                {subjects?.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-white/40 uppercase tracking-wide">Type</label>
              <select className="input-field mt-1" value={form.type} onChange={e => handleChange('type', e.target.value)}>
                {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-white/40 uppercase tracking-wide">Difficulty</label>
              <select className="input-field mt-1" value={form.difficulty} onChange={e => handleChange('difficulty', e.target.value)}>
                {DIFFICULTIES.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-white/40 uppercase tracking-wide">Status</label>
              <select className="input-field mt-1" value={form.status} onChange={e => handleChange('status', e.target.value)}>
                {STATUSES.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-white/40 uppercase tracking-wide">Due Date</label>
              <input type="date" className="input-field mt-1" value={form.due_date} onChange={e => handleChange('due_date', e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-white/40 uppercase tracking-wide">Est. Hours</label>
              <input type="number" step="0.5" min="0" className="input-field mt-1" value={form.estimated_hours} onChange={e => handleChange('estimated_hours', e.target.value)} placeholder="2.5" />
            </div>
          </div>
          <div>
            <label className="text-xs text-white/40 uppercase tracking-wide">Notes</label>
            <textarea
              className="input-field mt-1 h-20 resize-none"
              value={form.notes}
              onChange={e => handleChange('notes', e.target.value)}
              placeholder="Optional notes..."
            />
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-white/10 text-white/60 hover:text-white hover:border-white/20 transition-colors">
              Cancel
            </button>
            <button type="submit" className="flex-1 btn-primary py-2.5">
              {isEdit ? 'Save Changes' : 'Add Assignment'}
            </button>
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
      toast.success('Assignment parsed by AI!')
    } catch {
      toast.error('Could not parse — try the manual form')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <div className="flex-1 relative">
        <SparklesIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-400" />
        <input
          className="input-field pl-9 pr-4"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder='Try: "Calc problem set due Friday, 3 hours, hard"'
        />
      </div>
      <button
        type="submit"
        disabled={loading || !input.trim()}
        className="btn-primary px-4 flex items-center gap-2 disabled:opacity-50"
      >
        {loading ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <PaperAirplaneIcon className="w-4 h-4" />}
        {loading ? 'Parsing...' : 'Add'}
      </button>
    </form>
  )
}

function AssignmentRow({ assignment, onEdit, onDelete, onToggle }) {
  const [expanded, setExpanded] = useState(false)
  const status = getDueStatus(assignment.due_date)

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8, height: 0 }}
      className="glass rounded-xl overflow-hidden"
    >
      <div className="flex items-center gap-3 p-3.5">
        <button
          onClick={() => onToggle(assignment)}
          className={cn(
            'w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all',
            assignment.status === 'completed'
              ? 'bg-emerald-500 border-emerald-500'
              : 'border-white/20 hover:border-emerald-400'
          )}
        >
          {assignment.status === 'completed' && <CheckIcon className="w-3 h-3 text-white" />}
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={cn('text-sm font-medium truncate', assignment.status === 'completed' && 'line-through text-white/40')}>
              {assignment.title}
            </span>
            {assignment.subject_color && (
              <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: assignment.subject_color }} />
            )}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs text-white/30">{assignment.subject_name || 'No subject'}</span>
            <span className="text-white/20">·</span>
            <span className="text-xs text-white/30">{assignment.type}</span>
            {assignment.estimated_hours && (
              <>
                <span className="text-white/20">·</span>
                <span className="text-xs text-white/30">{assignment.estimated_hours}h</span>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {assignment.due_date && (
            <span className={cn('text-xs px-2 py-0.5 rounded-full', getDueBadgeColor(status))}>
              {formatDueDateFull(assignment.due_date)}
            </span>
          )}
          <span className={cn(
            'text-xs px-2 py-0.5 rounded-full',
            assignment.difficulty === 'High' ? 'bg-red-500/10 text-red-400' :
            assignment.difficulty === 'Medium' ? 'bg-amber-500/10 text-amber-400' :
            'bg-emerald-500/10 text-emerald-400'
          )}>
            {assignment.difficulty}
          </span>
          <button onClick={() => setExpanded(e => !e)} className="text-white/30 hover:text-white/60 transition-colors p-1">
            <ChevronDownIcon className={cn('w-4 h-4 transition-transform', expanded && 'rotate-180')} />
          </button>
          <button onClick={() => onEdit(assignment)} className="text-white/30 hover:text-indigo-400 transition-colors p-1">
            <PencilSquareIcon className="w-4 h-4" />
          </button>
          <button onClick={() => onDelete(assignment.id)} className="text-white/30 hover:text-red-400 transition-colors p-1">
            <TrashIcon className="w-4 h-4" />
          </button>
        </div>
      </div>

      <AnimatePresence>
        {expanded && assignment.notes && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-white/[0.06] px-4 py-3"
          >
            <p className="text-sm text-white/50">{assignment.notes}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

export default function Assignments() {
  const qc = useQueryClient()
  const [modal, setModal] = useState(null) // null | 'new' | assignment object
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
    onError: () => toast.error('Failed to add assignment'),
  })

  const updateMut = useMutation({
    mutationFn: ({ id, ...data }) => assignmentsApi.update(id, data),
    onSuccess: () => { qc.invalidateQueries(['assignments']); qc.invalidateQueries(['dashboard']); toast.success('Assignment updated'); setModal(null) },
    onError: () => toast.error('Failed to update'),
  })

  const deleteMut = useMutation({
    mutationFn: assignmentsApi.delete,
    onSuccess: () => { qc.invalidateQueries(['assignments']); qc.invalidateQueries(['dashboard']); toast.success('Deleted') },
  })

  function handleSave(data) {
    if (modal?.id) {
      updateMut.mutate({ id: modal.id, ...data })
    } else {
      createMut.mutate(data)
    }
  }

  function handleToggle(a) {
    const newStatus = a.status === 'completed' ? 'pending' : 'completed'
    updateMut.mutate({ id: a.id, status: newStatus })
  }

  async function handleNLAdd(parsed) {
    createMut.mutate(parsed)
  }

  const pending = assignmentData.filter(a => a.status !== 'completed')
  const completed = assignmentData.filter(a => a.status === 'completed')

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Assignments</h1>
          <p className="text-white/40 text-sm mt-0.5">{pending.length} pending · {completed.length} done</p>
        </div>
        <motion.button
          onClick={() => setModal('new')}
          className="btn-primary flex items-center gap-2"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <PlusIcon className="w-4 h-4" />
          New Assignment
        </motion.button>
      </div>

      {/* NL Add */}
      <Card>
        <p className="text-xs text-white/40 uppercase tracking-wide mb-2 flex items-center gap-1.5">
          <SparklesIcon className="w-3.5 h-3.5 text-indigo-400" />
          Natural Language Add
        </p>
        <NLAddBar subjects={subjects} onAdd={handleNLAdd} />
      </Card>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
          <input
            className="input-field pl-9 text-sm"
            placeholder="Search assignments..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select className="input-field text-sm min-w-32" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="">All Status</option>
          {STATUSES.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
        </select>
        <select className="input-field text-sm min-w-32" value={filterSubject} onChange={e => setFilterSubject(e.target.value)}>
          <option value="">All Subjects</option>
          {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <select className="input-field text-sm min-w-32" value={sortField} onChange={e => setSortField(e.target.value)}>
          <option value="due_date">Sort: Due Date</option>
          <option value="created_at">Sort: Created</option>
          <option value="title">Sort: Title</option>
          <option value="difficulty">Sort: Difficulty</option>
        </select>
      </div>

      {/* Assignment list */}
      {isLoading ? (
        <div className="space-y-2">
          {[1,2,3,4].map(i => <div key={i} className="skeleton h-16 rounded-xl" />)}
        </div>
      ) : assignmentData.length === 0 ? (
        <Card className="text-center py-12">
          <p className="text-white/30 text-lg">No assignments found</p>
          <p className="text-white/20 text-sm mt-1">Add one above or use natural language!</p>
        </Card>
      ) : (
        <div className="space-y-2">
          <AnimatePresence mode="popLayout">
            {pending.map(a => (
              <AssignmentRow
                key={a.id}
                assignment={a}
                onEdit={setModal}
                onDelete={id => deleteMut.mutate(id)}
                onToggle={handleToggle}
              />
            ))}
          </AnimatePresence>

          {completed.length > 0 && (
            <div className="pt-2">
              <p className="text-xs text-white/30 uppercase tracking-wide mb-2">Completed</p>
              <AnimatePresence mode="popLayout">
                {completed.map(a => (
                  <AssignmentRow
                    key={a.id}
                    assignment={a}
                    onEdit={setModal}
                    onDelete={id => deleteMut.mutate(id)}
                    onToggle={handleToggle}
                  />
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      )}

      {/* Modal */}
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
