/**
 * @TASK P5-R1 - 통계 분석 서비스
 * @SPEC docs/planning/04-database-design.md#DailyStats
 *
 * AnalyticsService - Advanced analytics on DailyStats and Task data
 * - getCompletionRate: SUM(completedCount) / SUM(totalPlanned) * 100
 * - getCategoryTimeDistribution: aggregate categoryBreakdown JSON across date range
 * - getDeferralPattern: deferred tasks grouped by day-of-week and category deferral rate
 * - generateAiInsight: collect stats -> call ClaudeApiService.generateInsight
 */

import Database from 'better-sqlite3';
import type { DailyStats } from '@shared/types';
import type { ClaudeApiService } from './claude-api';

// ============================================
// Exported interfaces
// ============================================

export interface CategoryDistribution {
  [category: string]: number; // minutes
}

export interface DeferralPattern {
  byDayOfWeek: Record<string, number>; // e.g. { "Mon": 3, "Tue": 1 }
  byCategory: Record<string, number>;  // e.g. { "quality": 0.4 } (deferral rate)
}

// ============================================
// Internal row types
// ============================================

interface DailyStatsRow {
  id: string;
  date: string;
  completedCount: number;
  totalPlanned: number;
  deferredCount: number;
  totalMinutesUsed: number;
  categoryBreakdown: string | null;
  createdAt: number;
  updatedAt: number;
}

interface DeferralByDayRow {
  dayOfWeek: string; // '0'-'6' (Sunday=0)
  cnt: number;
}

interface DeferralByCategoryRow {
  category: string;
  deferredCount: number;
  totalCount: number;
}

// ============================================
// Day-of-week mapping: SQLite strftime('%w') -> short name
// ============================================

const DAY_NAMES: Record<string, string> = {
  '0': 'Sun',
  '1': 'Mon',
  '2': 'Tue',
  '3': 'Wed',
  '4': 'Thu',
  '5': 'Fri',
  '6': 'Sat',
};

// ============================================
// AnalyticsService
// ============================================

export class AnalyticsService {
  constructor(
    private db: Database.Database,
    private claudeService: ClaudeApiService,
  ) {}

  /**
   * Get completion rate as percentage for a date range
   * SUM(completedCount) / SUM(totalPlanned) * 100 from DailyStats
   * Returns 0 if totalPlanned is 0
   */
  getCompletionRate(startDate: string, endDate: string): number {
    const row = this.db.prepare(`
      SELECT
        COALESCE(SUM(completedCount), 0) as totalCompleted,
        COALESCE(SUM(totalPlanned), 0) as totalPlanned
      FROM DailyStats
      WHERE date >= ? AND date <= ?
    `).get(startDate, endDate) as { totalCompleted: number; totalPlanned: number };

    if (row.totalPlanned === 0) {
      return 0;
    }

    return Math.round((row.totalCompleted / row.totalPlanned) * 10000) / 100;
  }

  /**
   * Get category time distribution across a date range
   * Parses categoryBreakdown JSON from each DailyStats row and aggregates
   */
  getCategoryTimeDistribution(startDate: string, endDate: string): CategoryDistribution {
    const rows = this.db.prepare(`
      SELECT categoryBreakdown
      FROM DailyStats
      WHERE date >= ? AND date <= ?
    `).all(startDate, endDate) as Array<{ categoryBreakdown: string | null }>;

    const result: CategoryDistribution = {};

    for (const row of rows) {
      if (!row.categoryBreakdown) continue;

      let breakdown: Record<string, number>;
      try {
        breakdown = JSON.parse(row.categoryBreakdown);
      } catch {
        continue;
      }

      for (const [category, minutes] of Object.entries(breakdown)) {
        result[category] = (result[category] ?? 0) + minutes;
      }
    }

    return result;
  }

  /**
   * Get deferral pattern for a date range
   * - byDayOfWeek: count deferred tasks grouped by strftime('%w', updatedAt/1000, 'unixepoch')
   * - byCategory: deferred count per category / total count per category
   *
   * Only considers tasks whose updatedAt falls within the date range
   * and whose status is 'deferred'
   */
  getDeferralPattern(startDate: string, endDate: string): DeferralPattern {
    const startTs = new Date(`${startDate}T00:00:00Z`).getTime();
    const endTs = new Date(`${endDate}T23:59:59.999Z`).getTime();

    // byDayOfWeek: group deferred tasks by day of week
    const dayRows = this.db.prepare(`
      SELECT
        strftime('%w', updatedAt / 1000, 'unixepoch') as dayOfWeek,
        COUNT(*) as cnt
      FROM Task
      WHERE status = 'deferred'
        AND updatedAt >= ? AND updatedAt <= ?
      GROUP BY dayOfWeek
    `).all(startTs, endTs) as DeferralByDayRow[];

    const byDayOfWeek: Record<string, number> = {};
    for (const row of dayRows) {
      const dayName = DAY_NAMES[row.dayOfWeek];
      if (dayName) {
        byDayOfWeek[dayName] = row.cnt;
      }
    }

    // byCategory: deferral rate = deferred / total per category
    // Only consider categories that have at least one deferred task in the range
    const categoryRows = this.db.prepare(`
      SELECT
        t.category,
        SUM(CASE WHEN t.status = 'deferred' AND t.updatedAt >= ? AND t.updatedAt <= ? THEN 1 ELSE 0 END) as deferredCount,
        COUNT(*) as totalCount
      FROM Task t
      WHERE t.category IN (
        SELECT DISTINCT category
        FROM Task
        WHERE status = 'deferred'
          AND updatedAt >= ? AND updatedAt <= ?
      )
      GROUP BY t.category
    `).all(startTs, endTs, startTs, endTs) as DeferralByCategoryRow[];

    const byCategory: Record<string, number> = {};
    for (const row of categoryRows) {
      if (row.totalCount > 0) {
        byCategory[row.category] = row.deferredCount / row.totalCount;
      }
    }

    return { byDayOfWeek, byCategory };
  }

  /**
   * Generate AI insight by collecting stats and calling Claude API
   * Collects DailyStats for the date range, passes to ClaudeApiService.generateInsight
   */
  async generateAiInsight(
    startDate: string,
    endDate: string,
    period: 'weekly' | 'monthly',
  ): Promise<string> {
    const rows = this.db.prepare(`
      SELECT * FROM DailyStats
      WHERE date >= ? AND date <= ?
      ORDER BY date ASC
    `).all(startDate, endDate) as DailyStatsRow[];

    const stats: DailyStats[] = rows.map((row) => ({
      id: row.id,
      date: row.date,
      completedCount: row.completedCount ?? 0,
      totalPlanned: row.totalPlanned ?? 0,
      deferredCount: row.deferredCount ?? 0,
      totalMinutesUsed: row.totalMinutesUsed ?? 0,
      categoryBreakdown: row.categoryBreakdown ?? '{}',
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }));

    return this.claudeService.generateInsight(stats, period);
  }
}
