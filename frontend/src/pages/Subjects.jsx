import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import {
  PlusIcon, TrashIcon, PencilSquareIcon, XMarkIcon,
  BookOpenIcon, ClockIcon, CheckCircleIcon, ExclamationTriangleIcon,
  ChevronUpDownIcon,
} from '@heroicons/react/24/outline'
import Card from '../components/ui/Card'
import { subjects as subjectsApi } from '../api/client'
import api from '../api/client'
import { cn } from '../utils/cn'
import { formatDueDate } from '../utils/dates'

const PRESET_COLORS = [
  '#6366f1','#8b5cf6','#ec4899','#ef4444',
  '#f59e0b','#10b981','#06b6d4','#3b82f6',
  '#84cc16','#f97316','#a855f7','#14b8a6',
]

const SORT_OPTIONS = [
  { value: 'workload', label: 'Workload' },
  { value: 'completion', label: 'Completion' },
  { value: 'overdue', label: 'Overdue First' },
  { value: 'name', label: 'Alphabetical' },
]

function ProgressRing({ pct, color, size = 72 }) {
  const r = (size - 10) / 2
  const circ = 2 * Math.PI * r
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', flexShrink: 0 }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--c-border-subtle)" strokeWidth="5" />
      <motion.circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none" stroke={color} strokeWidth="5" strokeLinecap="round"
        initial={{ strokeDasharray: `0 ${circ}` }}
        animate={{ strokeDasharray: `${(pct / 100) * circ} ${circ}` }}
        transition={{ duration: 0.9, ease: 'easeOut' }}
        style={{ filter: `drop-shadow(0 0 5px ${color}70)` }}
      />
    </svg>
  )
}

