import { GoogleGenerativeAI } from '@google/generative-ai'

let _genAI = null
function getModel() {
  if (!_genAI) _genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
  return _genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    generationConfig: { responseMimeType: 'application/json' },
  })
}

// Retry on 503 (model overloaded) — up to 3 attempts with 2s back-off
async function generate(prompt, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const result = await getModel().generateContent(prompt)
      return JSON.parse(result.response.text())
    } catch (err) {
      const is503 = err?.message?.includes('503') || err?.message?.includes('Service Unavailable') || err?.message?.includes('high demand')
      if (is503 && i < retries - 1) {
        await new Promise(r => setTimeout(r, 2000 * (i + 1)))
        continue
      }
      throw err
    }
  }
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
- title: the assignment name
- type: one of exactly: assignment, exam, essay, problem_set, reading, project, quiz, lab
- difficulty: one of exactly: low, medium, high
- due_date: ISO date string YYYY-MM-DD if a date is mentioned — resolve relative dates like "Friday", "next week", "in 3 days". Use null if no date.
- estimated_hours: number if mentioned (e.g. "3 hours" = 3), null if not
- subject_id: the matching id from the subjects list, or null
- notes: any extra context, or null

Respond with only this JSON:
{
  "title": "...",
  "type": "...",
  "difficulty": "...",
  "due_date": "YYYY-MM-DD or null",
  "estimated_hours": null,
  "subject_id": null,
  "notes": null
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
