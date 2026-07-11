// Realistic busy score: uses remaining work, exponential urgency, student capacity
// No AI needed — pure calculation based on what's actually left to do

const TYPE_WEIGHT = {
  exam: 2.2, essay: 1.4, problem_set: 1.2,
  quiz: 1.1, lab: 1.2, project: 1.5, reading: 0.7, assignment: 1.0,
}
const DIFFICULTY = { high: 1.6, medium: 1.0, low: 0.65 }

// Default estimated hours per type when no estimate is given
const TYPE_DEFAULT_HOURS = {
  exam: 4, essay: 3, problem_set: 2.5,
  quiz: 1, lab: 2, project: 3, reading: 1.5, assignment: 1.5,
}

function urgencyFactor(hoursUntilDue) {
  // Exponential urgency — gets steep fast inside 24h
  if (hoursUntilDue <= 0)   return 6.0   // overdue / past due
  if (hoursUntilDue <= 6)   return 5.5
  if (hoursUntilDue <= 12)  return 4.5
  if (hoursUntilDue <= 24)  return 3.5
  if (hoursUntilDue <= 48)  return 2.5
  if (hoursUntilDue <= 72)  return 1.8
  if (hoursUntilDue <= 120) return 1.3   // 5 days
  if (hoursUntilDue <= 168) return 1.0   // 7 days
  if (hoursUntilDue <= 240) return 0.65  // 10 days
  return 0.4                              // 10-14 days
}

export function calculateBusyScore(assignments, workStyle = 'on_time', settings = {}) {
  const now = Date.now()
  const in14days = now + 14 * 24 * 3600 * 1000
  const dailyHours = parseFloat(settings.daily_study_hours) || 6
  const extraHoursPerWeek = parseFloat(settings.extracurricular_hours_per_week) || 0

  // Available study hours over next 7 days, minus recurring extracurricular time
  const weeklyStudyCapacity = Math.max(1, dailyHours * 7 - extraHoursPerWeek)

  const relevant = assignments.filter(a =>
    a.status !== 'completed' &&
    a.due_date &&
    a.due_date * 1000 <= in14days
  )

  if (!relevant.length) return { score: 0, band: 'Clear', breakdown: [], totalAssignments: 0, daysWithCluster: 0, weeklyStudyCapacity, remainingHours: 0 }

  // Group by calendar day for cluster detection
  const byDay = {}
  for (const a of relevant) {
    const key = new Date(a.due_date * 1000).toISOString().slice(0, 10)
    if (!byDay[key]) byDay[key] = []
    byDay[key].push(a)
  }
  const daysWithCluster = Object.values(byDay).filter(d => d.length >= 3).length

  let totalWeightedHours = 0
  let totalRemainingHours = 0
  const breakdown = []

  for (const a of relevant) {
    const hoursUntilDue = (a.due_date * 1000 - now) / 3_600_000
    const uf = urgencyFactor(hoursUntilDue)

    // Work style shifts urgency perception
    const ufAdjusted = workStyle === 'early_bird'
      ? uf * 1.15
      : workStyle === 'last_minute'
      ? uf * 0.85
      : uf

    // Remaining hours: estimate minus already logged
    const sessionsLeft = Math.max(0, (a.sessions_total ?? 1) - (a.sessions_completed ?? 0))
    const sessionHours = a.session_duration_mins ? (sessionsLeft * a.session_duration_mins) / 60 : null
    const rawEstimate = a.estimated_hours ?? sessionHours ?? TYPE_DEFAULT_HOURS[a.type] ?? 1.5
    const logged = a.logged_hours ?? 0
    const remaining = Math.max(0.25, rawEstimate - logged)

    const diff = DIFFICULTY[a.difficulty] ?? 1.0
    const type = TYPE_WEIGHT[a.type] ?? 1.0

    // Cluster penalty: same day as 2+ other things
    const dayKey = new Date(a.due_date * 1000).toISOString().slice(0, 10)
    const clusterPenalty = byDay[dayKey].length >= 3 ? 1.35 : byDay[dayKey].length >= 2 ? 1.15 : 1.0

    const weighted = remaining * diff * type * ufAdjusted * clusterPenalty
    totalWeightedHours += weighted
    totalRemainingHours += remaining

    breakdown.push({
      id: a.id,
      title: a.title,
      due_date: a.due_date,
      hoursUntilDue: Math.round(hoursUntilDue),
      remainingHours: Math.round(remaining * 10) / 10,
      contribution: Math.round(weighted * 10) / 10,
      urgency_mult: Math.round(ufAdjusted * 10) / 10,
      cluster_penalty: clusterPenalty,
    })
  }

  // Score = weighted workload / weekly capacity, capped at 100
  // A score of 100 = you'd need to work non-stop to finish everything
  const raw = (totalWeightedHours / weeklyStudyCapacity) * 100
  const score = Math.min(100, Math.round(raw))

  breakdown.sort((a, b) => b.contribution - a.contribution)

  return {
    score,
    band: scoreBand(score),
    breakdown: breakdown.slice(0, 10),
    totalAssignments: relevant.length,
    daysWithCluster,
    weeklyStudyCapacity: Math.round(weeklyStudyCapacity * 10) / 10,
    remainingHours: Math.round(totalRemainingHours * 10) / 10,
  }
}