function SubjectModal({ subject, onClose, onSave }) {
  const [form, setForm] = useState({
    name: subject?.name ?? '',
    color: subject?.color ?? PRESET_COLORS[0],
    professor: subject?.professor ?? '',
    room: subject?.room ?? '',
    office_hours: subject?.office_hours ?? '',
  })

  function handleSubmit(e) {
    e.preventDefault()
    if (!form.name.trim()) return toast.error('Subject name required')
    onSave(form)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
        className="relative glass rounded-2xl p-6 w-full max-w-sm z-10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold">{subject?.id ? 'Edit Subject' : 'New Subject'}</h2>
          <button onClick={onClose} className="text-white/40 hover:text-white/80"><XMarkIcon className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs text-white/40 uppercase tracking-wide">Name *</label>
            <input className="input-field mt-1" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Organic Chemistry" autoFocus />
          </div>
          <div>
            <label className="text-xs text-white/40 uppercase tracking-wide">Color</label>
            <div className="flex flex-wrap gap-2 mt-2">
              {PRESET_COLORS.map(c => (
                <button key={c} type="button" onClick={() => setForm(f => ({ ...f, color: c }))}
                  className={cn('w-7 h-7 rounded-full transition-all', form.color === c ? 'ring-2 ring-white ring-offset-2 ring-offset-transparent scale-110' : 'hover:scale-110')}
                  style={{ background: c }} />
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-white/40 uppercase tracking-wide">Professor</label>
              <input className="input-field mt-1" value={form.professor} onChange={e => setForm(f => ({ ...f, professor: e.target.value }))} placeholder="Optional" />
            </div>
            <div>
              <label className="text-xs text-white/40 uppercase tracking-wide">Room</label>
              <input className="input-field mt-1" value={form.room} onChange={e => setForm(f => ({ ...f, room: e.target.value }))} placeholder="Optional" />
            </div>
          </div>
          <div>
            <label className="text-xs text-white/40 uppercase tracking-wide">Office Hours</label>
            <input className="input-field mt-1" value={form.office_hours} onChange={e => setForm(f => ({ ...f, office_hours: e.target.value }))} placeholder="e.g. Mon/Wed 2–4pm, Hall 201" />
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-white/10 text-white/60 hover:text-white transition-colors">Cancel</button>
            <button type="submit" className="flex-1 btn-primary py-2.5">{subject?.id ? 'Save' : 'Add Subject'}</button>
          </div>
        </form>
      </motion.div>
    </div>
  )
}

function SubjectCard({ subject, stats, timerMins, nextDue, onEdit, onDelete }) {
  const color = subject.color || '#6366f1'
  const pct = stats?.completionRate ?? 0
  const studyHrs = timerMins ? (timerMins / 60).toFixed(1) : null

  return (
    <motion.div layout initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
      <div className="rounded-2xl overflow-hidden relative"
        style={{ background: 'var(--c-surface-lo)', borderRight: '1px solid var(--c-border-subtle)', borderBottom: '1px solid var(--c-border-subtle)', borderLeft: '1px solid var(--c-border-subtle)', borderTop: `3px solid ${color}` }}>

        {/* Header */}
        <div className="p-5 pb-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${color}20` }}>
                <BookOpenIcon className="w-4.5 h-4.5" style={{ color }} />
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-[15px] truncate">{subject.name}</p>
                {(subject.professor || subject.room) && (
                  <p className="text-xs text-white/30 mt-0.5">
                    {[subject.professor, subject.room].filter(Boolean).join(' · ')}
                  </p>
                )}
                {subject.office_hours && (
                  <p className="text-[11px] text-white/20 mt-0.5">🕐 {subject.office_hours}</p>
                )}
              </div>
            </div>
            <div className="flex gap-1 flex-shrink-0">
              <button onClick={() => onEdit(subject)} className="p-1.5 text-white/25 hover:text-indigo-400 transition-colors rounded-lg hover:bg-white/[0.04]">
                <PencilSquareIcon className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => onDelete(subject.id)} className="p-1.5 text-white/25 hover:text-red-400 transition-colors rounded-lg hover:bg-white/[0.04]">
                <TrashIcon className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Progress ring + stats */}
          {stats && (
            <div className="flex items-center gap-4 mt-4">
              <div className="relative flex-shrink-0">
                <ProgressRing pct={pct} color={color} size={72} />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-xs font-bold" style={{ color }}>{pct}%</span>
                </div>
              </div>
              <div className="flex-1 grid grid-cols-2 gap-y-2.5 gap-x-4">
                <div>
                  <p className="text-[11px] text-white/30 uppercase tracking-wider">Pending</p>
                  <p className="text-base font-bold mt-0.5" style={{ color }}>{stats.pendingCount}</p>
                </div>
                <div>
                  <p className="text-[11px] text-white/30 uppercase tracking-wider">Completed</p>
                  <p className="text-base font-bold text-emerald-400 mt-0.5">{stats.completedCount}</p>
                </div>
                <div>
                  <p className="text-[11px] text-white/30 uppercase tracking-wider">Est. Left</p>
                  <p className="text-base font-bold text-amber-400 mt-0.5">{stats.totalEstHours}h</p>
                </div>
                <div>
                  <p className="text-[11px] text-white/30 uppercase tracking-wider">Studied</p>
                  <p className="text-base font-bold text-cyan-400 mt-0.5">{studyHrs ? `${studyHrs}h` : '—'}</p>
                </div>
              </div>
            </div>
          )}

          {/* Alerts row */}
          <div className="flex flex-wrap gap-2 mt-4">
            {stats?.overdueCount > 0 && (
              <span className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg"
                style={{ background: 'rgba(239,68,68,0.1)', color: '#f87171', border: '1px solid rgba(239,68,68,0.2)' }}>
                <ExclamationTriangleIcon className="w-3 h-3" />
                {stats.overdueCount} overdue
              </span>
            )}
            {nextDue && (
              <span className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg"
                style={{ background: 'var(--c-surface-lo)', color: 'var(--c-text-dim)', border: '1px solid var(--c-border-subtle)' }}>
                <ClockIcon className="w-3 h-3" />
                Next: {nextDue.title.length > 18 ? nextDue.title.slice(0, 18) + '…' : nextDue.title} · {formatDueDate(nextDue.due_date)}
              </span>
            )}
            {stats?.avgActualHours > 0 && (
              <span className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg"
                style={{ background: 'rgba(16,185,129,0.08)', color: '#34d399', border: '1px solid rgba(16,185,129,0.15)' }}>
                <CheckCircleIcon className="w-3 h-3" />
                avg {stats.avgActualHours}h/task
              </span>
            )}
          </div>
        </div>

        {/* Weekly sparkline footer */}
        {stats?.weeklyCompleted && (
          <div className="px-5 pb-4">
            <p className="text-[10px] text-white/20 uppercase tracking-wider mb-2">Last 4 weeks</p>
            <div className="flex items-end gap-1.5 h-8">
              {stats.weeklyCompleted.map((v, i) => (
                <motion.div key={i}
                  className="flex-1 rounded-sm"
                  style={{ background: `${color}55`, minHeight: 3 }}
                  initial={{ height: 3 }}
                  animate={{ height: Math.max((v / (Math.max(...stats.weeklyCompleted, 1))) * 32, 3) }}
                  transition={{ delay: i * 0.08, duration: 0.5, ease: 'easeOut' }}
                />
              ))}
            </div>
            <div className="flex justify-between mt-1">
              {['4w ago', '3w ago', '2w ago', 'This week'].map((l, i) => (
                <span key={i} className="text-[9px] text-white/20">{l}</span>
              ))}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  )
}

export default function Subjects() {
  const qc = useQueryClient()
  const [modal, setModal] = useState(null)
  const [sortBy, setSortBy] = useState('workload')

  const { data: subjects = [], isLoading } = useQuery({
    queryKey: ['subjects'],
    queryFn: subjectsApi.list,
  })

  const { data: subjectStats = [] } = useQuery({
    queryKey: ['analytics', 'subjects'],
    queryFn: () => api.get('/analytics/subjects'),
  })

  const { data: timerStats = [] } = useQuery({
    queryKey: ['timer-subject-stats'],
    queryFn: () => api.get('/timer/stats/subjects'),
  })

  const { data: allAssignments = [] } = useQuery({
    queryKey: ['assignments', { status: 'pending' }],
    queryFn: () => api.get('/assignments', { params: { status: 'pending', sort: 'due_date', order: 'asc' } }),
  })

  const statsMap = useMemo(() => Object.fromEntries(subjectStats.map(s => [s.id, s])), [subjectStats])
  const timerMap = useMemo(() => Object.fromEntries(timerStats.map(s => [s.subject_id, s.total_minutes])), [timerStats])
  const nextDueMap = useMemo(() => {
    const map = {}
    for (const a of allAssignments) {
      if (a.subject_id && a.due_date && !map[a.subject_id]) map[a.subject_id] = a
    }
    return map
  }, [allAssignments])

  const sortedSubjects = useMemo(() => {
    const s = [...subjects]
    if (sortBy === 'workload') return s.sort((a, b) => (statsMap[b.id]?.totalEstHours ?? 0) - (statsMap[a.id]?.totalEstHours ?? 0))
    if (sortBy === 'completion') return s.sort((a, b) => (statsMap[a.id]?.completionRate ?? 0) - (statsMap[b.id]?.completionRate ?? 0))
    if (sortBy === 'overdue') return s.sort((a, b) => (statsMap[b.id]?.overdueCount ?? 0) - (statsMap[a.id]?.overdueCount ?? 0))
    return s.sort((a, b) => a.name.localeCompare(b.name))
  }, [subjects, statsMap, sortBy])

  const createMut = useMutation({
    mutationFn: subjectsApi.create,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['subjects'] }); qc.invalidateQueries({ queryKey: ['analytics', 'subjects'] }); setModal(null); toast.success('Subject added') },
    onError: () => toast.error('Failed to add subject'),
  })
  const updateMut = useMutation({
    mutationFn: ({ id, ...data }) => subjectsApi.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['subjects'] }); qc.invalidateQueries({ queryKey: ['assignments'] }); setModal(null) },
  })
  const deleteMut = useMutation({
    mutationFn: subjectsApi.delete,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['subjects'] }); qc.invalidateQueries({ queryKey: ['analytics', 'subjects'] }); toast.success('Subject deleted') },
    onError: () => toast.error('Cannot delete — assignments still attached'),
  })

  function handleSave(data) {
    modal?.id ? updateMut.mutate({ id: modal.id, ...data }) : createMut.mutate(data)
  }

  // Summary stats
  const totalPending   = subjectStats.reduce((a, s) => a + (s.pendingCount ?? 0), 0)
  const totalHours     = subjectStats.reduce((a, s) => a + (s.totalEstHours ?? 0), 0)
  const totalCompleted = subjectStats.reduce((a, s) => a + (s.completedCount ?? 0), 0)
  const totalStudied   = timerStats.reduce((a, s) => a + (s.total_minutes ?? 0), 0)
  const overallPct     = (totalPending + totalCompleted) > 0 ? Math.round((totalCompleted / (totalPending + totalCompleted)) * 100) : 0

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Subjects</h1>
          <p className="text-white/40 text-sm mt-0.5">{subjects.length} courses this semester</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-white/30">
            <ChevronUpDownIcon className="w-3.5 h-3.5" />
            <select className="bg-transparent text-white/50 text-xs outline-none cursor-pointer" value={sortBy} onChange={e => setSortBy(e.target.value)}>
              {SORT_OPTIONS.map(o => <option key={o.value} value={o.value} className="bg-[#0d1023]">{o.label}</option>)}
            </select>
          </div>
          <motion.button onClick={() => setModal('new')} className="btn-primary flex items-center gap-2" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <PlusIcon className="w-4 h-4" /> Add Subject
          </motion.button>
        </div>
      </div>

      {/* Summary bar */}
      {subjects.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Overall Progress', value: `${overallPct}%`, color: '#6366f1', sub: `${totalCompleted} done` },
            { label: 'Pending Tasks',    value: totalPending,    color: '#f87171', sub: 'across all subjects' },
            { label: 'Hours Remaining',  value: `${totalHours.toFixed(1)}h`, color: '#fbbf24', sub: 'estimated work left' },
            { label: 'Total Studied',    value: `${(totalStudied / 60).toFixed(1)}h`, color: '#22d3ee', sub: 'logged study time' },
          ].map(s => (
            <div key={s.label} className="rounded-xl p-4" style={{ background: `${s.color}0d`, border: `1px solid ${s.color}22` }}>
              <p className="text-[10px] text-white/35 uppercase tracking-wider">{s.label}</p>
              <p className="text-xl font-bold mt-1" style={{ color: s.color }}>{s.value}</p>
              <p className="text-[11px] text-white/25 mt-0.5">{s.sub}</p>
            </div>
          ))}
        </div>
      )}

      {/* Cards */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[1,2,3,4].map(i => <div key={i} className="skeleton h-56 rounded-2xl" />)}
        </div>
      ) : subjects.length === 0 ? (
        <Card className="text-center py-16">
          <BookOpenIcon className="w-10 h-10 text-white/15 mx-auto mb-3" />
          <p className="text-white/30 text-sm">No subjects yet. Add your classes to start tracking!</p>
          <button onClick={() => setModal('new')} className="btn-primary mt-4 mx-auto">Add First Subject</button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <AnimatePresence mode="popLayout">
            {sortedSubjects.map(s => (
              <SubjectCard
                key={s.id}
                subject={s}
                stats={statsMap[s.id]}
                timerMins={timerMap[s.id]}
                nextDue={nextDueMap[s.id]}
                onEdit={setModal}
                onDelete={id => deleteMut.mutate(id)}
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      <AnimatePresence>
        {modal && (
          <SubjectModal
            subject={modal === 'new' ? null : modal}
            onClose={() => setModal(null)}
            onSave={handleSave}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
