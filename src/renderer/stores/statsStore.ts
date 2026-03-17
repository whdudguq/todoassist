// @TASK P5-S5 - Statistics state management store
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

export type StatsPeriod = 'thisWeek' | 'lastWeek' | 'thisMonth' | 'lastMonth' | 'custom';

export interface StatsState {
  period: StatsPeriod;
  completionData: Array<{ date: string; rate: number }>;
  categoryData: Array<{ name: string; minutes: number; color: string }>;
  deferralData: Array<{ label: string; count: number }>;
  aiInsights: string[];
  accumulatedCompleted: number;
  customRange: { start: string; end: string } | null;
  isLoading: boolean;
}

interface StatsActions {
  setPeriod: (period: StatsPeriod) => void;
  setCompletionData: (data: StatsState['completionData']) => void;
  setCategoryData: (data: StatsState['categoryData']) => void;
  setDeferralData: (data: StatsState['deferralData']) => void;
  setAiInsights: (insights: string[]) => void;
  setAccumulatedCompleted: (count: number) => void;
  setCustomRange: (range: { start: string; end: string } | null) => void;
  setLoading: (isLoading: boolean) => void;
}

type StatsStore = StatsState & StatsActions;

const initialState: StatsState = {
  period: 'thisWeek',
  completionData: [],
  categoryData: [],
  deferralData: [],
  aiInsights: [],
  accumulatedCompleted: 0,
  customRange: null,
  isLoading: false,
};

export const useStatsStore = create<StatsStore>()(
  devtools(
    (set) => ({
      ...initialState,

      setPeriod: (period) => set({ period }),
      setCompletionData: (completionData) => set({ completionData }),
      setCategoryData: (categoryData) => set({ categoryData }),
      setDeferralData: (deferralData) => set({ deferralData }),
      setAiInsights: (aiInsights) => set({ aiInsights }),
      setAccumulatedCompleted: (accumulatedCompleted) => set({ accumulatedCompleted }),
      setCustomRange: (customRange) => set({ customRange }),
      setLoading: (isLoading) => set({ isLoading }),
    }),
    { name: 'StatsStore', enabled: process.env.NODE_ENV === 'development' },
  ),
);
