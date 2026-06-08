import Database from 'better-sqlite3'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DB_PATH = process.env.DB_PATH || join(__dirname, '../../data/studenthub.db')

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
    CREATE INDEX IF NOT EXISTS idx_timer_sessions_assignment ON timer_sessions(assignment_id);
  `)
}
