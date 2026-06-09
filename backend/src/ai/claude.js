import { GoogleGenerativeAI } from '@google/generative-ai'

// Fallback chain — tries each in order, skips on 503 (overload) or 429 (quota 0)
const MODEL_CHAIN = [
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite-preview-06-17',
  'gemini-1.5-flash-8b',
  'gemini-1.5-flash',
]

let _genAI = null
function getModel(modelName) {
  if (!_genAI) _genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
  return _genAI.getGenerativeModel({
    model: modelName,
    generationConfig: { responseMimeType: 'application/json' },
  })
}

function isSkippable(err) {
  const m = err?.message || ''
  return (
    m.includes('503') || m.includes('Service Unavailable') || m.includes('high demand') ||
    m.includes('429') || m.includes('Too Many Requests') || m.includes('quota') ||
    m.includes('not found') || m.includes('404')
  )
}

async function generate(prompt) {
  let lastErr
  for (const model of MODEL_CHAIN) {
    try {
      const result = await getModel(model).generateContent(prompt)
      return JSON.parse(result.response.text())
    } catch (err) {
      if (isSkippable(err)) { lastErr = err; continue }
      throw err
    }
  }
  throw new Error('AI models are busy right now — please try again in a moment')
}

export async function generateStudyPlan(assignments, settings) {
  const now = new Date()
  const upcoming = assignments
    .filter(a => a.status !== 'completed' && a.due_date)
    .sort((a, b) => a.due_date - b.due_date)
    .slice(0, 20)

  const prompt = `You are an academic advisor helping a college student plan their study week.

Today: ${now.toDateString()}
Student's daily study hours: ${settings.daily_study_hours || 6}
Work style: ${settings.work_style || 'on_time'} (early_bird = likes to work ahead, last_minute = works closer to deadlines)

Upcoming assignments:
${upcoming.map(a => `- "${a.title}" | Type: ${a.type} | Difficulty: ${a.difficulty} | Due: ${a.due_date ? new Date(a.due_date * 1000).toDateString() : 'no date'} | Est. hours: ${a.estimated_hours || 'unknown'} | Subject: ${a.subject_name || 'General'}`).join('\n') || '(none)'}

Generate a day-by-day study plan for the next 7 days. For each day list specific tasks with time estimates. Be honest about tight deadlines.

Respond with this exact JSON structure:
{
  "summary": "2-3 sentence overview",
  "days": [
    {
      "date": "YYYY-MM-DD",
      "dayName": "Monday",
      "totalHours": 3.5,
      "tasks": [
        { "title": "task name", "hours": 1.5, "notes": "brief note" }
      ]
    }
  ],
  "warnings": ["any tight deadline warnings"],
  "insights": ["1-2 motivational insights"]
}`

  return generate(prompt)
}

export async function parseNaturalLanguageAssignment(input, subjects = []) {
  const today = new Date()
  const subjectsList = subjects.map(s => `${s.name} (id: ${s.id})`).join(', ')

  const prompt = `Parse this natural language assignment description into structured data.

Input: "${input}"

Today's date: ${today.toDateString()}
Available subjects: ${subjectsList || 'none'}

Extract and infer:
- title: the assignment name (concise)
- type: one of exactly: assignment, exam, essay, problem_set, reading, project, quiz, lab
- difficulty: one of exactly: low, medium, high
- due_date: ISO date string YYYY-MM-DD if a date is mentioned — resolve relative dates like "Friday", "next week", "in 3 days". Use null if no date.
- estimated_hours: total estimated hours if directly stated (e.g. "3 hours" = 3), null if not — do NOT compute from sessions
- subject_id: the matching id from the subjects list, or null
- notes: any extra context, or null
- sessions_total: if the input describes multiple sessions/episodes/videos/chapters/problems with a count, extract that number. e.g. "10 videos", "5 chapters", "8 problems" → sessions_total=10/5/8. null otherwise.
- session_duration_mins: if a per-session duration is mentioned (e.g. "30 min each", "each video is 45 minutes") extract it as an integer number of minutes. null otherwise.

Respond with only this JSON:
{
  "title": "...",
  "type": "...",
  "difficulty": "...",
  "due_date": "YYYY-MM-DD or null",
  "estimated_hours": null,
  "subject_id": null,
  "notes": null,
  "sessions_total": null,
  "session_duration_mins": null
}`

  return generate(prompt)
}

