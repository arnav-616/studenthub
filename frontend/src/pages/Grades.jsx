import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import {
  PlusIcon, TrashIcon, PencilSquareIcon, XMarkIcon,
  AcademicCapIcon, ChevronDownIcon, ChevronUpIcon,
} from '@heroicons/react/24/outline'
import Card from '../components/ui/Card'
import { grades as gradesApi } from '../api/client'
import { cn } from '../utils/cn'

function letterGrade(pct) {
  if (pct >= 93) return { letter: 'A', color: 'text-emerald-400' }
  if (pct >= 90) return { letter: 'A−', color: 'text-emerald-400' }
  if (pct >= 87) return { letter: 'B+', color: 'text-sky-400' }
  if (pct >= 83) return { letter: 'B', color: 'text-sky-400' }
  if (pct >= 80) return { letter: 'B−', color: 'text-sky-400' }
  if (pct >= 77) return { letter: 'C+', color: 'text-yellow-400' }
  if (pct >= 73) return { letter: 'C', color: 'text-yellow-400' }
  if (pct >= 70) return { letter: 'C−', color: 'text-yellow-400' }
  if (pct >= 67) return { letter: 'D+', color: 'text-orange-400' }
  if (pct >= 60) return { letter: 'D', color: 'text-orange-400' }
  return { letter: 'F', color: 'text-red-400' }
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
    onSuccess: () => { qc.invalidateQueries(['grades']); setNewComp({ name: '', weight: '' }); setShowAddComp(false) },
  })

  const updateCompMut = useMutation({
    mutationFn: ({ id, data }) => gradesApi.updateComponent(id, data),
    onSuccess: () => qc.invalidateQueries(['grades']),
  })

  const deleteCompMut = useMutation({
    mutationFn: gradesApi.deleteComponent,
    onSuccess: () => qc.invalidateQueries(['grades']),
  })

  const deleteMut = useMutation({
    mutationFn: () => gradesApi.deleteCourse(course.id),
    onSuccess: () => qc.invalidateQueries(['grades', 'courses']),
  })

  function handleAddComp(e) {
    e.preventDefault()
    if (!newComp.name || !newComp.weight) return
    addCompMut.mutate({ name: newComp.name, weight: parseFloat(newComp.weight) })
  }

  const grade = calc?.currentGrade
  const { letter, color } = grade != null ? letterGrade(grade) : { letter: '—', color: 'text-white/30' }

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
              {/* Grade components */}
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

              {/* Add component */}
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

              {/* What you need */}
              {calc?.needed && (
                <div className="pt-2 border-t border-white/[0.06]">
                  <p className="text-xs text-white/40 uppercase tracking-wide mb-2">What You Need</p>
                  <div className="grid grid-cols-3 gap-2">
                    {Object.entries(calc.needed).map(([g, score]) => (
                      <div key={g} className="bg-white/[0.04] rounded-xl p-2 text-center">
                        <p className="text-xs text-white/40">{g}</p>
                        <p className="text-sm font-semibold mt-0.5">{score > 100 ? 'N/A' : `${score?.toFixed(0)}%`}</p>
                      </div>
                    ))}
                  </div>
                </div>
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

export default function Grades() {
  const qc = useQueryClient()
  const [modal, setModal] = useState(false)

  const { data: courses = [], isLoading } = useQuery({
    queryKey: ['grades', 'courses'],
    queryFn: gradesApi.getCourses,
  })

  const createMut = useMutation({
    mutationFn: gradesApi.createCourse,
    onSuccess: () => { qc.invalidateQueries(['grades', 'courses']); setModal(false); toast.success('Course added') },
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
        <div className="space-y-3">
          {courses.map(c => <CourseCard key={c.id} course={c} />)}
        </div>
      )}

      <AnimatePresence>
        {modal && (
          <CourseModal onClose={() => setModal(false)} onSave={data => createMut.mutate(data)} />
        )}
      </AnimatePresence>
    </div>
  )
}
