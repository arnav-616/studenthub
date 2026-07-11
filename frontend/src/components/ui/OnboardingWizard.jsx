import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import {
  CheckIcon, XMarkIcon, PlusIcon, SparklesIcon,
  BookOpenIcon, ClockIcon, AcademicCapIcon, ChartBarIcon,
} from '@heroicons/react/24/outline'
import { subjects as subjectsApi, settingsApi } from '../../api/client'

const PRESET_COLORS = [
  '#6366f1','#8b5cf6','#ec4899','#ef4444',
  '#f59e0b','#10b981','#06b6d4','#3b82f6',
]

const FEATURES = [
  { icon: BookOpenIcon,    color: '#6366f1', title: 'Assignments',  desc: 'Track every deadline with AI natural-language entry' },
  { icon: ClockIcon,       color: '#10b981', title: 'Pomodoro Timer', desc: 'Focus sessions tied to your subjects & tasks' },
  { icon: AcademicCapIcon, color: '#f59e0b', title: 'Grades',       desc: 'What-if calculator + trajectory charts' },
  { icon: ChartBarIcon,    color: '#ec4899', title: 'Study Tools',  desc: 'AI flashcards, summaries, and quiz mode' },
]

function Dots({ total, current }) {
  return (
    <div className="flex items-center gap-1.5">
      {Array.from({ length: total }).map((_, i) => (
        <motion.div
          key={i}
          animate={{ width: i === current ? 20 : 6, opacity: i === current ? 1 : 0.3 }}
          transition={{ duration: 0.25 }}
          className="h-1.5 rounded-full bg-indigo-400"
        />
      ))}
    </div>
  )
}

