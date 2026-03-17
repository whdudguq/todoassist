// @TASK P0-T0.4 - Task state management store
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { Task, TaskStatus } from '../../shared/types';

export interface TaskFilter {
  category?: string;
  importance?: number[];
  status?: TaskStatus[];
  deadlineRange?: [number, number];
}

export type SortOption = 'createdAt' | 'deadline' | 'importance' | 'progress';

interface TaskState {
  tasks: Task[];
  selectedTaskId: string | null;
  filter: TaskFilter;
  sortBy: SortOption;
  searchQuery: string;
  isLoading: boolean;
}

interface TaskActions {
  setTasks: (tasks: Task[]) => void;
  addTask: (task: Task) => void;
  updateTask: (id: string, updates: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  setSelectedTask: (id: string | null) => void;
  setFilter: (filter: Partial<TaskFilter>) => void;
  setSortBy: (sortBy: SortOption) => void;
  setSearchQuery: (query: string) => void;
  setLoading: (isLoading: boolean) => void;
}

type TaskStore = TaskState & TaskActions;

const initialState: TaskState = {
  tasks: [],
  selectedTaskId: null,
  filter: {},
  sortBy: 'createdAt',
  searchQuery: '',
  isLoading: false,
};

export const useTaskStore = create<TaskStore>()(
  devtools(
    (set) => ({
      ...initialState,

      setTasks: (tasks) => set({ tasks }),

      addTask: (task) =>
        set((state) => ({ tasks: [...state.tasks, task] })),

      updateTask: (id, updates) =>
        set((state) => ({
          tasks: state.tasks.map((t) => (t.id === id ? { ...t, ...updates } : t)),
        })),

      deleteTask: (id) =>
        set((state) => ({
          tasks: state.tasks.filter((t) => t.id !== id),
          selectedTaskId: state.selectedTaskId === id ? null : state.selectedTaskId,
        })),

      setSelectedTask: (id) => set({ selectedTaskId: id }),

      setFilter: (filter) =>
        set((state) => ({ filter: { ...state.filter, ...filter } })),

      setSortBy: (sortBy) => set({ sortBy }),

      setSearchQuery: (searchQuery) => set({ searchQuery }),

      setLoading: (isLoading) => set({ isLoading }),
    }),
    { name: 'TaskStore', enabled: process.env.NODE_ENV === 'development' }
  )
);
