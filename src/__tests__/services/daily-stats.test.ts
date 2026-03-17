/**
 * @TASK P4-R1 - DailyStats 집계 서비스 (TDD_MODE:RED_FIRST)
 * @SPEC docs/planning/04-database-design.md#DailyStats
 * @TEST src/__tests__/services/daily-stats.test.ts
 *
 * Tests for DailyStatsService
 * - aggregateDaily: completedCount, totalPlanned, deferredCount, totalMinutesUsed
 * - getCategoryBreakdown: JSON { category: minutes }
 * - getOrCreateDailyStats: idempotent create/get
 * - updateDailyStats: recalculate and persist
 * - getStatsRange: date range query
 * - getAccumulatedCompletedCount: cumulative, never decreases (Eros principle)
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { runMigrations } from '../../main/database/migrations';
import { DailyStatsService } from '../../main/services/daily-stats';
import { TaskCrudService } from '../../main/services/task-crud';
import { TimeBoxCrudService } from '../../main/services/timebox-crud';
import type { DailyStats } from '@shared/types';

// ============================================
// Helpers
// ============================================

/** Create a Unix timestamp (ms) for a given date string 'YYYY-MM-DD' at noon UTC */
function dateToTimestamp(dateStr: string): number {
  return new Date(`${dateStr}T12:00:00Z`).getTime();
}

