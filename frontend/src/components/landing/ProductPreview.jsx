import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckBadgeIcon } from '@heroicons/react/24/solid'
import { SectionHeading } from './AnimatedText'
import { useTilt } from './useTilt'

const DEMO_TEXT = 'chem lab report due friday at 3pm, medium difficulty, 3 hours'
const TYPE_SPEED = 32

export default function ProductPreview() {
  const [typed, setTyped] = useState('')
  const [phase, setPhase] = useState('idle') // idle -> typing -> parsing -> done
  const started = useRef(false)
  const { tiltRef, tiltStyle, tiltHandlers } = useTilt(3)

  function runDemo() {
    if (started.current) return
    started.current = true
    setPhase('typing')

    let i = 0
    const interval = setInterval(() => {
      i++
      setTyped(DEMO_TEXT.slice(0, i))
      if (i >= DEMO_TEXT.length) {
        clearInterval(interval)
        setPhase('parsing')
        setTimeout(() => setPhase('done'), 900)
      }
    }, TYPE_SPEED)
  }

  return (
    <section id="product-preview" className="relative py-24 md:py-32 px-6">
      <div className="max-w-4xl mx-auto">
        <SectionHeading
          eyebrow="See it in action"
          title="Type it like a text. Get a real assignment."
          subtitle="No forms, no dropdowns — just describe it the way you'd tell a friend, and AI structures the rest."
          accent="#a5b4fc"
        />

        <motion.div
          ref={tiltRef}
          {...tiltHandlers}
          style={tiltStyle}
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          onViewportEnter={runDemo}
          transition={{ duration: 0.6 }}
          className="glass-elevated rounded-3xl p-6 sm:p-8 mt-14 max-w-2xl mx-auto"
        >
          {/* Input bar */}
          <div className="flex items-center gap-3 rounded-2xl px-4 py-3.5 bg-white/[0.03] border border-white/[0.07] mb-5">
            <span className="text-indigo-400 text-sm shrink-0">✨</span>
            <span className="text-sm text-white/85 font-mono min-h-[1.25rem]">
              {typed}
              {(phase === 'typing') && <span className="inline-block w-[2px] h-4 bg-indigo-400 ml-0.5 align-middle animate-pulse" />}
            </span>
          </div>

          <AnimatePresence mode="wait">
            {phase === 'parsing' && (
              <motion.div
                key="parsing"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-2.5 text-sm text-white/40 px-1 py-2"
              >
                <span className="w-3.5 h-3.5 border-2 border-white/20 border-t-indigo-400 rounded-full animate-spin" />
                Parsing with AI…
              </motion.div>
            )}

            {phase === 'done' && (
              <motion.div
                key="done"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45 }}
              >
                <div className="flex items-center gap-2.5 bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4">
                  <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white/90">Chem Lab Report</p>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {[['#f59e0b', 'Lab'], ['#6366f1', 'Medium'], ['#818cf8', '3 hours'], ['#ef4444', 'Fri, 3:00 PM']].map(([color, label], i) => (
                        <motion.span
                          key={label}
                          initial={{ opacity: 0, scale: 0.7 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: 0.1 + i * 0.08, duration: 0.3 }}
                        >
                          <Badge color={color}>{label}</Badge>
                        </motion.span>
                      ))}
                    </div>
                  </div>
                </div>
                <motion.div
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2, duration: 0.4 }}
                  className="flex items-center gap-1.5 mt-3 text-xs font-medium text-emerald-400"
                >
                  <CheckBadgeIcon className="w-4 h-4" /> Parsed by AI — added to your board
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </section>
  )
}

function Badge({ color, children }) {
  return (
    <span
      className="text-[11px] font-semibold px-2 py-1 rounded-lg"
      style={{ background: `color-mix(in srgb, ${color} 18%, transparent)`, color }}
    >
      {children}
    </span>
  )
}
