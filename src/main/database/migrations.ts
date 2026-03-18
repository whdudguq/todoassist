/**
 * Database migration system
 * - All SQL is inline (no external file dependency)
 * - Tracks migration version in _migrations table
 * - Executes in transactions
 */

import Database from 'better-sqlite3';

interface MigrationRecord {
  version: number;
  appliedAt: number;
}

function ensureMigrationsTable(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS _migrations (
      version INTEGER PRIMARY KEY,
      appliedAt INTEGER NOT NULL
    )
  `);
}

function getCurrentVersion(db: Database.Database): number {
  const result = db.prepare('SELECT MAX(version) as maxVersion FROM _migrations').get() as {
    maxVersion: number | null;
  };
  return result.maxVersion || 0;
}

function recordMigration(db: Database.Database, version: number): void {
  db.prepare('INSERT INTO _migrations (version, appliedAt) VALUES (?, ?)').run(
    version,
    Date.now()
  );
}

/** Version 1: Full initial schema (inline) */
const V1_SCHEMA = `
CREATE TABLE IF NOT EXISTS Task (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  deadline INTEGER,
  estimatedMinutes INTEGER,
  importance INTEGER DEFAULT 3,
  category TEXT,
  relatedClass TEXT,
  parentId TEXT,
  status TEXT NOT NULL,
  progress INTEGER DEFAULT 0,
  templateId TEXT,
  createdAt INTEGER NOT NULL,
  updatedAt INTEGER NOT NULL,
  completedAt INTEGER,
  FOREIGN KEY (parentId) REFERENCES Task(id) ON DELETE CASCADE,
  CHECK (importance >= 1 AND importance <= 5),
  CHECK (progress >= 0 AND progress <= 100),
  CHECK (status IN ('pending', 'in_progress', 'completed', 'deferred'))
);
CREATE INDEX IF NOT EXISTS idx_task_deadline ON Task(deadline);
CREATE INDEX IF NOT EXISTS idx_task_status ON Task(status);
CREATE INDEX IF NOT EXISTS idx_task_category ON Task(category);
CREATE INDEX IF NOT EXISTS idx_task_parentId ON Task(parentId);
CREATE INDEX IF NOT EXISTS idx_task_createdAt ON Task(createdAt DESC);
CREATE INDEX IF NOT EXISTS idx_task_completedAt ON Task(completedAt DESC);

CREATE TABLE IF NOT EXISTS TimeBox (
  id TEXT PRIMARY KEY,
  taskId TEXT NOT NULL,
  date TEXT NOT NULL,
  startSlot INTEGER NOT NULL,
  endSlot INTEGER NOT NULL,
  status TEXT NOT NULL,
  aiSuggested INTEGER DEFAULT 0,
  createdAt INTEGER NOT NULL,
  updatedAt INTEGER NOT NULL,
  FOREIGN KEY (taskId) REFERENCES Task(id) ON DELETE CASCADE,
  CHECK (startSlot >= 0 AND startSlot <= 47),
  CHECK (endSlot >= 0 AND endSlot <= 47),
  CHECK (startSlot <= endSlot),
  CHECK (status IN ('scheduled', 'in_progress', 'completed', 'skipped'))
);
CREATE INDEX IF NOT EXISTS idx_timebox_taskId ON TimeBox(taskId);
CREATE INDEX IF NOT EXISTS idx_timebox_date ON TimeBox(date);
CREATE INDEX IF NOT EXISTS idx_timebox_date_slot ON TimeBox(date, startSlot, endSlot);
CREATE UNIQUE INDEX IF NOT EXISTS idx_timebox_no_overlap ON TimeBox(date, startSlot) WHERE status != 'skipped';

CREATE TABLE IF NOT EXISTS Encouragement (
  id TEXT PRIMARY KEY,
  taskId TEXT NOT NULL,
  type TEXT NOT NULL,
  message TEXT NOT NULL,
  tone TEXT NOT NULL,
  createdAt INTEGER NOT NULL,
  FOREIGN KEY (taskId) REFERENCES Task(id) ON DELETE CASCADE,
  CHECK (type IN ('start', 'complete', 'milestone', 'nudge', 'morning')),
  CHECK (tone IN ('warm', 'urgent', 'humorous', 'professional'))
);
CREATE INDEX IF NOT EXISTS idx_encouragement_taskId ON Encouragement(taskId);
CREATE INDEX IF NOT EXISTS idx_encouragement_type ON Encouragement(type);
CREATE INDEX IF NOT EXISTS idx_encouragement_createdAt ON Encouragement(createdAt DESC);

CREATE TABLE IF NOT EXISTS Category (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  color TEXT NOT NULL,
  icon TEXT NOT NULL,
  createdAt INTEGER NOT NULL,
  CHECK (color LIKE '#%')
);

CREATE TABLE IF NOT EXISTS Template (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  taskTree TEXT NOT NULL,
  category TEXT,
  createdAt INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS Setting (
  id TEXT PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS DailyStats (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL UNIQUE,
  completedCount INTEGER DEFAULT 0,
  totalPlanned INTEGER DEFAULT 0,
  deferredCount INTEGER DEFAULT 0,
  totalMinutesUsed INTEGER DEFAULT 0,
  categoryBreakdown TEXT,
  createdAt INTEGER NOT NULL,
  updatedAt INTEGER NOT NULL
);

INSERT OR IGNORE INTO Category (id, name, color, icon, createdAt) VALUES
  ('cat-001', '품질검사', '#FF6B6B', 'check_circle', 1710953200000),
  ('cat-002', '보고서', '#4ECDC4', 'file_text', 1710953200000),
  ('cat-003', '회의', '#45B7D1', 'users', 1710953200000),
  ('cat-004', '이메일', '#FFA07A', 'mail', 1710953200000),
  ('cat-005', '기타', '#95A5A6', 'bookmark', 1710953200000);

INSERT OR IGNORE INTO Setting (id, key, value) VALUES
  ('set-001', 'workStartHour', '8'),
  ('set-002', 'workEndHour', '17'),
  ('set-003', 'workStartMinute', '30'),
  ('set-004', 'workEndMinute', '30'),
  ('set-005', 'aiTone', '"warm"'),
  ('set-006', 'notificationEnabled', 'true'),
  ('set-007', 'soundEnabled', 'true'),
  ('set-008', 'claudeApiKey', '""'),
  ('set-009', 'darkMode', 'false'),
  ('set-010', 'language', '"ko"');
`;

/** Version 2: DailyReflection table */
const V2_REFLECTION = `
CREATE TABLE IF NOT EXISTS DailyReflection (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL,
  gratitude TEXT,
  feedbackStart TEXT,
  feedbackMid TEXT,
  feedbackEnd TEXT,
  createdAt INTEGER NOT NULL,
  updatedAt INTEGER NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_reflection_date ON DailyReflection(date);
`;

export function runMigrations(db: Database.Database): void {
  try {
    ensureMigrationsTable(db);
    const currentVersion = getCurrentVersion(db);
    const targetVersion = 2;

    if (currentVersion >= targetVersion) return;

    if (currentVersion < 1) {
      db.transaction(() => {
        db.exec(V1_SCHEMA);
        recordMigration(db, 1);
      })();
      console.log('[Migration] Applied version 1 (initial schema)');
    }

    if (currentVersion < 2) {
      db.transaction(() => {
        db.exec(V2_REFLECTION);
        recordMigration(db, 2);
      })();
      console.log('[Migration] Applied version 2 (DailyReflection)');
    }
  } catch (error) {
    console.error('[Migration] Error:', error);
    throw error;
  }
}

export function isMigrationComplete(db: Database.Database): boolean {
  try {
    ensureMigrationsTable(db);
    return getCurrentVersion(db) >= 2;
  } catch {
    return false;
  }
}

export function getMigrationStatus(db: Database.Database): {
  currentVersion: number;
  targetVersion: number;
  isComplete: boolean;
  appliedMigrations: MigrationRecord[];
} {
  try {
    ensureMigrationsTable(db);
    const currentVersion = getCurrentVersion(db);
    return {
      currentVersion,
      targetVersion: 2,
      isComplete: currentVersion >= 2,
      appliedMigrations: db.prepare('SELECT version, appliedAt FROM _migrations ORDER BY version').all() as MigrationRecord[],
    };
  } catch {
    return { currentVersion: 0, targetVersion: 2, isComplete: false, appliedMigrations: [] };
  }
}
