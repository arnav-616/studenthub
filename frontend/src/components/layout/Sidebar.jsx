import { NavLink } from 'react-router-dom'
import { motion } from 'framer-motion'
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
  SparklesIcon,
} from '@heroicons/react/24/outline'

const sections = [
  {
    label: 'Overview',
    items: [
      { to: '/', icon: HomeIcon, label: 'Dashboard' },
      { to: '/assignments', icon: ClipboardDocumentListIcon, label: 'Assignments' },
      { to: '/schedule', icon: CalendarDaysIcon, label: 'Schedule' },
    ],
  },
  {
    label: 'Tools',
    items: [
      { to: '/timer', icon: ClockIcon, label: 'Study Timer' },
      { to: '/grades', icon: CalculatorIcon, label: 'Grades' },
      { to: '/heatmap', icon: FireIcon, label: 'Heatmap' },
    ],
  },
  {
    label: 'Manage',
    items: [
      { to: '/subjects', icon: BookOpenIcon, label: 'Subjects' },
      { to: '/settings', icon: Cog6ToothIcon, label: 'Settings' },
    ],
  },
]

export default function Sidebar() {
  return (
    <aside className="fixed left-0 top-0 h-full w-60 flex flex-col z-40"
      style={{
        background: 'rgba(8,11,24,0.85)',
        backdropFilter: 'blur(24px)',
        borderRight: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      {/* Logo */}
      <div className="px-5 pt-6 pb-5">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #6366f1, #4f46e5)', boxShadow: '0 0 20px rgba(99,102,241,0.5)' }}>
              <AcademicCapIcon className="w-5 h-5 text-white" />
            </div>
          </div>
          <div>
            <p className="font-bold text-white text-[15px] leading-tight tracking-tight">StudentHub</p>
            <p className="text-white/35 text-[11px] mt-0.5 tracking-wide">Academic OS</p>
          </div>
        </div>
      </div>

      {/* Nav sections */}
      <nav className="flex-1 px-3 overflow-y-auto space-y-5 pb-4">
        {sections.map(section => (
          <div key={section.label}>
            <p className="text-[10px] font-semibold text-white/25 tracking-widest uppercase px-3 mb-1.5">
              {section.label}
            </p>
            <div className="space-y-0.5">
              {section.items.map(({ to, icon: Icon, label }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={to === '/'}
                  className={({ isActive }) =>
                    `group relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-200 ${
                      isActive
                        ? 'text-white'
                        : 'text-white/45 hover:text-white/80'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      {isActive && (
                        <motion.div
                          layoutId="activeNav"
                          className="absolute inset-0 rounded-xl"
                          style={{ background: 'rgba(99,102,241,0.18)', border: '1px solid rgba(99,102,241,0.25)' }}
                          transition={{ type: 'spring', bounce: 0.18, duration: 0.38 }}
                        />
                      )}
                      <div className={`relative z-10 transition-all duration-200 ${isActive ? 'text-indigo-400' : 'group-hover:text-white/70'}`}>
                        <Icon className="w-[18px] h-[18px]" />
                      </div>
                      <span className="relative z-10 flex-1">{label}</span>
                      {isActive && (
                        <div className="relative z-10 w-1.5 h-1.5 rounded-full bg-indigo-400" />
                      )}
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* AI hint footer */}
      <div className="mx-3 mb-4 p-3 rounded-xl"
        style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.15)' }}>
        <div className="flex items-center gap-2 mb-1">
          <SparklesIcon className="w-3.5 h-3.5 text-indigo-400" />
          <span className="text-xs font-medium text-indigo-300">AI-Powered</span>
        </div>
        <p className="text-[11px] text-white/35 leading-relaxed">
          Study plans, NL assignment add &amp; weekly debrief — all on Dashboard.
        </p>
      </div>
    </aside>
  )
}
