// @TASK P0-T0.4 - Settings management store
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

interface SettingState {
  userName: string;
  workHoursStart: string;
  workHoursEnd: string;
  apiKey: string;
  notificationsEnabled: boolean;
  encouragementInterval: number;
  isApiValid: boolean;
}

interface SettingActions {
  updateSetting: <K extends keyof SettingState>(key: K, value: SettingState[K]) => void;
  setApiKey: (apiKey: string) => void;
  setApiValid: (isValid: boolean) => void;
  loadSettings: (settings: Partial<SettingState>) => void;
}

type SettingStore = SettingState & SettingActions;

const initialState: SettingState = {
  userName: '',
  workHoursStart: '09:00',
  workHoursEnd: '18:00',
  apiKey: '',
  notificationsEnabled: true,
  encouragementInterval: 2,
  isApiValid: false,
};

export const useSettingStore = create<SettingStore>()(
  devtools(
    (set) => ({
      ...initialState,

      updateSetting: (key, value) => set({ [key]: value }),

      setApiKey: (apiKey) => set({ apiKey, isApiValid: false }),

      setApiValid: (isApiValid) => set({ isApiValid }),

      loadSettings: (settings) => set({ ...settings }),
    }),
    { name: 'SettingStore', enabled: process.env.NODE_ENV === 'development' }
  )
);
