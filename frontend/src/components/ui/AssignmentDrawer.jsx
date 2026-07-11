import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import {
  XMarkIcon, SparklesIcon, PlusIcon, TrashIcon,
  CheckIcon, ClockIcon, LinkIcon, ArrowPathIcon,
  ChevronDownIcon,
} from '@heroicons/react/24/outline'
import { assignments as assignmentsApi, ai, analytics } from '../../api/client'
import { formatDueDateFull, getDueStatus, getDueBadgeColor } from '../../utils/dates'
import { cn } from '../../utils/cn'

const DIFF_STYLE = {
  high:   { bg: 'rgba(239,68,68,0.12)',  text: '#f87171' },
  medium: { bg: 'rgba(245,158,11,0.10)', text: '#fbbf24' },
  low:    { bg: 'rgba(16,185,129,0.10)', text: '#34d399' },
}

function Section({ title, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="border-b border-white/[0.05] last:border-0">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between py-3 text-left"
      >
        <span className="text-[11px] font-semibold text-white/35 uppercase tracking-widest">{title}</span>
        <ChevronDownIcon className={cn('w-3.5 h-3.5 text-white/25 transition-transform', open && 'rotate-180')} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="pb-4">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default function AssignmentDrawer({ assignment, onClose, onEdit, subjects = [] }) {
  const qc = useQueryClient()
  const [insights, setInsights] = useState(null)
  const [loadingInsights, setLoadingInsights] = useState(false)
  const [newSubtask, setNewSubtask] = useState('')
  const [newDep, setNewDep] = useState('')
  const [actualHours, setActualHours] = useState(assignment?.actual_hours ?? '')
  const [progress, setProgress] = useState(assignment?.progress ?? 0)

  const { data: detail } = useQuery({
    queryKey: ['assignment-detail', assignment?.id],
    queryFn: () => assignmentsApi.get(assignment.id),
    enabled: !!assignment?.id,
    initialData: assignment,
  })

  const { data: deps = [] } = useQuery({
    queryKey: ['dependencies', assignment?.id],
    queryFn: () => analytics.getDependencies(assignment.id),
    enabled: !!assignment?.id,
  })

  const { data: allAssignments = [] } = useQuery({
    queryKey: ['assignments'],
    queryFn: () => assignmentsApi.list({}),
  })

  const addSubtaskMut = useMutation({
    mutationFn: title => assignmentsApi.addSubtask(assignment.id, { title }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['assignment-detail', assignment.id] }); setNewSubtask('') },
  })

  const toggleSubtaskMut = useMutation({
    mutationFn: ({ stId, completed }) => assignmentsApi.updateSubtask(assignment.id, stId, { completed }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['assignment-detail', assignment.id] }),
  })

  const deleteSubtaskMut = useMutation({
    mutationFn: stId => assignmentsApi.deleteSubtask(assignment.id, stId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['assignment-detail', assignment.id] }),
  })

  const addDepMut = useMutation({
    mutationFn: depends_on_id => analytics.addDependency(assignment.id, depends_on_id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['dependencies', assignment.id] }); setNewDep('') },
    onError: err => toast.error(err?.message || 'Failed to add dependency'),
  })

  const removeDepMut = useMutation({
    mutationFn: id => analytics.removeDependency(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['dependencies', assignment.id] }),
  })

  const updateActualMut = useMutation({
    mutationFn: hours => assignmentsApi.update(assignment.id, { actual_hours: hours }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['assignments'] }); toast.success('Time logged') },
  })

  const updateProgressMut = useMutation({
    mutationFn: p => assignmentsApi.update(assignment.id, { progress: p }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['assignments'] }),
  })

  const incrementSessionMut = useMutation({
    mutationFn: () => assignmentsApi.update(assignment.id, {
      sessions_completed: Math.min((detail?.sessions_completed || 0) + 1, detail?.sessions_total || 1),
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['assignments'] }); qc.invalidateQueries({ queryKey: ['dashboard'] }); qc.invalidateQueries({ queryKey: ['assignment-detail', assignment.id] }) },
  })

  async function fetchInsights() {
    setLoadingInsights(true)
    try {
      const data = await ai.assignmentInsights(assignment.id)
      setInsights(data)
    } catch (err) {
      toast.error(err?.message || 'AI insights failed')
    } finally {
      setLoadingInsights(false)
    }
  }

  const a = detail || assignment
  if (!a) return null

  const status = getDueStatus(a.due_date)
  const diff = DIFF_STYLE[a.difficulty] || DIFF_STYLE.medium
  const subtasks = a.subtasks || []
  const completedSubtasks = subtasks.filter(s => s.completed).length
  const sessionPct = a.sessions_total > 1 ? ((a.sessions_completed || 0) / a.sessions_total) * 100 : null
  const availableDeps = allAssignments.filter(x => x.id !== a.id && !deps.some(d => d.depends_on_id === x.id))

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex justify-end">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          onClick={onClose}
        />
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 28, stiffness: 280 }}
          className="relative w-full max-w-md h-full flex flex-col overflow-hidden"
          style={{
            background: 'rgba(10,13,30,0.97)',
            backdropFilter: 'blur(24px)',
            borderLeft: '1px solid rgba(255,255,255,0.07)',
          }}
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-start gap-3 p-5 border-b border-white/[0.06]">
            {a.subject_color && (
              <div className="w-3 h-3 rounded-full flex-shrink-0 mt-1.5" style={{ background: a.subject_color, boxShadow: `0 0 10px ${a.subject_color}80` }} />
            )}
            <div className="flex-1 min-w-0">
              <h2 className="font-semibold text-base leading-snug">{a.title}</h2>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                {a.subject_name && <span className="text-xs text-white/40">{a.subject_name}</span>}
                <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: diff.bg, color: diff.text }}>{a.difficulty}</span>
                <span className="text-xs text-white/30">{a.type?.replace('_', ' ')}</span>
              </div>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              <button onClick={() => onEdit(a)} className="w-8 h-8 flex items-center justify-center rounded-lg text-white/30 hover:text-indigo-400 hover:bg-indigo-500/10 transition-all text-xs font-medium">Edit</button>
              <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg text-white/30 hover:text-white/80 transition-all">
                <XMarkIcon className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-5 space-y-0">

            {/* Due date + status */}
            <Section title="Due Date">
              {a.due_date ? (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-white/70">{format(new Date(a.due_date * 1000), 'EEEE, MMMM d, yyyy')}</span>
                  <span className={cn('text-xs px-2 py-0.5 rounded-full', getDueBadgeColor(status))}>
                    {formatDueDateFull(a.due_date)}
                  </span>
                </div>
              ) : (
                <p className="text-sm text-white/30">No due date</p>
              )}
            </Section>

            {/* Progress */}
            {a.status !== 'completed' && (
              <Section title="Progress">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-white/40">Completion</span>
                    <span className="font-semibold" style={{ color: 'var(--accent)' }}>{progress}%</span>
                  </div>
                  <input
                    type="range" min="0" max="100" step="5"
                    className="w-full"
                    style={{ accentColor: 'var(--accent)' }}
                    value={progress}
                    onChange={e => setProgress(parseInt(e.target.value))}
                    onMouseUp={e => updateProgressMut.mutate(parseInt(e.target.value))}
                    onTouchEnd={e => updateProgressMut.mutate(parseInt(e.target.value))}
                  />
                  <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                    <motion.div
                      className="h-full rounded-full"
                      style={{ background: 'var(--accent)' }}
                      animate={{ width: `${progress}%` }}
                      transition={{ duration: 0.3 }}
                    />
                  </div>
                </div>
              </Section>
            )}

            {/* Session progress */}
            {a.sessions_total > 1 && (
              <Section title="Session Progress">
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-white/60">{a.sessions_completed || 0} / {a.sessions_total} sessions done</span>
                    {a.session_duration_mins && (
                      <span className="text-white/30">{a.session_duration_mins} min each</span>
                    )}
                  </div>
                  <div className="h-2 bg-white/[0.06] rounded-full overflow-hidden">
                    <motion.div
                      className="h-full rounded-full"
                      style={{ background: 'linear-gradient(90deg, #6366f1, #8b5cf6)' }}
                      initial={{ width: 0 }}
                      animate={{ width: `${sessionPct}%` }}
                      transition={{ duration: 0.6, ease: 'easeOut' }}
                    />
                  </div>
                  <button
                    onClick={() => incrementSessionMut.mutate()}
                    disabled={(a.sessions_completed || 0) >= a.sessions_total}
                    className="btn-primary text-xs py-1.5 px-3 disabled:opacity-40"
                  >
                    <CheckIcon className="w-3.5 h-3.5" /> Mark Session Done
                  </button>
                </div>
              </Section>
            )}

            {/* Time tracking */}
            <Section title="Time Tracking">
              <div className="space-y-2">
                {a.estimated_hours && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-white/40">Estimated</span>
                    <span className="text-white/60">{a.estimated_hours}h</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <ClockIcon className="w-4 h-4 text-white/30 flex-shrink-0" />
                  <input
                    type="number" min="0" step="0.5"
                    className="input-field text-sm flex-1"
                    value={actualHours}
                    onChange={e => setActualHours(e.target.value)}
                    placeholder="Actual hours spent"
                  />
                  <button
                    onClick={() => updateActualMut.mutate(actualHours ? parseFloat(actualHours) : null)}
                    className="btn-primary text-xs py-2 px-3"
                  >Log</button>
                </div>
                {a.estimated_hours && actualHours && (
                  <p className="text-xs text-white/30">
                    {parseFloat(actualHours) > a.estimated_hours
                      ? `⚠ ${(parseFloat(actualHours) - a.estimated_hours).toFixed(1)}h over estimate`
                      : `✓ ${(a.estimated_hours - parseFloat(actualHours)).toFixed(1)}h under estimate`
                    }
                  </p>
                )}
              </div>
            </Section>

            {/* Subtasks */}
            <Section title={`Subtasks ${subtasks.length ? `(${completedSubtasks}/${subtasks.length})` : ''}`}>
              <div className="space-y-1.5">
                {subtasks.map(st => (
                  <div key={st.id} className="flex items-center gap-2 group">
                    <button
                      onClick={() => toggleSubtaskMut.mutate({ stId: st.id, completed: !st.completed })}
                      className="w-4 h-4 rounded border-2 flex-shrink-0 flex items-center justify-center transition-all"
                      style={{ background: st.completed ? '#6366f1' : 'transparent', borderColor: st.completed ? '#6366f1' : 'var(--c-surface-border)' }}
                    >
                      {st.completed && <CheckIcon className="w-2.5 h-2.5 text-white" />}
                    </button>
                    <span className={cn('text-sm flex-1', st.completed && 'line-through text-white/30')}>{st.title}</span>
                    <button onClick={() => deleteSubtaskMut.mutate(st.id)}
                      className="w-5 h-5 flex items-center justify-center text-white/0 group-hover:text-red-400/60 transition-colors">
                      <TrashIcon className="w-3 h-3" />
                    </button>
                  </div>
                ))}
                <form onSubmit={e => { e.preventDefault(); if (newSubtask.trim()) addSubtaskMut.mutate(newSubtask.trim()) }}
                  className="flex gap-2 mt-2">
                  <input
                    className="input-field text-sm flex-1"
                    value={newSubtask}
                    onChange={e => setNewSubtask(e.target.value)}
                    placeholder="Add subtask..."
                  />
                  <button type="submit" className="btn-primary text-xs py-2 px-3 disabled:opacity-40" disabled={!newSubtask.trim()}>
                    <PlusIcon className="w-3.5 h-3.5" />
                  </button>
                </form>
              </div>
            </Section>

            {/* Dependencies */}
            <Section title="Depends On" defaultOpen={false}>
              <div className="space-y-2">
                {deps.map(d => (
                  <div key={d.id} className="flex items-center gap-2 p-2 rounded-lg bg-white/[0.03]">
                    <div className={cn('w-2 h-2 rounded-full flex-shrink-0', d.dep_status === 'completed' ? 'bg-emerald-400' : 'bg-amber-400/70')} />
                    <span className="text-sm flex-1 text-white/70">{d.dep_title}</span>
                    <button onClick={() => removeDepMut.mutate(d.id)} className="text-white/20 hover:text-red-400 transition-colors">
                      <XMarkIcon className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
                <div className="flex gap-2">
                  <select
                    className="input-field text-sm flex-1"
                    value={newDep}
                    onChange={e => setNewDep(e.target.value)}
                  >
                    <option value="">Link a dependency...</option>
                    {availableDeps.map(x => <option key={x.id} value={x.id}>{x.title}</option>)}
                  </select>
                  <button
                    onClick={() => { if (newDep) addDepMut.mutate(newDep) }}
                    disabled={!newDep}
                    className="btn-primary text-xs py-2 px-3 disabled:opacity-40"
                  >
                    <LinkIcon className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </Section>

            {/* Notes */}
            {a.notes && (
              <Section title="Notes">
                <p className="text-sm text-white/55 leading-relaxed">{a.notes}</p>
              </Section>
            )}

            {/* AI Insights */}
            <Section title="AI Insights" defaultOpen={false}>
              {!insights ? (
                <button
                  onClick={fetchInsights}
                  disabled={loadingInsights}
                  className="btn-primary text-xs py-2 px-4 disabled:opacity-50"
                >
                  {loadingInsights
                    ? <><span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />Analyzing...</>
                    : <><SparklesIcon className="w-3.5 h-3.5" />Get AI Insights</>
                  }
                </button>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-white/40">Urgency:</span>
                    <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full',
                      insights.urgency === 'critical' ? 'bg-red-500/20 text-red-400' :
                      insights.urgency === 'high' ? 'bg-amber-500/20 text-amber-400' :
                      'bg-indigo-500/20 text-indigo-400'
                    )}>{insights.urgency}</span>
                    {insights.suggestedHours && (
                      <span className="text-xs text-white/40 ml-2">~{insights.suggestedHours}h suggested</span>
                    )}
                  </div>
                  {insights.subtaskSuggestions?.length > 0 && (
                    <div>
                      <p className="text-xs text-white/30 mb-1.5">Suggested breakdown:</p>
                      {insights.subtaskSuggestions.map((s, i) => (
                        <p key={i} className="text-xs text-white/55 leading-snug">· {s}</p>
                      ))}
                    </div>
                  )}
                  {insights.tips?.map((t, i) => (
                    <p key={i} className="text-xs text-indigo-300/60 leading-snug">💡 {t}</p>
                  ))}
                  {insights.warning && (
                    <p className="text-xs text-amber-300/70 leading-snug">⚠ {insights.warning}</p>
                  )}
                  <button onClick={() => setInsights(null)} className="text-xs text-white/20 hover:text-white/40 flex items-center gap-1">
                    <ArrowPathIcon className="w-3 h-3" /> Refresh
                  </button>
                </div>
              )}
            </Section>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
