// @TASK INT-2 - Preload script: exposes all IPC channels to renderer via contextBridge
import { contextBridge, ipcRenderer } from 'electron';
import { IPC_CHANNELS } from '../shared/types';

const api = {
  tasks: {
    getAll: () => ipcRenderer.invoke(IPC_CHANNELS.TASKS.GET_ALL),
    getById: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.TASKS.GET_BY_ID, id),
    getChildren: (parentId: string) => ipcRenderer.invoke(IPC_CHANNELS.TASKS.GET_CHILDREN, parentId),
    create: (data: unknown) => ipcRenderer.invoke(IPC_CHANNELS.TASKS.CREATE, data),
    update: (id: string, updates: unknown) => ipcRenderer.invoke(IPC_CHANNELS.TASKS.UPDATE, id, updates),
    delete: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.TASKS.DELETE, id),
    search: (query: string) => ipcRenderer.invoke(IPC_CHANNELS.TASKS.SEARCH, query),
  },
  timebox: {
    getByDate: (date: string) => ipcRenderer.invoke(IPC_CHANNELS.TIMEBOX.GET_BY_DATE, date),
    create: (data: unknown) => ipcRenderer.invoke(IPC_CHANNELS.TIMEBOX.CREATE, data),
    update: (id: string, updates: unknown) => ipcRenderer.invoke(IPC_CHANNELS.TIMEBOX.UPDATE, id, updates),
    delete: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.TIMEBOX.DELETE, id),
    aiGenerate: (date: string, workStart?: number, workEnd?: number) =>
      ipcRenderer.invoke(IPC_CHANNELS.TIMEBOX.AI_GENERATE, date, workStart, workEnd),
  },
  encouragement: {
    generate: (task: unknown, type: string, context?: unknown) =>
      ipcRenderer.invoke(IPC_CHANNELS.ENCOURAGEMENT.GENERATE, task, type, context),
    getToday: () => ipcRenderer.invoke(IPC_CHANNELS.ENCOURAGEMENT.GET_TODAY),
  },
  category: {
    getAll: () => ipcRenderer.invoke(IPC_CHANNELS.CATEGORY.GET_ALL),
    create: (data: unknown) => ipcRenderer.invoke(IPC_CHANNELS.CATEGORY.CREATE, data),
    update: (id: string, updates: unknown) => ipcRenderer.invoke(IPC_CHANNELS.CATEGORY.UPDATE, id, updates),
    delete: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.CATEGORY.DELETE, id),
  },
  template: {
    getAll: () => ipcRenderer.invoke(IPC_CHANNELS.TEMPLATE.GET_ALL),
    save: (name: string, desc: string, tree: unknown) =>
      ipcRenderer.invoke(IPC_CHANNELS.TEMPLATE.SAVE, name, desc, tree),
    load: (id: string, parentId?: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.TEMPLATE.LOAD, id, parentId),
    delete: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.TEMPLATE.DELETE, id),
  },
  stats: {
    getDaily: (date: string) => ipcRenderer.invoke(IPC_CHANNELS.STATS.GET_DAILY, date),
    getRange: (start: string, end: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.STATS.GET_RANGE, start, end),
    aiInsights: (start: string, end: string, period: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.STATS.AI_INSIGHTS, start, end, period),
  },
  reflection: {
    getByDate: (date: string) => ipcRenderer.invoke(IPC_CHANNELS.REFLECTION.GET_BY_DATE, date),
    upsert: (date: string, updates: unknown) => ipcRenderer.invoke(IPC_CHANNELS.REFLECTION.UPSERT, date, updates),
  },
  settings: {
    get: (key: string) => ipcRenderer.invoke(IPC_CHANNELS.SETTINGS.GET, key),
    update: (key: string, value: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.SETTINGS.UPDATE, key, value),
  },
  ai: {
    estimateTask: (title: string, desc?: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.AI.ESTIMATE_TASK, title, desc),
    splitTask: (task: unknown) => ipcRenderer.invoke(IPC_CHANNELS.AI.SPLIT_TASK, task),
    chat: (message: string, context?: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.AI.CHAT, message, context),
  },
};

contextBridge.exposeInMainWorld('api', api);

export type ElectronApi = typeof api;
