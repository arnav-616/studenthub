import { motion } from 'framer-motion'
import { ScaleIcon, CpuChipIcon, Squares2X2Icon } from '@heroicons/react/24/outline'
import { SectionHeading, RevealBlock } from './AnimatedText'
import { useTilt } from './useTilt'

const POINTS = [
  {
    icon: ScaleIcon,
    title: 'A score that means something',
    description: "Most planners just sort by due date. Cramr's Busy Score actually weighs how much work is left, how hard it is, and whether three things are all landing on the same day.",
    color: '#10b981',
  },
  {
    icon: CpuChipIcon,
    title: 'AI that acts, not just chats',
    description: "The AI here doesn't just answer questions — it turns a sentence into a real assignment, a PDF into flashcards, and a messy week into an actual study plan.",
    color: '#818cf8',
  },
  {
    icon: Squares2X2Icon,
    title: 'One tab instead of six',
    description: 'Deadlines, grades, study timer, extracurriculars, and job applications — built to live in one place instead of six different apps and a paper planner.',
    color: '#ec4899',
  },
]

function PointCard({ point, i }) {
  const { tiltRef, tiltStyle, glowX, glowY, tiltHandlers } = useTilt(5)
  return (
    <motion.div
      ref={tiltRef}
      style={tiltStyle}
      {...tiltHandlers}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.5, delay: i * 0.1 }}
      className="text-center md:text-left glass rounded-2xl p-6 relative overflow-hidden group"
    >
      <motion.div
        className="pointer-events-none absolute -inset-px opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{ background: `radial-gradient(280px circle at ${glowX} ${glowY}, color-mix(in srgb, ${point.color} 14%, transparent), transparent 70%)` }}
      />
      <div
        className="inline-flex items-center justify-center w-12 h-12 rounded-2xl mb-5 relative"
        style={{ background: `color-mix(in srgb, ${point.color} 16%, transparent)`, border: `1px solid color-mix(in srgb, ${point.color} 28%, transparent)` }}
      >
        <point.icon className="w-5 h-5" style={{ color: point.color, width: 22, height: 22 }} />
      </div>
      <h3 className="text-lg font-semibold text-white mb-2.5 relative">{point.title}</h3>
      <RevealBlock delay={i * 0.08 + 0.15} className="relative">
        <p className="text-sm text-white/40 leading-relaxed">{point.description}</p>
      </RevealBlock>
    </motion.div>
  )
}

export default function WhyChooseUs() {
  return (
    <section className="relative py-24 md:py-32 px-6">
      <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10">
        <div
          className="ambient-orb absolute top-0 right-[10%] w-[450px] h-[450px] rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle, #10b981 0%, transparent 70%)', animation: 'blob-drift 24s ease-in-out infinite' }}
        />
      </div>
      <div className="max-w-5xl mx-auto">
        <SectionHeading
          eyebrow="Why Cramr"
          title="Built out of frustration with generic to-do apps"
          subtitle="This started as one student's own tracker before it became something worth sharing."
          accent="#34d399"
        />

        <div className="grid md:grid-cols-3 gap-6 mt-14">
          {POINTS.map((p, i) => <PointCard key={p.title} point={p} i={i} />)}
        </div>
      </div>
    </section>
  )
}
