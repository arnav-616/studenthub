import { motion } from 'framer-motion'
import { cn } from '../../utils/cn'

export default function Card({ children, className, hover = false, onClick, ...props }) {
  const Comp = onClick ? motion.button : motion.div
  return (
    <Comp
      onClick={onClick}
      className={cn(
        'glass rounded-2xl p-5',
        hover && 'glass-hover cursor-pointer',
        onClick && 'text-left w-full',
        className
      )}
      whileHover={hover || onClick ? { scale: 1.01, y: -1 } : {}}
      transition={{ duration: 0.15 }}
      {...props}
    >
      {children}
    </Comp>
  )
}
