import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import { XMarkIcon, ArrowPathIcon } from '@heroicons/react/24/outline'
import { toUnix } from '../../utils/dates'
import { cn } from '../../utils/cn'

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
const STATUSES = ['pending', 'in_progress', 'completed']
const RECUR_PATTERNS = [
  { value: 'daily',     label: 'Every day' },
  { value: 'weekly',    label: 'Every week' },
  { value: 'biweekly',  label: 'Every 2 weeks' },
  { value: 'monthly',   label: 'Every month' },
]

function parseTags(raw) {
  if (!raw) return ''
  if (Array.isArray(raw)) return raw.join(', ')
  try { const p = JSON.parse(raw); return Array.isArray(p) ? p.join(', ') : '' } catch { return String(raw) }
}

export default function AssignmentModal({ assignment, subjects = [], onClose, onSave }) {
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
    tags: parseTags(assignment?.tags ?? ''),
    sessions_total: assignment?.sessions_total ?? '',
    sessions_completed: assignment?.sessions_completed ?? 0,
    session_duration_mins: assignment?.session_duration_mins ?? '',
    is_recurring: assignment?.is_recurring ? true : false,
    recur_pattern: assignment?.recur_pattern ?? 'weekly',
  })
  const [multiSession, setMultiSession] = useState(!!(assignment?.sessions_total > 1 || assignment?.session_duration_mins))

  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

  const sessionHours = (form.sessions_total && form.session_duration_mins)
    ? ((parseInt(form.sessions_total) - parseInt(form.sessions_completed || 0)) * parseInt(form.session_duration_mins) / 60).toFixed(1)
    : null

  function handleSubmit(e) {
    e.preventDefault()
    if (!form.title.trim()) return toast.error('Title is required')
    onSave({
      ...form,
      subject_id: form.subject_id || null,
      due_date: form.due_date ? toUnix(form.due_date) : null,
      estimated_hours: form.estimated_hours ? parseFloat(form.estimated_hours) : null,
      tags: form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
      sessions_total: multiSession && form.sessions_total ? parseInt(form.sessions_total) : null,
      sessions_completed: multiSession ? parseInt(form.sessions_completed || 0) : 0,
      session_duration_mins: multiSession && form.session_duration_mins ? parseInt(form.session_duration_mins) : null,
      is_recurring: form.is_recurring ? 1 : 0,
      recur_pattern: form.is_recurring ? form.recur_pattern : null,
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
        className="relative z-10 w-full max-w-md glass-elevated rounded-2xl p-6 overflow-y-auto max-h-[90vh]"
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

          {/* Recurring toggle */}
          <div className="rounded-xl p-3" style={{ background: 'rgba(16,185,129,0.07)', border: '1px solid rgba(16,185,129,0.15)' }}>
            <label className="flex items-center justify-between cursor-pointer" onClick={() => set('is_recurring', !form.is_recurring)}>
              <div className="flex items-center gap-2">
                <ArrowPathIcon className="w-3.5 h-3.5 text-emerald-400" />
                <div>
                  <p className="text-xs font-semibold text-emerald-300">Recurring</p>
                  <p className="text-[10px] text-white/30 mt-0.5">Auto-creates next instance when completed</p>
                </div>
              </div>
              <div className="w-9 h-5 rounded-full transition-colors flex-shrink-0" style={{ background: form.is_recurring ? '#10b981' : 'var(--c-input-toggle-off)' }}>
                <div className="w-3.5 h-3.5 rounded-full bg-white transition-transform"
                  style={{ transform: form.is_recurring ? 'translateX(18px)' : 'translateX(2px)', marginTop: '3px' }} />
              </div>
            </label>
            <AnimatePresence>
              {form.is_recurring && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    {RECUR_PATTERNS.map(p => (
                      <button
                        key={p.value} type="button"
                        onClick={() => set('recur_pattern', p.value)}
                        className={cn(
                          'py-1.5 px-3 rounded-lg text-xs transition-all',
                          form.recur_pattern === p.value
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : 'bg-white/[0.04] text-white/40 border border-white/[0.06] hover:text-white/60'
                        )}
                      >{p.label}</button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Multi-session toggle */}
          <div className="rounded-xl p-3" style={{ background: 'rgba(99,102,241,0.07)', border: '1px solid rgba(99,102,241,0.15)' }}>
            <label className="flex items-center justify-between cursor-pointer" onClick={() => setMultiSession(v => !v)}>
              <div>
                <p className="text-xs font-semibold text-indigo-300">Multi-session</p>
                <p className="text-[10px] text-white/30 mt-0.5">Videos, chapters, problems spread over time</p>
              </div>
              <div className="w-9 h-5 rounded-full transition-colors flex-shrink-0" style={{ background: multiSession ? '#6366f1' : 'var(--c-input-toggle-off)' }}>
                <div className="w-3.5 h-3.5 rounded-full bg-white transition-transform"
                  style={{ transform: multiSession ? 'translateX(18px)' : 'translateX(2px)', marginTop: '3px' }} />
              </div>
            </label>
            {multiSession && (
              <div className="mt-3 grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[10px] text-white/40 uppercase tracking-wider">Total</label>
                  <input type="number" min="1" className="input-field mt-1 text-sm" value={form.sessions_total} onChange={e => set('sessions_total', e.target.value)} placeholder="10" />
                </div>
                <div>
                  <label className="text-[10px] text-white/40 uppercase tracking-wider">Done</label>
                  <input type="number" min="0" className="input-field mt-1 text-sm" value={form.sessions_completed} onChange={e => set('sessions_completed', e.target.value)} placeholder="0" />
                </div>
                <div>
                  <label className="text-[10px] text-white/40 uppercase tracking-wider">Min each</label>
                  <input type="number" min="1" className="input-field mt-1 text-sm" value={form.session_duration_mins} onChange={e => set('session_duration_mins', e.target.value)} placeholder="30" />
                </div>
                {sessionHours && <p className="col-span-3 text-[10px] text-indigo-300/70 mt-0.5">≈ {sessionHours}h remaining work</p>}
              </div>
            )}
          </div>

          <div>
            <label className="text-[11px] text-white/40 uppercase tracking-wider font-medium">Notes</label>
            <textarea className="input-field mt-1.5 h-20 resize-none" value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Optional notes..." />
          </div>
          <div>
            <label className="text-[11px] text-white/40 uppercase tracking-wider font-medium">Tags</label>
            <input className="input-field mt-1.5" value={form.tags} onChange={e => set('tags', e.target.value)} placeholder="exam, important, review (comma separated)" />
            {form.tags && (
              <div className="flex flex-wrap gap-1 mt-2">
                {form.tags.split(',').map(t => t.trim()).filter(Boolean).map(tag => (
                  <span key={tag} className="px-2 py-0.5 rounded-md text-[11px] font-medium" style={{ background: 'rgba(99,102,241,0.18)', color: '#a5b4fc' }}>{tag}</span>
                ))}
              </div>
            )}
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
