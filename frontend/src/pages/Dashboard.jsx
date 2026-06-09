import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { useState } from 'react'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import {
  ClockIcon, FireIcon, CheckCircleIcon, ExclamationTriangleIcon,
  SparklesIcon, LightBulbIcon, ArrowTrendingUpIcon,
} from '@heroicons/react/24/outline'
import BusyScoreRing from '../components/ui/BusyScoreRing'
import Card from '../components/ui/Card'
import { dashboard, ai } from '../api/client'
import { formatDueDate, getDueStatus, getDueBadgeColor } from '../utils/dates'
import { cn } from '../utils/cn'

function getGreeting() {
  const h = new Date().getHours()
  if (h < 5)  return { text: 'Late night grind', emoji: '🌙' }
  if (h < 12) return { text: 'Good morning', emoji: '☀️' }
  if (h < 17) return { text: 'Good afternoon', emoji: '👋' }
  if (h < 21) return { text: 'Good evening', emoji: '🌆' }
  return { text: 'Night owl mode', emoji: '🦉' }
}

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
}
const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.38, ease: [0.25, 0.46, 0.45, 0.94] } },
}

function StatCard({ label, value, icon: Icon, color, bg, loading, suffix }) {
  return (
    <motion.div variants={fadeUp}>
      <Card className="flex items-center gap-4 p-4">
        <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: bg }}>
          <Icon className="w-5 h-5" style={{ color }} />
        </div>
        <div className="min-w-0">
          <p className="text-white/40 text-xs tracking-wide">{label}</p>
          <p className="text-xl font-bold mt-0.5 leading-none" style={{ color }}>
            {loading
              ? <span className="skeleton inline-block w-8 h-5 rounded" />
              : <>{value}{suffix}</>
            }
          </p>
        </div>
      </Card>
    </motion.div>
  )
}

