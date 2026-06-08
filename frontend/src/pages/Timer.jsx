import { useState, useEffect, useRef, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import {
  PlayIcon, PauseIcon, StopIcon, ArrowPathIcon,
  CheckCircleIcon, ClockIcon,
} from '@heroicons/react/24/outline'
import Card from '../components/ui/Card'
import { timer as timerApi, assignments as assignmentsApi } from '../api/client'
import { cn } from '../utils/cn'

const MODES = {
  work: { label: 'Focus', defaultMin: 25, color: '#6366f1' },
  short: { label: 'Short Break', defaultMin: 5, color: '#22d3ee' },
  long: { label: 'Long Break', defaultMin: 15, color: '#10b981' },
}

const CIRCUMFERENCE = 2 * Math.PI * 54

function TimerRing({ progress, color, size = 220 }) {
  const dash = CIRCUMFERENCE * progress
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" style={{ transform: 'rotate(-90deg)' }}>
      <circle cx="60" cy="60" r="54" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="5" />
      <motion.circle
        cx="60" cy="60" r="54"
        fill="none"
        stroke={color}
        strokeWidth="5"
        strokeLinecap="round"
        strokeDasharray={`${dash} ${CIRCUMFERENCE}`}
        animate={{ strokeDasharray: `${dash} ${CIRCUMFERENCE}` }}
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

export default function Timer() {
  const qc = useQueryClient()
  const [mode, setMode] = useState('work')
  const [minutes, setMinutes] = useState(MODES.work.defaultMin)
  const [seconds, setSeconds] = useState(0)
  const [running, setRunning] = useState(false)
  const [sessionCount, setSessionCount] = useState(0)
  const [linkedAssignment, setLinkedAssignment] = useState('')
  const [sessionStartTime, setSessionStartTime] = useState(null)
  const intervalRef = useRef(null)
  const totalSeconds = useRef(MODES.work.defaultMin * 60)

  const { data: assignments = [] } = useQuery({
    queryKey: ['assignments', { status: 'pending,in_progress' }],
    queryFn: () => assignmentsApi.list({ status: 'pending' }),
  })

  const { data: sessions = [] } = useQuery({
    queryKey: ['timer-sessions'],
    queryFn: timerApi.getSessions,
  })

  const logMut = useMutation({
    mutationFn: timerApi.log,
    onSuccess: () => qc.invalidateQueries(['timer-sessions']),
  })

  const elapsed = useCallback(() => {
    return totalSeconds.current - (minutes * 60 + seconds)
  }, [minutes, seconds])

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
  }, [running])

  function handleComplete() {
    if (mode === 'work') {
      const durationMin = Math.round(totalSeconds.current / 60)
      logMut.mutate({
        assignment_id: linkedAssignment || null,
        duration_minutes: durationMin,
        session_type: 'focus',
        started_at: sessionStartTime,
        ended_at: Math.floor(Date.now() / 1000),
      })
      setSessionCount(c => c + 1)
      toast.success('Focus session complete! 🎉')
      if ((sessionCount + 1) % 4 === 0) switchMode('long')
      else switchMode('short')
    } else {
      switchMode('work')
      toast('Break time over — back to work!', { icon: '⚡' })
    }
  }

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

  function handleStart() {
    if (!running) {
      setSessionStartTime(sessionStartTime || Math.floor(Date.now() / 1000))
    }
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

  const todaySessions = sessions.filter(s => {
    const d = new Date(s.started_at * 1000)
    const today = new Date()
    return d.toDateString() === today.toDateString() && s.session_type === 'focus'
  })

  const totalFocusMinutes = todaySessions.reduce((acc, s) => acc + (s.duration_minutes || 0), 0)

  return (
    <div className="space-y-5 max-w-2xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold">Study Timer</h1>
        <p className="text-white/40 text-sm mt-0.5">Pomodoro-style focus sessions</p>
      </div>

      {/* Mode selector */}
      <div className="flex gap-1 bg-white/[0.04] rounded-xl p-1">
        {Object.entries(MODES).map(([key, m]) => (
          <button
            key={key}
            onClick={() => switchMode(key)}
            className={cn(
              'flex-1 py-2 text-sm rounded-lg transition-all',
              mode === key
                ? 'bg-white/10 text-white font-medium'
                : 'text-white/40 hover:text-white/70'
            )}
          >
            {m.label}
          </button>
        ))}
      </div>

      {/* Timer card */}
      <Card className="flex flex-col items-center py-8">
        {/* Session dots */}
        <div className="flex gap-2 mb-6">
          {Array.from({ length: 4 }, (_, i) => (
            <SessionDot key={i} completed={i < sessionCount % 4} />
          ))}
        </div>

        {/* Ring */}
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

        {/* Controls */}
        <div className="flex items-center gap-4 mt-6">
          <motion.button
            onClick={handleReset}
            className="w-11 h-11 rounded-full bg-white/[0.06] flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-colors"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <ArrowPathIcon className="w-5 h-5" />
          </motion.button>
          <motion.button
            onClick={handleStart}
            className="w-16 h-16 rounded-full flex items-center justify-center text-white shadow-lg transition-all"
            style={{ background: `linear-gradient(135deg, ${color}, ${color}80)` }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {running ? <PauseIcon className="w-7 h-7" /> : <PlayIcon className="w-7 h-7" />}
          </motion.button>
          <motion.button
            onClick={() => { handleReset(); switchMode('work') }}
            className="w-11 h-11 rounded-full bg-white/[0.06] flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-colors"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <StopIcon className="w-5 h-5" />
          </motion.button>
        </div>

        {/* Link to assignment */}
        <div className="mt-6 w-full max-w-sm">
          <label className="text-xs text-white/30 uppercase tracking-wide">Link to Assignment</label>
          <select
            className="input-field mt-1 text-sm"
            value={linkedAssignment}
            onChange={e => setLinkedAssignment(e.target.value)}
          >
            <option value="">None (free focus)</option>
            {assignments.map(a => <option key={a.id} value={a.id}>{a.title}</option>)}
          </select>
        </div>
      </Card>

      {/* Today's stats */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <div className="flex items-center gap-2 mb-1">
            <ClockIcon className="w-4 h-4 text-indigo-400" />
            <span className="text-xs text-white/40 uppercase tracking-wide">Focus Today</span>
          </div>
          <p className="text-2xl font-bold text-indigo-300">
            {Math.floor(totalFocusMinutes / 60)}h {totalFocusMinutes % 60}m
          </p>
        </Card>
        <Card>
          <div className="flex items-center gap-2 mb-1">
            <CheckCircleIcon className="w-4 h-4 text-emerald-400" />
            <span className="text-xs text-white/40 uppercase tracking-wide">Sessions Today</span>
          </div>
          <p className="text-2xl font-bold text-emerald-300">{todaySessions.length}</p>
        </Card>
      </div>

      {/* Recent sessions */}
      {sessions.length > 0 && (
        <Card>
          <p className="text-xs text-white/40 uppercase tracking-wide mb-3">Recent Sessions</p>
          <div className="space-y-2">
            {sessions.slice(0, 8).map(s => (
              <div key={s.id} className="flex items-center gap-3 py-1.5">
                <div className="w-2 h-2 rounded-full bg-indigo-400/60" />
                <span className="text-sm text-white/70 flex-1">
                  {s.assignment_title || 'Free Focus'}
                </span>
                <span className="text-xs text-white/30">
                  {s.duration_minutes || '—'}m
                </span>
                <span className="text-xs text-white/20">
                  {new Date(s.started_at * 1000).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}
