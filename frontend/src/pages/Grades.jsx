import { useState, useMemo, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import {
  PlusIcon, TrashIcon, XMarkIcon,
  AcademicCapIcon, ChevronDownIcon, ChevronUpIcon,
  SparklesIcon, ArrowTrendingUpIcon, ArrowUpTrayIcon,
  CheckIcon,
} from '@heroicons/react/24/outline'
import Card from '../components/ui/Card'
import { grades as gradesApi } from '../api/client'
import { cn } from '../utils/cn'

function letterGrade(pct) {
  if (pct >= 93) return { letter: 'A', color: 'text-emerald-400', bg: 'bg-emerald-400/10' }
  if (pct >= 90) return { letter: 'A−', color: 'text-emerald-400', bg: 'bg-emerald-400/10' }
  if (pct >= 87) return { letter: 'B+', color: 'text-sky-400', bg: 'bg-sky-400/10' }
  if (pct >= 83) return { letter: 'B', color: 'text-sky-400', bg: 'bg-sky-400/10' }
  if (pct >= 80) return { letter: 'B−', color: 'text-sky-400', bg: 'bg-sky-400/10' }
  if (pct >= 77) return { letter: 'C+', color: 'text-yellow-400', bg: 'bg-yellow-400/10' }
  if (pct >= 73) return { letter: 'C', color: 'text-yellow-400', bg: 'bg-yellow-400/10' }
  if (pct >= 70) return { letter: 'C−', color: 'text-yellow-400', bg: 'bg-yellow-400/10' }
  if (pct >= 67) return { letter: 'D+', color: 'text-orange-400', bg: 'bg-orange-400/10' }
  if (pct >= 60) return { letter: 'D', color: 'text-orange-400', bg: 'bg-orange-400/10' }
  return { letter: 'F', color: 'text-red-400', bg: 'bg-red-400/10' }
}

function gradePointsToPct(gp) {
  if (gp == null) return null
  if (gp >= 4.0) return 96
  if (gp >= 3.7) return 91
  if (gp >= 3.3) return 88
  if (gp >= 3.0) return 84
  if (gp >= 2.7) return 81
  if (gp >= 2.3) return 78
  if (gp >= 2.0) return 74
  if (gp >= 1.7) return 71
  if (gp >= 1.3) return 68
  if (gp >= 1.0) return 63
  return 50
}

function GradeBar({ pct }) {
  const { letter, color } = letterGrade(pct)
  const barColor = pct >= 80 ? '#10b981' : pct >= 70 ? '#f59e0b' : '#ef4444'
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-2 rounded-full bg-white/[0.06] overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ background: barColor }}
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(pct, 100)}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
      </div>
      <span className={cn('text-sm font-bold w-8', color)}>{letter}</span>
      <span className="text-sm text-white/50 w-12 text-right">{pct?.toFixed(1)}%</span>
    </div>
  )
}

// Trajectory spark chart — shows grade history across grade entries
function TrajectoryChart({ components, currentGrade }) {
  const scored = components.filter(c => c.score != null)
  if (scored.length < 2) return null

  const trajectory = scored.map((_, idx) => {
    const slice = scored.slice(0, idx + 1)
    const totalWeight = slice.reduce((a, c) => a + c.weight, 0)
    const weightedSum = slice.reduce((a, c) => a + c.score * c.weight, 0)
    return totalWeight > 0 ? weightedSum / totalWeight : null
  }).filter(Boolean)

  if (trajectory.length < 2) return null

  const min = Math.min(...trajectory) - 5
  const max = 100
  const range = max - min
  const W = 200, H = 50

  const points = trajectory.map((v, i) => ({
    x: (i / (trajectory.length - 1)) * W,
    y: H - ((v - min) / range) * H,
  }))

  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
  const areaD = `${pathD} L${W},${H} L0,${H} Z`

  const last = trajectory[trajectory.length - 1]
  const trend = last - trajectory[0]
  const trendColor = trend >= 0 ? '#10b981' : '#ef4444'

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-xs text-white/40 uppercase tracking-wide">Grade Trajectory</span>
        <span className={cn('text-xs font-medium', trend >= 0 ? 'text-emerald-400' : 'text-red-400')}>
          {trend >= 0 ? '+' : ''}{trend.toFixed(1)}% overall
        </span>
      </div>
      <div className="rounded-xl overflow-hidden bg-white/[0.03] p-3">
        <svg width="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ height: 50 }}>
          <defs>
            <linearGradient id="traj-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={trendColor} stopOpacity="0.3" />
              <stop offset="100%" stopColor={trendColor} stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={areaD} fill="url(#traj-grad)" />
          <path d={pathD} stroke={trendColor} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          {points.map((p, i) => (
            <circle key={i} cx={p.x} cy={p.y} r="3" fill={trendColor} />
          ))}
        </svg>
        <div className="flex justify-between text-xs text-white/25 mt-1">
          <span>Start</span>
          <span>Now: {last.toFixed(1)}%</span>
        </div>
      </div>
    </div>
  )
}

