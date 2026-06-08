import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { useState } from 'react'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import {
  ClockIcon,
  FireIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  SparklesIcon,
  LightBulbIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline'
import BusyScoreRing from '../components/ui/BusyScoreRing'
import Card from '../components/ui/Card'
import { dashboard, ai } from '../api/client'
import { formatDueDate, getDueStatus, getDueBadgeColor } from '../utils/dates'
import { cn } from '../utils/cn'

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

function DayStrip({ days }) {
  if (!days?.length) return null
  const max = Math.max(...days.map(d => d.score), 1)
  return (
    <div className="flex gap-2 mt-3">
      {days.map((d, i) => {
        const pct = d.score / max
        const color =
          d.score >= 75 ? '#ef4444' :
          d.score >= 50 ? '#f59e0b' :
          d.score >= 25 ? '#8b5cf6' : '#6366f1'
        return (
          <div key={d.date} className="flex-1 flex flex-col items-center gap-1">
            <div className="text-white/40 text-[10px] font-medium">{d.dayName || format(new Date(d.date + 'T00:00:00'), 'EEE')}</div>
            <div className="w-full rounded-full overflow-hidden" style={{ height: 4, background: 'rgba(255,255,255,0.05)' }}>
              <motion.div
                className="h-full rounded-full"
                style={{ background: color }}
                initial={{ width: 0 }}
                animate={{ width: `${pct * 100}%` }}
                transition={{ delay: i * 0.05, duration: 0.6, ease: 'easeOut' }}
              />
            </div>
            <div className="text-white/30 text-[10px]">{d.count}</div>
          </div>
        )
      })}
    </div>
  )
}

function ProductivityChart({ data }) {
  if (!data?.length) return null
  const max = Math.max(...data.map(d => d.completed), 1)
  return (
    <div className="flex items-end gap-1 h-16 mt-2">
      {data.slice(-14).map((d, i) => {
        const pct = d.completed / max
        return (
          <motion.div
            key={d.date}
            className="flex-1 rounded-t-sm"
            style={{ background: 'rgba(99,102,241,0.5)', minHeight: 2 }}
            initial={{ height: 0 }}
            animate={{ height: `${Math.max(pct * 100, 4)}%` }}
            transition={{ delay: i * 0.03, duration: 0.5, ease: 'easeOut' }}
            title={`${d.date}: ${d.completed} completed`}
          />
        )
      })}
    </div>
  )
}

export default function Dashboard() {
  const qc = useQueryClient()
  const [studyPlan, setStudyPlan] = useState(null)
  const [loadingPlan, setLoadingPlan] = useState(false)
  const [weeklyDebrief, setWeeklyDebrief] = useState(null)

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: dashboard.get,
  })

  async function handleStudyPlan() {
    setLoadingPlan(true)
    try {
      const plan = await ai.studyPlan()
      setStudyPlan(plan)
    } catch {
      toast.error('Failed to generate study plan')
    } finally {
      setLoadingPlan(false)
    }
  }

  async function handleDebrief() {
    try {
      const debrief = await ai.weeklyDebrief()
      setWeeklyDebrief(debrief)
    } catch {
      toast.error('Failed to generate debrief')
    }
  }

  const busy = data?.busyScore ?? { score: 0, band: 'Clear' }
  const stats = data?.stats ?? {}
  const nextDue = data?.nextDue ?? []
  const dayStrip = data?.dayStrip ?? []
  const productivity = data?.productivity ?? []

  const containerVariants = {
    hidden: {},
    show: { transition: { staggerChildren: 0.07 } },
  }
  const itemVariants = {
    hidden: { opacity: 0, y: 16 },
    show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
  }

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-6">
      {/* Header */}
      <motion.div variants={itemVariants} className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">
            {getGreeting()} 👋
          </h1>
          <p className="text-white/40 mt-1">
            {format(new Date(), 'EEEE, MMMM d')}
          </p>
        </div>
        <div className="flex gap-2">
          <motion.button
            onClick={handleDebrief}
            className="btn-primary text-sm px-4 py-2 flex items-center gap-2"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <SparklesIcon className="w-4 h-4" />
            Weekly Debrief
          </motion.button>
        </div>
      </motion.div>

      {/* Weekly Debrief Banner */}
      {weeklyDebrief && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass rounded-2xl p-4 border border-indigo-500/20"
        >
          <div className="flex items-start gap-3">
            <SparklesIcon className="w-5 h-5 text-indigo-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-semibold text-indigo-300">{weeklyDebrief.headline}</p>
              <p className="text-white/60 text-sm mt-1">{weeklyDebrief.overview}</p>
              {weeklyDebrief.motivation && (
                <p className="text-amber-400/80 text-sm mt-2 italic">"{weeklyDebrief.motivation}"</p>
              )}
            </div>
            <button onClick={() => setWeeklyDebrief(null)} className="text-white/30 hover:text-white/60 ml-auto">✕</button>
          </div>
        </motion.div>
      )}

      {/* Top row: Busy Score + Stats */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Busy Score */}
        <Card className="lg:col-span-1 flex flex-col items-center py-6">
          <p className="text-white/40 text-xs font-semibold tracking-widest uppercase mb-4">Busy Score</p>
          {isLoading ? (
            <div className="w-[200px] h-[200px] rounded-full skeleton" />
          ) : (
            <BusyScoreRing score={busy.score} band={busy.band} size={200} />
          )}
          <p className="text-white/40 text-xs mt-4 text-center max-w-[160px]">
            {busy.totalAssignments ?? 0} pending in next 7 days
          </p>
          {busy.daysWithCluster > 0 && (
            <p className="text-amber-400/60 text-xs mt-1">
              ⚡ {busy.daysWithCluster} clustered day{busy.daysWithCluster > 1 ? 's' : ''}
            </p>
          )}
        </Card>

        {/* Stats Grid */}
        <div className="lg:col-span-2 grid grid-cols-2 gap-4">
          {[
            { label: 'Overdue', value: stats.overdue ?? 0, icon: ExclamationTriangleIcon, color: 'text-red-400', bg: 'bg-red-500/10' },
            { label: 'Due Today', value: stats.todayDue ?? 0, icon: ClockIcon, color: 'text-amber-400', bg: 'bg-amber-500/10' },
            { label: 'Completed This Week', value: stats.completedThisWeek ?? 0, icon: CheckCircleIcon, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
            { label: 'Day Streak', value: stats.streak ?? 0, icon: FireIcon, color: 'text-orange-400', bg: 'bg-orange-500/10' },
          ].map(s => (
            <Card key={s.label}>
              <div className="flex items-start gap-3">
                <div className={cn('p-2 rounded-xl', s.bg)}>
                  <s.icon className={cn('w-5 h-5', s.color)} />
                </div>
                <div>
                  <p className="text-white/40 text-xs">{s.label}</p>
                  <p className={cn('text-2xl font-bold mt-0.5', s.color)}>
                    {isLoading ? <span className="skeleton inline-block w-8 h-6 rounded" /> : s.value}
                    {s.label === 'Day Streak' && !isLoading && s.value > 0 ? ' 🔥' : ''}
                  </p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </motion.div>

      {/* 7-day strip + Next Due */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <p className="text-white/40 text-xs font-semibold tracking-widest uppercase">7-Day Load</p>
          <DayStrip days={dayStrip} />
        </Card>

        <Card>
          <p className="text-white/40 text-xs font-semibold tracking-widest uppercase mb-3">Next Due</p>
          {isLoading ? (
            <div className="space-y-2">
              {[1,2,3].map(i => <div key={i} className="skeleton h-10 rounded-lg" />)}
            </div>
          ) : nextDue.length === 0 ? (
            <p className="text-white/30 text-sm">Nothing due soon — enjoy the calm!</p>
          ) : (
            <div className="space-y-2">
              {nextDue.map(a => {
                const status = getDueStatus(a.due_date)
                return (
                  <div key={a.id} className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/[0.03] transition-colors">
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: a.subject_color || '#6366f1' }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white/90 truncate">{a.title}</p>
                      <p className="text-xs text-white/30">{a.subject_name}</p>
                    </div>
                    <span className={cn('text-xs px-2 py-0.5 rounded-full', getDueBadgeColor(status))}>
                      {formatDueDate(a.due_date)}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </Card>
      </motion.div>

      {/* Productivity chart + AI Study Plan */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <p className="text-white/40 text-xs font-semibold tracking-widest uppercase mb-2">14-Day Productivity</p>
          <ProductivityChart data={productivity} />
          <p className="text-white/25 text-xs mt-2">Assignments completed per day</p>
        </Card>

        <Card>
          <div className="flex items-center justify-between mb-3">
            <p className="text-white/40 text-xs font-semibold tracking-widest uppercase">AI Study Plan</p>
            <motion.button
              onClick={handleStudyPlan}
              disabled={loadingPlan}
              className="btn-primary text-xs px-3 py-1.5 flex items-center gap-1.5 disabled:opacity-50"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {loadingPlan ? (
                <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <LightBulbIcon className="w-3.5 h-3.5" />
              )}
              {loadingPlan ? 'Thinking...' : 'Generate'}
            </motion.button>
          </div>
          {!studyPlan ? (
            <p className="text-white/30 text-sm">Generate an AI-powered study plan tailored to your workload.</p>
          ) : (
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {(studyPlan.days || studyPlan.plan || []).map((day, i) => (
                <div key={i} className="flex gap-3 p-2 rounded-xl bg-white/[0.03]">
                  <div className="text-indigo-400 text-xs font-semibold w-14 flex-shrink-0 mt-0.5">
                    {day.date || day.day}
                  </div>
                  <div>
                    {(day.tasks || day.sessions || []).map((t, j) => (
                      <p key={j} className="text-xs text-white/60">{typeof t === 'string' ? t : t.task || t.activity}</p>
                    ))}
                  </div>
                </div>
              ))}
              {studyPlan.tips && (
                <div className="mt-2 p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
                  <p className="text-xs text-indigo-300">{studyPlan.tips}</p>
                </div>
              )}
            </div>
          )}
        </Card>
      </motion.div>
    </motion.div>
  )
}
