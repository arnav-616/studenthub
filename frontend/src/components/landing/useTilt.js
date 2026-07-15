import { useRef } from 'react'
import { useMotionValue, useSpring, useTransform, useReducedMotion } from 'framer-motion'

// Mouse-tracking 3D tilt — returns a ref + motion values to spread onto a motion.div.
export function useTilt(maxTilt = 8) {
  const reduceMotion = useReducedMotion()
  const ref = useRef(null)
  const px = useMotionValue(0.5)
  const py = useMotionValue(0.5)
  const spring = { stiffness: 200, damping: 22, mass: 0.5 }
  const rotateX = useSpring(useTransform(py, [0, 1], [maxTilt, -maxTilt]), spring)
  const rotateY = useSpring(useTransform(px, [0, 1], [-maxTilt, maxTilt]), spring)
  const glowX = useTransform(px, [0, 1], ['0%', '100%'])
  const glowY = useTransform(py, [0, 1], ['0%', '100%'])

  function onMouseMove(e) {
    if (reduceMotion || !ref.current) return
    const rect = ref.current.getBoundingClientRect()
    px.set((e.clientX - rect.left) / rect.width)
    py.set((e.clientY - rect.top) / rect.height)
  }
  function onMouseLeave() {
    px.set(0.5)
    py.set(0.5)
  }

  return {
    tiltRef: ref,
    tiltStyle: reduceMotion ? {} : { rotateX, rotateY, transformPerspective: 900 },
    glowX, glowY,
    tiltHandlers: { onMouseMove, onMouseLeave },
  }
}
