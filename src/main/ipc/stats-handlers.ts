/**
 * @TASK INT-1 - Stats IPC Handlers
 * Uses getter for analyticsService so it can be reinitialized at runtime.
 */

import { ipcMain } from 'electron';
import { IPC_CHANNELS } from '@shared/types';
import type { DailyStatsService } from '../services/daily-stats';
import type { AnalyticsService } from '../services/analytics';

export function registerStatsHandlers(
  statsService: DailyStatsService,
  getAnalytics: () => AnalyticsService | null,
): void {
  ipcMain.handle(IPC_CHANNELS.STATS.GET_DAILY, (_event, date: string) => {
    return statsService.getOrCreateDailyStats(date);
  });

  ipcMain.handle(
    IPC_CHANNELS.STATS.GET_RANGE,
    (_event, startDate: string, endDate: string) => {
      return statsService.getStatsRange(startDate, endDate);
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.STATS.AI_INSIGHTS,
    async (
      _event,
      startDate: string,
      endDate: string,
      period: 'weekly' | 'monthly',
    ) => {
      const analytics = getAnalytics();
      if (!analytics) {
        throw new Error('API 키가 설정되지 않았습니다.');
      }
      return analytics.generateAiInsight(startDate, endDate, period);
    },
  );
}
