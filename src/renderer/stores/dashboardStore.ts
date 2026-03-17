// @TASK P4-S1 - Dashboard state management store
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { DailyStats, Task } from '../../shared/types';

export interface DashboardState {
  dailyStats: DailyStats | null;
  todayTasks: Task[];
  aiGreeting: string;
  accumulatedCompleted: number; // Eros: never decreases
  weeklyData: Array<{ date: string; completionRate: number }>;
  isLoading: boolean;
}

interface DashboardActions {
  setDailyStats: (stats: DailyStats | null) => void;
  setTodayTasks: (tasks: Task[]) => void;
  setAiGreeting: (greeting: string) => void;
  setAccumulatedCompleted: (count: number) => void;
  setWeeklyData: (data: Array<{ date: string; completionRate: number }>) => void;
  setLoading: (isLoading: boolean) => void;
}

type DashboardStore = DashboardState & DashboardActions;

const initialState: DashboardState = {
  dailyStats: null,
  todayTasks: [],
  aiGreeting: '오늘 하루도 잘 해낼 수 있어요!',
  accumulatedCompleted: 0,
  weeklyData: [],
  isLoading: false,
};

export const useDashboardStore = create<DashboardStore>()(
  devtools(
    (set) => ({
      ...initialState,

      setDailyStats: (dailyStats) => set({ dailyStats }),

      setTodayTasks: (todayTasks) => set({ todayTasks }),

      setAiGreeting: (aiGreeting) => set({ aiGreeting }),

      setAccumulatedCompleted: (accumulatedCompleted) => set({ accumulatedCompleted }),

      setWeeklyData: (weeklyData) => set({ weeklyData }),

      setLoading: (isLoading) => set({ isLoading }),
    }),
    { name: 'DashboardStore', enabled: process.env.NODE_ENV === 'development' },
  ),
);
