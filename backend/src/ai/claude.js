import Anthropic from '@anthropic-ai/sdk'

// Lazy init — reads key at call time, not module load time (ESM import ordering)
let _client = null
function getClient() {
  if (!_client) _client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  return _client
}

export async function generateStudyPlan(assignments, settings) {
  const now = new Date()
  const in7days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

  const upcoming = assignments
    .filter(a => a.status !== 'completed' && a.due_date)
    .sort((a, b) => a.due_date - b.due_date)
    .slice(0, 20)

  const prompt = `You are an academic advisor helping a college student plan their study week.

Today: ${now.toDateString()}
Student's daily study hours: ${settings.daily_study_hours || 6}
Work style: ${settings.work_style || 'on_time'} (early_bird = likes to work ahead, last_minute = works closer to deadlines)

Upcoming assignments (next 7 days):
${upcoming.map(a => `- "${a.title}" | Type: ${a.type} | Difficulty: ${a.difficulty} | Due: ${a.due_date ? new Date(a.due_date * 1000).toDateString() : 'no date'} | Est. hours: ${a.estimated_hours || 'unknown'} | Subject: ${a.subject_name || 'General'}`).join('\n')}

Generate a day-by-day study plan for the next 7 days. For each day, list specific tasks with time estimates. Be honest about tight deadlines. Include brief reasoning for scheduling decisions.

Respond as JSON with this exact structure:
{
  "summary": "2-3 sentence overview of the week",
  "days": [
    {
      "date": "2024-01-15",
      "dayName": "Monday",
      "totalHours": 3.5,
      "tasks": [
        {
          "assignmentId": "uuid-or-null",
          "title": "Study session title",
          "hours": 1.5,
          "notes": "Brief why/what"
        }
      ]
    }
  ],
  "warnings": ["any tight deadline warnings"],
  "insights": ["1-2 motivational but honest insights"]
}`

  const response = await getClient().messages.create({
    model: 'claude-opus-4-8',
    max_tokens: 2000,
    thinking: { type: 'adaptive' },
    output_config: { format: { type: 'json_object' } },
    messages: [{ role: 'user', content: prompt }],
  })

  const text = response.content.find(b => b.type === 'text')?.text
  return JSON.parse(text)
}

export async function parseNaturalLanguageAssignment(input, subjects = []) {
  const today = new Date()
  const subjectsList = subjects.map(s => `${s.name} (id: ${s.id})`).join(', ')

  const prompt = `Parse this natural language assignment description into structured data.

Input: "${input}"

Today's date: ${today.toDateString()}
Available subjects: ${subjectsList || 'none'}

Extract and infer:
- title: main assignment name
- type: one of: assignment, exam, essay, problem_set, reading, project, quiz, lab
- difficulty: low, medium, or high
- due_date: ISO date string (YYYY-MM-DD) if mentioned — resolve relative dates like "Friday", "next week", "in 3 days"
- estimated_hours: number if mentioned (e.g. "3h" = 3, "2 hours" = 2)
- subject_id: matching subject id from the list, or null
- grade_weight: percentage number if mentioned (e.g. "worth 30%" = 30)
- notes: any additional context

Respond as JSON only:
{
  "title": "...",
  "type": "...",
  "difficulty": "...",
  "due_date": "YYYY-MM-DD or null",
  "estimated_hours": number or null,
  "subject_id": "id or null",
  "grade_weight": number or null,
  "notes": "... or null"
}`

  const response = await getClient().messages.create({
    model: 'claude-opus-4-8',
    max_tokens: 500,
    output_config: { format: { type: 'json_object' } },
    messages: [{ role: 'user', content: prompt }],
  })

  const text = response.content.find(b => b.type === 'text')?.text
  return JSON.parse(text)
}

export async function getAssignmentInsights(assignment, workload) {
  const prompt = `You're helping a college student with an assignment. Give concise, actionable insights.

Assignment: "${assignment.title}"
Type: ${assignment.type}
Difficulty: ${assignment.difficulty}
Due: ${assignment.due_date ? new Date(assignment.due_date * 1000).toDateString() : 'no date set'}
Estimated hours: ${assignment.estimated_hours || 'not set'}
Current workload score: ${workload.score}/100 (${workload.band})
Total upcoming assignments: ${workload.totalAssignments}

Respond as JSON:
{
  "urgency": "low|medium|high|critical",
  "timeEstimateRealistic": true/false,
  "suggestedHours": number,
  "subtaskSuggestions": ["task 1", "task 2", "task 3", "..."],
  "tips": ["specific tip 1", "specific tip 2"],
  "warning": "deadline warning if applicable or null"
}`

  const response = await getClient().messages.create({
    model: 'claude-opus-4-8',
    max_tokens: 600,
    output_config: { format: { type: 'json_object' } },
    messages: [{ role: 'user', content: prompt }],
  })

  const text = response.content.find(b => b.type === 'text')?.text
  return JSON.parse(text)
}

export async function generateWeeklyDebrief(dashboardData) {
  const { busyScore, stats, dayStrip } = dashboardData
  const hardestDay = dayStrip?.reduce((a, b) => (b.score > a.score ? b : a), { score: 0, date: '' })

  const prompt = `Generate a weekly academic debrief for a college student.

Busy Score: ${busyScore.score}/100 (${busyScore.band})
Total upcoming assignments: ${busyScore.totalAssignments}
Overdue items: ${stats?.overdue || 0}
Streak: ${stats?.streak || 0} days
Completed this week: ${stats?.completedThisWeek || 0}
Hardest upcoming day: ${hardestDay?.date || 'none'} (score: ${hardestDay?.score || 0})

Top contributors to busy score:
${busyScore.breakdown?.slice(0, 3).map(b => `- "${b.title}" due ${new Date(b.due_date * 1000).toDateString()}, contributing ${b.contribution} points`).join('\n') || 'none'}

Write a brief, honest, motivating debrief. Be direct, not fluffy. Acknowledge real pressure if there is any.

Respond as JSON:
{
  "headline": "one punchy headline sentence",
  "overview": "2-3 sentence honest overview",
  "hardestDayWarning": "specific warning about hardest day or null",
  "topPriority": "the single most important thing to focus on",
  "motivation": "one genuinely useful motivational sentence"
}`

  const response = await getClient().messages.create({
    model: 'claude-opus-4-8',
    max_tokens: 500,
    output_config: { format: { type: 'json_object' } },
    messages: [{ role: 'user', content: prompt }],
  })

  const text = response.content.find(b => b.type === 'text')?.text
  return JSON.parse(text)
}
