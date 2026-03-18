// @TASK P4-S2 - Daily Reflection state management store
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { DailyReflection } from '../../shared/types';

interface ReflectionState {
  reflection: DailyReflection | null;
  isLoading: boolean;
}

interface ReflectionActions {
  setReflection: (reflection: DailyReflection | null) => void;
  setLoading: (isLoading: boolean) => void;
}

type ReflectionStore = ReflectionState & ReflectionActions;

export const useReflectionStore = create<ReflectionStore>()(
  devtools(
    (set) => ({
      reflection: null,
      isLoading: false,
      setReflection: (reflection) => set({ reflection }),
      setLoading: (isLoading) => set({ isLoading }),
    }),
    { name: 'ReflectionStore', enabled: process.env.NODE_ENV === 'development' },
  ),
);
