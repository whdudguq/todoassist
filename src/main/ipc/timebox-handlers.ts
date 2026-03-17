/**
 * @TASK P3-R1 - TimeBox CRUD IPC Handlers
 * @SPEC docs/planning/04-database-design.md#TimeBox
 *
 * Registers IPC handlers for TimeBox CRUD operations.
 * Maps IPC_CHANNELS.TIMEBOX to TimeBoxCrudService methods.
 */

import { ipcMain } from 'electron';
import { IPC_CHANNELS } from '@shared/types';
import type { TimeBoxStatus } from '@shared/types';
import {
  TimeBoxCrudService,
  CreateTimeBoxInput,
} from '../services/timebox-crud';

/**
 * Register all TimeBox IPC handlers
 *
 * @param service - TimeBoxCrudService instance
 */
export function registerTimeBoxHandlers(service: TimeBoxCrudService): void {
  // @TASK P3-R1 - timebox:getByDate
  ipcMain.handle(
    IPC_CHANNELS.TIMEBOX.GET_BY_DATE,
    (_event, date: string) => {
      return service.getTimeBoxesByDate(date);
    }
  );

  // @TASK P3-R1 - timebox:create
  ipcMain.handle(
    IPC_CHANNELS.TIMEBOX.CREATE,
    (_event, input: CreateTimeBoxInput) => {
      return service.createTimeBox(input);
    }
  );

  // @TASK P3-R1 - timebox:update
  ipcMain.handle(
    IPC_CHANNELS.TIMEBOX.UPDATE,
    (
      _event,
      id: string,
      updates: Partial<{ startSlot: number; endSlot: number; status: TimeBoxStatus }>
    ) => {
      return service.updateTimeBox(id, updates);
    }
  );

  // @TASK P3-R1 - timebox:delete
  ipcMain.handle(
    IPC_CHANNELS.TIMEBOX.DELETE,
    (_event, id: string) => {
      return service.deleteTimeBox(id);
    }
  );
}
