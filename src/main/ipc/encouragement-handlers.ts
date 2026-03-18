/**
 * @TASK INT-1 - Encouragement IPC Handlers
 * Uses getter function so service can be reinitialized at runtime.
 */

import { ipcMain } from 'electron';
import { IPC_CHANNELS } from '@shared/types';
import type { EncouragementType } from '@shared/types';
import type { Task } from '@shared/types';
import type {
  EncouragementService,
  EncouragementContext,
} from '../services/encouragement';

export function registerEncouragementHandlers(
  getService: () => EncouragementService | null,
): void {
  ipcMain.handle(
    IPC_CHANNELS.ENCOURAGEMENT.GENERATE,
    async (
      _event,
      task: Task,
      type: EncouragementType,
      context?: EncouragementContext,
    ) => {
      const service = getService();
      if (!service) throw new Error('API 키가 설정되지 않았습니다.');
      return service.generateMessage(task, type, context);
    },
  );

  ipcMain.handle(IPC_CHANNELS.ENCOURAGEMENT.GET_TODAY, () => {
    const service = getService();
    if (!service) return [];
    return service.getTodayMessages();
  });
}
