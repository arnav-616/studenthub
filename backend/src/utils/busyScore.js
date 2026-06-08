const URGENCY = { within24h: 3, within3d: 2, within7d: 1 }
const DIFFICULTY = { high: 1.5, medium: 1.0, low: 0.7 }
const TYPE_WEIGHT = {
  exam: 1.8, essay: 1.3, problem_set: 1.1,
  quiz: 1.2, lab: 1.0, project: 1.2, reading: 0.8, assignment: 1.0,
}
const CLUSTER_THRESHOLD = 3
const CLUSTER_MULTIPLIER = 1.3
const MAX_RAW_SCORE = 120

export function calculateBusyScore(assignments, workStyle = 'on_time') {
  const now = Date.now()
  const in7days = now + 7 * 24 * 60 * 60 * 1000

  const relevant = assignments.filter(a => {
    if (!a.due_date) return false
    const due = a.due_date * 1000
    return due > now && due <= in7days && a.status !== 'completed'
  })

  if (relevant.length === 0) return { score: 0, band: 'Clear', breakdown: [] }

  // Group by day (day key = YYYY-MM-DD)
  const byDay = {}
  for (const a of relevant) {
    const key = new Date(a.due_date * 1000).toISOString().slice(0, 10)
    if (!byDay[key]) byDay[key] = []
    byDay[key].push(a)
  }

  let rawTotal = 0
  const breakdown = []

  for (const [day, dayAssignments] of Object.entries(byDay)) {
    const clusterPenalty = dayAssignments.length >= CLUSTER_THRESHOLD ? CLUSTER_MULTIPLIER : 1.0
    let dayScore = 0

    for (const a of dayAssignments) {
      const due = a.due_date * 1000
      const hoursUntil = (due - now) / 3_600_000

      let urgency
      if (hoursUntil <= 24) urgency = URGENCY.within24h
      else if (hoursUntil <= 72) urgency = URGENCY.within3d
      else urgency = URGENCY.within7d

      // Work style adjustment
      if (workStyle === 'early_bird') urgency = Math.min(urgency * 1.2, 4)
      else if (workStyle === 'last_minute') urgency = Math.max(urgency * 0.85, 0.5)

      const diff = DIFFICULTY[a.difficulty] ?? 1.0
      const type = TYPE_WEIGHT[a.type] ?? 1.0
      const hours = a.estimated_hours ? Math.log1p(a.estimated_hours) * 1.5 + 1 : 1.0

      const raw = urgency * diff * type * hours
      dayScore += raw

      breakdown.push({
        id: a.id,
        title: a.title,
        due_date: a.due_date,
        contribution: Math.round(raw * clusterPenalty * 10) / 10,
        urgency_mult: urgency,
        difficulty_mult: diff,
        type_mult: type,
        hours_factor: Math.round(hours * 100) / 100,
        cluster_penalty: clusterPenalty,
      })
    }

    rawTotal += dayScore * clusterPenalty
  }

  const score = Math.min(100, Math.round((rawTotal / MAX_RAW_SCORE) * 100))

  breakdown.sort((a, b) => b.contribution - a.contribution)

  return {
    score,
    band: scoreBand(score),
    breakdown: breakdown.slice(0, 10),
    totalAssignments: relevant.length,
    daysWithCluster: Object.values(byDay).filter(d => d.length >= CLUSTER_THRESHOLD).length,
  }
}

export function scoreBand(score) {
  if (score === 0) return 'Clear'
  if (score <= 24) return 'Light'
  if (score <= 49) return 'Moderate'
  if (score <= 74) return 'Busy'
  if (score <= 99) return 'Heavy'
  return 'Overwhelming'
}

export function dailyScores(assignments) {
  const now = Date.now()
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now + i * 24 * 60 * 60 * 1000)
    return d.toISOString().slice(0, 10)
  })

  return days.map(day => {
    const dayStart = new Date(day).getTime() / 1000
    const dayEnd = dayStart + 86400
    const dayAssignments = assignments.filter(
      a => a.due_date >= dayStart && a.due_date < dayEnd && a.status !== 'completed'
    )
    const { score } = calculateBusyScore(dayAssignments)
    return { date: day, score, count: dayAssignments.length }
  })
}