function DayStrip({ days }) {
  if (!days?.length) return null
  const max = Math.max(...days.map(d => d.score), 1)
  const dayNames = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
  return (
    <div className="flex gap-2 mt-4">
      {days.map((d, i) => {
        const pct = d.score / max
        const color =
          d.score >= 75 ? '#ef4444' :
          d.score >= 50 ? '#f59e0b' :
          d.score >= 20 ? '#8b5cf6' : '#6366f1'
        const dayLabel = dayNames[new Date(d.date + 'T12:00:00').getDay()]
        return (
          <div key={d.date} className="flex-1 flex flex-col items-center gap-1.5">
            <p className="text-[10px] text-white/30 font-medium">{i === 0 ? 'Today' : dayLabel}</p>
            <div className="relative w-full flex flex-col-reverse" style={{ height: 48 }}>
              <motion.div
                className="w-full rounded-lg"
                style={{ background: `${color}30`, border: `1px solid ${color}40` }}
                initial={{ height: 4 }}
                animate={{ height: Math.max(pct * 48, 4) }}
                transition={{ delay: i * 0.04, duration: 0.6, ease: 'easeOut' }}
              >
                {d.score > 0 && (
                  <div className="absolute inset-0 rounded-lg" style={{ background: `${color}18` }} />
                )}
              </motion.div>
            </div>
            <p className={cn(
              'text-[10px] font-semibold',
              d.count > 0 ? 'text-white/60' : 'text-white/20'
            )}>
              {d.count > 0 ? d.count : '—'}
            </p>
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
    <div className="flex items-end gap-1" style={{ height: 64 }}>
      {data.slice(-14).map((d, i) => {
        const pct = d.completed / max
        const isToday = i === data.slice(-14).length - 1
        return (
          <motion.div
            key={d.date}
            className="flex-1 rounded-t-md relative group"
            style={{
              background: isToday
                ? 'linear-gradient(to top, #6366f1, #818cf8)'
                : 'rgba(99,102,241,0.25)',
              minHeight: 3,
            }}
            initial={{ height: 0 }}
            animate={{ height: `${Math.max(pct * 100, 5)}%` }}
            transition={{ delay: i * 0.025, duration: 0.5, ease: 'easeOut' }}
            title={`${d.date}: ${d.completed} completed`}
          />
        )
      })}
    </div>
  )
}

export default function Dashboard() {
  const [studyPlan, setStudyPlan] = useState(null)
  const [loadingPlan, setLoadingPlan] = useState(false)
  const [weeklyDebrief, setWeeklyDebrief] = useState(null)
  const [loadingDebrief, setLoadingDebrief] = useState(false)
  const [redistPlan, setRedistPlan] = useState(null)
  const [loadingRedist, setLoadingRedist] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: dashboard.get,
  })

  function handleAiError(err, label) {
    const msg = err?.message || ''
    if (msg.includes('authentication') || msg.includes('API key') || msg.includes('apiKey')) {
      toast.error('Set GEMINI_API_KEY in backend/.env to enable AI features', { duration: 5000 })
    } else {
      toast.error(msg ? `${label}: ${msg}` : `${label} failed`)
    }
  }

  async function handleStudyPlan() {
    setLoadingPlan(true)
    try {
      const plan = await ai.studyPlan()
      setStudyPlan(plan)
    } catch (err) {
      handleAiError(err, 'Study plan')
    } finally {
      setLoadingPlan(false)
    }
  }

  async function handleRedistribute() {
    setLoadingRedist(true)
    try {
      const plan = await ai.redistribute()
      setRedistPlan(plan)
    } catch (err) {
      handleAiError(err, 'Redistribute')
    } finally {
      setLoadingRedist(false)
    }
  }

  async function handleDebrief() {
    setLoadingDebrief(true)
    try {
      const debrief = await ai.weeklyDebrief()
      setWeeklyDebrief(debrief)
    } catch (err) {
      handleAiError(err, 'Weekly debrief')
    } finally {
      setLoadingDebrief(false)
    }
  }

  const busy = data?.busyScore ?? { score: 0, band: 'Clear' }
  const stats = data?.stats ?? {}
  const nextDue = Array.isArray(data?.nextDue) ? data.nextDue : data?.nextDue ? [data.nextDue] : []
  const dayStrip = data?.dayStrip ?? []
  const productivity = data?.productivity ?? []
  const greeting = getGreeting()

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-6 max-w-6xl">

      {/* Page header */}
      <motion.div variants={fadeUp} className="flex items-start justify-between">
        <div>
          <p className="text-white/35 text-sm mb-1">{format(new Date(), 'EEEE, MMMM d')}</p>
          <h1 className="text-3xl font-bold text-white leading-tight">
            {greeting.text} {greeting.emoji}
          </h1>
        </div>
        <motion.button
          onClick={handleDebrief}
          disabled={loadingDebrief}
          className="btn-primary gap-2 disabled:opacity-60"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
        >
          {loadingDebrief
            ? <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            : <SparklesIcon className="w-4 h-4" />
          }
          Weekly Debrief
        </motion.button>
      </motion.div>

      {/* Weekly Debrief banner */}
      {weeklyDebrief && (
        <motion.div
          initial={{ opacity: 0, y: -8, scale: 0.99 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0 }}
          className="rounded-2xl p-4"
          style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(139,92,246,0.10))', border: '1px solid rgba(99,102,241,0.25)' }}
        >
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(99,102,241,0.25)' }}>
              <SparklesIcon className="w-4 h-4 text-indigo-300" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-indigo-200">{weeklyDebrief.headline}</p>
              <p className="text-white/55 text-sm mt-1 leading-relaxed">{weeklyDebrief.overview}</p>
              {weeklyDebrief.motivation && (
                <p className="text-amber-300/70 text-sm mt-2 italic">"{weeklyDebrief.motivation}"</p>
              )}
            </div>
            <button onClick={() => setWeeklyDebrief(null)} className="text-white/25 hover:text-white/60 transition-colors text-lg leading-none mt-0.5">✕</button>
          </div>
        </motion.div>
      )}

      {/* Redistribute plan */}
      {redistPlan && (
        <motion.div
          initial={{ opacity: 0, y: -8, scale: 0.99 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0 }}
          className="rounded-2xl p-4"
          style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.20)' }}
        >
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex items-center gap-2">
              <SparklesIcon className="w-4 h-4 text-amber-400 flex-shrink-0" />
              <div>
                <p className="font-semibold text-amber-200 text-sm">Workload Redistribution Plan</p>
                {redistPlan.summary && <p className="text-white/45 text-xs mt-0.5">{redistPlan.summary}</p>}
              </div>
            </div>
            <button onClick={() => setRedistPlan(null)} className="text-white/25 hover:text-white/60 text-lg leading-none">✕</button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 max-h-56 overflow-y-auto pr-1">
            {(redistPlan.plan || []).map((day, i) => (
              <div key={i} className="p-2.5 rounded-xl" style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.12)' }}>
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-amber-300 text-xs font-bold">{day.dayName || day.date}</p>
                  {day.totalHours > 0 && <span className="text-[10px] text-white/30">{day.totalHours}h</span>}
                </div>
                {(day.actions || []).map((a, j) => (
                  <div key={j} className="flex items-start gap-1 mb-1">
                    <span className="text-amber-400/40 text-[10px] mt-0.5">·</span>
                    <p className="text-[11px] text-white/60 leading-snug">
                      <span className="text-white/80">{a.assignmentTitle}</span>
                      {a.hours ? <span className="text-white/30"> ({a.hours}h)</span> : null}
                      {a.action && <span className="text-white/35"> — {a.action}</span>}
                    </p>
                  </div>
                ))}
              </div>
            ))}
          </div>
          {redistPlan.warnings?.length > 0 && (
            <div className="mt-2 space-y-0.5">
              {redistPlan.warnings.map((w, i) => (
                <p key={i} className="text-xs text-amber-300/60">⚠ {w}</p>
              ))}
            </div>
          )}
        </motion.div>
      )}

      {/* Row 1: Busy Score + Stats */}
      <div className="grid grid-cols-12 gap-4">
        {/* Busy Score */}
        <motion.div variants={fadeUp} className="col-span-12 lg:col-span-4">
          <Card className="h-full flex flex-col items-center py-8 gap-2" accent="linear-gradient(90deg, #6366f1, #8b5cf6)">
            <p className="text-white/35 text-[11px] font-semibold tracking-widest uppercase">Busy Score</p>
            {isLoading
              ? <div className="w-48 h-48 rounded-full skeleton my-2" />
              : <BusyScoreRing score={busy.score} band={busy.band} size={192} />
            }
            <div className="text-center mt-1">
              <p className="text-white/35 text-xs">{busy.totalAssignments ?? 0} assignments in next 7 days</p>
              {(busy.daysWithCluster ?? 0) > 0 && (
                <p className="text-amber-400/60 text-xs mt-1">
                  ⚡ {busy.daysWithCluster} day{busy.daysWithCluster > 1 ? 's' : ''} with cluster
                </p>
              )}
            </div>
            {busy.score >= 50 && (
              <motion.button
                onClick={handleRedistribute}
                disabled={loadingRedist}
                className="mt-2 text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5 disabled:opacity-50 transition-all"
                style={{ background: 'rgba(245,158,11,0.12)', color: '#fbbf24', border: '1px solid rgba(245,158,11,0.2)' }}
                whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
              >
                {loadingRedist
                  ? <span className="w-3 h-3 border-2 border-amber-400/30 border-t-amber-400 rounded-full animate-spin" />
                  : <SparklesIcon className="w-3.5 h-3.5" />
                }
                Redistribute Load
              </motion.button>
            )}
          </Card>
        </motion.div>

        {/* Stats + 7-day strip */}
        <div className="col-span-12 lg:col-span-8 flex flex-col gap-4">
          {/* 4 stat cards */}
          <div className="grid grid-cols-2 gap-4">
            <StatCard
              label="Overdue"
              value={stats.overdue ?? 0}
              icon={ExclamationTriangleIcon}
              color="#f87171"
              bg="rgba(239,68,68,0.12)"
              loading={isLoading}
            />
            <StatCard
              label="Due Today"
              value={stats.todayDue ?? 0}
              icon={ClockIcon}
              color="#fbbf24"
              bg="rgba(245,158,11,0.12)"
              loading={isLoading}
            />
            <StatCard
              label="Done This Week"
              value={stats.completedThisWeek ?? 0}
              icon={CheckCircleIcon}
              color="#34d399"
              bg="rgba(16,185,129,0.12)"
              loading={isLoading}
            />
            <StatCard
              label="Day Streak"
              value={stats.streak ?? 0}
              icon={FireIcon}
              color="#fb923c"
              bg="rgba(249,115,22,0.12)"
              loading={isLoading}
              suffix={stats.streak > 0 ? ' 🔥' : ''}
            />
          </div>

          {/* 7-day load strip */}
          <Card className="flex-1">
            <p className="text-white/35 text-[11px] font-semibold tracking-widest uppercase">7-Day Load Forecast</p>
            <DayStrip days={dayStrip} />
          </Card>
        </div>
      </div>

      {/* Row 2: Next Due + Productivity chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <motion.div variants={fadeUp}>
          <Card className="h-full" accent="rgba(248,113,113,0.6)">
            <p className="text-white/35 text-[11px] font-semibold tracking-widest uppercase mb-4">Next Due</p>
            {isLoading ? (
              <div className="space-y-2">
                {[1,2,3].map(i => <div key={i} className="skeleton h-12 rounded-xl" />)}
              </div>
            ) : nextDue.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 gap-2">
                <p className="text-3xl">🌿</p>
                <p className="text-white/30 text-sm">Nothing due soon — enjoy!</p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {nextDue.map((a, i) => {
                  const status = getDueStatus(a.due_date)
                  return (
                    <motion.div
                      key={a.id}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="flex items-center gap-3 p-2.5 rounded-xl"
                      style={{ background: 'rgba(255,255,255,0.03)' }}
                    >
                      <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: a.subject_color || '#6366f1', boxShadow: `0 0 8px ${a.subject_color || '#6366f1'}80` }} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white/85 truncate font-medium">{a.title}</p>
                        <p className="text-xs text-white/30 mt-0.5">{a.subject_name || 'No subject'}</p>
                      </div>
                      <span className={cn('text-xs px-2 py-0.5 rounded-full whitespace-nowrap', getDueBadgeColor(status))}>
                        {formatDueDate(a.due_date)}
                      </span>
                    </motion.div>
                  )
                })}
              </div>
            )}
          </Card>
        </motion.div>

        <motion.div variants={fadeUp}>
          <Card className="h-full" accent="rgba(99,102,241,0.6)">
            <div className="flex items-center justify-between mb-4">
              <p className="text-white/35 text-[11px] font-semibold tracking-widest uppercase">14-Day Productivity</p>
              <ArrowTrendingUpIcon className="w-4 h-4 text-indigo-400/60" />
            </div>
            <ProductivityChart data={productivity} />
            <p className="text-white/20 text-xs mt-3">Assignments completed per day · today is rightmost</p>
          </Card>
        </motion.div>
      </div>

      {/* Row 3: AI Study Plan */}
      <motion.div variants={fadeUp}>
        <Card accent="linear-gradient(90deg, #8b5cf6, #6366f1)">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(99,102,241,0.2)' }}>
                <LightBulbIcon className="w-4 h-4 text-indigo-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">AI Study Plan</p>
                <p className="text-white/30 text-xs">Personalized to your workload</p>
              </div>
            </div>
            <motion.button
              onClick={handleStudyPlan}
              disabled={loadingPlan}
              className="btn-primary text-xs px-3 py-2 disabled:opacity-50"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
            >
              {loadingPlan ? (
                <><span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />Thinking...</>
              ) : (
                <><SparklesIcon className="w-3.5 h-3.5" />Generate</>
              )}
            </motion.button>
          </div>

          {!studyPlan ? (
            <div className="rounded-xl py-6 flex flex-col items-center gap-2"
              style={{ background: 'rgba(99,102,241,0.06)', border: '1px dashed rgba(99,102,241,0.2)' }}>
              <SparklesIcon className="w-6 h-6 text-indigo-400/40" />
              <p className="text-white/30 text-sm">Hit Generate for a day-by-day AI study plan</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 max-h-72 overflow-y-auto pr-1">
              {(studyPlan.days || studyPlan.plan || []).map((day, i) => {
                const tasks = day.tasks || day.sessions || []
                const totalH = day.totalHours ?? tasks.reduce((s, t) => s + (t.hours || 0), 0)
                return (
                  <div key={i} className="p-3 rounded-xl flex flex-col gap-1.5"
                    style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.15)' }}>
                    <div className="flex items-center justify-between mb-0.5">
                      <p className="text-indigo-300 text-xs font-bold">{day.dayName || day.day || day.date}</p>
                      {totalH > 0 && <span className="text-[10px] text-white/30">{totalH}h</span>}
                    </div>
                    {tasks.length === 0 ? (
                      <p className="text-[11px] text-white/20 italic">Rest day</p>
                    ) : tasks.map((t, j) => {
                      const label = typeof t === 'string' ? t : (t.title || t.task || t.activity || '')
                      const hrs = typeof t === 'object' ? t.hours : null
                      const note = typeof t === 'object' ? t.notes : null
                      return (
                        <div key={j} className="flex items-start gap-1.5">
                          <span className="text-indigo-400/50 text-[10px] mt-0.5 flex-shrink-0">·</span>
                          <div className="min-w-0">
                            <p className="text-xs text-white/70 leading-snug">{label}{hrs ? <span className="text-white/30 ml-1">({hrs}h)</span> : null}</p>
                            {note && <p className="text-[10px] text-white/30 leading-snug mt-0.5">{note}</p>}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )
              })}
            </div>
          )}
          {studyPlan?.summary && (
            <p className="text-xs text-white/40 mt-3 leading-relaxed">{studyPlan.summary}</p>
          )}
          {studyPlan?.warnings?.length > 0 && (
            <div className="mt-2 p-3 rounded-xl flex items-start gap-2"
              style={{ background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.15)' }}>
              <ExclamationTriangleIcon className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                {studyPlan.warnings.map((w, i) => <p key={i} className="text-xs text-red-300/70">{w}</p>)}
              </div>
            </div>
          )}
          {studyPlan?.tips && (
            <div className="mt-2 p-3 rounded-xl flex items-start gap-2"
              style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.15)' }}>
              <LightBulbIcon className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-300/70">{studyPlan.tips}</p>
            </div>
          )}
        </Card>
      </motion.div>
    </motion.div>
  )
}
