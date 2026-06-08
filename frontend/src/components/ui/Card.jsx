import { motion } from 'framer-motion'
import { cn } from '../../utils/cn'

export default function Card({ children, className, hover = false, onClick, accent, ...props }) {
  const Comp = onClick ? motion.button : motion.div
  return (
    <Comp
      onClick={onClick}
      className={cn(
        'glass rounded-2xl p-5 relative overflow-hidden',
        hover && 'glass-hover cursor-pointer',
        onClick && 'text-left w-full',
        className
      )}
      whileHover={hover || onClick ? { y: -2, boxShadow: '0 16px 48px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.10)' } : {}}
      transition={{ duration: 0.18, ease: 'easeOut' }}
      {...props}
    >
      {/* Optional color accent strip on top */}
      {accent && (
        <div
          className="absolute top-0 left-0 right-0 h-[2px] rounded-t-2xl"
          style={{ background: accent }}
        />
      )}
      {children}
    </Comp>
  )
}