export default function OnboardingWizard({ onDone, userName }) {
  const qc = useQueryClient()
  const [step, setStep] = useState(0)
  const [subjects, setSubjects] = useState([])
  const [newName, setNewName] = useState('')
  const [newColor, setNewColor] = useState(PRESET_COLORS[0])
  const [semStart, setSemStart] = useState('')
  const [semEnd, setSemEnd] = useState('')
  const [saving, setSaving] = useState(false)

  const TOTAL = 4

  function addSubject() {
    const n = newName.trim()
    if (!n) return
    setSubjects(s => [...s, { name: n, color: newColor }])
    setNewName('')
    setNewColor(PRESET_COLORS[Math.floor(Math.random() * PRESET_COLORS.length)])
  }

  function removeSubject(i) {
    setSubjects(s => s.filter((_, idx) => idx !== i))
  }

  async function finish() {
    setSaving(true)
    try {
      for (const s of subjects) {
        await subjectsApi.create(s)
      }
      if (semStart || semEnd) {
        await settingsApi.update({ semester_start: semStart, semester_end: semEnd })
      }
      qc.invalidateQueries({ queryKey: ['subjects'] })
    } catch {
      // non-fatal
    } finally {
      setSaving(false)
    }
    markDone()
  }

  function markDone() {
    localStorage.setItem('sh_onboarding_done', '1')
    settingsApi.update({ onboarding_done: 'true' }).catch(() => {})
    onDone()
  }

  const steps = [
    // Step 0 — Welcome
    <div className="text-center py-4" key="welcome">
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 15 }}
        className="w-20 h-20 rounded-2xl mx-auto mb-5 flex items-center justify-center"
        style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', boxShadow: '0 0 40px rgba(99,102,241,0.4)' }}>
        <SparklesIcon className="w-10 h-10 text-white" />
      </motion.div>
      <h2 className="text-2xl font-bold mb-2">
        Welcome{userName ? `, ${userName.split(' ')[0]}` : ''}! 🎓
      </h2>
      <p className="text-white/50 text-sm leading-relaxed max-w-xs mx-auto">
        StudentHub is your all-in-one academic command center. Let's get you set up in 3 quick steps — takes less than a minute.
      </p>
      <div className="grid grid-cols-2 gap-3 mt-6 text-left">
        {FEATURES.map(f => (
          <div key={f.title} className="rounded-xl p-3 flex items-start gap-2.5"
            style={{ background: 'var(--c-surface-lo)', border: '1px solid var(--c-border-subtle)' }}>
            <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
              style={{ background: `${f.color}20` }}>
              <f.icon className="w-3.5 h-3.5" style={{ color: f.color }} />
            </div>
            <div>
              <p className="text-xs font-semibold text-white/80">{f.title}</p>
              <p className="text-[11px] text-white/35 leading-tight mt-0.5">{f.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>,

    // Step 1 — Add subjects
    <div key="subjects">
      <h2 className="text-xl font-bold mb-1">Your classes this semester</h2>
      <p className="text-white/40 text-sm mb-4">Add the courses you're taking. You can always add more later.</p>
      <div className="flex gap-2 mb-3">
        <input
          className="input-field flex-1 text-sm"
          placeholder="e.g. Calculus II"
          value={newName}
          onChange={e => setNewName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addSubject()}
          autoFocus
        />
        <button onClick={addSubject} className="btn-primary px-3 flex-shrink-0">
          <PlusIcon className="w-4 h-4" />
        </button>
      </div>
      <div className="flex gap-1.5 flex-wrap mb-4">
        {PRESET_COLORS.map(c => (
          <button key={c} onClick={() => setNewColor(c)}
            className={`w-6 h-6 rounded-full transition-all ${newColor === c ? 'ring-2 ring-white ring-offset-1 ring-offset-transparent scale-110' : 'hover:scale-110'}`}
            style={{ background: c }} />
        ))}
      </div>
      <div className="space-y-1.5 min-h-[80px]">
        <AnimatePresence>
          {subjects.map((s, i) => (
            <motion.div key={i}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, height: 0, marginBottom: 0 }}
              className="flex items-center gap-2.5 px-3 py-2 rounded-xl"
              style={{ background: 'var(--c-surface-lo)', border: '1px solid var(--c-border-subtle)' }}>
              <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: s.color }} />
              <span className="flex-1 text-sm text-white/80">{s.name}</span>
              <button onClick={() => removeSubject(i)} className="text-white/20 hover:text-red-400 transition-colors">
                <XMarkIcon className="w-4 h-4" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
        {subjects.length === 0 && (
          <p className="text-center text-white/20 text-sm py-6">No subjects yet — add one above</p>
        )}
      </div>
    </div>,

    // Step 2 — Semester dates
    <div key="dates">
      <h2 className="text-xl font-bold mb-1">When is your semester?</h2>
      <p className="text-white/40 text-sm mb-5">Used to show progress bars and deadline warnings. Totally optional.</p>
      <div className="space-y-3">
        <div>
          <label className="text-[11px] text-white/40 uppercase tracking-wider font-medium">Semester Start</label>
          <input type="date" className="input-field mt-1.5" value={semStart} onChange={e => setSemStart(e.target.value)} />
        </div>
        <div>
          <label className="text-[11px] text-white/40 uppercase tracking-wider font-medium">Semester End / Finals Week</label>
          <input type="date" className="input-field mt-1.5" value={semEnd} onChange={e => setSemEnd(e.target.value)} />
        </div>
      </div>
    </div>,

    // Step 3 — Done
    <div className="text-center py-4" key="done">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 18, delay: 0.1 }}
        className="w-20 h-20 rounded-full mx-auto mb-5 flex items-center justify-center"
        style={{ background: 'linear-gradient(135deg, #10b981, #059669)', boxShadow: '0 0 40px rgba(16,185,129,0.4)' }}>
        <CheckIcon className="w-10 h-10 text-white" strokeWidth={2.5} />
      </motion.div>
      <h2 className="text-2xl font-bold mb-2">You're all set! 🚀</h2>
      <p className="text-white/50 text-sm leading-relaxed max-w-xs mx-auto mb-5">
        {subjects.length > 0
          ? `${subjects.length} subject${subjects.length > 1 ? 's' : ''} added. Start adding assignments, run your first Pomodoro, or explore the dashboard.`
          : 'Explore the app — add assignments, run your first Pomodoro, or check out the dashboard.'}
      </p>
      <div className="rounded-xl p-3 text-sm text-white/40 text-left"
        style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.15)' }}>
        <p className="font-medium text-indigo-300 mb-1">Pro tip</p>
        <p className="text-xs leading-relaxed">Type naturally in the Assignments page — "Calc problem set due Friday 3hrs hard" and AI will parse it instantly.</p>
      </div>
    </div>,
  ]

  const isLast = step === TOTAL - 1

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="absolute inset-0"
        style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(12px)' }}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 24 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 200, damping: 22 }}
        className="relative z-10 w-full max-w-md rounded-2xl overflow-hidden"
        style={{ background: 'var(--c-dropdown-bg)', border: '1px solid var(--c-input-toggle-off)', boxShadow: '0 32px 80px rgba(0,0,0,0.7)' }}>

        {/* Skip button */}
        {!isLast && (
          <button
            onClick={markDone}
            className="absolute top-4 right-4 z-10 text-xs text-white/25 hover:text-white/60 transition-colors px-2 py-1">
            Skip setup
          </button>
        )}

        <div className="p-7">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}>
              {steps[step]}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="px-7 pb-6 flex items-center justify-between gap-4">
          <Dots total={TOTAL} current={step} />
          <div className="flex items-center gap-2">
            {step > 0 && !isLast && (
              <button
                onClick={() => setStep(s => s - 1)}
                className="px-4 py-2 rounded-xl text-sm text-white/40 hover:text-white/70 transition-colors">
                Back
              </button>
            )}
            {isLast ? (
              <button
                onClick={finish}
                disabled={saving}
                className="btn-primary px-5 py-2.5 disabled:opacity-60">
                {saving
                  ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  : <><CheckIcon className="w-4 h-4" /> Let's go</>}
              </button>
            ) : (
              <button
                onClick={() => setStep(s => s + 1)}
                className="btn-primary px-5 py-2.5">
                {step === 0 ? 'Get started' : 'Next'} →
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  )
}
