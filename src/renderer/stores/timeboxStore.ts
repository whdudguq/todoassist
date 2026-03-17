// @TASK P3-S2 - Timebox state management store
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { TimeBox } from '../../shared/types';

interface TimeBoxState {
  timeboxes: TimeBox[];
  selectedDate: string; // 'YYYY-MM-DD', default today
  isLoading: boolean;
}

interface TimeBoxActions {
  setTimeboxes: (timeboxes: TimeBox[]) => void;
  addTimebox: (timebox: TimeBox) => void;
  updateTimebox: (id: string, updates: Partial<TimeBox>) => void;
  deleteTimebox: (id: string) => void;
  setSelectedDate: (date: string) => void;
  setLoading: (isLoading: boolean) => void;
}

type TimeboxStore = TimeBoxState & TimeBoxActions;

function todayString(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

const initialState: TimeBoxState = {
  timeboxes: [],
  selectedDate: todayString(),
  isLoading: false,
};

export const useTimeboxStore = create<TimeboxStore>()(
  devtools(
    (set) => ({
      ...initialState,

      setTimeboxes: (timeboxes) => set({ timeboxes }),

      addTimebox: (timebox) =>
        set((state) => ({ timeboxes: [...state.timeboxes, timebox] })),

      updateTimebox: (id, updates) =>
        set((state) => ({
          timeboxes: state.timeboxes.map((tb) =>
            tb.id === id ? { ...tb, ...updates } : tb,
          ),
        })),

      deleteTimebox: (id) =>
        set((state) => ({
          timeboxes: state.timeboxes.filter((tb) => tb.id !== id),
        })),

      setSelectedDate: (selectedDate) => set({ selectedDate }),

      setLoading: (isLoading) => set({ isLoading }),
    }),
    { name: 'TimeboxStore', enabled: process.env.NODE_ENV === 'development' },
  ),
);
