/**
 * @TASK P2-R1 - Task CRUD IPC Handlers
 * @SPEC docs/planning/04-database-design.md#Task
 *
 * Registers IPC handlers for Task CRUD operations.
 * Maps IPC_CHANNELS.TASKS to TaskCrudService methods.
 */

import { ipcMain } from 'electron';
import { IPC_CHANNELS } from '@shared/types';
import type { TaskStatus } from '@shared/types';
import {
  TaskCrudService,
  CreateTaskInput,
  TaskFilter,
  SortField,
} from '../services/task-crud';

/**
 * Register all Task IPC handlers
 *
 * @param service - TaskCrudService instance
 */
export function registerTaskHandlers(service: TaskCrudService): void {
  // @TASK P2-R1 - tasks:getAll
  ipcMain.handle(IPC_CHANNELS.TASKS.GET_ALL, () => {
    return service.getAllTasks();
  });

  // @TASK P2-R1 - tasks:getById
  ipcMain.handle(
    IPC_CHANNELS.TASKS.GET_BY_ID,
    (_event, id: string) => {
      return service.getTaskById(id);
    }
  );

  // @TASK P2-R1 - tasks:getChildren
  ipcMain.handle(
    IPC_CHANNELS.TASKS.GET_CHILDREN,
    (_event, parentId: string) => {
      return service.getChildTasks(parentId);
    }
  );

  // @TASK P2-R1 - tasks:create
  ipcMain.handle(
    IPC_CHANNELS.TASKS.CREATE,
    (_event, input: CreateTaskInput) => {
      return service.createTask(input);
    }
  );

  // @TASK P2-R1 - tasks:update
  ipcMain.handle(
    IPC_CHANNELS.TASKS.UPDATE,
    (
      _event,
      id: string,
      updates: Partial<CreateTaskInput & { progress: number; status: TaskStatus }>
    ) => {
      return service.updateTask(id, updates);
    }
  );

  // @TASK P2-R1 - tasks:delete
  ipcMain.handle(
    IPC_CHANNELS.TASKS.DELETE,
    (_event, id: string) => {
      return service.deleteTask(id);
    }
  );

  // @TASK P2-R1 - tasks:search
  ipcMain.handle(
    IPC_CHANNELS.TASKS.SEARCH,
    (_event, query: string) => {
      return service.searchTasks(query);
    }
  );
}
