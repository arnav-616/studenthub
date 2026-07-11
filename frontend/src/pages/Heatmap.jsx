import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { format, subMonths, startOfMonth, parseISO } from 'date-fns'
import { settingsApi } from '../api/client'
import Card from '../components/ui/Card'
import { cn } from '../utils/cn'

const WEEKS_COUNT = 26
const DAYS = ['', 'Mon', '', 'Wed', '', 'Fri', '']

function getColor(score) {
  if (score === 0 || score == null) return 'var(--c-surface-lo)'
  if (score < 20) return '#4338ca'
  if (score < 40) return '#6366f1'
  if (score < 60) return '#818cf8'
  if (score < 75) return '#f59e0b'
  if (score < 90) return '#ef4444'
  return '#dc2626'
}

function HeatCell({ day }) {
  const color = getColor(day?.score)
  const hasData = day && day.score != null
  return (
    <motion.div
      className="w-3.5 h-3.5 rounded-sm relative group"
      style={{ background: color }}
      whileHover={{ scale: 1.4 }}
      transition={{ duration: 0.1 }}
    >
      {hasData && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 glass rounded-lg px-2 py-1.5 text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-20" style={{ minWidth: '120px' }}>
          <p className="font-medium text-white">{day.date}</p>
          <p className="text-white/50">Score: {day.score}</p>
          <p className="text-white/50">Due: {day.due} · Done: {day.completed}</p>
        </div>
      )}
    </motion.div>
  )
}

function buildGrid(days) {
  const map = {}
  days.forEach(d => { map[d.date] = d })

  const today = new Date()
  const start = subMonths(today, 6)

  // Find the Sunday before start
  const grid = []
  const startDate = new Date(start)
  startDate.setDate(startDate.getDate() - startDate.getDay())

  let current = new Date(startDate)
  const weeks = []
  let week = []

  while (current <= today) {
    const dateStr = format(current, 'yyyy-MM-dd')
    week.push(map[dateStr] ?? { date: dateStr, score: null, due: 0, completed: 0 })
    if (week.length === 7) {
      weeks.push(week)
      week = []
    }
    current.setDate(current.getDate() + 1)
  }
  if (week.length) {
    while (week.length < 7) week.push(null)
    weeks.push(week)
  }
  return weeks
}

function getMonthLabels(weeks) {
  const labels = []
  let lastMonth = null
  weeks.forEach((week, i) => {
    const firstDay = week.find(d => d?.date)
    if (!firstDay) return
    const month = firstDay.date.slice(0, 7)
    if (month !== lastMonth) {
      labels.push({ index: i, label: format(parseISO(firstDay.date), 'MMM') })
      lastMonth = month
    }
  })
  return labels
}

