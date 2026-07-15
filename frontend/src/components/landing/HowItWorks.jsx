import { useRef } from 'react'
import { motion, useScroll, useTransform, useReducedMotion } from 'framer-motion'
import { SectionHeading, RevealBlock } from './AnimatedText'

const STEPS = [
  {
    number: '01',
    title: 'Add your workload',
    description: 'Type assignments in plain English, import from Canvas, or add them manually. Takes seconds either way.',
  },
  {
    number: '02',
    title: 'See your real Busy Score',
    description: 'A live number that factors in urgency, difficulty, and how many things are stacking up on the same day.',
  },
  {
    number: '03',
    title: 'Let AI help you plan',
    description: 'Generate a day-by-day study plan, ask what to work on right now, or turn any material into flashcards.',
  },
  {
    number: '04',
    title: 'Stay ahead, automatically',
    description: 'Timer sessions, grade updates, and your semester heatmap all stay in sync as you go.',
  },
]

export default function HowItWorks() {
  const reduceMotion = useReducedMotion()
  const ref = useRef(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start 75%', 'end 60%'] })
  const lineScale = useTransform(scrollYProgress, [0, 1], [0, 1])

  return (
    <section id="how-it-works" className="relative py-24 md:py-32 px-6">
      <div className="max-w-5xl mx-auto">
        <SectionHeading
          eyebrow="How it works"
          title="From syllabus chaos to a plan, in minutes"
          subtitle="Four steps. No setup wizard you'll forget to finish."
          accent="#a78bfa"
        />

        <div ref={ref} className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-14 relative">
          <div className="hidden lg:block absolute top-6 left-[12.5%] right-[12.5%] h-px bg-white/[0.07]" />
          <motion.div
            className="hidden lg:block absolute top-6 left-[12.5%] h-px origin-left"
            style={{
              width: '75%',
              scaleX: reduceMotion ? 1 : lineScale,
              background: 'linear-gradient(90deg, #6366f1, #a78bfa, #ec4899)',
            }}
          />
          {STEPS.map((step, i) => (
            <motion.div
              key={step.number}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="relative"
            >
              <motion.div
                className="flex items-center justify-center w-12 h-12 rounded-2xl glass mb-5 relative z-10"
                whileInView={{ scale: [0.8, 1.08, 1] }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 + 0.2 }}
              >
                <span className="text-sm font-bold text-gradient">{step.number}</span>
              </motion.div>
              <h3 className="text-base font-semibold text-white mb-2">{step.title}</h3>
              <RevealBlock delay={i * 0.05}>
                <p className="text-sm text-white/40 leading-relaxed">{step.description}</p>
              </RevealBlock>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
