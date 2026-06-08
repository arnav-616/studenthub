import { useEffect, useRef, useState } from 'react'
import { motion, useSpring, useTransform } from 'framer-motion'

const BANDS = {
  Clear: { color: '#22d3ee', glow: 'rgba(34,211,238,0.4)', label: 'Clear Skies' },
  Light: { color: '#6366f1', glow: 'rgba(99,102,241,0.4)', label: 'Light Load' },
  Moderate: { color: '#8b5cf6', glow: 'rgba(139,92,246,0.4)', label: 'Moderate' },
  Busy: { color: '#f59e0b', glow: 'rgba(245,158,11,0.4)', label: 'Getting Busy' },
  Heavy: { color: '#ef4444', glow: 'rgba(239,68,68,0.4)', label: 'Heavy Load' },
  Overwhelming: { color: '#dc2626', glow: 'rgba(220,38,38,0.5)', label: 'Overwhelming' },
}

const CIRCUMFERENCE = 2 * Math.PI * 54
const ARC_RATIO = 270 / 360

export default function BusyScoreRing({ score = 0, band = 'Clear', size = 200 }) {
  const config = BANDS[band] || BANDS.Clear
  const [displayScore, setDisplayScore] = useState(0)
  const targetDash = (score / 100) * CIRCUMFERENCE * ARC_RATIO

  // Animate score number
  useEffect(() => {
    const start = displayScore
    const end = score
    if (start === end) return
    const steps = 40
    const inc = (end - start) / steps
    let current = start
    const timer = setInterval(() => {
      current += inc
      if ((inc > 0 && current >= end) || (inc < 0 && current <= end)) {
        setDisplayScore(end)
        clearInterval(timer)
      } else {
        setDisplayScore(Math.round(current))
      }
    }, 16)
    return () => clearInterval(timer)
  }, [score])

  const isHigh = score >= 75
  const isPulsing = score >= 50

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 120 120"
        style={{ transform: 'rotate(135deg)' }}
      >
        {/* Background arc */}
        <circle
          cx="60" cy="60" r="54"
          fill="none"
          stroke="rgba(255,255,255,0.05)"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={`${CIRCUMFERENCE * ARC_RATIO} ${CIRCUMFERENCE}`}
        />
        {/* Score arc */}
        <motion.circle
          cx="60" cy="60" r="54"
          fill="none"
          stroke={config.color}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={`${targetDash} ${CIRCUMFERENCE}`}
          initial={{ strokeDasharray: `0 ${CIRCUMFERENCE}` }}
          animate={{ strokeDasharray: `${targetDash} ${CIRCUMFERENCE}` }}
          transition={{ duration: 1.2, ease: 'easeOut' }}
          style={{ filter: `drop-shadow(0 0 6px ${config.glow})` }}
        />
      </svg>

      {/* Center content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.div
          className={`font-bold tracking-tight leading-none ${
            size > 150 ? 'text-5xl' : 'text-3xl'
          }`}
          style={{ color: config.color }}
          animate={isPulsing ? { opacity: [1, 0.8, 1] } : {}}
          transition={isPulsing ? { duration: 2.5, repeat: Infinity } : {}}
        >
          {displayScore}
        </motion.div>
        <div className="text-white/40 text-xs mt-1 font-medium tracking-wide uppercase">
          {config.label}
        </div>
      </div>
    </div>
  )
}