export default function Heatmap() {
  const [range, setRange] = useState(180)

  const { data: heatData = [], isLoading } = useQuery({
    queryKey: ['heatmap', range],
    queryFn: () => {
      const end = new Date().toISOString().slice(0, 10)
      const start = format(subMonths(new Date(), range / 30), 'yyyy-MM-dd')
      return settingsApi.heatmap(start, end)
    },
  })

  const weeks = buildGrid(heatData)
  const monthLabels = getMonthLabels(weeks)

  const totalCompleted = heatData.reduce((acc, d) => acc + (d.completed || 0), 0)
  const busyDays = heatData.filter(d => d.score >= 50).length
  const activeDays = heatData.filter(d => d.completed > 0).length

  // Streak calculations
  const currentStreak = useMemo(() => {
    const sorted = [...heatData].sort((a, b) => b.date.localeCompare(a.date))
    let streak = 0
    for (const d of sorted) {
      if ((d.completed || 0) > 0) streak++
      else break
    }
    return streak
  }, [heatData])

  const bestStreak = useMemo(() => {
    const sorted = [...heatData].sort((a, b) => a.date.localeCompare(b.date))
    let best = 0, cur = 0
    for (const d of sorted) {
      if ((d.completed || 0) > 0) { cur++; if (cur > best) best = cur }
      else cur = 0
    }
    return best
  }, [heatData])

  const bestDayOfWeek = useMemo(() => {
    const DAYS_FULL = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']
    const totals = [0,0,0,0,0,0,0]
    for (const d of heatData) {
      const dow = new Date(d.date + 'T12:00:00').getDay()
      totals[dow] += d.completed || 0
    }
    const maxIdx = totals.indexOf(Math.max(...totals))
    return totals[maxIdx] > 0 ? DAYS_FULL[maxIdx] : null
  }, [heatData])

  const LEGEND = [0, 15, 35, 55, 80, 95]

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Semester Heatmap</h1>
          <p className="text-white/40 text-sm mt-0.5">Your academic load over time</p>
        </div>
        <select
          className="input-field text-sm w-36"
          value={range}
          onChange={e => setRange(Number(e.target.value))}
        >
          <option value={90}>3 Months</option>
          <option value={180}>6 Months</option>
          <option value={365}>1 Year</option>
        </select>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: 'Total Done',     value: totalCompleted, color: '#6366f1' },
          { label: 'Active Days',    value: activeDays,     color: '#10b981' },
          { label: 'Busy Days',      value: busyDays,       color: '#f59e0b' },
          { label: 'Current Streak', value: `${currentStreak}d`, color: '#22d3ee' },
          { label: 'Best Streak',    value: `${bestStreak}d`,    color: '#a78bfa' },
          { label: 'Best Day',       value: bestDayOfWeek ?? '—', color: '#fb923c', small: true },
        ].map(s => (
          <Card key={s.label} className="text-center py-4">
            <p className={cn('font-bold text-ellipsis overflow-hidden', s.small ? 'text-sm' : 'text-2xl')} style={{ color: s.color }}>{s.value}</p>
            <p className="text-[11px] text-white/35 mt-1 leading-tight">{s.label}</p>
          </Card>
        ))}
      </div>

      {/* Heatmap */}
      <Card className="overflow-x-auto">
        {isLoading ? (
          <div className="skeleton h-28 rounded-xl" />
        ) : (
          <div>
            {/* Month labels */}
            <div className="flex gap-1 mb-1 pl-7">
              {weeks.map((_, i) => {
                const label = monthLabels.find(m => m.index === i)
                return (
                  <div key={i} className="w-3.5 text-[10px] text-white/30 text-center">
                    {label ? label.label : ''}
                  </div>
                )
              })}
            </div>

            <div className="flex gap-1">
              {/* Day labels */}
              <div className="flex flex-col gap-1 mr-1">
                {DAYS.map((d, i) => (
                  <div key={i} className="w-5 h-3.5 text-[10px] text-white/25 flex items-center justify-end">
                    {d}
                  </div>
                ))}
              </div>

              {/* Grid */}
              {weeks.map((week, wi) => (
                <div key={wi} className="flex flex-col gap-1">
                  {week.map((day, di) => (
                    <HeatCell key={di} day={day} />
                  ))}
                </div>
              ))}
            </div>

            {/* Legend */}
            <div className="flex items-center gap-2 mt-4 justify-end">
              <span className="text-xs text-white/30">Less</span>
              <div className="flex gap-1">
                {LEGEND.map(score => (
                  <div key={score} className="w-3.5 h-3.5 rounded-sm" style={{ background: getColor(score) }} />
                ))}
              </div>
              <span className="text-xs text-white/30">More</span>
            </div>
          </div>
        )}
      </Card>

      {/* Daily breakdown for last 14 days */}
      <Card>
        <p className="text-xs text-white/40 uppercase tracking-wide mb-3">Recent 14 Days</p>
        <div className="space-y-1.5">
          {heatData.slice(-14).reverse().map(d => (
            <div key={d.date} className="flex items-center gap-3">
              <span className="text-xs text-white/30 w-24 flex-shrink-0">
                {format(parseISO(d.date), 'EEE, MMM d')}
              </span>
              <div className="flex-1 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: getColor(d.score) }}
                  initial={{ width: 0 }}
                  animate={{ width: `${(d.score || 0)}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>
              <span className="text-xs text-white/40 w-8 text-right">{d.score || 0}</span>
              <span className="text-xs text-white/25 w-16 text-right">{d.completed} done</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
