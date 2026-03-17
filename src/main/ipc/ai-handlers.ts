/**
 * @TASK INT-1 - AI IPC Handlers
 * @SPEC docs/planning/02-trd.md#AI-API
 *
 * Registers IPC handlers for AI operations.
 * Maps IPC_CHANNELS.AI to ClaudeApiService methods.
 * Maps IPC_CHANNELS.TIMEBOX.AI_GENERATE to AiScheduleService.
 */

import { ipcMain } from 'electron';
import { IPC_CHANNELS } from '@shared/types';
import type { Task } from '@shared/types';
import type { ClaudeApiService } from '../services/claude-api';
import type { AiScheduleService } from '../services/ai-schedule';

/**
 * Register all AI IPC handlers
 *
 * @param claudeService - ClaudeApiService instance
 * @param scheduleService - AiScheduleService instance
 */
export function registerAiHandlers(
  claudeService: ClaudeApiService,
  scheduleService: AiScheduleService,
): void {
  // @TASK INT-1 - ai:estimateTask (async - calls Claude API)
  ipcMain.handle(
    IPC_CHANNELS.AI.ESTIMATE_TASK,
    async (_event, title: string, description?: string) => {
      return claudeService.estimateTaskMetadata(title, description);
    },
  );

  // @TASK INT-1 - ai:splitTask (async - calls Claude API)
  ipcMain.handle(
    IPC_CHANNELS.AI.SPLIT_TASK,
    async (_event, task: Task) => {
      return claudeService.splitTask(task);
    },
  );

  // @TASK INT-1 - ai:chat (async - calls Claude API)
  ipcMain.handle(
    IPC_CHANNELS.AI.CHAT,
    async (_event, userMessage: string, context?: string) => {
      return claudeService.chat(userMessage, context);
    },
  );

  // @TASK INT-1 - timebox:aiGenerate (async - calls AI Schedule Service)
  ipcMain.handle(
    IPC_CHANNELS.TIMEBOX.AI_GENERATE,
    async (_event, date: string, workStartSlot?: number, workEndSlot?: number) => {
      return scheduleService.generateAiSchedule(date, workStartSlot, workEndSlot);
    },
  );
}
