import { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import {
  MagnifyingGlassIcon, HomeIcon, ClipboardDocumentListIcon,
  CalendarDaysIcon, ClockIcon, CalculatorIcon, FireIcon,
  BookOpenIcon, Cog6ToothIcon, PlusIcon, ArrowRightIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline'
import { assignments as assignmentsApi } from '../../api/client'
import { useUIStore } from '../../store/useUIStore'

const PAGES = [
  { id: 'nav-home',       label: 'Go to Dashboard',    icon: HomeIcon,                    to: '/' },
  { id: 'nav-assign',     label: 'Go to Assignments',  icon: ClipboardDocumentListIcon,   to: '/assignments' },
  { id: 'nav-schedule',   label: 'Go to Schedule',     icon: CalendarDaysIcon,            to: '/schedule' },
  { id: 'nav-timer',      label: 'Go to Study Timer',  icon: ClockIcon,                   to: '/timer' },
  { id: 'nav-grades',     label: 'Go to Grades',       icon: CalculatorIcon,              to: '/grades' },
  { id: 'nav-heatmap',    label: 'Go to Heatmap',      icon: FireIcon,                    to: '/heatmap' },
  { id: 'nav-subjects',   label: 'Go to Subjects',     icon: BookOpenIcon,                to: '/subjects' },
  { id: 'nav-settings',   label: 'Go to Settings',     icon: Cog6ToothIcon,               to: '/settings' },
]

export default function CommandPalette() {
  const { commandPaletteOpen, closeCommandPalette, openNewAssignment } = useUIStore()
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const navigate = useNavigate()
  const inputRef = useRef(null)
  const listRef = useRef(null)

  const { data: allAssignments = [] } = useQuery({
    queryKey: ['assignments'],
    queryFn: () => assignmentsApi.list({}),
    staleTime: 30_000,
    enabled: commandPaletteOpen,
  })

  // Build filtered list
  const q = query.trim().toLowerCase()
  const actions = [
    {
      id: 'action-new',
      label: 'New Assignment',
      icon: PlusIcon,
      action: () => { closeCommandPalette(); openNewAssignment() },
      tag: 'Action',
    },
    {
      id: 'action-timer',
      label: 'Start Study Timer',
      icon: ClockIcon,
      action: () => { closeCommandPalette(); navigate('/timer') },
      tag: 'Action',
    },
  ]

  const pageItems = PAGES
    .filter(p => !q || p.label.toLowerCase().includes(q))
    .map(p => ({ ...p, tag: 'Navigate', action: () => { closeCommandPalette(); navigate(p.to) } }))

  const assignmentItems = q
    ? allAssignments
        .filter(a => a.title.toLowerCase().includes(q))
        .slice(0, 5)
        .map(a => ({
          id: `asgn-${a.id}`,
          label: a.title,
          sublabel: a.subject_name,
          icon: ClipboardDocumentListIcon,
          tag: 'Assignment',
          action: () => { closeCommandPalette(); navigate('/assignments') },
          color: a.subject_color,
        }))
    : []

  const filteredActions = !q ? actions : actions.filter(a => a.label.toLowerCase().includes(q))

  const items = [...filteredActions, ...pageItems, ...assignmentItems]

  useEffect(() => { setActiveIndex(0) }, [query])

  useEffect(() => {
    if (commandPaletteOpen) {
      setQuery('')
      setActiveIndex(0)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [commandPaletteOpen])

  const handleKey = useCallback((e) => {
    if (!commandPaletteOpen) return
    if (e.key === 'Escape') { closeCommandPalette(); return }
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIndex(i => Math.min(i + 1, items.length - 1)) }
    if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIndex(i => Math.max(i - 1, 0)) }
    if (e.key === 'Enter') { e.preventDefault(); items[activeIndex]?.action() }
  }, [commandPaletteOpen, items, activeIndex, closeCommandPalette])

  useEffect(() => {
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [handleKey])

  // Scroll active item into view
  useEffect(() => {
    const el = listRef.current?.children[activeIndex]
    el?.scrollIntoView({ block: 'nearest' })
  }, [activeIndex])

  if (!commandPaletteOpen) return null

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-[200] flex items-start justify-center pt-[15vh]">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          onClick={closeCommandPalette}
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: -8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: -8 }}
          transition={{ duration: 0.15, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="relative w-full max-w-lg z-10 overflow-hidden rounded-2xl"
          style={{ background: 'var(--c-dropdown-bg)', border: '1px solid var(--c-input-toggle-off)', boxShadow: '0 24px 80px rgba(0,0,0,0.8)' }}
          onClick={e => e.stopPropagation()}
        >
          {/* Search input */}
          <div className="flex items-center gap-3 px-4 py-3.5 border-b border-white/[0.07]">
            <MagnifyingGlassIcon className="w-5 h-5 text-white/40 flex-shrink-0" />
            <input
              ref={inputRef}
              className="flex-1 bg-transparent text-white text-sm placeholder-white/30 outline-none"
              placeholder="Search pages, assignments, actions…"
              value={query}
              onChange={e => setQuery(e.target.value)}
            />
            <kbd className="text-[10px] text-white/20 px-1.5 py-0.5 rounded border border-white/10">ESC</kbd>
          </div>

          {/* Results */}
          <div ref={listRef} className="max-h-80 overflow-y-auto py-2">
            {items.length === 0 ? (
              <p className="text-sm text-white/30 text-center py-8">No results for "{query}"</p>
            ) : (
              items.map((item, i) => {
                const Icon = item.icon
                return (
                  <button
                    key={item.id}
                    onClick={item.action}
                    onMouseEnter={() => setActiveIndex(i)}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors"
                    style={{ background: i === activeIndex ? 'var(--c-border-subtle)' : 'transparent' }}
                  >
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{
                        background: item.color ? `${item.color}20` : 'var(--c-border-subtle)',
                        border: '1px solid var(--c-border-subtle)',
                      }}>
                      <Icon className="w-4 h-4" style={{ color: item.color || (i === activeIndex ? 'var(--accent)' : 'var(--c-text-dim)') }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white/80 truncate">{item.label}</p>
                      {item.sublabel && <p className="text-xs text-white/30 truncate">{item.sublabel}</p>}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-[10px] text-white/25 px-1.5 py-0.5 rounded border border-white/[0.08]">{item.tag}</span>
                      {i === activeIndex && <ArrowRightIcon className="w-3.5 h-3.5 text-white/30" />}
                    </div>
                  </button>
                )
              })
            )}
          </div>

          <div className="flex items-center gap-4 px-4 py-2.5 border-t border-white/[0.05]">
            <span className="text-[10px] text-white/20 flex items-center gap-1"><kbd className="border border-white/10 rounded px-1">↑↓</kbd> navigate</span>
            <span className="text-[10px] text-white/20 flex items-center gap-1"><kbd className="border border-white/10 rounded px-1">↵</kbd> select</span>
            <span className="text-[10px] text-white/20 flex items-center gap-1"><kbd className="border border-white/10 rounded px-1">⌘K</kbd> toggle</span>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  )
}
