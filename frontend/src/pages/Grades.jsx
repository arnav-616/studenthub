import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import {
  PlusIcon, TrashIcon, XMarkIcon,
  AcademicCapIcon, ChevronDownIcon, ChevronUpIcon,
  SparklesIcon, ArrowTrendingUpIcon,
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
  // Build a simulated trajectory: each component scored so far is a "checkpoint"
  const scored = components.filter(c => c.score != null)
  if (scored.length < 2) return null

  // Running weighted average after each scored component
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
    // Start from scored components contribution
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
  const [activeTab, setActiveTab] = useState('grades') // 'grades' | 'trajectory' | 'whatif'
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

// GPA summary card
function GPASummaryCard({ courses }) {
  const { data: allCalcs = [] } = useQuery({
    queryKey: ['grades', 'all-calcs'],
    queryFn: () => Promise.all(courses.map(c => gradesApi.calculate(c.id).then(r => ({ ...r, course: c })))),
    enabled: courses.length > 0,
  })

  const gpa = useMemo(() => {
    const gradePoints = { 'A': 4.0, 'A−': 3.7, 'B+': 3.3, 'B': 3.0, 'B−': 2.7, 'C+': 2.3, 'C': 2.0, 'C−': 1.7, 'D+': 1.3, 'D': 1.0, 'F': 0.0 }
    let totalWeighted = 0, totalCredits = 0
    for (const c of allCalcs) {
      if (c.currentGrade == null) continue
      const { letter } = letterGrade(c.currentGrade)
      const gp = gradePoints[letter] ?? 0
      const credits = c.course?.credits || 3
      totalWeighted += gp * credits
      totalCredits += credits
    }
    return totalCredits > 0 ? totalWeighted / totalCredits : null
  }, [allCalcs])

  const graded = allCalcs.filter(c => c.currentGrade != null)
  if (graded.length === 0) return null

  const gpaColor = gpa >= 3.5 ? 'text-emerald-400' : gpa >= 3.0 ? 'text-sky-400' : gpa >= 2.0 ? 'text-yellow-400' : 'text-red-400'

  return (
    <Card className="flex items-center gap-6 py-4 px-6">
      <div className="text-center">
        <p className="text-xs text-white/40 uppercase tracking-wide">Semester GPA</p>
        <p className={cn('text-3xl font-bold mt-1', gpaColor)}>{gpa?.toFixed(2) ?? '—'}</p>
      </div>
      <div className="flex-1 grid grid-cols-3 gap-3">
        {graded.slice(0, 3).map(c => {
          const { letter, color } = letterGrade(c.currentGrade)
          return (
            <div key={c.course.id} className="bg-white/[0.04] rounded-xl p-2 text-center">
              <p className="text-xs text-white/30 truncate">{c.course.name}</p>
              <p className={cn('text-lg font-bold mt-0.5', color)}>{letter}</p>
              <p className="text-xs text-white/30">{c.currentGrade?.toFixed(1)}%</p>
            </div>
          )
        })}
      </div>
    </Card>
  )
}

export default function Grades() {
  const qc = useQueryClient()
  const [modal, setModal] = useState(false)

  const { data: courses = [], isLoading } = useQuery({
    queryKey: ['grades', 'courses'],
    queryFn: gradesApi.getCourses,
  })

  const createMut = useMutation({
    mutationFn: gradesApi.createCourse,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['grades', 'courses'] }); setModal(false); toast.success('Course added') },
  })

  const totalCredits = courses.reduce((acc, c) => acc + (c.credits || 0), 0)

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Grade Calculator</h1>
          <p className="text-white/40 text-sm mt-0.5">{courses.length} courses · {totalCredits} total credits</p>
        </div>
        <motion.button
          onClick={() => setModal(true)}
          className="btn-primary flex items-center gap-2"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <PlusIcon className="w-4 h-4" />
          Add Course
        </motion.button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => <div key={i} className="skeleton h-16 rounded-2xl" />)}
        </div>
      ) : courses.length === 0 ? (
        <Card className="text-center py-12">
          <AcademicCapIcon className="w-10 h-10 text-white/20 mx-auto mb-3" />
          <p className="text-white/30">No courses yet. Add your first course!</p>
        </Card>
      ) : (
        <>
          <GPASummaryCard courses={courses} />
          <div className="space-y-3">
            {courses.map(c => <CourseCard key={c.id} course={c} />)}
          </div>
        </>
      )}

      <AnimatePresence>
        {modal && (
          <CourseModal onClose={() => setModal(false)} onSave={data => createMut.mutate(data)} />
        )}
      </AnimatePresence>
    </div>
  )
}