export function scoreBand(score) {
  if (score === 0)   return 'Clear'
  if (score <= 20)  return 'Light'
  if (score <= 45)  return 'Moderate'
  if (score <= 70)  return 'Busy'
  if (score <= 90)  return 'Heavy'
  return 'Overwhelming'
}

// Per-day breakdown for the next 7 days: how loaded is each day?
export function dailyScores(assignments, settings = {}) {
  const now = Date.now()
  const dailyHours = parseFloat(settings.daily_study_hours) || 6

  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now + i * 24 * 3600 * 1000)
    const dayStr = d.toISOString().slice(0, 10)
    const dayStart = new Date(dayStr).getTime() / 1000
    const dayEnd = dayStart + 86400

    // Assignments due on this day
    const due = assignments.filter(a =>
      a.due_date >= dayStart && a.due_date < dayEnd && a.status !== 'completed'
    )

    // Work that should ideally be done on this day (due within next 3 days of this day)
    const upcoming = assignments.filter(a => {
      if (a.status === 'completed' || !a.due_date) return false
      const dueTs = a.due_date * 1000
      return dueTs >= d.getTime() && dueTs <= d.getTime() + 3 * 86400000
    })

    const hoursNeeded = upcoming.reduce((sum, a) => {
      const remaining = Math.max(0.25, (a.estimated_hours ?? TYPE_DEFAULT_HOURS[a.type] ?? 1.5) - (a.logged_hours ?? 0))
      return sum + remaining / Math.max(1, Math.ceil(((a.due_date * 1000) - d.getTime()) / 86400000))
    }, 0)

    const loadPct = Math.min(100, Math.round((hoursNeeded / dailyHours) * 100))

    return {
      date: dayStr,
      score: loadPct,
      count: due.length,
      dueCount: due.length,
      hoursNeeded: Math.round(hoursNeeded * 10) / 10,
      freeHours: Math.max(0, Math.round((dailyHours - hoursNeeded) * 10) / 10),
    }
  })
}

// Free time finder: which days this week have open hours?
export function freeTimeFinder(assignments, extracurriculars = [], settings = {}) {
  const dailyHours = parseFloat(settings.daily_study_hours) || 6
  const dayStrips = dailyScores(assignments, settings)

  // Map extracurricular meeting days to hours-per-day cost
  const DAYS = ['sun','mon','tue','wed','thu','fri','sat']
  const extraByDay = {}
  for (const ec of extracurriculars) {
    if (!ec.active || !ec.meeting_days) continue
    const days = ec.meeting_days.split(',').map(d => d.trim().toLowerCase())
    const hoursPerMeeting = ec.hours_per_week / Math.max(1, days.length)
    for (const d of days) {
      const idx = DAYS.indexOf(d.slice(0, 3))
      if (idx >= 0) extraByDay[idx] = (extraByDay[idx] || 0) + hoursPerMeeting
    }
  }

  return dayStrips.map(day => {
    const date = new Date(day.date)
    const dow = date.getDay()
    const ecHours = extraByDay[dow] || 0
    const studyHours = Math.max(0, day.hoursNeeded)
    const totalBusy = ecHours + studyHours
    const freeHours = Math.max(0, Math.round((dailyHours - totalBusy) * 10) / 10)
    return {
      ...day,
      ecHours: Math.round(ecHours * 10) / 10,
      totalBusyHours: Math.round(totalBusy * 10) / 10,
      freeHours,
      isLight: freeHours >= dailyHours * 0.5,
    }
  })
}
