import Database from 'better-sqlite3'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DB_PATH = process.env.DB_PATH || join(__dirname, '../../data/cramr.db')

let db

export function getDb() {
  if (!db) {
    db = new Database(DB_PATH)
    db.pragma('journal_mode = WAL')
    db.pragma('foreign_keys = ON')
    initSchema(db)
  }
  return db
}

function initSchema(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL DEFAULT '',
      created_at INTEGER NOT NULL DEFAULT (unixepoch())
    );

    CREATE TABLE IF NOT EXISTS subjects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      color TEXT NOT NULL DEFAULT '#6366f1',
      icon TEXT,
      created_at INTEGER NOT NULL DEFAULT (unixepoch())
    );

    CREATE TABLE IF NOT EXISTS assignments (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      subject_id TEXT REFERENCES subjects(id) ON DELETE SET NULL,
      type TEXT NOT NULL DEFAULT 'assignment'
        CHECK(type IN ('assignment','exam','essay','problem_set','reading','project','quiz','lab')),
      difficulty TEXT NOT NULL DEFAULT 'medium'
        CHECK(difficulty IN ('low','medium','high')),
      status TEXT NOT NULL DEFAULT 'pending'
        CHECK(status IN ('pending','in_progress','completed','overdue')),
      due_date INTEGER,
      due_time TEXT,
      estimated_hours REAL,
      actual_hours REAL,
      priority INTEGER DEFAULT 0,
      grade_weight REAL,
      notes TEXT,
      url TEXT,
      is_recurring INTEGER DEFAULT 0,
      recur_pattern TEXT,
      created_at INTEGER NOT NULL DEFAULT (unixepoch()),
      updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
      completed_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS subtasks (
      id TEXT PRIMARY KEY,
      assignment_id TEXT NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      completed INTEGER DEFAULT 0,
      position INTEGER DEFAULT 0,
      created_at INTEGER NOT NULL DEFAULT (unixepoch())
    );

    CREATE TABLE IF NOT EXISTS timer_sessions (
      id TEXT PRIMARY KEY,
      assignment_id TEXT REFERENCES assignments(id) ON DELETE SET NULL,
      started_at INTEGER NOT NULL,
      ended_at INTEGER,
      duration_minutes INTEGER,
      session_type TEXT DEFAULT 'focus'
        CHECK(session_type IN ('focus','short_break','long_break'))
    );

    CREATE TABLE IF NOT EXISTS courses (
      id TEXT PRIMARY KEY,
      subject_id TEXT REFERENCES subjects(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      target_grade REAL DEFAULT 90,
      current_gpa REAL,
      created_at INTEGER NOT NULL DEFAULT (unixepoch())
    );

    CREATE TABLE IF NOT EXISTS grade_components (
      id TEXT PRIMARY KEY,
      course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      weight REAL NOT NULL,
      earned_points REAL,
      max_points REAL,
      assignment_id TEXT REFERENCES assignments(id) ON DELETE SET NULL,
      created_at INTEGER NOT NULL DEFAULT (unixepoch())
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS user_settings (
      user_id TEXT NOT NULL,
      key TEXT NOT NULL,
      value TEXT NOT NULL,
      PRIMARY KEY (user_id, key)
    );

    CREATE TABLE IF NOT EXISTS study_plans (
      id TEXT PRIMARY KEY,
      generated_at INTEGER NOT NULL DEFAULT (unixepoch()),
      week_start INTEGER NOT NULL,
      plan_json TEXT NOT NULL
    );

    INSERT OR IGNORE INTO settings (key, value) VALUES
      ('accent_color', '#6366f1'),
      ('daily_study_hours', '6'),
      ('work_style', 'on_time'),
      ('theme', 'dark'),
      ('pomodoro_focus', '25'),
      ('pomodoro_short_break', '5'),
      ('pomodoro_long_break', '15'),
      ('semester_start', ''),
      ('semester_end', '');

    CREATE INDEX IF NOT EXISTS idx_assignments_due_date ON assignments(due_date);
    CREATE INDEX IF NOT EXISTS idx_assignments_subject ON assignments(subject_id);
    CREATE INDEX IF NOT EXISTS idx_assignments_status ON assignments(status);
    CREATE INDEX IF NOT EXISTS idx_subtasks_assignment ON subtasks(assignment_id);
    CREATE INDEX IF NOT EXISTS idx_grade_components_course ON grade_components(course_id);
    CREATE TABLE IF NOT EXISTS assignment_dependencies (
      id TEXT PRIMARY KEY,
      assignment_id TEXT NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
      depends_on_id TEXT NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
      created_at INTEGER NOT NULL DEFAULT (unixepoch()),
      UNIQUE(assignment_id, depends_on_id)
    );

    CREATE INDEX IF NOT EXISTS idx_timer_sessions_assignment ON timer_sessions(assignment_id);
    CREATE INDEX IF NOT EXISTS idx_deps_assignment ON assignment_dependencies(assignment_id);
    CREATE INDEX IF NOT EXISTS idx_deps_depends_on ON assignment_dependencies(depends_on_id);
  `)

  // Add user_id and session columns to existing DBs (safe no-op if they already exist)
  const sessionCols = [
    `ALTER TABLE assignments ADD COLUMN sessions_total INTEGER DEFAULT 1`,
    `ALTER TABLE assignments ADD COLUMN sessions_completed INTEGER DEFAULT 0`,
    `ALTER TABLE assignments ADD COLUMN session_duration_mins INTEGER`,
    `ALTER TABLE subjects ADD COLUMN user_id TEXT`,
    `ALTER TABLE assignments ADD COLUMN user_id TEXT`,
    `ALTER TABLE courses ADD COLUMN user_id TEXT`,
    `ALTER TABLE timer_sessions ADD COLUMN user_id TEXT`,
    `ALTER TABLE settings ADD COLUMN user_id TEXT`,
    `ALTER TABLE assignments ADD COLUMN progress INTEGER DEFAULT 0`,
    `ALTER TABLE courses ADD COLUMN credits INTEGER DEFAULT 3`,
    `ALTER TABLE courses ADD COLUMN semester TEXT`,
    `CREATE TABLE IF NOT EXISTS study_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  mode TEXT NOT NULL,
  result TEXT NOT NULL,
  source_preview TEXT,
  assignment_id TEXT,
  mastery TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
)`,
    `CREATE INDEX IF NOT EXISTS idx_study_sessions_user ON study_sessions(user_id)`,
    `CREATE TABLE IF NOT EXISTS extracurriculars (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'club',
  role TEXT,
  hours_per_week REAL DEFAULT 0,
  meeting_days TEXT,
  meeting_time TEXT,
  location TEXT,
  notes TEXT,
  color TEXT DEFAULT '#6366f1',
  active INTEGER DEFAULT 1,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
)`,
    `CREATE INDEX IF NOT EXISTS idx_extracurriculars_user ON extracurriculars(user_id)`,
    `CREATE TABLE IF NOT EXISTS applications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  company TEXT NOT NULL,
  role TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'internship',
  status TEXT NOT NULL DEFAULT 'applied',
  applied_date INTEGER,
  follow_up_date INTEGER,
  deadline INTEGER,
  url TEXT,
  notes TEXT,
  salary TEXT,
  location TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
)`,
    `CREATE INDEX IF NOT EXISTS idx_applications_user ON applications(user_id)`,
    `ALTER TABLE assignments ADD COLUMN tags TEXT DEFAULT '[]'`,
    `ALTER TABLE assignments ADD COLUMN recur_end INTEGER`,
    `ALTER TABLE courses ADD COLUMN drop_lowest INTEGER DEFAULT 0`,
    `CREATE TABLE IF NOT EXISTS assignment_templates (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  type TEXT DEFAULT 'assignment',
  difficulty TEXT DEFAULT 'medium',
  estimated_hours REAL,
  subject_id TEXT,
  notes TEXT,
  tags TEXT DEFAULT '[]',
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
)`,
    `CREATE INDEX IF NOT EXISTS idx_templates_user ON assignment_templates(user_id)`,
    `CREATE TABLE IF NOT EXISTS quiz_attempts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  topic TEXT NOT NULL,
  correct INTEGER NOT NULL DEFAULT 0,
  total INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
)`,
    `CREATE INDEX IF NOT EXISTS idx_quiz_attempts_user ON quiz_attempts(user_id)`,
    `ALTER TABLE timer_sessions ADD COLUMN subject_id TEXT`,
    `ALTER TABLE subjects ADD COLUMN professor TEXT`,
    `ALTER TABLE subjects ADD COLUMN room TEXT`,
    `ALTER TABLE subjects ADD COLUMN office_hours TEXT`,
  ]
  for (const sql of sessionCols) {
    try { db.exec(sql) } catch (_) {}
  }
}
