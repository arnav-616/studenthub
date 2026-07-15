import { motion, useReducedMotion } from 'framer-motion'

const EASE = [0.22, 1, 0.36, 1]

// Splits plain-string headings into words that slide up out of a mask, staggered.
export function AnimatedHeadline({ children, className = '', delay = 0, as: Tag = 'span' }) {
  const reduceMotion = useReducedMotion()
  const words = String(children).split(' ')

  if (reduceMotion) return <Tag className={className}>{children}</Tag>

  return (
    <Tag className={className}>
      {words.map((word, i) => (
        <span key={i} style={{ display: 'inline-block', overflow: 'hidden', verticalAlign: 'top', paddingBottom: '0.15em', marginBottom: '-0.15em' }}>
          <motion.span
            style={{ display: 'inline-block' }}
            initial={{ y: '100%', opacity: 0 }}
            whileInView={{ y: '0%', opacity: 1 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.65, delay: delay + i * 0.045, ease: EASE }}
          >
            {word}&nbsp;
          </motion.span>
        </span>
      ))}
    </Tag>
  )
}

// Blur + rise reveal for paragraphs / non-text blocks — a step up from plain fade.
export function RevealBlock({ children, className = '', delay = 0, y = 18, as = 'div' }) {
  const reduceMotion = useReducedMotion()
  const Motion = motion[as] || motion.div

  return (
    <Motion
      initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y, filter: 'blur(8px)' }}
      whileInView={reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0, filter: 'blur(0px)' }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.7, delay, ease: EASE }}
      className={className}
    >
      {children}
    </Motion>
  )
}

export function SectionHeading({ eyebrow, title, subtitle, accent = 'var(--accent)' }) {
  return (
    <div className="text-center max-w-2xl mx-auto">
      <RevealBlock>
        <span className="text-xs font-semibold tracking-wider uppercase" style={{ color: accent }}>{eyebrow}</span>
      </RevealBlock>
      <h2 className="text-3xl sm:text-4xl font-bold text-white mt-3 mb-4 tracking-tight">
        <AnimatedHeadline>{title}</AnimatedHeadline>
      </h2>
      <RevealBlock delay={0.15}>
        <p className="text-white/40 text-base leading-relaxed">{subtitle}</p>
      </RevealBlock>
    </div>
  )
}
