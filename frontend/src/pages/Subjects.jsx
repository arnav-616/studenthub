import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import {
  PlusIcon, TrashIcon, PencilSquareIcon, XMarkIcon,
  BookOpenIcon, ClockIcon, CheckCircleIcon, ExclamationTriangleIcon,
  ArrowTrendingUpIcon,
} from '@heroicons/react/24/outline'
import Card from '../components/ui/Card'
import { subjects as subjectsApi, assignments as assignmentsApi } from '../api/client'
import api from '../api/client'
import { cn } from '../utils/cn'

const PRESET_COLORS = [
  '#6366f1','#8b5cf6','#ec4899','#ef4444',
  '#f59e0b','#10b981','#06b6d4','#3b82f6',
  '#84cc16','#f97316','#a855f7','#14b8a6',
]

function MiniSparkline({ data, color }) {
  if (!data?.length) return null
  const max = Math.max(...data, 1)
  const w = 60, h = 24
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - (v / max) * h}`).join(' ')
  return (
    <svg width={w} height={h} className="overflow-visible">
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.7" />
    </svg>
  )
}

function SubjectModal({ subject, onClose, onSave }) {
  const [form, setForm] = useState({
    name: subject?.name ?? '',
    color: subject?.color ?? PRESET_COLORS[0],
    professor: subject?.professor ?? '',
    room: subject?.room ?? '',
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
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-white/10 text-white/60 hover:text-white transition-colors">Cancel</button>
            <button type="submit" className="flex-1 btn-primary py-2.5">{subject?.id ? 'Save' : 'Add Subject'}</button>
          </div>
        </form>
      </motion.div>
    </div>
  )
}

function SubjectCard({ subject, stats, onEdit, onDelete }) {
  const [expanded, setExpanded] = useState(false)
  const color = subject.color || '#6366f1'

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <Card className="p-0 overflow-hidden">
        <div className="h-1" style={{ background: color }} />
        <div className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${color}20` }}>
                <BookOpenIcon className="w-4 h-4" style={{ color }} />
              </div>
              <div>
                <p className="font-semibold text-sm">{subject.name}</p>
                {subject.professor && <p className="text-xs text-white/30">{subject.professor}</p>}
              </div>
            </div>
            <div className="flex gap-1">
              <button onClick={() => onEdit(subject)} className="p-1.5 text-white/30 hover:text-indigo-400 transition-colors rounded-lg hover:bg-white/[0.04]">
                <PencilSquareIcon className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => onDelete(subject.id)} className="p-1.5 text-white/30 hover:text-red-400 transition-colors rounded-lg hover:bg-white/[0.04]">
                <TrashIcon className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {stats && (
            <div className="mt-4 grid grid-cols-3 gap-3 text-center">
              <div>
                <p className="text-xl font-bold" style={{ color }}>{stats.pendingCount}</p>
                <p className="text-[10px] text-white/30 mt-0.5">Pending</p>
              </div>
              <div>
                <p className="text-xl font-bold text-emerald-400">{stats.completionRate}%</p>
                <p className="text-[10px] text-white/30 mt-0.5">Done rate</p>
              </div>
              <div>
                <p className="text-xl font-bold text-amber-400">{stats.totalEstHours}h</p>
                <p className="text-[10px] text-white/30 mt-0.5">Left</p>
              </div>
            </div>
          )}

          {stats && (
            <button
              onClick={() => setExpanded(e => !e)}
              className="w-full mt-3 text-xs text-white/25 hover:text-white/50 flex items-center justify-center gap-1 transition-colors"
            >
              <ArrowTrendingUpIcon className="w-3.5 h-3.5" />
              {expanded ? 'Hide' : 'Show'} Analytics
            </button>
          )}
        </div>

        <AnimatePresence>
          {expanded && stats && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden border-t border-white/[0.05]"
            >
              <div className="p-4 space-y-3">
                {/* Completion trend sparkline */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] text-white/30 uppercase tracking-wider">4-Week Completion</p>
                    <div className="flex items-end gap-1 mt-1">
                      {stats.weeklyCompleted.map((v, i) => (
                        <motion.div key={i}
                          className="w-5 rounded-sm"
                          style={{ background: `${color}60`, minHeight: 3 }}
                          initial={{ height: 3 }}
                          animate={{ height: Math.max(v * 8, 3) }}
                          transition={{ delay: i * 0.08, duration: 0.5, ease: 'easeOut' }}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-white/30">Total assigned</p>
                    <p className="text-sm font-semibold" style={{ color }}>{stats.totalAssignments}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  {stats.overdueCount > 0 && (
                    <div className="flex items-center gap-1.5 p-2 rounded-lg" style={{ background: 'rgba(239,68,68,0.08)' }}>
                      <ExclamationTriangleIcon className="w-3.5 h-3.5 text-red-400" />
                      <span className="text-red-400">{stats.overdueCount} overdue</span>
                    </div>
                  )}
                  {stats.avgActualHours > 0 && (
                    <div className="flex items-center gap-1.5 p-2 rounded-lg" style={{ background: 'rgba(99,102,241,0.08)' }}>
                      <ClockIcon className="w-3.5 h-3.5 text-indigo-400" />
                      <span className="text-indigo-400">avg {stats.avgActualHours}h actual</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1.5 p-2 rounded-lg" style={{ background: 'rgba(16,185,129,0.08)' }}>
                    <CheckCircleIcon className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400">{stats.completedCount} completed</span>
                  </div>
                  {subject.room && (
                    <div className="p-2 rounded-lg bg-white/[0.04] text-white/40">
                      📍 {subject.room}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </motion.div>
  )
}

export default function Subjects() {
  const qc = useQueryClient()
  const [modal, setModal] = useState(null)

  const { data: subjects = [], isLoading } = useQuery({
    queryKey: ['subjects'],
    queryFn: subjectsApi.list,
  })

  const { data: subjectStats = [] } = useQuery({
    queryKey: ['analytics', 'subjects'],
    queryFn: () => api.get('/analytics/subjects'),
  })

  const statsMap = Object.fromEntries(subjectStats.map(s => [s.id, s]))

  const createMut = useMutation({
    mutationFn: subjectsApi.create,
    onSuccess: () => { qc.invalidateQueries(['subjects']); qc.invalidateQueries(['analytics', 'subjects']); setModal(null); toast.success('Subject added') },
    onError: () => toast.error('Failed to add subject'),
  })

  const updateMut = useMutation({
    mutationFn: ({ id, ...data }) => subjectsApi.update(id, data),
    onSuccess: () => { qc.invalidateQueries(['subjects']); qc.invalidateQueries(['assignments']); setModal(null) },
  })

  const deleteMut = useMutation({
    mutationFn: subjectsApi.delete,
    onSuccess: () => { qc.invalidateQueries(['subjects']); qc.invalidateQueries(['analytics', 'subjects']); toast.success('Subject deleted') },
    onError: () => toast.error('Cannot delete — assignments still attached'),
  })

  function handleSave(data) {
    modal?.id ? updateMut.mutate({ id: modal.id, ...data }) : createMut.mutate(data)
  }

  const totalPending = subjectStats.reduce((a, s) => a + s.pendingCount, 0)
  const totalHours = subjectStats.reduce((a, s) => a + s.totalEstHours, 0)

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Subjects</h1>
          <p className="text-white/40 text-sm mt-0.5">
            {subjects.length} subjects · {totalPending} pending · {totalHours.toFixed(1)}h remaining
          </p>
        </div>
        <motion.button onClick={() => setModal('new')} className="btn-primary flex items-center gap-2" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
          <PlusIcon className="w-4 h-4" /> Add Subject
        </motion.button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3].map(i => <div key={i} className="skeleton h-40 rounded-2xl" />)}
        </div>
      ) : subjects.length === 0 ? (
        <Card className="text-center py-12">
          <BookOpenIcon className="w-10 h-10 text-white/20 mx-auto mb-3" />
          <p className="text-white/30">No subjects yet. Add your classes!</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {subjects.map(s => (
            <SubjectCard
              key={s.id}
              subject={s}
              stats={statsMap[s.id]}
              onEdit={setModal}
              onDelete={id => deleteMut.mutate(id)}
            />
          ))}
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
