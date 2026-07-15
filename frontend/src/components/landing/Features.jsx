import { useState, useEffect } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import {
  ClipboardDocumentListIcon,
  CalculatorIcon,
  SparklesIcon,
  ArrowPathIcon,
  FireIcon,
  ClockIcon,
  Squares2X2Icon,
} from '@heroicons/react/24/outline'
import { SectionHeading } from './AnimatedText'
import { useTilt } from './useTilt'

const RING_C = 2 * Math.PI * 42

function TiltCard({ className = '', children, glowColor = '#6366f1' }) {
  const { tiltRef, tiltStyle, glowX, glowY, tiltHandlers } = useTilt(6)
  return (
    <motion.div
      ref={tiltRef}
      style={tiltStyle}
      {...tiltHandlers}
      whileHover={{ scale: 1.015 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      className={`glass glass-hover rounded-2xl p-6 relative overflow-hidden group ${className}`}
    >
      <motion.div
        className="pointer-events-none absolute -inset-px opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{ background: `radial-gradient(320px circle at ${glowX} ${glowY}, color-mix(in srgb, ${glowColor} 12%, transparent), transparent 70%)` }}
      />
      {children}
    </motion.div>
  )
}

function BusyScoreCard() {
  const reduceMotion = useReducedMotion()
  const [score, setScore] = useState(() => reduceMotion ? 62 : 0)
  useEffect(() => {
    if (reduceMotion) return
    const t = setTimeout(() => setScore(62), 300)
    return () => clearTimeout(t)
  }, [reduceMotion])

  return (
    <TiltCard className="lg:col-span-2 lg:row-span-2 flex flex-col" glowColor="#6366f1">
      <div className="inline-flex items-center justify-center w-11 h-11 rounded-xl mb-4 bg-indigo-500/15 border border-indigo-500/25">
        <span className="text-lg">📊</span>
      </div>
      <h3 className="text-lg font-semibold text-white mb-2">Busy Score</h3>
      <p className="text-sm text-white/40 leading-relaxed mb-6 max-w-xs">
        A live 0–100 workload gauge that weighs urgency, difficulty, and deadline clustering — not just a countdown to the next due date.
      </p>
      <div className="mt-auto flex items-center gap-5">
        <div className="relative w-24 h-24 shrink-0">
          <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
            <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="7" />
            <motion.circle
              cx="50" cy="50" r="42" fill="none" stroke="url(#busy-card-gradient)" strokeWidth="7" strokeLinecap="round"
              strokeDasharray={RING_C}
              initial={{ strokeDashoffset: RING_C }}
              whileInView={{ strokeDashoffset: RING_C * (1 - score / 100) }}
              viewport={{ once: true }}
              transition={{ duration: 1.3, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
            />
            <defs>
              <linearGradient id="busy-card-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#a5b4fc" /><stop offset="100%" stopColor="#6366f1" />
              </linearGradient>
            </defs>
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-xl font-bold text-white">{score}</span>
          </div>
        </div>
        <div className="flex-1 space-y-1.5">
          <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden"><motion.div className="h-full bg-amber-400/70 rounded-full" initial={{ width: 0 }} whileInView={{ width: '70%' }} viewport={{ once: true }} transition={{ duration: 1, delay: 0.4 }} /></div>
          <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden"><motion.div className="h-full bg-indigo-400/70 rounded-full" initial={{ width: 0 }} whileInView={{ width: '45%' }} viewport={{ once: true }} transition={{ duration: 1, delay: 0.5 }} /></div>
          <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden"><motion.div className="h-full bg-emerald-400/70 rounded-full" initial={{ width: 0 }} whileInView={{ width: '30%' }} viewport={{ once: true }} transition={{ duration: 1, delay: 0.6 }} /></div>
        </div>
      </div>
    </TiltCard>
  )
}

const NL_EXAMPLES =['calc pset due friday, 3 hours, hard', 'chem lab report due monday 9am', 'read ch. 4 before thursday seminar']

function NLAddCard() {
  const [idx, setIdx] = useState(0)
  const reduceMotion = useReducedMotion()
  useEffect(() => {
    if (reduceMotion) return
    const i = setInterval(() => setIdx(v => (v + 1) % NL_EXAMPLES.length), 2800)
    return () => clearInterval(i)
  }, [reduceMotion])

  return (
    <TiltCard className="lg:col-span-2" glowColor="#818cf8">
      <div className="inline-flex items-center justify-center w-11 h-11 rounded-xl mb-4 bg-indigo-400/15 border border-indigo-400/25">
        <ClipboardDocumentListIcon className="w-5 h-5 text-indigo-300" />
      </div>
      <h3 className="text-base font-semibold text-white mb-2">Natural-language add</h3>
      <p className="text-sm text-white/40 leading-relaxed mb-4">Type it like a text. AI turns it into a structured assignment — no dropdowns, no forms.</p>
      <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] px-3.5 py-2.5 font-mono text-xs text-white/60 h-9 overflow-hidden relative">
        {reduceMotion ? (
          <span>{NL_EXAMPLES[0]}</span>
        ) : (
          <motion.div key={idx} initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -20, opacity: 0 }} transition={{ duration: 0.4 }}>
            {NL_EXAMPLES[idx]}
          </motion.div>
        )}
      </div>
    </TiltCard>
  )
}

function AIToolsCard() {
  return (
    <TiltCard glowColor="#a855f7">
      <div className="inline-flex items-center justify-center w-11 h-11 rounded-xl mb-4 bg-purple-500/15 border border-purple-500/25 relative">
        <motion.div
          className="absolute inset-0 rounded-xl"
          style={{ background: 'radial-gradient(circle, rgba(168,85,247,0.35) 0%, transparent 70%)' }}
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
        />
        <SparklesIcon className="w-5 h-5 text-purple-300 relative" />
      </div>
      <h3 className="text-base font-semibold text-white mb-2">AI study tools</h3>
      <p className="text-sm text-white/40 leading-relaxed">Paste notes or a PDF — get flashcards, guides, or a quiz back in seconds.</p>
    </TiltCard>
  )
}

function GradeCalcCard() {
  const [pct, setPct] = useState(0)
  return (
    <TiltCard glowColor="#f59e0b">
      <div className="inline-flex items-center justify-center w-11 h-11 rounded-xl mb-4 bg-amber-500/15 border border-amber-500/25">
        <CalculatorIcon className="w-5 h-5 text-amber-400" />
      </div>
      <h3 className="text-base font-semibold text-white mb-2">Grade calculator</h3>
      <p className="text-sm text-white/40 leading-relaxed mb-3">Weighted grades and a what-you-need-on-the-final calculator.</p>
      <motion.p
        className="text-2xl font-bold text-amber-400 tabular-nums"
        onViewportEnter={() => {
          if (pct !== 0) return
          const target = 92
          const start = performance.now()
          function tick(now) {
            const p = Math.min(1, (now - start) / 900)
            setPct(Math.round(target * p))
            if (p < 1) requestAnimationFrame(tick)
          }
          requestAnimationFrame(tick)
        }}
        viewport={{ once: true }}
      >
        {pct}%
      </motion.p>
    </TiltCard>
  )
}

function CanvasSyncCard() {
  const reduceMotion = useReducedMotion()
  return (
    <TiltCard glowColor="#10b981">
      <div className="inline-flex items-center justify-center w-11 h-11 rounded-xl mb-4 bg-emerald-500/15 border border-emerald-500/25">
        <motion.div animate={reduceMotion ? {} : { rotate: 360 }} transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}>
          <ArrowPathIcon className="w-5 h-5 text-emerald-400" />
        </motion.div>
      </div>
      <h3 className="text-base font-semibold text-white mb-2">Canvas sync</h3>
      <p className="text-sm text-white/40 leading-relaxed">Pull assignments and grades in directly from Canvas LMS.</p>
    </TiltCard>
  )
}

