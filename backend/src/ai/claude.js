import { GoogleGenerativeAI } from '@google/generative-ai'

// Fallback chain — tries each in order, skips on 503 (overload) or 429 (quota 0)
const MODEL_CHAIN = [
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite',
  'gemini-2.0-flash',
  'gemini-2.0-flash-lite',
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
  for (const model of MODEL_CHAIN) {
    try {
      const result = await getModel(model).generateContent(prompt)
      return JSON.parse(result.response.text())
    } catch (err) {
      if (isSkippable(err)) continue
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

export async function suggestNextTask(assignments, _subjects = []) {
  const now = new Date()
  const hour = now.getHours()
  const upcoming = assignments
    .filter(a => a.status !== 'completed')
    .sort((a, b) => (a.due_date || 9999999999) - (b.due_date || 9999999999))
    .slice(0, 15)

  const timeOfDay = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening'

  const prompt = `You are an academic advisor. A student wants to know the single best thing to work on RIGHT NOW.

Current time: ${now.toLocaleString()} (${timeOfDay})

Their pending assignments (sorted by due date):
${upcoming.map(a => `- "${a.title}" | Due: ${a.due_date ? new Date(a.due_date * 1000).toDateString() : 'no date'} | Difficulty: ${a.difficulty} | Type: ${a.type} | Subject: ${a.subject_name || 'General'} | Est. hours: ${a.estimated_hours || '?'}`).join('\n') || '(none)'}

Pick the SINGLE most important task to start right now. Consider due date urgency, difficulty, and time of day.

Respond ONLY with this JSON:
{
  "title": "exact task title from the list",
  "reason": "one sentence explanation of why this is the priority right now",
  "urgency": "low|medium|high|critical",
  "tip": "one concrete actionable tip for getting started on this task"
}`

  return generate(prompt)
}

export async function reviewWriting(text, requirements = '') {
  const prompt = `You are an expert academic writing coach. Review the following student essay or writing sample.

${requirements ? `Assignment requirements: ${requirements}\n` : ''}

Writing sample:
"""
${text.slice(0, 6000)}
"""

Provide detailed, constructive feedback. Be specific and actionable, not vague.

CRITICAL FORMATTING RULES:
- Every string value must be plain prose. NO asterisks, NO markdown, NO bold (**), NO bullet dashes (-) inside string values.
- Array items must be complete sentences.

Respond ONLY with this JSON (no markdown, no backticks):
{
  "score": 82,
  "grade": "B",
  "overall": "2-3 sentence honest overall assessment",
  "strengths": [
    "Specific strength as a complete sentence",
    "Another specific strength"
  ],
  "improvements": [
    "Specific improvement needed as a complete sentence with example",
    "Another improvement with concrete suggestion"
  ],
  "suggestions": [
    "Actionable rewrite suggestion as a complete sentence",
    "Another actionable suggestion"
  ],
  "thesisClear": true,
  "evidenceStrong": true,
  "flowGood": false
}`

  return generate(prompt)
}

export async function parseTranscript(text) {
  const prompt = `You are parsing a student's grade report or transcript. This may be an official academic transcript OR an LMS grade report (Canvas, Blackboard, Moodle, etc.) showing individual assignment scores.

Text to parse:
"""
${text.slice(0, 8000)}
"""

Detect what type it is:
- OFFICIAL TRANSCRIPT: lists courses with letter grades (A, B+, etc.) and credits. No individual homework items.
- LMS GRADE REPORT: lists individual assignments, quizzes, exams with point scores.

For OFFICIAL TRANSCRIPTS, extract each course:
- name, grade (letter like "A-"), gradePoints (4.0 scale), credits (number), semester (e.g. "Fall 2024")
- items: [] (empty array)

For LMS GRADE REPORTS, group items by course/category:
- name: the course or category name
- grade: overall letter grade if shown, else null
- gradePoints: null
- credits: 3 (default)
- semester: null
- items: array of { name, earned (points earned), max (points possible), category (assignment group name), categoryWeight (% weight of that group, 0-100) }

Respond ONLY with valid JSON, no markdown:
{
  "courses": [
    {
      "name": "...",
      "grade": "A-",
      "gradePoints": 3.7,
      "credits": 3,
      "semester": "Fall 2024",
      "items": []
    }
  ]
}`

  return generate(prompt)
}

export async function parseTranscriptFromImage(imageBuffer, mimeType = 'image/png') {
  if (!_genAI) _genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
  const prompt = `You are parsing a screenshot of a student's grades page or transcript. Extract all courses and/or assignment scores visible.

If this shows COURSE GRADES (official transcript style): extract course name, letter grade, credit hours, semester.
If this shows INDIVIDUAL ASSIGNMENT SCORES (LMS grade report): extract each item's name, points earned, points possible, category/group name.

Respond ONLY with valid JSON, no markdown:
{
  "courses": [
    {
      "name": "Course name",
      "grade": "A-",
      "gradePoints": 3.7,
      "credits": 3,
      "semester": null,
      "items": [
        { "name": "HW 1", "earned": 95, "max": 100, "category": "Homework", "categoryWeight": 30 }
      ]
    }
  ]
}`

  for (const modelName of MODEL_CHAIN) {
    try {
      const m = _genAI.getGenerativeModel({ model: modelName, generationConfig: { responseMimeType: 'application/json' } })
      const result = await m.generateContent([
        { inlineData: { mimeType, data: imageBuffer.toString('base64') } },
        prompt,
      ])
      return JSON.parse(result.response.text())
    } catch (err) {
      if (isSkippable(err)) continue
      throw err
    }
  }
  throw new Error('AI models are busy — please try again in a moment')
}

export async function generateNotes(text, title = '') {
  const prompt = `You are an expert study assistant. Create concise, exam-focused quick notes from the following content.
${title ? `Topic: ${title}\n` : ''}

Content:
"""
${text}
"""

Organize into clear sections with key bullet points. Include key terms and top takeaways.

CRITICAL FORMATTING RULES:
- Every string value must be plain prose. NO asterisks, NO markdown, NO bold (**), NO dashes (-) inside string values.
- Array items must be complete sentences or phrases.

Respond ONLY with valid JSON, no markdown, no backticks:
{
  "title": "concise topic title",
  "summary": "2-3 sentence overview of the material",
  "sections": [
    {
      "heading": "Section Name",
      "detail": "optional 1-sentence context for this section",
      "points": ["key point as a complete sentence", "another key point"]
    }
  ],
  "keyTerms": [
    { "term": "term name", "definition": "clear definition in one sentence" }
  ],
  "takeaways": ["Most important takeaway", "Second most important takeaway", "Third takeaway"]
}`

  return generate(prompt)
}

export async function generateStudyGuide(text, title = '') {
  const prompt = `You are an expert tutor. Create a comprehensive study guide from the following content that will help a student ace an exam.
${title ? `Topic: ${title}\n` : ''}

Content:
"""
${text}
"""

CRITICAL FORMATTING RULES:
- Every string value must be plain prose. NO asterisks, NO markdown, NO bold (**), NO dashes (-) inside string values.
- Array items (bullets, questions, mistakes) must be complete sentences.

Respond ONLY with valid JSON, no markdown, no backticks:
{
  "title": "Study Guide: [Topic]",
  "overview": "3-4 sentence big-picture summary of what this material covers and why it matters",
  "sections": [
    {
      "heading": "Section Name",
      "content": "A paragraph explaining this concept clearly",
      "bullets": ["Supporting detail as a complete sentence", "Another supporting detail"]
    }
  ],
  "keyTerms": [
    { "term": "term name", "definition": "precise definition in one sentence" }
  ],
  "examQuestions": [
    "A likely exam question about this material?",
    "Another exam question testing deeper understanding?"
  ],
  "commonMistakes": [
    "A common error students make with this material, explained clearly",
    "Another common misconception students have"
  ],
  "summary": "A 2-sentence reminder of the most critical things to remember"
}`

  return generate(prompt)
}

export async function generateFlashcards(text, title = '') {
  const prompt = `You are a study flashcard expert. Create 15-25 high-quality flashcards from the following content. Each card should test one specific concept, term, or fact.
${title ? `Topic: ${title}\n` : ''}

Content:
"""
${text}
"""

CRITICAL FORMATTING RULES:
- Every string value must be plain prose. NO asterisks, NO markdown, NO bold (**), NO dashes (-) inside string values.
- Fronts should be clear questions or prompts.
- Backs should be concise, memorable answers.

Respond ONLY with valid JSON, no markdown, no backticks:
{
  "topic": "topic name",
  "cards": [
    { "front": "What is [concept]?", "back": "Clear, concise answer in 1-2 sentences" },
    { "front": "Define [term]", "back": "The precise definition" }
  ]
}`

  return generate(prompt)
}

export async function generateFollowUp(question, originalContent, mode, history = []) {
  const historyText = history.slice(-6).map(m => `${m.role === 'user' ? 'Student' : 'Tutor'}: ${m.content}`).join('\n')
  const prompt = `You are an expert tutor helping a student understand their study material. Answer the student's follow-up question based on the content below.

Study material mode: ${mode}
Original content summary: ${JSON.stringify(originalContent).slice(0, 2000)}

${historyText ? `Conversation so far:\n${historyText}\n` : ''}
Student question: ${question}

Give a clear, helpful answer that references the specific content when possible. Be concise but thorough. Use plain prose — no markdown, no asterisks.

Respond ONLY with valid JSON, no markdown, no backticks:
{ "answer": "Your clear answer here as plain prose" }`

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
