import { Link } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { ArrowRightIcon } from '@heroicons/react/24/outline'
import { AnimatedHeadline, RevealBlock } from './AnimatedText'

export default function FinalCTA() {
  const reduceMotion = useReducedMotion()
  return (
    <section className="relative py-24 md:py-32 px-6">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.6 }}
          className="relative glass-elevated rounded-3xl px-8 py-16 sm:py-20 text-center overflow-hidden"
        >
          <motion.div
            className="absolute inset-0 opacity-30 pointer-events-none"
            style={{ background: 'radial-gradient(circle at 50% 0%, #6366f1 0%, transparent 60%)' }}
            animate={reduceMotion ? {} : { opacity: [0.2, 0.35, 0.2] }}
            transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
          />
          <div
            className="absolute -bottom-24 -left-16 w-72 h-72 rounded-full opacity-15 pointer-events-none"
            style={{ background: 'radial-gradient(circle, #ec4899 0%, transparent 70%)' }}
          />
          <div className="relative">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white tracking-tight mb-5">
              <AnimatedHeadline as="span">Ready to know how busy</AnimatedHeadline>
              <br className="hidden sm:block" />
              <AnimatedHeadline as="span" delay={0.2}>you actually are?</AnimatedHeadline>
            </h2>
            <RevealBlock delay={0.4}>
              <p className="text-white/45 text-base max-w-md mx-auto mb-9">
                Free to use, takes under a minute to set up, and your data stays yours.
              </p>
            </RevealBlock>
            <Link to="/login?tab=signup">
              <motion.span
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.5, duration: 0.5 }}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.98 }}
                className="btn-primary text-base px-7 py-3.5 inline-flex"
              >
                Get Started Free <ArrowRightIcon className="w-4 h-4" />
              </motion.span>
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