describe('DailyStatsService', () => {
  let db: Database.Database;
  let statsService: DailyStatsService;
  let taskService: TaskCrudService;
  let timeboxService: TimeBoxCrudService;

  const TODAY = '2026-03-18';
  const YESTERDAY = '2026-03-17';

  beforeEach(() => {
    db = new Database(':memory:');
    db.pragma('foreign_keys = ON');
    runMigrations(db);
    statsService = new DailyStatsService(db);
    taskService = new TaskCrudService(db);
    timeboxService = new TimeBoxCrudService(db);
  });

  afterEach(() => {
    if (db) {
      db.close();
    }
  });

  // ============================================
  // aggregateDaily
  // ============================================
  describe('aggregateDaily', () => {
    it('should return zeros when no tasks exist for date', () => {
      const result = statsService.aggregateDaily(TODAY);
      expect(result.completedCount).toBe(0);
      expect(result.totalPlanned).toBe(0);
      expect(result.deferredCount).toBe(0);
      expect(result.totalMinutesUsed).toBe(0);
    });

    it('should count only tasks completed on the given date', () => {
      // Create and complete 2 tasks "today"
      const task1 = taskService.createTask({ title: 'Task 1', estimatedMinutes: 30, category: 'work' });
      const task2 = taskService.createTask({ title: 'Task 2', estimatedMinutes: 45, category: 'work' });
      const task3 = taskService.createTask({ title: 'Task 3', estimatedMinutes: 20, category: 'work' });

      // Complete task1 and task2 with completedAt on TODAY
      const todayTs = dateToTimestamp(TODAY);
      db.prepare('UPDATE Task SET status = ?, completedAt = ?, updatedAt = ? WHERE id = ?')
        .run('completed', todayTs, todayTs, task1.id);
      db.prepare('UPDATE Task SET status = ?, completedAt = ?, updatedAt = ? WHERE id = ?')
        .run('completed', todayTs, todayTs, task2.id);

      // Complete task3 with completedAt on YESTERDAY
      const yesterdayTs = dateToTimestamp(YESTERDAY);
      db.prepare('UPDATE Task SET status = ?, completedAt = ?, updatedAt = ? WHERE id = ?')
        .run('completed', yesterdayTs, yesterdayTs, task3.id);

      const result = statsService.aggregateDaily(TODAY);
      expect(result.completedCount).toBe(2);
    });

    it('should count totalPlanned as distinct taskIds from TimeBox for date', () => {
      const task1 = taskService.createTask({ title: 'Task 1' });
      const task2 = taskService.createTask({ title: 'Task 2' });

      // Create 2 timeboxes for task1, 1 for task2 on TODAY
      timeboxService.createTimeBox({ taskId: task1.id, date: TODAY, startSlot: 0, endSlot: 1 });
      timeboxService.createTimeBox({ taskId: task1.id, date: TODAY, startSlot: 2, endSlot: 3 });
      timeboxService.createTimeBox({ taskId: task2.id, date: TODAY, startSlot: 4, endSlot: 5 });

      // Create timebox on a different date (should not count)
      timeboxService.createTimeBox({ taskId: task1.id, date: YESTERDAY, startSlot: 0, endSlot: 1 });

      const result = statsService.aggregateDaily(TODAY);
      expect(result.totalPlanned).toBe(2); // 2 distinct tasks
    });

    it('should count deferredCount for tasks deferred on the given date', () => {
      const task1 = taskService.createTask({ title: 'Task 1' });
      const task2 = taskService.createTask({ title: 'Task 2' });
      const task3 = taskService.createTask({ title: 'Task 3' });

      // Defer task1 and task2 on TODAY
      const todayTs = dateToTimestamp(TODAY);
      db.prepare('UPDATE Task SET status = ?, updatedAt = ? WHERE id = ?')
        .run('deferred', todayTs, task1.id);
      db.prepare('UPDATE Task SET status = ?, updatedAt = ? WHERE id = ?')
        .run('deferred', todayTs, task2.id);

      // Defer task3 on YESTERDAY
      const yesterdayTs = dateToTimestamp(YESTERDAY);
      db.prepare('UPDATE Task SET status = ?, updatedAt = ? WHERE id = ?')
        .run('deferred', yesterdayTs, task3.id);

      const result = statsService.aggregateDaily(TODAY);
      expect(result.deferredCount).toBe(2);
    });

    it('should calculate totalMinutesUsed from completed tasks on the date', () => {
      const task1 = taskService.createTask({ title: 'Task 1', estimatedMinutes: 30, category: 'work' });
      const task2 = taskService.createTask({ title: 'Task 2', estimatedMinutes: 45, category: 'work' });

      const todayTs = dateToTimestamp(TODAY);
      db.prepare('UPDATE Task SET status = ?, completedAt = ?, updatedAt = ? WHERE id = ?')
        .run('completed', todayTs, todayTs, task1.id);
      db.prepare('UPDATE Task SET status = ?, completedAt = ?, updatedAt = ? WHERE id = ?')
        .run('completed', todayTs, todayTs, task2.id);

      const result = statsService.aggregateDaily(TODAY);
      expect(result.totalMinutesUsed).toBe(75); // 30 + 45
    });
  });

  // ============================================
  // getCategoryBreakdown
  // ============================================
  describe('getCategoryBreakdown', () => {
    it('should return empty object when no completed tasks', () => {
      const result = statsService.getCategoryBreakdown(TODAY);
      expect(result).toEqual({});
    });

    it('should group completed tasks by category and sum estimatedMinutes', () => {
      const task1 = taskService.createTask({ title: 'T1', estimatedMinutes: 30, category: 'work' });
      const task2 = taskService.createTask({ title: 'T2', estimatedMinutes: 45, category: 'work' });
      const task3 = taskService.createTask({ title: 'T3', estimatedMinutes: 20, category: 'personal' });

      const todayTs = dateToTimestamp(TODAY);
      db.prepare('UPDATE Task SET status = ?, completedAt = ?, updatedAt = ? WHERE id = ?')
        .run('completed', todayTs, todayTs, task1.id);
      db.prepare('UPDATE Task SET status = ?, completedAt = ?, updatedAt = ? WHERE id = ?')
        .run('completed', todayTs, todayTs, task2.id);
      db.prepare('UPDATE Task SET status = ?, completedAt = ?, updatedAt = ? WHERE id = ?')
        .run('completed', todayTs, todayTs, task3.id);

      const result = statsService.getCategoryBreakdown(TODAY);
      expect(result).toEqual({ work: 75, personal: 20 });
    });

    it('should not include tasks completed on other dates', () => {
      const task1 = taskService.createTask({ title: 'T1', estimatedMinutes: 30, category: 'work' });

      const yesterdayTs = dateToTimestamp(YESTERDAY);
      db.prepare('UPDATE Task SET status = ?, completedAt = ?, updatedAt = ? WHERE id = ?')
        .run('completed', yesterdayTs, yesterdayTs, task1.id);

      const result = statsService.getCategoryBreakdown(TODAY);
      expect(result).toEqual({});
    });
  });

  // ============================================
  // getOrCreateDailyStats
  // ============================================
  describe('getOrCreateDailyStats', () => {
    it('should create new DailyStats for date if none exists', () => {
      const stats = statsService.getOrCreateDailyStats(TODAY);

      expect(stats).toBeDefined();
      expect(stats.id).toBeTruthy();
      expect(stats.date).toBe(TODAY);
      expect(stats.completedCount).toBe(0);
      expect(stats.totalPlanned).toBe(0);
      expect(stats.deferredCount).toBe(0);
      expect(stats.totalMinutesUsed).toBe(0);
      expect(stats.createdAt).toBeGreaterThan(0);
      expect(stats.updatedAt).toBeGreaterThan(0);
    });

    it('should return existing DailyStats if already exists', () => {
      const first = statsService.getOrCreateDailyStats(TODAY);
      const second = statsService.getOrCreateDailyStats(TODAY);

      expect(first.id).toBe(second.id);
      expect(first.date).toBe(second.date);
    });
  });

  // ============================================
  // updateDailyStats
  // ============================================
  describe('updateDailyStats', () => {
    it('should recalculate and persist stats for date', () => {
      const task1 = taskService.createTask({ title: 'T1', estimatedMinutes: 30, category: 'work' });
      const task2 = taskService.createTask({ title: 'T2', estimatedMinutes: 60, category: 'personal' });

      // Complete task1 on TODAY
      const todayTs = dateToTimestamp(TODAY);
      db.prepare('UPDATE Task SET status = ?, completedAt = ?, updatedAt = ? WHERE id = ?')
        .run('completed', todayTs, todayTs, task1.id);

      // Defer task2 on TODAY
      db.prepare('UPDATE Task SET status = ?, updatedAt = ? WHERE id = ?')
        .run('deferred', todayTs, task2.id);

      // Schedule both tasks on TODAY
      timeboxService.createTimeBox({ taskId: task1.id, date: TODAY, startSlot: 0, endSlot: 1 });
      timeboxService.createTimeBox({ taskId: task2.id, date: TODAY, startSlot: 2, endSlot: 3 });

      const stats = statsService.updateDailyStats(TODAY);

      expect(stats.completedCount).toBe(1);
      expect(stats.totalPlanned).toBe(2);
      expect(stats.deferredCount).toBe(1);
      expect(stats.totalMinutesUsed).toBe(30);

      const breakdown = JSON.parse(stats.categoryBreakdown);
      expect(breakdown).toEqual({ work: 30 });
    });

    it('should update existing stats when called again', () => {
      // First update with no data
      const first = statsService.updateDailyStats(TODAY);
      expect(first.completedCount).toBe(0);

      // Add a completed task
      const task = taskService.createTask({ title: 'T1', estimatedMinutes: 15, category: 'misc' });
      const todayTs = dateToTimestamp(TODAY);
      db.prepare('UPDATE Task SET status = ?, completedAt = ?, updatedAt = ? WHERE id = ?')
        .run('completed', todayTs, todayTs, task.id);

      // Second update should reflect new data
      const second = statsService.updateDailyStats(TODAY);
      expect(second.completedCount).toBe(1);
      expect(second.totalMinutesUsed).toBe(15);
      expect(second.id).toBe(first.id); // Same row updated
    });
  });

  // ============================================
  // getStatsRange
  // ============================================
  describe('getStatsRange', () => {
    it('should return empty array when no stats in range', () => {
      const result = statsService.getStatsRange('2026-01-01', '2026-01-31');
      expect(result).toEqual([]);
    });

    it('should return DailyStats[] for date range inclusive', () => {
      // Create stats for 3 consecutive days
      statsService.updateDailyStats('2026-03-16');
      statsService.updateDailyStats('2026-03-17');
      statsService.updateDailyStats('2026-03-18');
      statsService.updateDailyStats('2026-03-19');

      const result = statsService.getStatsRange('2026-03-17', '2026-03-18');
      expect(result).toHaveLength(2);
      expect(result[0].date).toBe('2026-03-17');
      expect(result[1].date).toBe('2026-03-18');
    });
  });

  // ============================================
  // getAccumulatedCompletedCount (Eros principle)
  // ============================================
  describe('getAccumulatedCompletedCount', () => {
    it('should return 0 when no stats exist', () => {
      const result = statsService.getAccumulatedCompletedCount();
      expect(result).toBe(0);
    });

    it('should return cumulative completedCount across all dates', () => {
      // Create tasks and complete them on different days
      const task1 = taskService.createTask({ title: 'T1', estimatedMinutes: 10, category: 'a' });
      const task2 = taskService.createTask({ title: 'T2', estimatedMinutes: 20, category: 'b' });
      const task3 = taskService.createTask({ title: 'T3', estimatedMinutes: 30, category: 'c' });

      // Complete task1 on day 1
      const day1Ts = dateToTimestamp('2026-03-16');
      db.prepare('UPDATE Task SET status = ?, completedAt = ?, updatedAt = ? WHERE id = ?')
        .run('completed', day1Ts, day1Ts, task1.id);

      // Complete task2 and task3 on day 2
      const day2Ts = dateToTimestamp('2026-03-17');
      db.prepare('UPDATE Task SET status = ?, completedAt = ?, updatedAt = ? WHERE id = ?')
        .run('completed', day2Ts, day2Ts, task2.id);
      db.prepare('UPDATE Task SET status = ?, completedAt = ?, updatedAt = ? WHERE id = ?')
        .run('completed', day2Ts, day2Ts, task3.id);

      // Update stats for both days
      statsService.updateDailyStats('2026-03-16');
      statsService.updateDailyStats('2026-03-17');

      const total = statsService.getAccumulatedCompletedCount();
      expect(total).toBe(3); // 1 + 2 = 3, cumulative, never decreases
    });

    it('should never decrease (Eros: accumulated count is monotonically non-decreasing)', () => {
      const task1 = taskService.createTask({ title: 'T1', estimatedMinutes: 10, category: 'a' });
      const todayTs = dateToTimestamp(TODAY);
      db.prepare('UPDATE Task SET status = ?, completedAt = ?, updatedAt = ? WHERE id = ?')
        .run('completed', todayTs, todayTs, task1.id);

      statsService.updateDailyStats(TODAY);
      const count1 = statsService.getAccumulatedCompletedCount();
      expect(count1).toBe(1);

      // Even if we recalculate (e.g., if task data changes), accumulated stays >= previous
      // The SUM of completedCount from DailyStats table is the source of truth
      statsService.updateDailyStats(TODAY);
      const count2 = statsService.getAccumulatedCompletedCount();
      expect(count2).toBeGreaterThanOrEqual(count1);
    });
  });

  // ============================================
  // Edge cases
  // ============================================
  describe('edge cases', () => {
    it('should handle tasks with 0 estimatedMinutes', () => {
      const task = taskService.createTask({ title: 'Quick task', estimatedMinutes: 0, category: 'misc' });
      const todayTs = dateToTimestamp(TODAY);
      db.prepare('UPDATE Task SET status = ?, completedAt = ?, updatedAt = ? WHERE id = ?')
        .run('completed', todayTs, todayTs, task.id);

      const result = statsService.aggregateDaily(TODAY);
      expect(result.completedCount).toBe(1);
      expect(result.totalMinutesUsed).toBe(0);
    });

    it('should handle tasks with empty category in breakdown', () => {
      const task = taskService.createTask({ title: 'No category', estimatedMinutes: 15 });
      const todayTs = dateToTimestamp(TODAY);
      db.prepare('UPDATE Task SET status = ?, completedAt = ?, updatedAt = ? WHERE id = ?')
        .run('completed', todayTs, todayTs, task.id);

      const breakdown = statsService.getCategoryBreakdown(TODAY);
      // Empty string category should still appear
      expect(breakdown['']).toBe(15);
    });
  });
});
