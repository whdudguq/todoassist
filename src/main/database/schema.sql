-- @TASK P1-R1 - DB 마이그레이션 + 스키마 생성 (TDD_MODE:RED_FIRST)
-- @SPEC docs/planning/04-database-design.md
--
-- TodoAssist Database Schema
-- All 7 tables with indexes and constraints

-- ============================================
-- 1. Task Table
-- ============================================
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

-- Task indexes
CREATE INDEX IF NOT EXISTS idx_task_deadline ON Task(deadline);
CREATE INDEX IF NOT EXISTS idx_task_status ON Task(status);
CREATE INDEX IF NOT EXISTS idx_task_category ON Task(category);
CREATE INDEX IF NOT EXISTS idx_task_parentId ON Task(parentId);
CREATE INDEX IF NOT EXISTS idx_task_createdAt ON Task(createdAt DESC);
CREATE INDEX IF NOT EXISTS idx_task_completedAt ON Task(completedAt DESC);

-- ============================================
-- 2. TimeBox Table
-- ============================================
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

-- TimeBox indexes
CREATE INDEX IF NOT EXISTS idx_timebox_taskId ON TimeBox(taskId);
CREATE INDEX IF NOT EXISTS idx_timebox_date ON TimeBox(date);
CREATE INDEX IF NOT EXISTS idx_timebox_date_slot ON TimeBox(date, startSlot, endSlot);
CREATE UNIQUE INDEX IF NOT EXISTS idx_timebox_no_overlap ON TimeBox(date, startSlot)
  WHERE status != 'skipped';

-- ============================================
-- 3. Encouragement Table
-- ============================================
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

-- Encouragement indexes
CREATE INDEX IF NOT EXISTS idx_encouragement_taskId ON Encouragement(taskId);
CREATE INDEX IF NOT EXISTS idx_encouragement_type ON Encouragement(type);
CREATE INDEX IF NOT EXISTS idx_encouragement_createdAt ON Encouragement(createdAt DESC);

-- ============================================
-- 4. Category Table
-- ============================================
CREATE TABLE IF NOT EXISTS Category (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  color TEXT NOT NULL,
  icon TEXT NOT NULL,
  createdAt INTEGER NOT NULL,

  CHECK (color LIKE '#%')
);

-- ============================================
-- 5. Template Table
-- ============================================
CREATE TABLE IF NOT EXISTS Template (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  taskTree TEXT NOT NULL,
  category TEXT,
  createdAt INTEGER NOT NULL
);

-- ============================================
-- 6. Setting Table
-- ============================================
CREATE TABLE IF NOT EXISTS Setting (
  id TEXT PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  value TEXT NOT NULL
);

-- ============================================
-- 7. DailyStats Table
-- ============================================
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

-- ============================================
-- Seed Data: Categories
-- ============================================
INSERT OR IGNORE INTO Category (id, name, color, icon, createdAt)
VALUES
  ('cat-001', '품질검사', '#FF6B6B', 'check_circle', 1710953200000),
  ('cat-002', '보고서', '#4ECDC4', 'file_text', 1710953200000),
  ('cat-003', '회의', '#45B7D1', 'users', 1710953200000),
  ('cat-004', '이메일', '#FFA07A', 'mail', 1710953200000),
  ('cat-005', '기타', '#95A5A6', 'bookmark', 1710953200000);

-- ============================================
-- Seed Data: Settings
-- ============================================
INSERT OR IGNORE INTO Setting (id, key, value)
VALUES
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
