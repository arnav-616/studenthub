import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import {
  PlayIcon, PauseIcon, StopIcon, ArrowPathIcon,
  CheckCircleIcon, ClockIcon, ArrowsPointingOutIcon,
  ArrowsPointingInIcon, BoltIcon, MusicalNoteIcon,
  ChevronDownIcon, ChevronUpIcon,
} from '@heroicons/react/24/outline'
import Card from '../components/ui/Card'
import { timer as timerApi, assignments as assignmentsApi, dashboard as dashboardApi, subjects as subjectsApi } from '../api/client'

function playChime() {
  try {
    const ctx = new AudioContext()
    ;[[0, 523.25], [0.22, 659.25], [0.44, 783.99]].forEach(([t, freq]) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain); gain.connect(ctx.destination)
      osc.type = 'sine'; osc.frequency.value = freq
      gain.gain.setValueAtTime(0, ctx.currentTime + t)
      gain.gain.linearRampToValueAtTime(0.25, ctx.currentTime + t + 0.05)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 1.0)
      osc.start(ctx.currentTime + t); osc.stop(ctx.currentTime + t + 1.0)
    })
  } catch {}
}
import { cn } from '../utils/cn'

const MODES = {
  work:  { label: 'Focus',       defaultMin: 25, color: '#6366f1' },
  short: { label: 'Short Break', defaultMin: 5,  color: '#22d3ee' },
  long:  { label: 'Long Break',  defaultMin: 15, color: '#10b981' },
}
const CIRCUMFERENCE = 2 * Math.PI * 54

function TimerRing({ progress, color, size = 220 }) {
  const dash = CIRCUMFERENCE * progress
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" style={{ transform: 'rotate(-90deg)' }}>
      <circle cx="60" cy="60" r="54" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="5" />
      <motion.circle
        cx="60" cy="60" r="54"
        fill="none" stroke={color} strokeWidth="5" strokeLinecap="round"
        animate={{ strokeDasharray: `${Math.max(dash, 0)} ${CIRCUMFERENCE}` }}
        transition={{ duration: 0.5 }}
        style={{ filter: `drop-shadow(0 0 8px ${color}80)` }}
      />
    </svg>
  )
}

function SessionDot({ completed }) {
  return (
    <motion.div
      className="w-2.5 h-2.5 rounded-full"
      style={{ background: completed ? '#6366f1' : 'rgba(99,102,241,0.2)' }}
      animate={completed ? { scale: [1, 1.3, 1] } : {}}
      transition={{ duration: 0.3 }}
    />
  )
}

