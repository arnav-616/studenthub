import { motion, useReducedMotion } from 'framer-motion'
import { useTilt } from './useTilt'

const ASSIGNMENTS = [
  { title: 'Orgo Lab Report', subject: 'Chemistry', color: '#f59e0b', due: 'Tomorrow', urgent: true },
  { title: 'Problem Set 6', subject: 'Calc II', color: '#6366f1', due: 'Fri' },
  { title: 'Reading Response', subject: 'Lit Seminar', color: '#10b981', due: 'Mon' },
]

const RING_CIRCUMFERENCE = 2 * Math.PI * 54

export default function DashboardMockup() {
  const score = 62
  const dashOffset = RING_CIRCUMFERENCE * (1 - score / 100)
  const reduceMotion = useReducedMotion()
  const { tiltRef, tiltStyle, tiltHandlers } = useTilt(7)

  return (
    <motion.div
      initial={{ opacity: 0, y: 30, rotate: -1 }}
      animate={{ opacity: 1, y: 0, rotate: 0 }}
      transition={{ duration: 0.7, delay: 0.3, ease: 'easeOut' }}
      className="relative w-full max-w-md mx-auto lg:mx-0"
    >
      <motion.div
        ref={tiltRef}
        {...tiltHandlers}
        animate={reduceMotion ? {} : { y: [0, -10, 0] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
        style={tiltStyle}
        className="glass-elevated rounded-3xl p-5 relative overflow-hidden"
      >
        {/* ambient glow behind the card */}
        <div
          className="absolute -top-16 -right-16 w-56 h-56 rounded-full opacity-20 pointer-events-none"
          style={{ background: 'radial-gradient(circle, #6366f1 0%, transparent 70%)' }}
        />

        <div className="flex items-center justify-between mb-5 relative">
          <span className="text-[11px] font-semibold tracking-wide text-white/35 uppercase">This Week</span>
          <span className="flex items-center gap-1.5 text-[11px] font-medium text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Live
          </span>
        </div>

        {/* Busy score ring */}
        <div className="flex items-center gap-4 mb-5 relative">
          <div className="relative w-[110px] h-[110px] shrink-0">
            <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
              <circle cx="60" cy="60" r="54" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="9" />
              <motion.circle
                cx="60" cy="60" r="54" fill="none"
                stroke="url(#mockup-gradient)"
                strokeWidth="9"
                strokeLinecap="round"
                strokeDasharray={RING_CIRCUMFERENCE}
                initial={{ strokeDashoffset: RING_CIRCUMFERENCE }}
                animate={{ strokeDashoffset: dashOffset }}
                transition={{ duration: 1.4, delay: 0.6, ease: 'easeOut' }}
              />
              <defs>
                <linearGradient id="mockup-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#818cf8" />
                  <stop offset="100%" stopColor="#6366f1" />
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-bold text-white">{score}</span>
              <span className="text-[9px] uppercase tracking-wide text-white/35">Busy Score</span>
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-amber-400 mb-1">Moderately Busy</p>
            <p className="text-xs text-white/40 leading-relaxed">3 things due this week. You've got ~14 focus hours to spare.</p>
          </div>
        </div>

        {/* Assignment rows */}
        <div className="space-y-2 mb-4">
          {ASSIGNMENTS.map((a, i) => (
            <motion.div
              key={a.title}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: 0.9 + i * 0.12 }}
              className="flex items-center gap-2.5 bg-white/[0.03] border border-white/[0.05] rounded-xl px-3 py-2.5"
            >
              <span className="w-2 h-2 rounded-full shrink-0" style={{ background: a.color }} />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-white/85 truncate">{a.title}</p>
                <p className="text-[10px] text-white/35">{a.subject}</p>
              </div>
              <span className={`text-[10px] font-semibold px-2 py-1 rounded-lg shrink-0 ${a.urgent ? 'bg-red-500/15 text-red-400' : 'bg-white/[0.05] text-white/40'}`}>
                {a.due}
              </span>
            </motion.div>
          ))}
        </div>

        {/* AI suggestion strip */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 1.4 }}
          className="flex items-center gap-2 rounded-xl px-3 py-2.5"
          style={{ background: 'color-mix(in srgb, var(--accent) 12%, transparent)', border: '1px solid color-mix(in srgb, var(--accent) 25%, transparent)' }}
        >
          <span className="text-sm">✨</span>
          <p className="text-[11px] text-white/70"><span className="font-semibold text-white">Do this next:</span> Orgo lab report — due tomorrow</p>
        </motion.div>
      </motion.div>

      {/* Floating badge */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8, x: -10 }}
        animate={{ opacity: 1, scale: 1, x: 0, y: reduceMotion ? 0 : [0, -8, 0] }}
        transition={{ opacity: { duration: 0.4, delay: 1.7 }, scale: { duration: 0.4, delay: 1.7 }, y: { duration: 5, repeat: Infinity, ease: 'easeInOut', delay: 1.7 } }}
        className="hidden sm:flex absolute -left-8 top-8 glass rounded-2xl px-3.5 py-2.5 items-center gap-2"
      >
        <span className="w-2 h-2 rounded-full bg-emerald-400" />
        <span className="text-xs font-medium text-white/80">Synced with Canvas</span>
      </motion.div>
    </motion.div>
  )
}
