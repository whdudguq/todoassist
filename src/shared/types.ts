// ============================================
// TodoAssist Shared Types
// Main Process <-> Renderer Process
// ============================================

/** Task priority levels */
export type Priority = 'urgent' | 'high' | 'medium' | 'low';

/** Task status */
export type TaskStatus = 'todo' | 'in_progress' | 'done' | 'cancelled';

/** Emotion types for tracking */
export type EmotionType =
  | 'happy'
  | 'calm'
  | 'anxious'
  | 'stressed'
  | 'sad'
  | 'frustrated'
  | 'motivated'
  | 'tired';

/** Task item */
export interface Task {
  id: string;
  parentId: string | null;
  title: string;
  description: string;
  status: TaskStatus;
  priority: Priority;
  tags: string[];
  estimatedMinutes: number | null;
  actualMinutes: number | null;
  dueDate: string | null; // ISO 8601
  createdAt: string;      // ISO 8601
  updatedAt: string;      // ISO 8601
  children?: Task[];
}

/** Time box session */
export interface TimeBox {
  id: string;
  taskId: string;
  startTime: string;  // ISO 8601
  endTime: string | null;
  plannedMinutes: number;
  breakMinutes: number;
  emotionBefore: EmotionType | null;
  emotionAfter: EmotionType | null;
  notes: string;
  createdAt: string;
}

/** AI chat message */
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string; // ISO 8601
}

/** AI conversation */
export interface Conversation {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: string;
  updatedAt: string;
}

/** App settings */
export interface AppSettings {
  theme: 'light' | 'dark' | 'system';
  language: 'ko' | 'en';
  claudeApiKey: string;
  defaultPomodoroMinutes: number;
  defaultBreakMinutes: number;
  notificationsEnabled: boolean;
}

/** Emotion log entry */
export interface EmotionLog {
  id: string;
  emotion: EmotionType;
  intensity: number; // 1-10
  note: string;
  taskId: string | null;
  createdAt: string;
}

/** Statistics data for charts */
export interface DailyStats {
  date: string;
  tasksCompleted: number;
  totalMinutes: number;
  averageEmotion: number;
}

/** IPC channel definitions */
export const IPC_CHANNELS = {
  TASKS: {
    GET_ALL: 'tasks:getAll',
    CREATE: 'tasks:create',
    UPDATE: 'tasks:update',
    DELETE: 'tasks:delete',
  },
  AI: {
    SEND_MESSAGE: 'ai:sendMessage',
  },
  SETTINGS: {
    GET: 'settings:get',
    UPDATE: 'settings:update',
  },
} as const;
