import { useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useLocation, NavLink } from 'react-router-dom'
import { createPortal } from 'react-dom'
import {
  HomeIcon, ClipboardDocumentListIcon, CalendarDaysIcon,
  ClockIcon, CalculatorIcon, PlusIcon,
} from '@heroicons/react/24/outline'
import Sidebar from './Sidebar'
import { useUIStore } from '../../store/useUIStore'

const pageVariants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit:    { opacity: 0, y: -8 },
}

const BOTTOM_NAV = [
  { to: '/', icon: HomeIcon, label: 'Home', end: true },
  { to: '/assignments', icon: ClipboardDocumentListIcon, label: 'Tasks' },
  { to: '/schedule', icon: CalendarDaysIcon, label: 'Schedule' },
  { to: '/timer', icon: ClockIcon, label: 'Timer' },
  { to: '/grades', icon: CalculatorIcon, label: 'Grades' },
]

function FAB() {
  const { openNewAssignment } = useUIStore()
  return (
    <motion.button
      onClick={openNewAssignment}
      className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full text-white shadow-2xl flex items-center justify-center fab-hide-mobile"
      style={{
        background: 'linear-gradient(135deg, var(--accent), color-mix(in srgb, var(--accent) 80%, #000))',
        boxShadow: '0 0 30px color-mix(in srgb, var(--accent) 40%, transparent)',
      }}
      whileHover={{ scale: 1.08 }}
      whileTap={{ scale: 0.94 }}
      title="New Assignment (⌘K)"
    >
      <PlusIcon className="w-6 h-6" />
    </motion.button>
  )
}

export default function Layout({ children, user, onLogout }) {
  const location = useLocation()
  const { sidebarCollapsed } = useUIStore()
  const marginLeft = sidebarCollapsed ? 64 : 240
  const spotlightRef = useRef(null)

  useEffect(() => {
    const move = (e) => {
      if (!spotlightRef.current) return
      if (document.documentElement.getAttribute('data-bg') === 'off') return
      spotlightRef.current.style.transform = `translate(${e.clientX - 240}px, ${e.clientY - 240}px)`
    }
    window.addEventListener('mousemove', move, { passive: true })
    return () => window.removeEventListener('mousemove', move)
  }, [])

  return (
    <div className="app-bg flex min-h-screen" style={{ background: 'var(--c-bg)' }}>
      {/* ── Dynamic background ── */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 0 }}>

        {/* Cursor spotlight */}
        <div ref={spotlightRef} className="bg-spotlight" style={{
          position: 'absolute', top: 0, left: 0,
          width: '480px', height: '480px', borderRadius: '50%',
          background: 'radial-gradient(circle at center, color-mix(in srgb, var(--accent) 5%, transparent) 0%, transparent 70%)',
          transform: 'translate(-240px, -240px)',
          transition: 'transform 0.55s cubic-bezier(0.23, 1, 0.32, 1)',
          willChange: 'transform',
        }} />

        {/* Ambient orbs */}
        <div className="ambient-orb" style={{ position: 'absolute', top: '-18%', left: '2%', width: '750px', height: '750px', borderRadius: '50%', background: 'radial-gradient(circle, color-mix(in srgb, var(--accent) 11%, transparent) 0%, transparent 70%)', animation: 'blob-drift 26s ease-in-out infinite' }} />
        <div className="ambient-orb" style={{ position: 'absolute', bottom: '-18%', right: '-5%', width: '650px', height: '650px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(139,92,246,0.09) 0%, transparent 70%)', animation: 'blob-drift 32s ease-in-out infinite reverse' }} />
        <div className="ambient-orb" style={{ position: 'absolute', top: '35%', right: '10%', width: '420px', height: '420px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(16,185,129,0.06) 0%, transparent 70%)', animation: 'blob-drift 22s ease-in-out 5s infinite' }} />
        <div className="ambient-orb" style={{ position: 'absolute', bottom: '15%', left: '15%', width: '380px', height: '380px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(245,158,11,0.05) 0%, transparent 70%)', animation: 'blob-drift 28s ease-in-out 10s infinite reverse' }} />
        <div className="ambient-orb" style={{ position: 'absolute', top: '60%', left: '50%', width: '300px', height: '300px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(236,72,153,0.04) 0%, transparent 70%)', animation: 'blob-drift 20s ease-in-out 3s infinite' }} />

        {/* Dot grid — faded at edges */}
        <div className="bg-dot-grid" style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.07) 1px, transparent 1px)',
          backgroundSize: '36px 36px',
          maskImage: 'radial-gradient(ellipse 80% 80% at 50% 40%, black 30%, transparent 100%)',
          WebkitMaskImage: 'radial-gradient(ellipse 80% 80% at 50% 40%, black 30%, transparent 100%)',
        }} />
      </div>

      {/* Desktop sidebar */}
      <Sidebar user={user} onLogout={onLogout} />

      {/* Main content */}
      <motion.main
        animate={{ marginLeft }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        className="flex-1 min-h-screen relative main-mobile-pad"
        style={{ marginLeft, zIndex: 1 }}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.22, ease: [0.25, 0.46, 0.45, 0.94] }}
            style={{ padding: '2.5rem 2.5rem 3rem' }}
            className="page-mobile-pad"
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </motion.main>

      {/* FAB — desktop only */}
      <FAB />

      {/* Mobile bottom navigation */}
      <nav className="mobile-nav-panel mobile-bottom-nav fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around px-2 pb-safe"
        style={{ background: 'var(--c-nav)', backdropFilter: 'blur(20px)', borderTop: '1px solid var(--c-nav-border)', paddingBottom: 'max(env(safe-area-inset-bottom), 8px)', paddingTop: '8px' }}>
        {BOTTOM_NAV.map(({ to, icon: Icon, label, end }) => (
          <NavLink key={to} to={to} end={end}
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 px-3 py-1 rounded-xl transition-all ${isActive ? 'text-white' : 'text-white/35'}`
            }
          >
            {({ isActive }) => (
              <>
                <div className="relative">
                  <Icon className="w-6 h-6" style={isActive ? { color: 'var(--accent)' } : {}} />
                  {isActive && <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full" style={{ background: 'var(--accent)' }} />}
                </div>
                <span className="text-[10px] font-medium" style={isActive ? { color: 'var(--accent)' } : {}}>{label}</span>
              </>
            )}
          </NavLink>
        ))}
        {/* Plus button in bottom nav */}
        <button
          onClick={() => useUIStore.getState().openNewAssignment()}
          className="flex flex-col items-center gap-1 px-3 py-1 rounded-xl transition-all text-white/35"
        >
          <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'var(--accent)' }}>
            <PlusIcon className="w-5 h-5 text-white" />
          </div>
          <span className="text-[10px] font-medium">New</span>
        </button>
      </nav>
    </div>
  )
}
