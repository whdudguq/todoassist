/**
 * @TASK INT-1 - Encouragement IPC Handlers
 * @SPEC docs/planning/02-trd.md#Encouragement
 *
 * Registers IPC handlers for Encouragement operations.
 * Maps IPC_CHANNELS.ENCOURAGEMENT to EncouragementService methods.
 */

import { ipcMain } from 'electron';
import { IPC_CHANNELS } from '@shared/types';
import type { EncouragementType } from '@shared/types';
import type { Task } from '@shared/types';
import type {
  EncouragementService,
  EncouragementContext,
} from '../services/encouragement';

/**
 * Register all Encouragement IPC handlers
 *
 * @param service - EncouragementService instance
 */
export function registerEncouragementHandlers(
  service: EncouragementService,
): void {
  // @TASK INT-1 - encouragement:generate (async - calls Claude API)
  ipcMain.handle(
    IPC_CHANNELS.ENCOURAGEMENT.GENERATE,
    async (
      _event,
      task: Task,
      type: EncouragementType,
      context?: EncouragementContext,
    ) => {
      return service.generateMessage(task, type, context);
    },
  );

  // @TASK INT-1 - encouragement:getToday
  ipcMain.handle(IPC_CHANNELS.ENCOURAGEMENT.GET_TODAY, () => {
    return service.getTodayMessages();
  });
}
