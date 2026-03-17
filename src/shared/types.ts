// ============================================
// TodoAssist Shared Types
// Main Process <-> Renderer Process
// Aligned with docs/planning/04-database-design.md
// ============================================

/** Task status */
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'deferred';

/** TimeBox status */
export type TimeBoxStatus = 'scheduled' | 'in_progress' | 'completed' | 'skipped';

/** Encouragement message type */
export type EncouragementType = 'morning' | 'start' | 'complete' | 'nudge' | 'milestone';

/** AI message tone (Eros: emotion-aware) */
export type EncouragementTone = 'warm' | 'urgent' | 'humorous' | 'professional';

/** Importance level (1-5) */
export type Importance = 1 | 2 | 3 | 4 | 5;

/** Task item */
export interface Task {
  id: string;
  title: string;
  description: string;
  deadline: number | null;        // Unix timestamp (ms)
  estimatedMinutes: number;
  importance: Importance;
  category: string;
  relatedClass: string;
  parentId: string | null;        // Self-join for tree structure
  status: TaskStatus;
  progress: number;               // 0-100
  templateId: string | null;
  createdAt: number;              // Unix timestamp (ms)
  updatedAt: number;
  completedAt: number | null;
}

/** TimeBox (30-min schedule slot) */
export interface TimeBox {
  id: string;
  taskId: string;
  date: string;                   // 'YYYY-MM-DD'
  startSlot: number;              // 0-47
  endSlot: number;
  status: TimeBoxStatus;
  aiSuggested: boolean;
  createdAt: number;
  updatedAt: number;
}

/** AI encouragement message */
export interface Encouragement {
  id: string;
  taskId: string;
  type: EncouragementType;
  message: string;
  tone: EncouragementTone;
  createdAt: number;
}

/** Category */
export interface Category {
  id: string;
  name: string;
  color: string;                  // HEX color
  icon: string;
  createdAt: number;
}

/** Template (reusable task tree) */
export interface Template {
  id: string;
  name: string;
  description: string;
  taskTree: string;               // JSON tree structure
  category: string;
  createdAt: number;
}

/** App setting (key-value) */
export interface Setting {
  id: string;
  key: string;
  value: string;                  // JSON-encoded
}

/** Daily statistics */
export interface DailyStats {
  id: string;
  date: string;                   // 'YYYY-MM-DD'
  completedCount: number;
  totalPlanned: number;
  deferredCount: number;
  totalMinutesUsed: number;
  categoryBreakdown: string;      // JSON: { "category": minutes }
  createdAt: number;
  updatedAt: number;
}

/** Chat message (renderer-only) */
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  tone?: EncouragementTone;
  timestamp: number;
}

/** IPC channel definitions */
export const IPC_CHANNELS = {
  TASKS: {
    GET_ALL: 'tasks:getAll',
    GET_BY_ID: 'tasks:getById',
    GET_CHILDREN: 'tasks:getChildren',
    CREATE: 'tasks:create',
    UPDATE: 'tasks:update',
    DELETE: 'tasks:delete',
    SEARCH: 'tasks:search',
  },
  TIMEBOX: {
    GET_BY_DATE: 'timebox:getByDate',
    CREATE: 'timebox:create',
    UPDATE: 'timebox:update',
    DELETE: 'timebox:delete',
    AI_GENERATE: 'timebox:aiGenerate',
  },
  ENCOURAGEMENT: {
    GENERATE: 'encouragement:generate',
    GET_TODAY: 'encouragement:getToday',
  },
  CATEGORY: {
    GET_ALL: 'category:getAll',
    CREATE: 'category:create',
    UPDATE: 'category:update',
    DELETE: 'category:delete',
  },
  TEMPLATE: {
    GET_ALL: 'template:getAll',
    SAVE: 'template:save',
    LOAD: 'template:load',
    DELETE: 'template:delete',
  },
  STATS: {
    GET_DAILY: 'stats:getDaily',
    GET_RANGE: 'stats:getRange',
    AI_INSIGHTS: 'stats:aiInsights',
  },
  SETTINGS: {
    GET: 'settings:get',
    UPDATE: 'settings:update',
  },
  AI: {
    ESTIMATE_TASK: 'ai:estimateTask',
    SPLIT_TASK: 'ai:splitTask',
    CHAT: 'ai:chat',
  },
} as const;