export async function getAssignmentInsights(assignment, workload) {
  const prompt = `Help a college student understand this assignment.

Assignment: "${assignment.title}"
Type: ${assignment.type} | Difficulty: ${assignment.difficulty}
Due: ${assignment.due_date ? new Date(assignment.due_date * 1000).toDateString() : 'no date'}
Estimated hours: ${assignment.estimated_hours || 'not set'}
Current workload: ${workload.score}/100 (${workload.band}), ${workload.totalAssignments} upcoming

Respond with this JSON:
{
  "urgency": "low|medium|high|critical",
  "timeEstimateRealistic": true,
  "suggestedHours": 3,
  "subtaskSuggestions": ["subtask 1", "subtask 2", "subtask 3"],
  "tips": ["tip 1", "tip 2"],
  "warning": null
}`

  return generate(prompt)
}

export async function generateWeeklyDebrief(dashboardData) {
  const { busyScore, stats } = dashboardData

  const prompt = `Generate a weekly academic debrief for a college student.

Busy Score: ${busyScore.score}/100 (${busyScore.band})
Upcoming assignments: ${busyScore.totalAssignments}
Overdue: ${stats?.overdue || 0}
Completed this week: ${stats?.completedThisWeek || 0}
Streak: ${stats?.streak || 0} days

Top workload contributors:
${busyScore.breakdown?.slice(0, 3).map(b => `- "${b.title}" due ${new Date(b.due_date * 1000).toDateString()}`).join('\n') || 'none'}

Write a brief, honest, motivating debrief. Be direct, not fluffy.

Respond with this JSON:
{
  "headline": "one punchy sentence",
  "overview": "2-3 honest sentences",
  "hardestDayWarning": null,
  "topPriority": "single most important focus",
  "motivation": "one genuinely useful sentence"
}`

  return generate(prompt)
}

export async function parseSyllabus(text, subjects = []) {
  const today = new Date()
  const subjectsList = subjects.map(s => `${s.name} (id: ${s.id})`).join(', ')

  const prompt = `You are a parser that extracts every assignment, exam, quiz, project, essay, lab, and reading from a course syllabus.

Today: ${today.toDateString()}
Available subjects: ${subjectsList || 'none — leave subject_id null'}

Syllabus text:
"""
${text.slice(0, 8000)}
"""

Extract EVERY graded item, deadline, or deliverable. For each one:
- title: concise name
- type: one of: assignment, exam, essay, problem_set, reading, project, quiz, lab
- due_date: YYYY-MM-DD if determinable, null otherwise
- difficulty: low | medium | high
- estimated_hours: number if inferable, null otherwise
- subject_id: matching id from subjects list or null
- notes: point value, weight, or any context

Respond ONLY with valid JSON, no markdown:
{
  "assignments": [
    { "title": "...", "type": "...", "difficulty": "...", "due_date": null, "estimated_hours": null, "subject_id": null, "notes": null }
  ],
  "courseName": null,
  "totalFound": 0
}`

  return generate(prompt)
}

export async function redistributeWorkload(assignments, dailyHours = 6) {
  const now = new Date()
  const upcoming = assignments
    .filter(a => a.status !== 'completed' && a.due_date)
    .sort((a, b) => a.due_date - b.due_date)
    .slice(0, 30)

  const prompt = `A student is overloaded. Suggest how to redistribute their work across the next 7 days.

Today: ${now.toDateString()}
Daily study capacity: ${dailyHours} hours

Assignments (sorted by due date):
${upcoming.map(a => {
    const remaining = a.sessions_total && a.session_duration_mins
      ? `${(a.sessions_total - (a.sessions_completed || 0))} sessions × ${a.session_duration_mins}min`
      : a.estimated_hours ? `${a.estimated_hours}h` : 'no estimate'
    return `- "${a.title}" | Due: ${new Date(a.due_date * 1000).toDateString()} | ${remaining} | ${a.difficulty}`
  }).join('\n')}

Respond ONLY with valid JSON:
{
  "plan": [
    {
      "date": "YYYY-MM-DD",
      "dayName": "Monday",
      "totalHours": 4.5,
      "actions": [
        { "assignmentTitle": "...", "action": "what to do", "hours": 1.5 }
      ]
    }
  ],
  "warnings": [],
  "summary": "2-sentence honest assessment"
}`

  return generate(prompt)
}