// Full-screen Focus Mode overlay
function FocusMode({ minutes, seconds, progress, color, mode, running, sessionCount, linkedAssignment, onToggle, onReset, onExit, onComplete }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center"
      style={{ background: 'radial-gradient(ellipse at center, #0f1128 0%, #050714 100%)' }}
    >
      {/* Ambient glow */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full opacity-20"
          style={{ background: color, filter: 'blur(80px)', transform: 'translate(-50%, -50%)' }} />
      </div>

      {/* Exit button */}
      <button
        onClick={onExit}
        className="absolute top-6 right-6 flex items-center gap-1.5 text-white/30 hover:text-white/70 transition-colors text-sm"
      >
        <ArrowsPointingInIcon className="w-4 h-4" /> Exit Focus
      </button>

      {/* Assignment name */}
      {linkedAssignment && (
        <p className="text-white/40 text-sm mb-8 tracking-wide">{linkedAssignment}</p>
      )}

      {/* Session dots */}
      <div className="flex gap-3 mb-8">
        {Array.from({ length: 4 }, (_, i) => (
          <SessionDot key={i} completed={i < sessionCount % 4} />
        ))}
      </div>

      {/* Big ring */}
      <div className="relative">
        <TimerRing progress={progress} color={color} size={300} />
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <motion.div
            className="font-mono font-bold tracking-tight"
            style={{ color, fontSize: '5rem', lineHeight: 1 }}
            animate={running && seconds === 0 ? { scale: [1, 1.03, 1] } : {}}
            transition={{ duration: 0.3 }}
          >
            {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
          </motion.div>
          <div className="text-white/40 text-sm mt-2 uppercase tracking-widest">{MODES[mode]?.label}</div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-6 mt-10">
        <motion.button onClick={onReset}
          className="w-14 h-14 rounded-full bg-white/[0.06] flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-colors"
          whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
          <ArrowPathIcon className="w-6 h-6" />
        </motion.button>
        <motion.button onClick={onToggle}
          aria-label={running ? 'Pause timer' : 'Start timer'}
          className="w-20 h-20 rounded-full flex items-center justify-center shadow-2xl"
          style={{ background: `linear-gradient(135deg, ${color}, ${color}90)`, boxShadow: `0 0 40px ${color}60`, color: '#fff' }}
          whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
          {running ? <PauseIcon className="w-9 h-9" /> : <PlayIcon className="w-9 h-9" />}
        </motion.button>
        <motion.button onClick={onComplete}
          className="w-14 h-14 rounded-full bg-white/[0.06] flex items-center justify-center text-white/50 hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors"
          whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
          <CheckCircleIcon className="w-6 h-6" />
        </motion.button>
      </div>

      <p className="text-white/20 text-xs mt-8 tracking-widest uppercase">Stay focused · you've got this</p>
    </motion.div>
  )
}

function ProgressPrompt({ title, current, onSave, onSkip }) {
  const [val, setVal] = useState(current || 0)
  return (
    <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[110] w-full max-w-sm mx-auto px-4">
      <div className="rounded-2xl p-4 shadow-2xl"
        style={{ background: 'rgba(15,17,40,0.97)', border: '1px solid rgba(99,102,241,0.3)', backdropFilter: 'blur(20px)' }}>
        <p className="text-xs text-indigo-300/70 font-semibold uppercase tracking-wide mb-1">Session complete</p>
        <p className="text-sm text-white/80 font-medium mb-3 truncate">How far are you on "{title}"?</p>
        <div className="flex items-center gap-3 mb-4">
          <input type="range" min="0" max="100" step="5" value={val}
            onChange={e => setVal(+e.target.value)}
            className="flex-1 accent-indigo-500" />
          <span className="text-sm font-bold text-indigo-300 w-10 text-right">{val}%</span>
        </div>
        <div className="flex gap-2">
          <button onClick={onSkip} className="btn-ghost flex-1 py-2 text-sm justify-center">Skip</button>
          <button onClick={() => onSave(val)} className="btn-primary flex-1 py-2 text-sm justify-center">Update progress</button>
        </div>
      </div>
    </motion.div>
  )
}

const MUSIC_STATIONS = [
  { label: 'Lo-fi Beats', url: 'https://www.youtube.com/watch?v=jfKfPfyJRdk', emoji: '🎵' },
  { label: 'Nature Sounds', url: 'https://www.youtube.com/watch?v=eKFTSSKCzWA', emoji: '🌿' },
  { label: 'White Noise', url: 'https://www.youtube.com/watch?v=nMfPqeZjc2c', emoji: '⬜' },
  { label: 'Jazz Cafe', url: 'https://www.youtube.com/watch?v=Dx5qFachd3A', emoji: '🎷' },
]

function MusicPanel() {
  const [open, setOpen] = useState(false)
  return (
    <div className="mt-3 text-center">
      <button onClick={() => setOpen(o => !o)}
        className="text-xs text-white/30 hover:text-white/60 inline-flex items-center gap-1.5 transition-colors">
        <MusicalNoteIcon className="w-3.5 h-3.5" />
        Focus music
        {open ? <ChevronUpIcon className="w-3 h-3" /> : <ChevronDownIcon className="w-3 h-3" />}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden">
            <div className="grid grid-cols-2 gap-2 mt-3">
              {MUSIC_STATIONS.map(s => (
                <button key={s.label} onClick={() => window.open(s.url, '_blank')}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-white/60 hover:text-white hover:bg-white/[0.04] transition-all border border-white/[0.06]">
                  <span>{s.emoji}</span> {s.label}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function SubjectTimeStats() {
  const { data: stats = [] } = useQuery({
    queryKey: ['timer-subject-stats'],
    queryFn: timerApi.statsBySubject,
  })
  const active = stats.filter(s => s.total_minutes > 0)
  if (!active.length) return null
  const maxMins = Math.max(...active.map(s => s.total_minutes), 1)
  return (
    <Card className="p-5">
      <p className="text-[11px] font-semibold text-white/30 uppercase tracking-widest mb-4">Study Time by Subject</p>
      <div className="space-y-3">
        {active.map(s => {
          const hrs = Math.floor(s.total_minutes / 60)
          const mins = s.total_minutes % 60
          return (
            <div key={s.subject_id} className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-sm text-white/70">{s.subject_name}</span>
                <span className="text-xs text-white/40">{hrs > 0 ? `${hrs}h ` : ''}{mins}m</span>
              </div>
              <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                <motion.div className="h-full rounded-full"
                  style={{ background: s.color || '#6366f1' }}
                  initial={{ width: 0 }}
                  animate={{ width: `${(s.total_minutes / maxMins) * 100}%` }}
                  transition={{ duration: 0.6, ease: 'easeOut' }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </Card>
  )
}

export default function Timer() {
  const qc = useQueryClient()
  const [mode, setMode] = useState('work')
  const [minutes, setMinutes] = useState(MODES.work.defaultMin)
  const [seconds, setSeconds] = useState(0)
  const [running, setRunning] = useState(false)
  const [sessionCount, setSessionCount] = useState(0)
  const [linkedAssignmentId, setLinkedAssignmentId] = useState('')
  const [sessionSubjectId, setSessionSubjectId] = useState('')
  const [sessionStartTime, setSessionStartTime] = useState(null)
  const [focusMode, setFocusMode] = useState(false)
  const [progressPrompt, setProgressPrompt] = useState(null) // { assignmentId, title, current }
  const intervalRef = useRef(null)
  const totalSeconds = useRef(MODES.work.defaultMin * 60)

  const { data: assignments = [] } = useQuery({
    queryKey: ['assignments', { status: 'pending' }],
    queryFn: () => assignmentsApi.list({ status: 'pending' }),
  })

  const { data: dashData } = useQuery({
    queryKey: ['dashboard'],
    queryFn: dashboardApi.get,
    staleTime: 60_000,
  })
  const suggestedFocus = dashData?.today?.suggestedFocus ?? null

  const { data: sessions = [] } = useQuery({
    queryKey: ['timer-sessions'],
    queryFn: timerApi.getSessions,
  })

  const { data: subjectsList = [] } = useQuery({
    queryKey: ['subjects'],
    queryFn: subjectsApi.list,
  })

  const logMut = useMutation({
    mutationFn: timerApi.log,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['timer-sessions'] }),
  })

  const updateProgressMut = useMutation({
    mutationFn: ({ id, progress }) => assignmentsApi.update(id, { progress }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['assignments'] }); toast.success('Progress updated') },
  })

  function handleComplete() {
    if (mode === 'work') {
      const durationMin = Math.round(totalSeconds.current / 60)
      logMut.mutate({
        assignment_id: linkedAssignmentId || null,
        subject_id: sessionSubjectId || null,
        duration_minutes: durationMin,
        session_type: 'focus',
        started_at: sessionStartTime || Math.floor(Date.now() / 1000) - durationMin * 60,
        ended_at: Math.floor(Date.now() / 1000),
      })
      playChime()
      setSessionCount(c => c + 1)
      toast.success('Focus session complete! 🎉')
      if (linkedAssignmentId) {
        const linked = assignments.find(a => a.id === linkedAssignmentId)
        if (linked) setProgressPrompt({ assignmentId: linked.id, title: linked.title, current: linked.progress || 0 })
      }
      const next = (sessionCount + 1) % 4 === 0 ? 'long' : 'short'
      switchMode(next)
    } else {
      switchMode('work')
      toast('Break over — back to work!', { icon: '⚡' })
    }
  }

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setSeconds(s => {
          if (s === 0) {
            setMinutes(m => {
              if (m === 0) {
                clearInterval(intervalRef.current)
                setRunning(false)
                handleComplete()
                return 0
              }
              return m - 1
            })
            return 59
          }
          return s - 1
        })
      }, 1000)
    }
    return () => clearInterval(intervalRef.current)
  }, [running, mode, sessionCount])

  function switchMode(newMode) {
    clearInterval(intervalRef.current)
    setRunning(false)
    setMode(newMode)
    const mins = MODES[newMode].defaultMin
    setMinutes(mins)
    setSeconds(0)
    totalSeconds.current = mins * 60
    setSessionStartTime(null)
  }

  function handleToggle() {
    if (!running) setSessionStartTime(s => s || Math.floor(Date.now() / 1000))
    setRunning(r => !r)
  }

  function handleReset() {
    clearInterval(intervalRef.current)
    setRunning(false)
    const mins = MODES[mode].defaultMin
    setMinutes(mins)
    setSeconds(0)
    totalSeconds.current = mins * 60
    setSessionStartTime(null)
  }

  const total = totalSeconds.current
  const remaining = minutes * 60 + seconds
  const progress = total > 0 ? remaining / total : 1
  const color = MODES[mode].color
  const linkedAssignment = assignments.find(a => a.id === linkedAssignmentId)

  const todaySessions = sessions.filter(s => {
    const d = new Date(s.started_at * 1000)
    return d.toDateString() === new Date().toDateString() && s.session_type === 'focus'
  })
  const totalFocusMinutes = todaySessions.reduce((acc, s) => acc + (s.duration_minutes || 0), 0)

  return (
    <>
      {createPortal(
        <AnimatePresence>
          {focusMode && (
            <FocusMode
              minutes={minutes} seconds={seconds} progress={progress}
              color={color} mode={mode} running={running}
              sessionCount={sessionCount}
              linkedAssignment={linkedAssignment?.title}
              onToggle={handleToggle}
              onReset={handleReset}
              onExit={() => setFocusMode(false)}
              onComplete={handleComplete}
            />
          )}
          {progressPrompt && (
            <ProgressPrompt
              title={progressPrompt.title}
              current={progressPrompt.current}
              onSave={(val) => { updateProgressMut.mutate({ id: progressPrompt.assignmentId, progress: val }); setProgressPrompt(null) }}
              onSkip={() => setProgressPrompt(null)}
            />
          )}
        </AnimatePresence>,
        document.body
      )}

      <div className="space-y-5 max-w-2xl mx-auto">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Study Timer</h1>
            <p className="text-white/40 text-sm mt-0.5">Pomodoro-style focus sessions</p>
          </div>
          <motion.button
            onClick={() => setFocusMode(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-indigo-300 transition-all"
            style={{ background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.25)' }}
            whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
          >
            <ArrowsPointingOutIcon className="w-4 h-4" /> Focus Mode
          </motion.button>
        </div>

        {/* Mode tabs */}
        <div className="flex gap-1 bg-white/[0.04] rounded-xl p-1">
          {Object.entries(MODES).map(([key, m]) => (
            <button key={key} onClick={() => switchMode(key)}
              className={cn('flex-1 py-2 text-sm rounded-lg transition-all',
                mode === key ? 'bg-white/10 text-white font-medium' : 'text-white/40 hover:text-white/70')}>
              {m.label}
            </button>
          ))}
        </div>

        {/* Timer card */}
        <Card className="flex flex-col items-center py-8">
          <div className="flex gap-2 mb-6">
            {Array.from({ length: 4 }, (_, i) => <SessionDot key={i} completed={i < sessionCount % 4} />)}
          </div>

          <div className="relative">
            <TimerRing progress={progress} color={color} size={220} />
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <motion.div
                className="font-mono text-5xl font-bold tracking-tight"
                style={{ color }}
                animate={running && seconds === 0 ? { scale: [1, 1.05, 1] } : {}}
                transition={{ duration: 0.3 }}
              >
                {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
              </motion.div>
              <div className="text-white/40 text-xs mt-1 uppercase tracking-wide">{MODES[mode].label}</div>
            </div>
          </div>

          <div className="flex items-center gap-4 mt-6">
            <motion.button onClick={handleReset}
              className="w-11 h-11 rounded-full bg-white/[0.06] flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-colors"
              whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <ArrowPathIcon className="w-5 h-5" />
            </motion.button>
            <motion.button onClick={handleToggle}
              aria-label={running ? 'Pause timer' : 'Start timer'}
              className="w-16 h-16 rounded-full flex items-center justify-center shadow-lg"
              style={{ background: `linear-gradient(135deg, ${color}, ${color}80)`, color: '#fff' }}
              whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              {running ? <PauseIcon className="w-7 h-7" /> : <PlayIcon className="w-7 h-7" />}
            </motion.button>
            <motion.button onClick={() => { handleReset(); switchMode('work') }}
              className="w-11 h-11 rounded-full bg-white/[0.06] flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-colors"
              whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <StopIcon className="w-5 h-5" />
            </motion.button>
          </div>

          <div className="mt-6 w-full max-w-sm space-y-2">
            {suggestedFocus && !linkedAssignmentId && (
              <button
                onClick={() => setLinkedAssignmentId(suggestedFocus.id)}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-left transition-all"
                style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.20)' }}
              >
                <BoltIcon className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] text-amber-400/70 font-semibold uppercase tracking-wide">Suggested</p>
                  <p className="text-xs text-white/70 truncate">{suggestedFocus.title}</p>
                </div>
                <span className="text-[10px] text-amber-400/50 flex-shrink-0">Use →</span>
              </button>
            )}
            <label className="text-xs text-white/30 uppercase tracking-wide">Link to Assignment</label>
            <select className="input-field mt-1 text-sm" value={linkedAssignmentId} onChange={e => setLinkedAssignmentId(e.target.value)}>
              <option value="">None (free focus)</option>
              {assignments.map(a => <option key={a.id} value={a.id}>{a.title}</option>)}
            </select>
            <label className="text-xs text-white/30 uppercase tracking-wide mt-3 block">Subject (for time tracking)</label>
            <select className="input-field mt-1 text-sm" value={sessionSubjectId} onChange={e => setSessionSubjectId(e.target.value)}>
              <option value="">Untagged</option>
              {subjectsList.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <MusicPanel />
          </div>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4">
          <Card>
            <div className="flex items-center gap-2 mb-1">
              <ClockIcon className="w-4 h-4 text-indigo-400" />
              <span className="text-xs text-white/40 uppercase tracking-wide">Focus Today</span>
            </div>
            <p className="text-2xl font-bold text-indigo-300">{Math.floor(totalFocusMinutes / 60)}h {totalFocusMinutes % 60}m</p>
          </Card>
          <Card>
            <div className="flex items-center gap-2 mb-1">
              <CheckCircleIcon className="w-4 h-4 text-emerald-400" />
              <span className="text-xs text-white/40 uppercase tracking-wide">Sessions Today</span>
            </div>
            <p className="text-2xl font-bold text-emerald-300">{todaySessions.length}</p>
          </Card>
        </div>

        {sessions.length > 0 && (
          <Card>
            <p className="text-xs text-white/40 uppercase tracking-wide mb-3">Recent Sessions</p>
            <div className="space-y-2">
              {sessions.slice(0, 8).map(s => (
                <div key={s.id} className="flex items-center gap-3 py-1.5">
                  <div className="w-2 h-2 rounded-full bg-indigo-400/60 flex-shrink-0" />
                  <span className="text-sm text-white/70 flex-1">{s.assignment_title || 'Free Focus'}</span>
                  <span className="text-xs text-white/30">{s.duration_minutes || '—'}m</span>
                  <span className="text-xs text-white/20">{new Date(s.started_at * 1000).toLocaleDateString()}</span>
                </div>
              ))}
            </div>
          </Card>
        )}

        <SubjectTimeStats />
      </div>
    </>
  )
}
