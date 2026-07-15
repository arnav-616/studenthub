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
  ArrowRightOnRectangleIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  SparklesIcon,
  TrophyIcon,
  BriefcaseIcon,
} from '@heroicons/react/24/outline'
import { useUIStore } from '../../store/useUIStore'
import { cn } from '../../utils/cn'
import Logo from '../ui/Logo'

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
      { to: '/study-tools', icon: SparklesIcon, label: 'Study Tools' },
      { to: '/grades', icon: CalculatorIcon, label: 'Grades' },
      { to: '/heatmap', icon: FireIcon, label: 'Heatmap' },
    ],
  },
  {
    label: 'Life',
    items: [
      { to: '/extracurriculars', icon: TrophyIcon, label: 'Extracurriculars' },
      { to: '/applications', icon: BriefcaseIcon, label: 'Applications' },
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

export default function Sidebar({ user, onLogout }) {
  const { sidebarCollapsed, toggleSidebar } = useUIStore()

  const initials = user?.name
    ? user.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    : user?.email?.[0]?.toUpperCase() ?? '?'

  const w = sidebarCollapsed ? 64 : 240

  return (
    <motion.aside
      animate={{ width: w }}
      transition={{ type: 'spring', damping: 30, stiffness: 300 }}
      className="sidebar-panel fixed left-0 top-0 h-full flex flex-col z-40 overflow-hidden sidebar-desktop"
      style={{
        background: 'var(--c-sidebar)',
        backdropFilter: 'blur(24px)',
        borderRight: '1px solid var(--c-sidebar-border)',
        width: w,
      }}
    >
      {/* Logo + collapse toggle */}
      <div className={cn('px-3 pt-5 pb-4 flex items-center', sidebarCollapsed ? 'justify-center' : 'justify-between')}>
        {!sidebarCollapsed && (
          <div className="flex items-center gap-3 min-w-0">
            <Logo size={34} className="flex-shrink-0" />
            <div className="min-w-0">
              <p className="font-bold text-white text-[15px] leading-tight tracking-tight truncate">Cramr</p>
              <p className="text-white/35 text-[11px] mt-0.5 tracking-wide">Academic OS</p>
            </div>
          </div>
        )}
        {sidebarCollapsed && (
          <Logo size={30} className="flex-shrink-0" />
        )}
        {!sidebarCollapsed && (
          <button onClick={toggleSidebar}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-white/25 hover:text-white/60 hover:bg-white/[0.06] transition-all flex-shrink-0 ml-1">
            <ChevronLeftIcon className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Collapse button when collapsed */}
      {sidebarCollapsed && (
        <button onClick={toggleSidebar}
          className="mx-2 mb-2 h-7 rounded-lg flex items-center justify-center text-white/25 hover:text-white/60 hover:bg-white/[0.06] transition-all">
          <ChevronRightIcon className="w-4 h-4" />
        </button>
      )}

      {/* Nav sections */}
      <nav className="flex-1 px-2 overflow-y-auto space-y-4 pb-4">
        {sections.map(section => (
          <div key={section.label}>
            {!sidebarCollapsed && (
              <p className="text-[10px] font-semibold text-white/25 tracking-widest uppercase px-3 mb-1.5">
                {section.label}
              </p>
            )}
            <div className="space-y-0.5">
              {section.items.map(({ to, icon: Icon, label }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={to === '/'}
                  title={sidebarCollapsed ? label : undefined}
                  className={({ isActive }) =>
                    cn(
                      'group relative flex items-center gap-3 rounded-xl text-[13px] font-medium transition-all duration-200',
                      sidebarCollapsed ? 'justify-center w-10 h-10 mx-auto' : 'px-3 py-2.5',
                      isActive ? 'text-white' : 'text-white/45 hover:text-white/80'
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      {isActive && (
                        <motion.div
                          layoutId="activeNav"
                          className="absolute inset-0 rounded-xl"
                          style={{ background: 'color-mix(in srgb, var(--accent) 16%, transparent)', border: '1px solid color-mix(in srgb, var(--accent) 28%, transparent)', boxShadow: '0 0 16px color-mix(in srgb, var(--accent) 18%, transparent), inset 0 1px 0 color-mix(in srgb, var(--accent) 20%, transparent)' }}
                          transition={{ type: 'spring', bounce: 0.18, duration: 0.38 }}
                        />
                      )}
                      <div className={cn('relative z-10 transition-all duration-200 flex-shrink-0', isActive ? 'text-indigo-400' : 'group-hover:text-white/70')}
                        style={isActive ? { color: 'var(--accent)' } : {}}>
                        <Icon className="w-[18px] h-[18px]" />
                      </div>
                      {!sidebarCollapsed && <span className="relative z-10 flex-1 truncate">{label}</span>}
                      {!sidebarCollapsed && isActive && (
                        <div className="relative z-10 w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: 'var(--accent)' }} />
                      )}
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* User / logout */}
      {user && (
        <div className={cn('mx-2 mb-4 flex items-center gap-2 p-2.5 rounded-xl',
          sidebarCollapsed && 'justify-center flex-col py-3')}
          style={{ background: 'var(--c-surface-lo)', border: '1px solid var(--c-surface-border)' }}>
          <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold text-white"
            style={{ background: 'linear-gradient(135deg, var(--accent), color-mix(in srgb, var(--accent) 75%, #000))' }}>
            {initials}
          </div>
          {!sidebarCollapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-[12px] text-white/70 truncate font-medium">{user.name || user.email}</p>
              {user.name && <p className="text-[10px] text-white/30 truncate">{user.email}</p>}
            </div>
          )}
          <button onClick={onLogout} title="Sign out"
            className="text-white/25 hover:text-red-400 transition-colors p-1 flex-shrink-0">
            <ArrowRightOnRectangleIcon className="w-4 h-4" />
          </button>
        </div>
      )}
    </motion.aside>
  )
}
