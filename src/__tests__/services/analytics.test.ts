/**
 * @TASK P5-R1 - 통계 분석 서비스 (TDD_MODE:RED_FIRST)
 * @SPEC docs/planning/04-database-design.md#DailyStats
 * @TEST src/__tests__/services/analytics.test.ts
 *
 * Tests for AnalyticsService
 * - getCompletionRate: percentage (completed / total) from DailyStats
 * - getCategoryTimeDistribution: { category: totalMinutes } aggregated from DailyStats
 * - getDeferralPattern: { byDayOfWeek, byCategory } from Task table
 * - generateAiInsight: calls Claude API, returns analysis string
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Database from 'better-sqlite3';
import { runMigrations } from '../../main/database/migrations';
import { TaskCrudService } from '../../main/services/task-crud';
import { AnalyticsService } from '../../main/services/analytics';
import type { CategoryDistribution, DeferralPattern } from '../../main/services/analytics';
import type { ClaudeApiService } from '../../main/services/claude-api';

// ============================================
// Helpers
// ============================================

/** Create a Unix timestamp (ms) for a given date string 'YYYY-MM-DD' at noon UTC */
function dateToTimestamp(dateStr: string): number {
  return new Date(`${dateStr}T12:00:00Z`).getTime();
}

/** Create a mock ClaudeApiService */
function createMockClaudeService(): ClaudeApiService {
  return {
    generateInsight: vi.fn().mockResolvedValue('AI 분석: 이번 주 완료율이 좋습니다!'),
    testConnection: vi.fn().mockResolvedValue(true),
    generateEncouragement: vi.fn().mockResolvedValue(''),
    estimateTaskMetadata: vi.fn().mockResolvedValue({ estimatedMinutes: 30, importance: 3, category: '' }),
    generateSchedule: vi.fn().mockResolvedValue([]),
    splitTask: vi.fn().mockResolvedValue([]),
    chat: vi.fn().mockResolvedValue(''),
  } as unknown as ClaudeApiService;
}

