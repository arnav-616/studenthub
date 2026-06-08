import { NavLink, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  HomeIcon,
  ClipboardDocumentListIcon,
  CalendarDaysIcon,
  ClockIcon,
  CalculatorIcon,
  FireIcon,
  BookOpenIcon,
  Cog6ToothIcon,
  AcademicCapIcon,
} from '@heroicons/react/24/outline'

const navItems = [
  { to: '/', icon: HomeIcon, label: 'Dashboard' },
  { to: '/assignments', icon: ClipboardDocumentListIcon, label: 'Assignments' },
  { to: '/schedule', icon: CalendarDaysIcon, label: 'Schedule' },
  { to: '/timer', icon: ClockIcon, label: 'Study Timer' },
  { to: '/grades', icon: CalculatorIcon, label: 'Grades' },
  { to: '/heatmap', icon: FireIcon, label: 'Heatmap' },
  { to: '/subjects', icon: BookOpenIcon, label: 'Subjects' },
  { to: '/settings', icon: Cog6ToothIcon, label: 'Settings' },
]

export default function Sidebar() {
  const location = useLocation()

  return (
    <aside className="fixed left-0 top-0 h-full w-64 bg-navy-800/80 backdrop-blur-xl border-r border-white/[0.06] flex flex-col z-40">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-white/[0.06]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-indigo-500 flex items-center justify-center shadow-glow">
            <AcademicCapIcon className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="font-bold text-white text-lg leading-none">StudentHub</span>
            <p className="text-white/40 text-xs mt-0.5">Academic OS</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `group relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                isActive
                  ? 'bg-indigo-500/15 text-white'
                  : 'text-white/50 hover:text-white/80 hover:bg-white/[0.04]'
              }`
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <motion.div
                    layoutId="activeNav"
                    className="absolute inset-0 bg-indigo-500/15 rounded-xl border border-indigo-500/20"
                    transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }}
                  />
                )}
                <Icon className={`w-5 h-5 relative z-10 transition-colors ${isActive ? 'text-indigo-400' : ''}`} />
                <span className="relative z-10">{label}</span>
                {isActive && (
                  <div className="ml-auto w-1.5 h-1.5 rounded-full bg-indigo-400 relative z-10" />
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-4 py-4 border-t border-white/[0.06]">
        <div className="text-xs text-white/25 text-center">
          StudentHub v1.0
        </div>
      </div>
    </aside>
  )
}
