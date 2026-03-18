/**
 * @TASK P-REFLECTION - Reflection IPC Handlers
 * @SPEC docs/planning/04-database-design.md#DailyReflection
 *
 * Registers IPC handlers for DailyReflection operations.
 * Maps IPC_CHANNELS.REFLECTION to ReflectionCrudService methods.
 */

import { ipcMain } from 'electron';
import { IPC_CHANNELS } from '@shared/types';
import type { ReflectionCrudService } from '../services/reflection-crud';

/**
 * Register all Reflection IPC handlers
 *
 * @param service - ReflectionCrudService instance
 */
export function registerReflectionHandlers(service: ReflectionCrudService): void {
  // @TASK P-REFLECTION - reflection:getByDate
  ipcMain.handle(IPC_CHANNELS.REFLECTION.GET_BY_DATE, (_event, date: string) => {
    return service.getByDate(date);
  });

  // @TASK P-REFLECTION - reflection:upsert
  ipcMain.handle(
    IPC_CHANNELS.REFLECTION.UPSERT,
    (_event, date: string, updates: Record<string, unknown>) => {
      return service.upsert(date, updates);
    },
  );
}
