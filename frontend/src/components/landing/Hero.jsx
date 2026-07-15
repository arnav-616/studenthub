import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { ArrowRightIcon, SparklesIcon } from '@heroicons/react/24/outline'
import { RevealBlock } from './AnimatedText'
import DashboardMockup from './DashboardMockup'

const EASE = [0.22, 1, 0.36, 1]

const BADGE_PHRASES = [
  'Built for students who juggle too much',
  'Made for the perpetually overcommitted',
  'For students drowning in deadlines',
  'Built by someone who missed too many of them',
  'For when your calendar looks like chaos',
]

function ShufflingBadge() {
  const reduceMotion = useReducedMotion()
  const [idx, setIdx] = useState(0)

  useEffect(() => {
    if (reduceMotion) return
    const i = setInterval(() => setIdx(v => (v + 1) % BADGE_PHRASES.length), 3400)
    return () => clearInterval(i)
  }, [reduceMotion])

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 mb-6 glass overflow-hidden"
    >
      <SparklesIcon className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
      <span className="text-xs font-medium text-white/60 relative inline-grid">
        <span className="invisible whitespace-nowrap col-start-1 row-start-1" aria-hidden="true">
          {BADGE_PHRASES.reduce((a, b) => (a.length > b.length ? a : b))}
        </span>
        <AnimatePresence mode="wait">
          <motion.span
            key={idx}
            initial={reduceMotion ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? {} : { opacity: 0, y: -8 }}
            transition={{ duration: 0.4, ease: EASE }}
            className="whitespace-nowrap col-start-1 row-start-1"
          >
            {BADGE_PHRASES[idx]}
          </motion.span>
        </AnimatePresence>
      </span>
    </motion.div>
  )
}

function Word({ children, delay, className = '' }) {
  const reduceMotion = useReducedMotion()
  if (reduceMotion) return <span className={className}>{children}&nbsp;</span>
  return (
    <span style={{ display: 'inline-block', overflow: 'hidden', verticalAlign: 'top', paddingBottom: '0.15em', marginBottom: '-0.15em' }}>
      <motion.span
        style={{ display: 'inline-block' }}
        className={className}
        initial={{ y: '100%', opacity: 0 }}
        animate={{ y: '0%', opacity: 1 }}
        transition={{ duration: 0.7, delay, ease: EASE }}
      >
        {children}&nbsp;
      </motion.span>
    </span>
  )
}

export default function Hero() {
  const reduceMotion = useReducedMotion()
  const line1 = ['Stop', 'guessing', 'how']
  const line2Pre = ['busy', 'this', 'week']

  return (
    <section className="relative pt-36 pb-24 md:pt-44 md:pb-32 px-6 overflow-hidden">
      {/* Ambient background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10">
        <motion.div
          className="ambient-orb absolute top-[-10%] left-[15%] w-[500px] h-[500px] rounded-full opacity-25"
          style={{ background: 'radial-gradient(circle, #6366f1 0%, transparent 70%)' }}
          animate={reduceMotion ? {} : { x: [0, 40, 0], y: [0, 30, 0] }}
          transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="ambient-orb absolute top-[10%] right-[5%] w-[400px] h-[400px] rounded-full opacity-15"
          style={{ background: 'radial-gradient(circle, #a855f7 0%, transparent 70%)' }}
          animate={reduceMotion ? {} : { x: [0, -30, 0], y: [0, 40, 0] }}
          transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="ambient-orb absolute bottom-[-15%] left-[35%] w-[350px] h-[350px] rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle, #ec4899 0%, transparent 70%)' }}
          animate={reduceMotion ? {} : { x: [0, 25, 0], y: [0, -20, 0] }}
          transition={{ duration: 16, repeat: Infinity, ease: 'easeInOut' }}
        />
        <div className="bg-dot-grid absolute inset-0 opacity-40" style={{ backgroundImage: 'radial-gradient(circle, var(--c-dot-grid) 1px, transparent 1px)', backgroundSize: '32px 32px' }} />
      </div>

      <div className="max-w-6xl mx-auto grid lg:grid-cols-[1.1fr_0.9fr] gap-16 items-center">
        <div>
          <ShufflingBadge />

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-white leading-[1.08] mb-6">
            <span className="block">
              {line1.map((w, i) => <Word key={w} delay={0.05 + i * 0.06}>{w}</Word>)}
            </span>
            <span className="block">
              {line2Pre.map((w, i) => <Word key={w} delay={0.25 + i * 0.06}>{w}</Word>)}
              <Word delay={0.45} className="text-gradient bg-[length:200%_auto] animate-[gradient-shift_4s_ease_infinite]">actually</Word>
              <Word delay={0.5}>is.</Word>
            </span>
          </h1>

          <RevealBlock delay={0.55}>
            <p className="text-base sm:text-lg text-white/45 leading-relaxed max-w-xl mb-9">
              Cramr turns your syllabus chaos into one honest number — a live Busy Score that weighs deadlines, difficulty, and how much time you have left. Add assignments by typing them like a text message. Let AI handle the planning, flashcards, and grade math.
            </p>
          </RevealBlock>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.7 }}
            className="flex flex-col sm:flex-row gap-3"
          >
            <Link to="/login?tab=signup">
              <motion.span
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.98 }}
                className="btn-primary text-base px-6 py-3.5 justify-center relative overflow-hidden group"
              >
                <span className="relative z-10 flex items-center gap-1.5">Get Started Free <ArrowRightIcon className="w-4 h-4" /></span>
                {!reduceMotion && (
                  <motion.span
                    className="absolute inset-0 opacity-0 group-hover:opacity-100"
                    style={{ background: 'linear-gradient(120deg, transparent, rgba(255,255,255,0.25), transparent)' }}
                    initial={{ x: '-100%' }}
                    whileHover={{ x: '100%' }}
                    transition={{ duration: 0.8, ease: 'easeInOut' }}
                  />
                )}
              </motion.span>
            </Link>
            <a
              href="#product-preview"
              onClick={e => { e.preventDefault(); document.querySelector('#product-preview')?.scrollIntoView({ behavior: 'smooth' }) }}
              className="btn-ghost text-base px-6 py-3.5 justify-center"
            >
              See it in action
            </a>
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.85 }}
            className="text-xs text-white/25 mt-5"
          >
            Free to use · No credit card · Takes under a minute
          </motion.p>
        </div>

        <DashboardMockup />
      </div>
    </section>
  )
}
