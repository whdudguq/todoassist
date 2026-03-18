/**
 * @TASK INT-1 - AI IPC Handlers
 * @SPEC docs/planning/02-trd.md#AI-API
 *
 * Registers IPC handlers for AI operations.
 * Uses getter functions so AI services can be reinitialized at runtime.
 */

import { ipcMain } from 'electron';
import { IPC_CHANNELS } from '@shared/types';
import type { Task } from '@shared/types';
import type { ClaudeApiService } from '../services/claude-api';
import type { AiScheduleService } from '../services/ai-schedule';

export function registerAiHandlers(
  getClaude: () => ClaudeApiService | null,
  getSchedule: () => AiScheduleService | null,
): void {
  ipcMain.handle(
    IPC_CHANNELS.AI.ESTIMATE_TASK,
    async (_event, title: string, description?: string) => {
      const claude = getClaude();
      if (!claude) throw new Error('API 키가 설정되지 않았습니다. 설정에서 API 키를 입력하고 저장하세요.');
      return claude.estimateTaskMetadata(title, description);
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.AI.SPLIT_TASK,
    async (_event, task: Task) => {
      const claude = getClaude();
      if (!claude) throw new Error('API 키가 설정되지 않았습니다.');
      return claude.splitTask(task);
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.AI.CHAT,
    async (_event, userMessage: string, context?: string) => {
      const claude = getClaude();
      if (!claude) throw new Error('API 키가 설정되지 않았습니다. 설정에서 API 키를 입력하고 저장하세요.');
      return claude.chat(userMessage, context);
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.TIMEBOX.AI_GENERATE,
    async (_event, date: string, workStartSlot?: number, workEndSlot?: number) => {
      const schedule = getSchedule();
      if (!schedule) throw new Error('API 키가 설정되지 않았습니다.');
      return schedule.generateAiSchedule(date, workStartSlot, workEndSlot);
    },
  );
}
