import { contextBridge, ipcRenderer } from 'electron';

export interface ElectronAPI {
  // Tasks
  getTasks: () => Promise<unknown[]>;
  createTask: (task: unknown) => Promise<unknown>;
  updateTask: (id: string, updates: unknown) => Promise<unknown>;
  deleteTask: (id: string) => Promise<void>;

  // AI Chat
  sendMessage: (message: string) => Promise<unknown>;

  // Settings
  getSettings: () => Promise<unknown>;
  updateSettings: (settings: unknown) => Promise<unknown>;
}

const electronAPI: ElectronAPI = {
  // Tasks
  getTasks: () => ipcRenderer.invoke('tasks:getAll'),
  createTask: (task) => ipcRenderer.invoke('tasks:create', task),
  updateTask: (id, updates) => ipcRenderer.invoke('tasks:update', id, updates),
  deleteTask: (id) => ipcRenderer.invoke('tasks:delete', id),

  // AI Chat
  sendMessage: (message) => ipcRenderer.invoke('ai:sendMessage', message),

  // Settings
  getSettings: () => ipcRenderer.invoke('settings:get'),
  updateSettings: (settings) => ipcRenderer.invoke('settings:update', settings),
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);
