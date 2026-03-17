/**
 * @TASK INT-1 - Stats IPC Handlers
 * @SPEC docs/planning/04-database-design.md#DailyStats
 *
 * Registers IPC handlers for Stats operations.
 * Maps IPC_CHANNELS.STATS to DailyStatsService and AnalyticsService methods.
 */

import { ipcMain } from 'electron';
import { IPC_CHANNELS } from '@shared/types';
import type { DailyStatsService } from '../services/daily-stats';
import type { AnalyticsService } from '../services/analytics';

/**
 * Register all Stats IPC handlers
 *
 * @param statsService - DailyStatsService instance
 * @param analyticsService - AnalyticsService instance
 */
export function registerStatsHandlers(
  statsService: DailyStatsService,
  analyticsService: AnalyticsService | null,
): void {
  // @TASK INT-1 - stats:getDaily
  ipcMain.handle(IPC_CHANNELS.STATS.GET_DAILY, (_event, date: string) => {
    return statsService.getOrCreateDailyStats(date);
  });

  // @TASK INT-1 - stats:getRange
  ipcMain.handle(
    IPC_CHANNELS.STATS.GET_RANGE,
    (_event, startDate: string, endDate: string) => {
      return statsService.getStatsRange(startDate, endDate);
    },
  );

  // @TASK INT-1 - stats:aiInsights (async - calls Claude API)
  ipcMain.handle(
    IPC_CHANNELS.STATS.AI_INSIGHTS,
    async (
      _event,
      startDate: string,
      endDate: string,
      period: 'weekly' | 'monthly',
    ) => {
      if (!analyticsService) {
        throw new Error('AI features are not available. Please set a Claude API key in Settings.');
      }
      return analyticsService.generateAiInsight(startDate, endDate, period);
    },
  );
}
