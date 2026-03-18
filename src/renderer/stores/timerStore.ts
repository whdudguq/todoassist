import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

export interface TimerEntry {
  taskId: string;
  startedAt: number;       // 최초 시작 시각
  lastResumedAt: number;   // 마지막 재개 시각
  accumulatedMs: number;   // 정지 제외 누적 시간 (ms)
  isPaused: boolean;
  pauseReason: string | null;
  pauseHistory: Array<{ pausedAt: number; resumedAt: number | null; reason: string }>;
}

interface TimerState {
  timers: Record<string, TimerEntry>; // taskId -> TimerEntry
}

interface TimerActions {
  startTimer: (taskId: string) => void;
  pauseTimer: (taskId: string, reason: string) => void;
  resumeTimer: (taskId: string) => void;
  stopTimer: (taskId: string) => void;
  getActiveTime: (taskId: string) => number; // 정지 제외 실제 작업 시간 (ms)
}

type TimerStore = TimerState & TimerActions;

export const useTimerStore = create<TimerStore>()(
  devtools(
    (set, get) => ({
      timers: {},

      startTimer: (taskId) => {
        const now = Date.now();
        set((state) => ({
          timers: {
            ...state.timers,
            [taskId]: {
              taskId,
              startedAt: now,
              lastResumedAt: now,
              accumulatedMs: 0,
              isPaused: false,
              pauseReason: null,
              pauseHistory: [],
            },
          },
        }));
      },

      pauseTimer: (taskId, reason) => {
        const now = Date.now();
        set((state) => {
          const timer = state.timers[taskId];
          if (!timer || timer.isPaused) return state;

          const sessionMs = now - timer.lastResumedAt;
          return {
            timers: {
              ...state.timers,
              [taskId]: {
                ...timer,
                accumulatedMs: timer.accumulatedMs + sessionMs,
                isPaused: true,
                pauseReason: reason,
                pauseHistory: [
                  ...timer.pauseHistory,
                  { pausedAt: now, resumedAt: null, reason },
                ],
              },
            },
          };
        });
      },

      resumeTimer: (taskId) => {
        const now = Date.now();
        set((state) => {
          const timer = state.timers[taskId];
          if (!timer || !timer.isPaused) return state;

          const history = [...timer.pauseHistory];
          if (history.length > 0) {
            history[history.length - 1] = {
              ...history[history.length - 1],
              resumedAt: now,
            };
          }

          return {
            timers: {
              ...state.timers,
              [taskId]: {
                ...timer,
                lastResumedAt: now,
                isPaused: false,
                pauseReason: null,
                pauseHistory: history,
              },
            },
          };
        });
      },

      stopTimer: (taskId) => {
        set((state) => {
          const newTimers = { ...state.timers };
          delete newTimers[taskId];
          return { timers: newTimers };
        });
      },

      getActiveTime: (taskId) => {
        const timer = get().timers[taskId];
        if (!timer) return 0;
        if (timer.isPaused) return timer.accumulatedMs;
        return timer.accumulatedMs + (Date.now() - timer.lastResumedAt);
      },
    }),
    { name: 'TimerStore', enabled: process.env.NODE_ENV === 'development' }
  )
);