const HEATMAP_LEVELS = [0.1, 0.14, 0.55, 0.85, 0.18, 0.12, 0.35, 0.65, 0.22, 0.1, 0.9, 0.45, 0.16, 0.28]

function HeatmapCard() {
  const reduceMotion = useReducedMotion()
  return (
    <TiltCard glowColor="#ef4444" className="flex flex-col">
      <div className="inline-flex items-center justify-center w-11 h-11 rounded-xl mb-4 bg-red-500/15 border border-red-500/25">
        <FireIcon className="w-5 h-5 text-red-400" />
      </div>
      <h3 className="text-base font-semibold text-white mb-2">Semester heatmap</h3>
      <p className="text-sm text-white/40 leading-relaxed mb-3">Your academic activity and streaks, at a glance.</p>
      <div className="grid grid-cols-7 gap-1.5 mt-auto">
        {HEATMAP_LEVELS.map((level, i) => (
          <motion.div
            key={i}
            className="w-2.5 h-2.5 rounded-full bg-red-400"
            initial={{ opacity: 0.08, scale: 0.6 }}
            whileInView={{ opacity: level, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.35, delay: reduceMotion ? 0 : i * 0.04 }}
          />
        ))}
      </div>
    </TiltCard>
  )
}

function TimerCard() {
  const reduceMotion = useReducedMotion()
  return (
    <TiltCard glowColor="#22d3ee">
      <div className="inline-flex items-center justify-center w-11 h-11 rounded-xl mb-4 bg-cyan-500/15 border border-cyan-500/25 relative">
        <svg viewBox="0 0 24 24" className="w-6 h-6 absolute -rotate-90">
          <motion.circle
            cx="12" cy="12" r="9" fill="none" stroke="#22d3ee" strokeWidth="1.5" strokeLinecap="round"
            strokeDasharray={2 * Math.PI * 9}
            animate={reduceMotion ? {} : { strokeDashoffset: [2 * Math.PI * 9, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
            opacity={0.5}
          />
        </svg>
        <ClockIcon className="w-5 h-5 text-cyan-400 relative" />
      </div>
      <h3 className="text-base font-semibold text-white mb-2">Study timer</h3>
      <p className="text-sm text-white/40 leading-relaxed">Pomodoro sessions tied to your assignments and subjects.</p>
    </TiltCard>
  )
}

function LifeCard() {
  return (
    <TiltCard glowColor="#ec4899">
      <div className="inline-flex items-center justify-center w-11 h-11 rounded-xl mb-4 bg-pink-500/15 border border-pink-500/25">
        <Squares2X2Icon className="w-5 h-5 text-pink-400" />
      </div>
      <h3 className="text-base font-semibold text-white mb-2">Beyond the classroom</h3>
      <p className="text-sm text-white/40 leading-relaxed">Clubs, jobs, and internship applications — plus CSV/calendar export.</p>
    </TiltCard>
  )
}

export default function Features() {
  return (
    <section id="features" className="relative py-24 md:py-32 px-6">
      <div className="max-w-6xl mx-auto">
        <SectionHeading
          eyebrow="Features"
          title="Everything, without the app-switching"
          subtitle="One place for deadlines, grades, study time, and the AI to tie it all together."
          accent="#818cf8"
        />

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 mt-14 lg:auto-rows-[210px]">
          <BusyScoreCard />
          <AIToolsCard />
          <GradeCalcCard />
          <NLAddCard />
          <CanvasSyncCard />
          <HeatmapCard />
          <TimerCard />
          <LifeCard />
        </div>
      </div>
    </section>
  )
}