// What-if sliders panel
function WhatIfPanel({ components, calc }) {
  const unscored = components.filter(c => c.score == null)
  const [sliders, setSliders] = useState(() =>
    Object.fromEntries(unscored.map(c => [c.id, 80]))
  )

  const projected = useMemo(() => {
    const scoredContrib = components
      .filter(c => c.score != null)
      .reduce((acc, c) => acc + (c.score * c.weight) / 100, 0)

    const whatIfContrib = unscored.reduce((acc, c) => {
      const v = sliders[c.id] ?? 80
      return acc + (v * c.weight) / 100
    }, 0)

    return scoredContrib + whatIfContrib
  }, [components, sliders, unscored])

  if (unscored.length === 0) return null

  const { letter, color, bg } = letterGrade(projected)
  const barColor = projected >= 80 ? '#10b981' : projected >= 70 ? '#f59e0b' : '#ef4444'

  return (
    <div className="space-y-3 pt-2 border-t border-white/[0.06]">
      <div className="flex items-center gap-2">
        <SparklesIcon className="w-4 h-4 text-violet-400" />
        <span className="text-xs text-white/40 uppercase tracking-wide">What-If Calculator</span>
        <span className="text-xs text-white/20 ml-auto">{unscored.length} remaining</span>
      </div>

      {unscored.map(c => (
        <div key={c.id} className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-sm text-white/70">{c.name}</span>
            <span className="text-sm font-medium text-indigo-300">{sliders[c.id] ?? 80}%</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-white/25 w-6">0</span>
            <input
              type="range" min="0" max="100" step="1"
              className="flex-1 accent-indigo-500"
              value={sliders[c.id] ?? 80}
              onChange={e => setSliders(s => ({ ...s, [c.id]: parseInt(e.target.value) }))}
            />
            <span className="text-xs text-white/25 w-8 text-right">100</span>
          </div>
          <p className="text-xs text-white/25">Weight: {c.weight}%</p>
        </div>
      ))}

      <div className="rounded-xl p-3 border border-white/[0.06] bg-white/[0.03]">
        <p className="text-xs text-white/40 mb-2">Projected Final Grade</p>
        <div className="flex items-center gap-3">
          <div className="flex-1 h-2.5 rounded-full bg-white/[0.06] overflow-hidden">
            <motion.div
              className="h-full rounded-full"
              style={{ background: barColor }}
              animate={{ width: `${Math.min(projected, 100)}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
          <span className={cn('text-lg font-bold w-10 text-right', color)}>{letter}</span>
          <span className="text-sm text-white/50 w-14 text-right">{projected.toFixed(1)}%</span>
        </div>
      </div>
    </div>
  )
}

// What do I need for a target grade?
function TargetGradePanel({ components, calc }) {
  const [target, setTarget] = useState('A')
  const targetMap = { 'A': 93, 'A−': 90, 'B+': 87, 'B': 83, 'B−': 80, 'C': 73 }
  const targetPct = targetMap[target] ?? 93

  const unscored = components.filter(c => c.score == null)
  const scoredPct = components
    .filter(c => c.score != null)
    .reduce((acc, c) => acc + (c.score * c.weight) / 100, 0)
  const remainingWeight = unscored.reduce((acc, c) => acc + c.weight, 0)
  const needed = remainingWeight > 0 ? ((targetPct - scoredPct) / remainingWeight) * 100 : null

  if (unscored.length === 0 || calc?.currentGrade == null) return null

  return (
    <div className="space-y-2 pt-2 border-t border-white/[0.06]">
      <div className="flex items-center gap-2">
        <ArrowTrendingUpIcon className="w-4 h-4 text-amber-400" />
        <span className="text-xs text-white/40 uppercase tracking-wide">Target Grade</span>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-sm text-white/60">I want an</span>
        <select
          className="input-field text-sm py-1 px-2 w-20"
          value={target}
          onChange={e => setTarget(e.target.value)}
        >
          {Object.keys(targetMap).map(g => <option key={g} value={g}>{g}</option>)}
        </select>
        <span className="text-sm text-white/60">in this course</span>
      </div>
      {needed !== null && (
        <div className={cn(
          'rounded-xl p-3 border',
          needed > 100 ? 'border-red-400/20 bg-red-400/5' :
          needed < 60 ? 'border-emerald-400/20 bg-emerald-400/5' :
          'border-amber-400/20 bg-amber-400/5'
        )}>
          {needed > 100 ? (
            <p className="text-sm text-red-400">
              Not achievable — you would need {needed.toFixed(0)}% average on remaining work.
            </p>
          ) : (
            <p className="text-sm">
              <span className="text-white/60">You need an average of </span>
              <span className={cn('font-bold', needed < 60 ? 'text-emerald-400' : needed < 80 ? 'text-amber-400' : 'text-orange-400')}>
                {needed.toFixed(1)}%
              </span>
              <span className="text-white/60"> on your remaining {unscored.length} component{unscored.length !== 1 ? 's' : ''}.</span>
            </p>
          )}
        </div>
      )}
    </div>
  )
}

// Grade Forgiveness Panel
function ForgivenessPanel({ courseId }) {
  const { data, isLoading } = useQuery({
    queryKey: ['grades', 'forgiveness', courseId],
    queryFn: () => gradesApi.getForgiveness(courseId),
  })

  if (isLoading) return <div className="text-white/30 text-sm">Calculating…</div>
  if (!data?.items?.length) return <div className="text-white/30 text-sm">No unscored components to analyze.</div>

  return (
    <div className="space-y-3">
      <p className="text-xs text-white/40">Impact of each remaining component on your final grade. Current: <span className="text-white font-semibold">{data.currentGrade?.toFixed(1)}%</span></p>
      {data.items.map(item => (
        <div key={item.id} className="rounded-xl p-3 border border-white/[0.06] bg-white/[0.02] space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-white/80">{item.name}</span>
            <span className="text-xs text-white/30">{item.weight}% weight</span>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            {[
              { label: 'If you skip (0%)', value: item.gradeIfZero, color: 'text-red-400' },
              { label: 'If avg (75%)', value: item.gradeIfAvg, color: 'text-amber-400' },
              { label: 'If perfect (100%)', value: item.gradeIfPerfect, color: 'text-emerald-400' },
            ].map(({ label, value, color }) => (
              <div key={label} className="rounded-lg p-2 bg-white/[0.03]">
                <p className={cn('text-base font-bold', color)}>{value?.toFixed(1)}%</p>
                <p className="text-[10px] text-white/30 mt-0.5">{label}</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-white/30">Max swing: <span className="text-white/60 font-medium">{item.maxImpact?.toFixed(1)}%</span> on your grade</p>
        </div>
      ))}
    </div>
  )
}

function CourseModal({ course, onClose, onSave }) {
  const [form, setForm] = useState({
    name: course?.name ?? '',
    credits: course?.credits ?? 3,
    semester: course?.semester ?? '',
  })
  function handleSubmit(e) {
    e.preventDefault()
    if (!form.name.trim()) return toast.error('Course name required')
    onSave(form)
  }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
        className="relative glass rounded-2xl p-6 w-full max-w-sm z-10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold">{course?.id ? 'Edit Course' : 'New Course'}</h2>
          <button onClick={onClose} className="text-white/40 hover:text-white/80"><XMarkIcon className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-xs text-white/40 uppercase tracking-wide">Course Name *</label>
            <input className="input-field mt-1" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Calculus II" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-white/40 uppercase tracking-wide">Credits</label>
              <input type="number" min="1" max="6" className="input-field mt-1" value={form.credits} onChange={e => setForm(f => ({ ...f, credits: parseInt(e.target.value) }))} />
            </div>
            <div>
              <label className="text-xs text-white/40 uppercase tracking-wide">Semester</label>
              <input className="input-field mt-1" value={form.semester} onChange={e => setForm(f => ({ ...f, semester: e.target.value }))} placeholder="Fall 2025" />
            </div>
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-white/10 text-white/60 hover:text-white transition-colors">Cancel</button>
            <button type="submit" className="flex-1 btn-primary py-2.5">{course?.id ? 'Save' : 'Add Course'}</button>
          </div>
        </form>
      </motion.div>
    </div>
  )
}

function ComponentRow({ comp, onDelete, onUpdate }) {
  const [score, setScore] = useState(comp.score ?? '')
  function handleScoreChange(v) {
    setScore(v)
    onUpdate(comp.id, { score: v === '' ? null : parseFloat(v) })
  }
  return (
    <div className="flex items-center gap-3 py-2 border-b border-white/[0.04] last:border-0">
      <div className="flex-1">
        <p className="text-sm text-white/80">{comp.name}</p>
        <p className="text-xs text-white/30">Weight: {comp.weight}%</p>
      </div>
      <div className="flex items-center gap-1 text-xs text-white/40">
        <input
          type="number"
          min="0"
          max="100"
          step="0.1"
          className="w-16 bg-white/[0.06] border border-white/[0.08] rounded-lg px-2 py-1 text-white text-sm text-center"
          value={score}
          onChange={e => handleScoreChange(e.target.value)}
          placeholder="—"
        />
        <span>/ 100</span>
      </div>
      <button onClick={() => onDelete(comp.id)} className="text-white/20 hover:text-red-400 transition-colors p-1">
        <TrashIcon className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}

function CourseCard({ course }) {
  const qc = useQueryClient()
  const [expanded, setExpanded] = useState(false)
  const [showAddComp, setShowAddComp] = useState(false)
  const [activeTab, setActiveTab] = useState('grades') // 'grades' | 'trajectory' | 'whatif' | 'forgiveness'
  const [newComp, setNewComp] = useState({ name: '', weight: '' })

  const { data: calc } = useQuery({
    queryKey: ['grades', 'calc', course.id],
    queryFn: () => gradesApi.calculate(course.id),
    enabled: expanded,
  })

  const { data: components = [] } = useQuery({
    queryKey: ['grades', 'components', course.id],
    queryFn: () => gradesApi.getComponents(course.id),
    enabled: expanded,
  })

  const addCompMut = useMutation({
    mutationFn: data => gradesApi.addComponent(course.id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['grades'] }); setNewComp({ name: '', weight: '' }); setShowAddComp(false) },
  })

  const updateCompMut = useMutation({
    mutationFn: ({ id, data }) => gradesApi.updateComponent(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['grades'] }),
  })

  const deleteCompMut = useMutation({
    mutationFn: gradesApi.deleteComponent,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['grades'] }),
  })

  const deleteMut = useMutation({
    mutationFn: () => gradesApi.deleteCourse(course.id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['grades', 'courses'] }),
  })

  function handleAddComp(e) {
    e.preventDefault()
    if (!newComp.name || !newComp.weight) return
    addCompMut.mutate({ name: newComp.name, weight: parseFloat(newComp.weight) })
  }

  const grade = calc?.currentGrade
  const { letter, color } = grade != null ? letterGrade(grade) : { letter: '—', color: 'text-white/30' }

  const hasTrajectory = components.filter(c => c.score != null).length >= 2
  const hasUnscored = components.some(c => c.score == null)

  return (
    <Card className="p-0 overflow-hidden">
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center gap-4 p-4 text-left hover:bg-white/[0.02] transition-colors"
      >
        <div className="flex-1">
          <p className="font-semibold">{course.name}</p>
          <p className="text-xs text-white/30 mt-0.5">{course.credits} credits · {course.semester || 'No semester'}</p>
        </div>
        {grade != null && <GradeBar pct={grade} />}
        <span className={cn('text-2xl font-bold w-10 text-right', color)}>{letter}</span>
        {expanded ? <ChevronUpIcon className="w-4 h-4 text-white/40" /> : <ChevronDownIcon className="w-4 h-4 text-white/40" />}
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-white/[0.06]"
          >
            <div className="p-4 space-y-4">
              {/* Tabs */}
              <div className="flex gap-1 bg-white/[0.04] rounded-xl p-1">
                {[
                  { id: 'grades', label: 'Components' },
                  { id: 'trajectory', label: 'Trajectory', disabled: !hasTrajectory },
                  { id: 'whatif', label: 'What-If', disabled: !hasUnscored },
                  { id: 'forgiveness', label: 'Forgiveness', disabled: !hasUnscored },
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => !tab.disabled && setActiveTab(tab.id)}
                    className={cn(
                      'flex-1 py-1.5 rounded-lg text-xs font-medium transition-all',
                      activeTab === tab.id ? 'bg-indigo-600 text-white' : 'text-white/40 hover:text-white/60',
                      tab.disabled && 'opacity-30 cursor-not-allowed'
                    )}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Components tab */}
              {activeTab === 'grades' && (
                <div className="space-y-4">
                  <div>
                    {components.map(c => (
                      <ComponentRow
                        key={c.id}
                        comp={c}
                        onDelete={id => deleteCompMut.mutate(id)}
                        onUpdate={(id, data) => updateCompMut.mutate({ id, data })}
                      />
                    ))}
                    {components.length === 0 && <p className="text-white/30 text-sm">No grade components yet.</p>}
                  </div>

                  {showAddComp ? (
                    <form onSubmit={handleAddComp} className="flex gap-2">
                      <input className="input-field flex-1 text-sm" placeholder="Component name" value={newComp.name} onChange={e => setNewComp(c => ({ ...c, name: e.target.value }))} />
                      <input type="number" min="0" max="100" className="input-field w-20 text-sm" placeholder="%" value={newComp.weight} onChange={e => setNewComp(c => ({ ...c, weight: e.target.value }))} />
                      <button type="submit" className="btn-primary px-3 text-sm">Add</button>
                      <button type="button" onClick={() => setShowAddComp(false)} className="text-white/40 hover:text-white px-2">✕</button>
                    </form>
                  ) : (
                    <button onClick={() => setShowAddComp(true)} className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1">
                      <PlusIcon className="w-3.5 h-3.5" /> Add Component
                    </button>
                  )}

                  {/* Drop-lowest control */}
                  <div className="flex items-center gap-3 pt-2 border-t border-white/[0.06]">
                    <span className="text-xs text-white/40">Drop lowest</span>
                    <select
                      className="input-field text-xs py-1 px-2 w-20"
                      value={course.drop_lowest || 0}
                      onChange={e => {
                        gradesApi.updateCourse(course.id, { drop_lowest: parseInt(e.target.value) })
                          .then(() => qc.invalidateQueries({ queryKey: ['grades'] }))
                      }}
                    >
                      {[0,1,2,3].map(n => <option key={n} value={n}>{n === 0 ? 'None' : `${n} grade${n>1?'s':''}`}</option>)}
                    </select>
                    {(course.drop_lowest > 0) && (
                      <span className="text-xs text-indigo-400">Dropping {course.drop_lowest} lowest from grade calc</span>
                    )}
                  </div>
                </div>
              )}

              {/* Trajectory tab */}
              {activeTab === 'trajectory' && (
                <div className="space-y-4">
                  <TrajectoryChart components={components} currentGrade={grade} />
                  <TargetGradePanel components={components} calc={calc} />
                </div>
              )}

              {/* What-If tab */}
              {activeTab === 'whatif' && (
                <WhatIfPanel components={components} calc={calc} />
              )}

              {/* Forgiveness tab */}
              {activeTab === 'forgiveness' && (
                <ForgivenessPanel courseId={course.id} />
              )}

              <button onClick={() => deleteMut.mutate()} className="text-xs text-red-400/60 hover:text-red-400 flex items-center gap-1 transition-colors">
                <TrashIcon className="w-3.5 h-3.5" /> Delete Course
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  )
}

// Transcript import modal
function TranscriptModal({ onClose, onImport }) {
  const fileRef = useRef(null)
  const [file, setFile] = useState(null)
  const [parsing, setParsing] = useState(false)
  const [result, setResult] = useState(null)
  const [selected, setSelected] = useState([])
  const [dragging, setDragging] = useState(false)

  async function handleFile(f) {
    if (!f) return
    setFile(f)
    setParsing(true)
    try {
      const fd = new FormData()
      fd.append('file', f)
      const data = await gradesApi.parseTranscript(fd)
      setResult(data)
      setSelected(data.courses.map((_, i) => i))
    } catch (err) {
      toast.error(err?.message || 'Failed to parse — try a clearer screenshot')
    } finally {
      setParsing(false)
    }
  }

  function handleDrop(e) {
    e.preventDefault()
    setDragging(false)
    const f = e.dataTransfer.files[0]
    if (f) handleFile(f)
  }

  function handleImport() {
    const courses = result.courses.filter((_, i) => selected.includes(i))
    onImport(courses)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <motion.div initial={{ opacity: 0, scale: 0.96, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97 }}
        className="relative z-10 w-full max-w-lg glass-elevated rounded-2xl p-6 max-h-[85vh] flex flex-col"
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-semibold text-white">Import from Transcript</h2>
            <p className="text-xs text-white/40 mt-0.5">Upload a screenshot or PDF of your grades</p>
          </div>
          <button onClick={onClose} className="text-white/30 hover:text-white/60"><XMarkIcon className="w-5 h-5" /></button>
        </div>

        {!result ? (
          <div
            onDragOver={e => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileRef.current?.click()}
            className={cn('flex flex-col items-center justify-center rounded-2xl cursor-pointer transition-all py-12 gap-3',
              dragging ? 'border-2 border-dashed border-indigo-400 bg-indigo-500/10' : 'border-2 border-dashed border-white/10 hover:border-white/25 hover:bg-white/[0.02]'
            )}>
            <input ref={fileRef} type="file" accept="image/*,.pdf" className="hidden"
              onChange={e => handleFile(e.target.files[0])} />
            {parsing ? (
              <>
                <span className="w-8 h-8 border-2 border-indigo-400/30 border-t-indigo-400 rounded-full animate-spin" />
                <p className="text-sm text-white/50">AI is reading your transcript…</p>
              </>
            ) : (
              <>
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(99,102,241,0.15)' }}>
                  <ArrowUpTrayIcon className="w-6 h-6 text-indigo-400" />
                </div>
                <div className="text-center">
                  <p className="text-sm text-white/70 font-medium">Drop your transcript here</p>
                  <p className="text-xs text-white/35 mt-1">JPG, PNG, or PDF · Canvas/Blackboard grade pages import individual items</p>
                </div>
                {file && <p className="text-xs text-white/30">{file.name}</p>}
              </>
            )}
          </div>
        ) : (
          <div className="flex flex-col flex-1 min-h-0">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-white/60">
                Found <span className="text-white font-semibold">{result.courses.length}</span> courses
                {result.confidence && <span className="text-white/30"> · {result.confidence} confidence</span>}
              </p>
              <div className="flex gap-2">
                <button onClick={() => setSelected(result.courses.map((_, i) => i))} className="text-xs text-indigo-400 hover:text-indigo-300">All</button>
                <button onClick={() => setSelected([])} className="text-xs text-white/30 hover:text-white/60">None</button>
              </div>
            </div>
            <div className="overflow-y-auto flex-1 space-y-1.5 pr-1 min-h-0">
              {result.courses.map((c, i) => {
                const isSel = selected.includes(i)
                const gpaColor = c.gradePoints >= 3.7 ? '#10b981' : c.gradePoints >= 3.0 ? '#38bdf8' : c.gradePoints >= 2.0 ? '#fbbf24' : '#f87171'
                return (
                  <motion.div key={i} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}
                    onClick={() => setSelected(s => s.includes(i) ? s.filter(x => x !== i) : [...s, i])}
                    className={cn('flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all',
                      isSel ? 'bg-indigo-500/10 border border-indigo-500/20' : 'bg-white/[0.02] border border-white/[0.04] opacity-50')}>
                    <div className={cn('w-4 h-4 rounded border-2 flex-shrink-0 flex items-center justify-center', isSel ? 'border-indigo-400 bg-indigo-500' : 'border-white/20')}>
                      {isSel && <CheckIcon className="w-2.5 h-2.5 text-white" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white/85 truncate">{c.name}</p>
                      {c.semester && <p className="text-xs text-white/30">{c.semester}</p>}
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <span className="text-xs text-white/30">{c.credits || 3} cr</span>
                      {c.items?.length > 0 && (
                        <span className="text-xs text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded-md">
                          {c.items.length} items
                        </span>
                      )}
                      <span className="text-sm font-bold" style={{ color: gpaColor }}>{c.grade}</span>
                      <span className="text-xs text-white/40">{c.gradePoints?.toFixed(1)}</span>
                    </div>
                  </motion.div>
                )
              })}
            </div>
            <div className="flex gap-2 mt-4 pt-3 border-t border-white/[0.06]">
              <button onClick={() => setResult(null)} className="btn-ghost px-4 py-2.5 text-sm">← Re-upload</button>
              <button onClick={handleImport} disabled={selected.length === 0} className="btn-primary flex-1 justify-center py-2.5 text-sm disabled:opacity-50">
                Import {selected.length} course{selected.length !== 1 ? 's' : ''}
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  )
}

// GPA Trend Chart across semesters
function GPATrendChart({ courses }) {
  const bySemester = {}
  for (const c of courses) {
    const sem = c.semester || 'Unassigned'
    if (!bySemester[sem]) bySemester[sem] = []
    bySemester[sem].push(c)
  }
  const sems = Object.entries(bySemester)
    .map(([sem, cs]) => {
      const totalQP = cs.reduce((s, c) => s + c.gpaPoints * (c.credits || 3), 0)
      const totalCr = cs.reduce((s, c) => s + (c.credits || 3), 0)
      return { sem, gpa: totalCr > 0 ? Math.round((totalQP / totalCr) * 100) / 100 : null }
    })
    .filter(s => s.gpa !== null)

  if (sems.length < 2) return null

  const W = 300, H = 60
  const min = Math.min(...sems.map(s => s.gpa)) - 0.3
  const max = 4.0
  const range = max - min
  const pts = sems.map((s, i) => ({
    x: (i / (sems.length - 1)) * W,
    y: H - ((s.gpa - min) / range) * H,
    gpa: s.gpa,
    sem: s.sem,
  }))
  const pathD = pts.map((p, i) => `${i===0?'M':'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
  const areaD = `${pathD} L${W},${H} L0,${H} Z`
  const trend = sems[sems.length-1].gpa - sems[0].gpa
  const color = trend >= 0 ? '#10b981' : '#ef4444'

  return (
    <div className="mt-4 space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-[11px] text-white/30 uppercase tracking-wide">GPA by Semester</span>
        <span className={cn('text-xs font-medium', trend >= 0 ? 'text-emerald-400' : 'text-red-400')}>
          {trend >= 0 ? '+' : ''}{trend.toFixed(2)} overall
        </span>
      </div>
      <div className="rounded-xl overflow-hidden bg-white/[0.03] px-3 pt-2 pb-1">
        <svg width="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ height: 60 }}>
          <defs>
            <linearGradient id="gpa-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.25" />
              <stop offset="100%" stopColor={color} stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={areaD} fill="url(#gpa-grad)" />
          <path d={pathD} stroke={color} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          {pts.map((p, i) => (
            <g key={i}>
              <circle cx={p.x} cy={p.y} r="3.5" fill={color} />
            </g>
          ))}
        </svg>
        <div className="flex justify-between mt-1">
          {sems.map((s, i) => (
            <span key={i} className="text-[9px] text-white/25 truncate max-w-[60px] text-center">{s.sem}</span>
          ))}
        </div>
      </div>
    </div>
  )
}

// GPA summary card
function GPASummaryCard({ courses, onImportTranscript, gpaData }) {
  if (!gpaData || gpaData.courses.length === 0) return null

  const gpa = gpaData.gpa
  const gpaColor = !gpa ? 'text-white/30' : gpa >= 3.5 ? 'text-emerald-400' : gpa >= 3.0 ? 'text-sky-400' : gpa >= 2.0 ? 'text-yellow-400' : 'text-red-400'
  const gpaLabel = !gpa ? '—' : gpa >= 3.7 ? 'Dean\'s List' : gpa >= 3.0 ? 'Good Standing' : gpa >= 2.0 ? 'Satisfactory' : 'At Risk'

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-4">
        <p className="text-[11px] font-semibold text-white/30 uppercase tracking-widest">Cumulative GPA</p>
        <button onClick={onImportTranscript}
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-all text-indigo-300 hover:text-white"
          style={{ background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.2)' }}>
          <ArrowUpTrayIcon className="w-3.5 h-3.5" /> Import transcript
        </button>
      </div>
      <div className="flex items-end gap-5 mb-4">
        <div>
          <p className={cn('text-5xl font-bold tracking-tight', gpaColor)}>{gpa?.toFixed(2) ?? '—'}</p>
          <p className="text-xs text-white/30 mt-1">{gpaLabel} · {gpaData.totalCredits} credits graded</p>
        </div>
        {/* GPA bar */}
        <div className="flex-1 pb-1">
          <div className="flex justify-between text-[10px] text-white/25 mb-1">
            <span>0.0</span><span>2.0</span><span>3.0</span><span>4.0</span>
          </div>
          <div className="h-3 rounded-full bg-white/[0.06] overflow-hidden relative">
            <motion.div className="h-full rounded-full"
              style={{ background: gpa >= 3.5 ? '#10b981' : gpa >= 3.0 ? '#38bdf8' : gpa >= 2.0 ? '#fbbf24' : '#f87171' }}
              initial={{ width: 0 }} animate={{ width: `${Math.min((gpa / 4.0) * 100, 100)}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }} />
          </div>
        </div>
      </div>

      {/* GPA Trend Chart */}
      <GPATrendChart courses={gpaData.courses} />

      <div className="grid grid-cols-4 gap-2 mt-4">
        {gpaData.courses.slice(0, 4).map(c => {
          const { letter, color } = letterGrade(c.currentGrade)
          return (
            <div key={c.id} className="rounded-xl p-2 text-center" style={{ background: 'var(--c-surface-lo)' }}>
              <p className="text-[10px] text-white/30 truncate mb-0.5">{c.name}</p>
              <p className={cn('text-base font-bold', color)}>{letter}</p>
              <p className="text-[10px] text-white/25">{c.credits}cr</p>
            </div>
          )
        })}
      </div>
    </Card>
  )
}

// Semester GPA Planner
function SemesterPlanner({ existingGPA, existingCredits }) {
  const [courses, setCourses] = useState([{ name: 'Course 1', credits: 3, grade: 'A' }])
  const gradeMap = { 'A': 4.0, 'A-': 3.7, 'B+': 3.3, 'B': 3.0, 'B-': 2.7, 'C+': 2.3, 'C': 2.0, 'C-': 1.7, 'D': 1.0, 'F': 0.0 }
  const [show, setShow] = useState(false)

  const projected = useMemo(() => {
    const newQP = courses.reduce((s, c) => s + (gradeMap[c.grade] ?? 0) * (parseInt(c.credits) || 3), 0)
    const newCr = courses.reduce((s, c) => s + (parseInt(c.credits) || 3), 0)
    const totalQP = (existingGPA || 0) * (existingCredits || 0) + newQP
    const totalCr = (existingCredits || 0) + newCr
    return totalCr > 0 ? Math.round((totalQP / totalCr) * 1000) / 1000 : null
  }, [courses, existingGPA, existingCredits])

  const projColor = !projected ? 'text-white/30' : projected >= 3.5 ? 'text-emerald-400' : projected >= 3.0 ? 'text-sky-400' : projected >= 2.0 ? 'text-yellow-400' : 'text-red-400'

  return (
    <Card className="p-5">
      <button onClick={() => setShow(s => !s)} className="w-full flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ArrowTrendingUpIcon className="w-4 h-4 text-amber-400" />
          <span className="font-medium text-sm">Semester GPA Planner</span>
        </div>
        {!show && projected && <span className={cn('text-lg font-bold', projColor)}>{projected?.toFixed(2)}</span>}
        {show ? <ChevronUpIcon className="w-4 h-4 text-white/30" /> : <ChevronDownIcon className="w-4 h-4 text-white/30" />}
      </button>
      <AnimatePresence>
        {show && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="pt-4 space-y-3">
              <p className="text-xs text-white/40">Enter hypothetical next-semester courses to project your cumulative GPA.</p>
              {courses.map((c, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <input className="input-field flex-1 text-sm py-1.5" placeholder="Course name" value={c.name}
                    onChange={e => setCourses(cs => cs.map((x,j) => j===i ? {...x, name: e.target.value} : x))} />
                  <select className="input-field text-sm py-1.5 w-16"
                    value={c.credits}
                    onChange={e => setCourses(cs => cs.map((x,j) => j===i ? {...x, credits: e.target.value} : x))}>
                    {[1,2,3,4,5,6].map(n => <option key={n} value={n}>{n} cr</option>)}
                  </select>
                  <select className="input-field text-sm py-1.5 w-16"
                    value={c.grade}
                    onChange={e => setCourses(cs => cs.map((x,j) => j===i ? {...x, grade: e.target.value} : x))}>
                    {Object.keys(gradeMap).map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                  {courses.length > 1 && (
                    <button onClick={() => setCourses(cs => cs.filter((_,j) => j!==i))} className="text-white/25 hover:text-red-400">
                      <XMarkIcon className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
              <button onClick={() => setCourses(cs => [...cs, { name: `Course ${cs.length+1}`, credits: 3, grade: 'A' }])}
                className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1">
                <PlusIcon className="w-3.5 h-3.5" /> Add course
              </button>
              <div className="rounded-xl p-4 border border-white/[0.06] bg-white/[0.02] text-center">
                <p className="text-xs text-white/30 mb-1">Projected Cumulative GPA</p>
                <p className={cn('text-3xl font-bold', projColor)}>{projected?.toFixed(2) ?? '—'}</p>
                {existingGPA && projected && (
                  <p className={cn('text-xs mt-1', projected > existingGPA ? 'text-emerald-400' : projected < existingGPA ? 'text-red-400' : 'text-white/30')}>
                    {projected > existingGPA ? '+' : ''}{(projected - existingGPA).toFixed(2)} from current {existingGPA?.toFixed(2)}
                  </p>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  )
}

export default function Grades() {
  const qc = useQueryClient()
  const [modal, setModal] = useState(false)
  const [transcriptModal, setTranscriptModal] = useState(false)

  const { data: courses = [], isLoading } = useQuery({
    queryKey: ['grades', 'courses'],
    queryFn: gradesApi.getCourses,
  })

  const { data: gpaData } = useQuery({
    queryKey: ['grades', 'gpa'],
    queryFn: gradesApi.getGPA,
    enabled: courses.length > 0,
  })

  const createMut = useMutation({
    mutationFn: gradesApi.createCourse,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['grades', 'courses'] }); qc.invalidateQueries({ queryKey: ['grades', 'gpa'] }); setModal(false); toast.success('Course added') },
  })

  async function handleTranscriptImport(parsedCourses) {
    let count = 0
    let itemCount = 0
    for (const c of parsedCourses) {
      try {
        const course = await gradesApi.createCourse({ name: c.name, credits: c.credits || 3, semester: c.semester || '' })
        if (!course?.id) continue

        const items = c.items?.filter(it => it.max > 0) ?? []
        if (items.length > 0) {
          const categories = {}
          for (const item of items) {
            const cat = item.category || 'General'
            if (!categories[cat]) categories[cat] = { items: [], weight: null }
            categories[cat].items.push(item)
            if (item.categoryWeight != null && categories[cat].weight == null) {
              categories[cat].weight = item.categoryWeight
            }
          }

          const catNames = Object.keys(categories)
          const totalKnownWeight = catNames.reduce((s, c) => s + (categories[c].weight ?? 0), 0)
          const hasWeights = totalKnownWeight > 0
          const normalizer = hasWeights ? 100 / totalKnownWeight : null

          for (const [, catData] of Object.entries(categories)) {
            const catWeight = hasWeights
              ? (catData.weight ?? 0) * normalizer
              : 100 / catNames.length
            const perItemWeight = Math.round((catWeight / catData.items.length) * 10) / 10
            for (const item of catData.items) {
              const score = Math.round((item.earned / item.max) * 1000) / 10
              await gradesApi.addComponent(course.id, { name: item.name, weight: perItemWeight, score })
              itemCount++
            }
          }
        } else {
          const pct = c.percentage ?? gradePointsToPct(c.gradePoints)
          if (pct != null) {
            await gradesApi.addComponent(course.id, { name: 'Final Grade', weight: 100, score: pct })
          }
        }
        count++
      } catch {}
    }
    qc.invalidateQueries({ queryKey: ['grades', 'courses'] })
    qc.invalidateQueries({ queryKey: ['grades', 'gpa'] })
    const detail = itemCount > 0 ? ` · ${itemCount} grade items` : ''
    toast.success(`Imported ${count} course${count !== 1 ? 's' : ''}${detail}`)
  }

  const totalCredits = courses.reduce((acc, c) => acc + (c.credits || 0), 0)

  return (
    <div className="space-y-5 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Grades</h1>
          <p className="text-white/40 text-sm mt-0.5">{courses.length} courses · {totalCredits} total credits</p>
        </div>
        <div className="flex gap-2">
          <motion.button onClick={() => setTranscriptModal(true)}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-white/60 hover:text-white transition-colors"
            style={{ border: '1px solid var(--c-border-dim)' }}
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
            <ArrowUpTrayIcon className="w-4 h-4" /> Import transcript
          </motion.button>
          <motion.button onClick={() => setModal(true)} className="btn-primary flex items-center gap-2"
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <PlusIcon className="w-4 h-4" /> Add Course
          </motion.button>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => <div key={i} className="skeleton h-16 rounded-2xl" />)}
        </div>
      ) : courses.length === 0 ? (
        <Card className="text-center py-12">
          <AcademicCapIcon className="w-10 h-10 text-white/20 mx-auto mb-3" />
          <p className="text-white/30 mb-4">No courses yet.</p>
          <div className="flex gap-2 justify-center">
            <button onClick={() => setTranscriptModal(true)} className="btn-ghost text-sm gap-2 py-2 px-4">
              <ArrowUpTrayIcon className="w-4 h-4" /> Import transcript
            </button>
            <button onClick={() => setModal(true)} className="btn-primary text-sm gap-2 py-2 px-4">
              <PlusIcon className="w-4 h-4" /> Add manually
            </button>
          </div>
        </Card>
      ) : (
        <>
          <GPASummaryCard courses={courses} onImportTranscript={() => setTranscriptModal(true)} gpaData={gpaData} />
          <div className="space-y-3">
            {courses.map(c => <CourseCard key={c.id} course={c} />)}
          </div>
          {gpaData && <SemesterPlanner existingGPA={gpaData?.gpa} existingCredits={gpaData?.totalCredits} />}
        </>
      )}

      <AnimatePresence>
        {modal && <CourseModal onClose={() => setModal(false)} onSave={data => createMut.mutate(data)} />}
        {transcriptModal && <TranscriptModal onClose={() => setTranscriptModal(false)} onImport={handleTranscriptImport} />}
      </AnimatePresence>
    </div>
  )
}
