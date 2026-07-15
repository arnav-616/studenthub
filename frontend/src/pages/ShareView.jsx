import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { format } from 'date-fns'
import { assignments as assignmentsApi } from '../api/client'
import { getDueBadgeColor, getDueStatus, formatDueDateFull } from '../utils/dates'
import { cn } from '../utils/cn'

const DIFF_COLOR = {
  high:   '#f87171',
  medium: '#fbbf24',
  low:    '#34d399',
}

export default function ShareView() {
  const { token } = useParams()
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    assignmentsApi.getPublicShare(token)
      .then(d => { if (d.error) setError(d.error); else setData(d) })
      .catch(() => setError('Could not load shared assignments'))
  }, [token])

  if (error) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--c-bg)' }}>
      <div className="text-center">
        <p className="text-5xl font-bold mb-3" style={{ color: 'var(--c-surface-border)' }}>404</p>
        <p className="text-white/50">{error}</p>
      </div>
    </div>
  )

  if (!data) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--c-bg)' }}>
      <span className="w-8 h-8 border-2 border-indigo-400/30 border-t-indigo-400 rounded-full animate-spin" />
    </div>
  )

  const grouped = data.assignments.reduce((acc, a) => {
    const key = a.subject_name || 'No Subject'
    if (!acc[key]) acc[key] = { color: a.subject_color, items: [] }
    acc[key].items.push(a)
    return acc
  }, {})

  return (
    <div className="min-h-screen py-12 px-4" style={{ background: 'var(--c-bg)' }}>
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-2xl mx-auto mb-4 flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white">Shared Assignments</h1>
          <p className="text-white/35 text-sm mt-1">{data.assignments.length} pending · read-only view via Cramr</p>
        </div>

        <div className="space-y-4">
          {Object.entries(grouped).map(([subject, { color, items }]) => (
            <div key={subject}>
              <div className="flex items-center gap-2 mb-2">
                {color && <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: color }} />}
                <span className="text-[11px] font-semibold text-white/40 uppercase tracking-wider">{subject}</span>
                <span className="text-[11px] text-white/20">{items.length}</span>
                <div className="h-px flex-1 bg-white/[0.05]" />
              </div>
              <div className="space-y-1.5">
                {items.map((a, i) => {
                  const status = getDueStatus(a.due_date)
                  const diffColor = DIFF_COLOR[a.difficulty] || DIFF_COLOR.medium
                  return (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.02 }}
                      className="flex items-center gap-3 px-4 py-3 rounded-xl"
                      style={{
                        background: 'var(--c-surface-lo)',
                        border: '1px solid var(--c-border-subtle)',
                        borderLeft: `3px solid ${color || '#6366f1'}`,
                      }}>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white/85 truncate">{a.title}</p>
                        <p className="text-xs text-white/30 mt-0.5">{a.type}</p>
                      </div>
                      {a.estimated_hours && (
                        <span className="text-xs text-white/25">{a.estimated_hours}h</span>
                      )}
                      <span className="text-[11px] font-medium" style={{ color: diffColor }}>
                        {a.difficulty ? a.difficulty[0].toUpperCase() + a.difficulty.slice(1) : ''}
                      </span>
                      {a.due_date && (
                        <span className={cn('text-xs px-2 py-0.5 rounded-full', getDueBadgeColor(status))}>
                          {formatDueDateFull(a.due_date)}
                        </span>
                      )}
                    </motion.div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>

        <p className="text-center text-white/20 text-xs mt-10">
          Shared via <span className="text-indigo-400">Cramr</span> · {format(new Date(), 'MMM d, yyyy')}
        </p>
      </div>
    </div>
  )
}
