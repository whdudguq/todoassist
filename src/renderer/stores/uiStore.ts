// @TASK P0-T0.4 - UI state management store
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

export type PageRoute = 'dashboard' | 'calendar' | 'taskTree' | 'statistics' | 'settings';

interface UiState {
  sidebarOpen: boolean;
  aiAssistantOpen: boolean;
  currentPage: PageRoute;
  modalOpen: string | null;
  theme: 'light' | 'dark';
}

interface UiActions {
  toggleSidebar: () => void;
  toggleAiAssistant: () => void;
  setCurrentPage: (page: PageRoute) => void;
  openModal: (modalId: string) => void;
  closeModal: () => void;
  setTheme: (theme: 'light' | 'dark') => void;
}

type UiStore = UiState & UiActions;

const initialState: UiState = {
  sidebarOpen: true,
  aiAssistantOpen: false,
  currentPage: 'dashboard',
  modalOpen: null,
  theme: 'dark',
};

export const useUiStore = create<UiStore>()(
  devtools(
    (set) => ({
      ...initialState,

      toggleSidebar: () =>
        set((state) => ({ sidebarOpen: !state.sidebarOpen })),

      toggleAiAssistant: () =>
        set((state) => ({ aiAssistantOpen: !state.aiAssistantOpen })),

      setCurrentPage: (page) => set({ currentPage: page }),

      openModal: (modalId) => set({ modalOpen: modalId }),

      closeModal: () => set({ modalOpen: null }),

      setTheme: (theme) => set({ theme }),
    }),
    { name: 'UiStore', enabled: process.env.NODE_ENV === 'development' }
  )
);