/** Insert a DailyStats row directly */
function insertDailyStats(
  db: Database.Database,
  date: string,
  completedCount: number,
  totalPlanned: number,
  deferredCount: number,
  totalMinutesUsed: number,
  categoryBreakdown: Record<string, number>,
) {
  const id = `stats-${date}`;
  const now = Date.now();
  db.prepare(`
    INSERT INTO DailyStats (id, date, completedCount, totalPlanned, deferredCount, totalMinutesUsed, categoryBreakdown, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, date, completedCount, totalPlanned, deferredCount, totalMinutesUsed, JSON.stringify(categoryBreakdown), now, now);
}

describe('AnalyticsService', () => {
  let db: Database.Database;
  let analyticsService: AnalyticsService;
  let taskService: TaskCrudService;
  let mockClaudeService: ClaudeApiService;

  beforeEach(() => {
    db = new Database(':memory:');
    db.pragma('foreign_keys = ON');
    runMigrations(db);
    taskService = new TaskCrudService(db);
    mockClaudeService = createMockClaudeService();
    analyticsService = new AnalyticsService(db, mockClaudeService);
  });

  afterEach(() => {
    if (db) {
      db.close();
    }
  });

  // ============================================
  // getCompletionRate
  // ============================================
  describe('getCompletionRate', () => {
    it('should return 0 when no DailyStats exist in range', () => {
      const rate = analyticsService.getCompletionRate('2026-03-01', '2026-03-07');
      expect(rate).toBe(0);
    });

    it('should calculate correct percentage from DailyStats', () => {
      // 7 days: total completed=10, total planned=20 => 50%
      insertDailyStats(db, '2026-03-01', 3, 5, 0, 90, { work: 90 });
      insertDailyStats(db, '2026-03-02', 2, 5, 1, 60, { work: 60 });
      insertDailyStats(db, '2026-03-03', 5, 10, 0, 150, { work: 100, personal: 50 });

      const rate = analyticsService.getCompletionRate('2026-03-01', '2026-03-07');
      expect(rate).toBe(50); // 10/20 * 100
    });

    it('should handle weekly range (7 days) correctly', () => {
      // Insert stats for a full week
      insertDailyStats(db, '2026-03-11', 4, 5, 1, 120, { work: 120 });
      insertDailyStats(db, '2026-03-12', 3, 5, 2, 90, { work: 90 });
      insertDailyStats(db, '2026-03-13', 5, 5, 0, 150, { work: 150 });
      insertDailyStats(db, '2026-03-14', 2, 4, 2, 60, { personal: 60 });
      insertDailyStats(db, '2026-03-15', 0, 3, 3, 0, {});
      insertDailyStats(db, '2026-03-16', 1, 2, 1, 30, { work: 30 });
      insertDailyStats(db, '2026-03-17', 3, 3, 0, 90, { work: 90 });

      const rate = analyticsService.getCompletionRate('2026-03-11', '2026-03-17');
      // total completed: 4+3+5+2+0+1+3 = 18, total planned: 5+5+5+4+3+2+3 = 27
      // 18/27 * 100 = 66.666... => expect rounded or truncated
      expect(rate).toBeCloseTo(66.67, 1);
    });

    it('should handle monthly range (30 days) correctly', () => {
      // Insert a few stats within a month range
      insertDailyStats(db, '2026-02-15', 5, 10, 2, 150, { work: 150 });
      insertDailyStats(db, '2026-02-20', 8, 10, 1, 240, { work: 200, personal: 40 });
      insertDailyStats(db, '2026-02-28', 7, 10, 0, 210, { work: 210 });

      const rate = analyticsService.getCompletionRate('2026-02-01', '2026-03-01');
      // total completed: 5+8+7 = 20, total planned: 10+10+10 = 30
      // 20/30 * 100 = 66.67
      expect(rate).toBeCloseTo(66.67, 1);
    });

    it('should return 0 when totalPlanned is 0', () => {
      insertDailyStats(db, '2026-03-01', 0, 0, 0, 0, {});
      const rate = analyticsService.getCompletionRate('2026-03-01', '2026-03-07');
      expect(rate).toBe(0);
    });

    it('should return 100 when all tasks are completed', () => {
      insertDailyStats(db, '2026-03-01', 5, 5, 0, 150, { work: 150 });
      insertDailyStats(db, '2026-03-02', 3, 3, 0, 90, { work: 90 });

      const rate = analyticsService.getCompletionRate('2026-03-01', '2026-03-02');
      expect(rate).toBe(100);
    });
  });

  // ============================================
  // getCategoryTimeDistribution
  // ============================================
  describe('getCategoryTimeDistribution', () => {
    it('should return empty object when no DailyStats exist', () => {
      const dist = analyticsService.getCategoryTimeDistribution('2026-03-01', '2026-03-07');
      expect(dist).toEqual({});
    });

    it('should aggregate categoryBreakdown across multiple days', () => {
      insertDailyStats(db, '2026-03-01', 3, 5, 0, 90, { work: 60, personal: 30 });
      insertDailyStats(db, '2026-03-02', 2, 4, 0, 75, { work: 45, meeting: 30 });
      insertDailyStats(db, '2026-03-03', 4, 6, 0, 120, { work: 80, personal: 40 });

      const dist = analyticsService.getCategoryTimeDistribution('2026-03-01', '2026-03-03');
      expect(dist).toEqual({
        work: 185,      // 60 + 45 + 80
        personal: 70,   // 30 + 40
        meeting: 30,    // 30
      });
    });

    it('should handle empty categoryBreakdown JSON', () => {
      insertDailyStats(db, '2026-03-01', 0, 0, 0, 0, {});

      const dist = analyticsService.getCategoryTimeDistribution('2026-03-01', '2026-03-01');
      expect(dist).toEqual({});
    });

    it('should only include stats within the date range', () => {
      insertDailyStats(db, '2026-03-01', 3, 5, 0, 90, { work: 90 });
      insertDailyStats(db, '2026-03-10', 2, 4, 0, 60, { personal: 60 });

      const dist = analyticsService.getCategoryTimeDistribution('2026-03-01', '2026-03-05');
      expect(dist).toEqual({ work: 90 }); // Only March 1 included
    });
  });

  // ============================================
  // getDeferralPattern
  // ============================================
  describe('getDeferralPattern', () => {
    it('should return empty patterns when no deferred tasks exist', () => {
      const pattern = analyticsService.getDeferralPattern('2026-03-01', '2026-03-07');
      expect(pattern.byDayOfWeek).toEqual({});
      expect(pattern.byCategory).toEqual({});
    });

    it('should group deferred tasks by day of week', () => {
      // 2026-03-16 is Monday (1), 2026-03-17 is Tuesday (2), 2026-03-18 is Wednesday (3)
      const task1 = taskService.createTask({ title: 'T1', category: 'work' });
      const task2 = taskService.createTask({ title: 'T2', category: 'work' });
      const task3 = taskService.createTask({ title: 'T3', category: 'personal' });

      // Defer task1 on Monday
      const monTs = dateToTimestamp('2026-03-16');
      db.prepare('UPDATE Task SET status = ?, updatedAt = ? WHERE id = ?')
        .run('deferred', monTs, task1.id);

      // Defer task2 on Monday
      db.prepare('UPDATE Task SET status = ?, updatedAt = ? WHERE id = ?')
        .run('deferred', monTs, task2.id);

      // Defer task3 on Tuesday
      const tueTs = dateToTimestamp('2026-03-17');
      db.prepare('UPDATE Task SET status = ?, updatedAt = ? WHERE id = ?')
        .run('deferred', tueTs, task3.id);

      const pattern = analyticsService.getDeferralPattern('2026-03-16', '2026-03-18');

      expect(pattern.byDayOfWeek['Mon']).toBe(2);
      expect(pattern.byDayOfWeek['Tue']).toBe(1);
    });

    it('should calculate deferral rate by category', () => {
      // Create 4 tasks in "work" category: 2 deferred, 2 not
      const t1 = taskService.createTask({ title: 'W1', category: 'work' });
      const t2 = taskService.createTask({ title: 'W2', category: 'work' });
      taskService.createTask({ title: 'W3', category: 'work' });
      taskService.createTask({ title: 'W4', category: 'work' });

      // Create 2 tasks in "personal" category: 1 deferred, 1 not
      const t5 = taskService.createTask({ title: 'P1', category: 'personal' });
      taskService.createTask({ title: 'P2', category: 'personal' });

      const ts = dateToTimestamp('2026-03-16');
      db.prepare('UPDATE Task SET status = ?, updatedAt = ? WHERE id = ?')
        .run('deferred', ts, t1.id);
      db.prepare('UPDATE Task SET status = ?, updatedAt = ? WHERE id = ?')
        .run('deferred', ts, t2.id);
      db.prepare('UPDATE Task SET status = ?, updatedAt = ? WHERE id = ?')
        .run('deferred', ts, t5.id);

      const pattern = analyticsService.getDeferralPattern('2026-03-16', '2026-03-18');

      // work: 2 deferred / 4 total = 0.5
      expect(pattern.byCategory['work']).toBeCloseTo(0.5, 2);
      // personal: 1 deferred / 2 total = 0.5
      expect(pattern.byCategory['personal']).toBeCloseTo(0.5, 2);
    });

    it('should handle weekly range with mixed data', () => {
      // Create tasks deferred across a week
      const t1 = taskService.createTask({ title: 'T1', category: 'meeting' });
      const t2 = taskService.createTask({ title: 'T2', category: 'meeting' });
      taskService.createTask({ title: 'T3', category: 'meeting' }); // not deferred

      // Defer on Wednesday and Friday
      const wedTs = dateToTimestamp('2026-03-18'); // Wednesday
      const friTs = dateToTimestamp('2026-03-20'); // Friday

      db.prepare('UPDATE Task SET status = ?, updatedAt = ? WHERE id = ?')
        .run('deferred', wedTs, t1.id);
      db.prepare('UPDATE Task SET status = ?, updatedAt = ? WHERE id = ?')
        .run('deferred', friTs, t2.id);

      const pattern = analyticsService.getDeferralPattern('2026-03-16', '2026-03-22');

      expect(pattern.byDayOfWeek['Wed']).toBe(1);
      expect(pattern.byDayOfWeek['Fri']).toBe(1);
      expect(pattern.byCategory['meeting']).toBeCloseTo(2 / 3, 2);
    });

    it('should return zeros for empty date range', () => {
      const pattern = analyticsService.getDeferralPattern('2026-01-01', '2026-01-07');
      expect(pattern.byDayOfWeek).toEqual({});
      expect(pattern.byCategory).toEqual({});
    });
  });

  // ============================================
  // generateAiInsight
  // ============================================
  describe('generateAiInsight', () => {
    it('should call ClaudeApiService.generateInsight with collected stats', async () => {
      insertDailyStats(db, '2026-03-11', 4, 5, 1, 120, { work: 120 });
      insertDailyStats(db, '2026-03-12', 3, 5, 2, 90, { work: 90 });

      const result = await analyticsService.generateAiInsight('2026-03-11', '2026-03-17', 'weekly');

      expect(result).toBe('AI 분석: 이번 주 완료율이 좋습니다!');
      expect(mockClaudeService.generateInsight).toHaveBeenCalledTimes(1);

      // Check that stats were passed to the API
      const callArgs = (mockClaudeService.generateInsight as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(callArgs[0]).toHaveLength(2); // 2 DailyStats rows
      expect(callArgs[1]).toBe('weekly');
    });

    it('should work with monthly period', async () => {
      insertDailyStats(db, '2026-02-15', 5, 10, 2, 150, { work: 150 });
      insertDailyStats(db, '2026-02-20', 8, 10, 1, 240, { work: 200, personal: 40 });

      const result = await analyticsService.generateAiInsight('2026-02-01', '2026-03-01', 'monthly');

      expect(result).toBe('AI 분석: 이번 주 완료율이 좋습니다!');
      const callArgs = (mockClaudeService.generateInsight as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(callArgs[1]).toBe('monthly');
    });

    it('should pass empty stats array when no data exists', async () => {
      const result = await analyticsService.generateAiInsight('2026-01-01', '2026-01-07', 'weekly');

      expect(result).toBe('AI 분석: 이번 주 완료율이 좋습니다!');
      const callArgs = (mockClaudeService.generateInsight as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(callArgs[0]).toHaveLength(0);
    });

    it('should propagate errors from ClaudeApiService', async () => {
      (mockClaudeService.generateInsight as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
        new Error('API rate limit exceeded')
      );

      await expect(
        analyticsService.generateAiInsight('2026-03-01', '2026-03-07', 'weekly')
      ).rejects.toThrow('API rate limit exceeded');
    });
  });

  // ============================================
  // Accuracy with known data
  // ============================================
  describe('accuracy with known data', () => {
    it('should return precise completion rate with known values', () => {
      // Exact known data: 15 completed out of 20 planned = 75%
      insertDailyStats(db, '2026-03-01', 5, 8, 1, 150, { work: 100, personal: 50 });
      insertDailyStats(db, '2026-03-02', 4, 6, 2, 120, { work: 80, personal: 40 });
      insertDailyStats(db, '2026-03-03', 6, 6, 0, 180, { work: 120, personal: 60 });

      const rate = analyticsService.getCompletionRate('2026-03-01', '2026-03-03');
      // 15 / 20 * 100 = 75
      expect(rate).toBe(75);
    });

    it('should aggregate category distribution accurately with known values', () => {
      insertDailyStats(db, '2026-03-01', 3, 5, 0, 90, { 'quality': 30, 'report': 60 });
      insertDailyStats(db, '2026-03-02', 2, 4, 0, 75, { 'quality': 45, 'email': 30 });
      insertDailyStats(db, '2026-03-03', 4, 6, 0, 120, { 'quality': 50, 'report': 40, 'email': 30 });

      const dist = analyticsService.getCategoryTimeDistribution('2026-03-01', '2026-03-03');
      expect(dist['quality']).toBe(125);   // 30 + 45 + 50
      expect(dist['report']).toBe(100);    // 60 + 40
      expect(dist['email']).toBe(60);      // 30 + 30
    });

    it('should compute deferral patterns accurately with known task data', () => {
      // Create exactly 5 tasks in "quality" category
      const tasks = Array.from({ length: 5 }, (_, i) =>
        taskService.createTask({ title: `Q${i + 1}`, category: 'quality' })
      );

      // Defer exactly 2 on Monday (2026-03-16)
      const monTs = dateToTimestamp('2026-03-16');
      db.prepare('UPDATE Task SET status = ?, updatedAt = ? WHERE id = ?')
        .run('deferred', monTs, tasks[0].id);
      db.prepare('UPDATE Task SET status = ?, updatedAt = ? WHERE id = ?')
        .run('deferred', monTs, tasks[1].id);

      const pattern = analyticsService.getDeferralPattern('2026-03-16', '2026-03-22');

      expect(pattern.byDayOfWeek['Mon']).toBe(2);
      // 2 deferred / 5 total = 0.4
      expect(pattern.byCategory['quality']).toBeCloseTo(0.4, 2);
    });
  });
});
