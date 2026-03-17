/**
 * @TASK P4-R1 - DailyStats 집계 서비스
 * @SPEC docs/planning/04-database-design.md#DailyStats
 *
 * DailyStatsService - Aggregation and persistence of daily statistics
 * - Aggregates completedCount, totalPlanned, deferredCount, totalMinutesUsed
 * - Category breakdown as JSON { category: minutes }
 * - Cumulative completed count (Eros: never decreases)
 * - Date range queries for analytics
 */

import Database from 'better-sqlite3';
import { randomUUID } from 'crypto';
import type { DailyStats } from '@shared/types';

// ============================================
// Row mapper: DB row -> DailyStats object
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

function rowToDailyStats(row: DailyStatsRow): DailyStats {
  return {
    id: row.id,
    date: row.date,
    completedCount: row.completedCount ?? 0,
    totalPlanned: row.totalPlanned ?? 0,
    deferredCount: row.deferredCount ?? 0,
    totalMinutesUsed: row.totalMinutesUsed ?? 0,
    categoryBreakdown: row.categoryBreakdown ?? '{}',
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

// ============================================
// DailyStatsService
// ============================================

export class DailyStatsService {
  constructor(private db: Database.Database) {}

  /**
   * Aggregate daily statistics from Task and TimeBox tables
   * - completedCount: tasks completed on the given date (by completedAt)
   * - totalPlanned: distinct tasks scheduled in TimeBox for the date
   * - deferredCount: tasks deferred on the given date (by updatedAt)
   * - totalMinutesUsed: sum of estimatedMinutes for completed tasks on the date
   */
  aggregateDaily(date: string): {
    completedCount: number;
    totalPlanned: number;
    deferredCount: number;
    totalMinutesUsed: number;
  } {
    // completedCount: tasks where completedAt falls on the given date
    const completedRow = this.db.prepare(`
      SELECT COUNT(*) as cnt, COALESCE(SUM(estimatedMinutes), 0) as totalMin
      FROM Task
      WHERE status = 'completed'
        AND date(completedAt / 1000, 'unixepoch') = ?
    `).get(date) as { cnt: number; totalMin: number };

    // totalPlanned: distinct taskIds from TimeBox for the date
    const plannedRow = this.db.prepare(`
      SELECT COUNT(DISTINCT taskId) as cnt
      FROM TimeBox
      WHERE date = ?
    `).get(date) as { cnt: number };

    // deferredCount: tasks deferred on the given date (by updatedAt)
    const deferredRow = this.db.prepare(`
      SELECT COUNT(*) as cnt
      FROM Task
      WHERE status = 'deferred'
        AND date(updatedAt / 1000, 'unixepoch') = ?
    `).get(date) as { cnt: number };

    return {
      completedCount: completedRow.cnt,
      totalPlanned: plannedRow.cnt,
      deferredCount: deferredRow.cnt,
      totalMinutesUsed: completedRow.totalMin,
    };
  }

  /**
   * Get category breakdown for completed tasks on a given date
   * Returns { category: totalMinutes } grouped by category
   */
  getCategoryBreakdown(date: string): Record<string, number> {
    const rows = this.db.prepare(`
      SELECT category, COALESCE(SUM(estimatedMinutes), 0) as totalMin
      FROM Task
      WHERE status = 'completed'
        AND date(completedAt / 1000, 'unixepoch') = ?
      GROUP BY category
    `).all(date) as Array<{ category: string; totalMin: number }>;

    const breakdown: Record<string, number> = {};
    for (const row of rows) {
      breakdown[row.category ?? ''] = row.totalMin;
    }
    return breakdown;
  }

  /**
   * Get existing DailyStats or create a new empty one for the date
   * Idempotent: calling multiple times returns the same record
   */
  getOrCreateDailyStats(date: string): DailyStats {
    const existing = this.db.prepare(
      'SELECT * FROM DailyStats WHERE date = ?'
    ).get(date) as DailyStatsRow | undefined;

    if (existing) {
      return rowToDailyStats(existing);
    }

    const id = randomUUID();
    const now = Date.now();

    this.db.prepare(`
      INSERT INTO DailyStats (
        id, date, completedCount, totalPlanned, deferredCount,
        totalMinutesUsed, categoryBreakdown, createdAt, updatedAt
      ) VALUES (?, ?, 0, 0, 0, 0, '{}', ?, ?)
    `).run(id, date, now, now);

    return this.getOrCreateDailyStats(date);
  }

  /**
   * Recalculate and persist daily stats for the given date
   * Creates a new record if none exists, updates existing otherwise
   */
  updateDailyStats(date: string): DailyStats {
    const stats = this.getOrCreateDailyStats(date);
    const aggregated = this.aggregateDaily(date);
    const breakdown = this.getCategoryBreakdown(date);
    const now = Date.now();

    this.db.prepare(`
      UPDATE DailyStats
      SET completedCount = ?,
          totalPlanned = ?,
          deferredCount = ?,
          totalMinutesUsed = ?,
          categoryBreakdown = ?,
          updatedAt = ?
      WHERE id = ?
    `).run(
      aggregated.completedCount,
      aggregated.totalPlanned,
      aggregated.deferredCount,
      aggregated.totalMinutesUsed,
      JSON.stringify(breakdown),
      now,
      stats.id,
    );

    const updated = this.db.prepare(
      'SELECT * FROM DailyStats WHERE id = ?'
    ).get(stats.id) as DailyStatsRow;

    return rowToDailyStats(updated);
  }

  /**
   * Get DailyStats for a date range (inclusive), ordered by date ASC
   */
  getStatsRange(startDate: string, endDate: string): DailyStats[] {
    const rows = this.db.prepare(`
      SELECT * FROM DailyStats
      WHERE date >= ? AND date <= ?
      ORDER BY date ASC
    `).all(startDate, endDate) as DailyStatsRow[];

    return rows.map(rowToDailyStats);
  }

  /**
   * Get accumulated completed count across all dates
   * Eros principle: this value is cumulative and never decreases
   * It represents the total number of tasks ever completed
   */
  getAccumulatedCompletedCount(): number {
    const row = this.db.prepare(
      'SELECT COALESCE(SUM(completedCount), 0) as total FROM DailyStats'
    ).get() as { total: number };

    return row.total;
  }
}
