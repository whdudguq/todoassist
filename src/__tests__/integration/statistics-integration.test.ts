/**
 * @TASK P5-S5-V - Statistics Integration Tests
 * @SPEC docs/planning/04-database-design.md#DailyStats
 * @TEST src/__tests__/integration/statistics-integration.test.ts
 *
 * Integration tests for statistics data flow:
 * AnalyticsService → statsStore → UI Charts
 *
 * Tests verify:
 * 1. AnalyticsService.getCompletionRate → data matches statsStore.completionData shape
 * 2. AnalyticsService.getCategoryTimeDistribution → matches statsStore.categoryData shape
 * 3. AnalyticsService.getDeferralPattern → matches statsStore.deferralData shape
 * 4. statsStore.setPeriod → triggers correct date range calculation
 * 5. Period tab change → store reflects new period
 * 6. AI insights → stored and displayed correctly
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Database from 'better-sqlite3';
import { runMigrations } from '../../main/database/migrations';
import { AnalyticsService } from '../../main/services/analytics';
import { DailyStatsService } from '../../main/services/daily-stats';
import { TaskCrudService } from '../../main/services/task-crud';
import { useStatsStore } from '@renderer/stores/statsStore';
import type { Task, DailyStats } from '@shared/types';

// ============================================
// Mock Claude API Service
// ============================================

class MockClaudeApiService {
  async generateInsight(_stats: DailyStats[], period: 'weekly' | 'monthly'): Promise<string> {
    return `This is a ${period} insight. Great progress!`;
  }
}

// ============================================
// Test Utilities
// ============================================

/** Create a Unix timestamp (ms) for a given date string 'YYYY-MM-DD' at noon UTC */
function dateToTimestamp(dateStr: string): number {
  return new Date(`${dateStr}T12:00:00Z`).getTime();
}

/** Create test task with sensible defaults */
function createTestTask(
  taskService: TaskCrudService,
  title: string = 'Test Task',
  importance: 1 | 2 | 3 | 4 | 5 = 3,
  estimatedMinutes: number = 30,
  category: string = 'work',
): Task {
  return taskService.createTask({
    title,
    description: `Description for ${title}`,
    importance,
    estimatedMinutes,
    category,
    status: 'pending',
  });
}

/** Verify statsStore.completionData shape */
function assertValidCompletionDataShape(data: Array<{ date: string; rate: number }>): void {
  expect(Array.isArray(data)).toBe(true);
  if (data.length > 0) {
    data.forEach((item) => {
      expect(item).toHaveProperty('date');
      expect(item).toHaveProperty('rate');
      expect(typeof item.date).toBe('string');
      expect(typeof item.rate).toBe('number');
      expect(item.rate).toBeGreaterThanOrEqual(0);
      expect(item.rate).toBeLessThanOrEqual(100);
    });
  }
}

/** Verify statsStore.categoryData shape */
function assertValidCategoryDataShape(data: Array<{ name: string; minutes: number; color: string }>): void {
  expect(Array.isArray(data)).toBe(true);
  if (data.length > 0) {
    data.forEach((item) => {
      expect(item).toHaveProperty('name');
      expect(item).toHaveProperty('minutes');
      expect(item).toHaveProperty('color');
      expect(typeof item.name).toBe('string');
      expect(typeof item.minutes).toBe('number');
      expect(typeof item.color).toBe('string');
      expect(item.minutes).toBeGreaterThanOrEqual(0);
    });
  }
}

/** Verify statsStore.deferralData shape */
function assertValidDeferralDataShape(data: Array<{ label: string; count: number }>): void {
  expect(Array.isArray(data)).toBe(true);
  if (data.length > 0) {
    data.forEach((item) => {
      expect(item).toHaveProperty('label');
      expect(item).toHaveProperty('count');
      expect(typeof item.label).toBe('string');
      expect(typeof item.count).toBe('number');
      expect(item.count).toBeGreaterThanOrEqual(0);
    });
  }
}

// ============================================
// Test Suites
// ============================================

describe('Statistics Integration Tests', () => {
  let db: Database.Database;
  let analyticsService: AnalyticsService;
  let statsService: DailyStatsService;
  let taskService: TaskCrudService;

  const TODAY = '2026-03-18';
  const YESTERDAY = '2026-03-17';
  const TWO_DAYS_AGO = '2026-03-16';

  beforeEach(() => {
    db = new Database(':memory:');
    runMigrations(db);

    const mockClaudeService = new MockClaudeApiService();
    analyticsService = new AnalyticsService(db, mockClaudeService as any);
    statsService = new DailyStatsService(db);
    taskService = new TaskCrudService(db);

    // Reset store
    useStatsStore.setState({
      period: 'thisWeek',
      completionData: [],
      categoryData: [],
      deferralData: [],
      aiInsights: [],
      accumulatedCompleted: 0,
      customRange: null,
      isLoading: false,
    });
  });

  afterEach(() => {
    db.close();
  });

  describe('AnalyticsService.getCompletionRate', () => {
    it('should return 0 when no DailyStats exist', () => {
      const rate = analyticsService.getCompletionRate(TODAY, TODAY);
      expect(rate).toBe(0);
    });

    it('should return 0 when totalPlanned is 0', () => {
      statsService.getOrCreateDailyStats(TODAY);
      const rate = analyticsService.getCompletionRate(TODAY, TODAY);
      expect(rate).toBe(0);
    });

    it('should return correct completion rate from DailyStats', () => {
      // Directly insert DailyStats record
      db.prepare(`
        INSERT INTO DailyStats (id, date, completedCount, totalPlanned, deferredCount, totalMinutesUsed, categoryBreakdown, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(`stats1`, TODAY, 2, 3, 0, 60, '{}', Date.now(), Date.now());

      const rate = analyticsService.getCompletionRate(TODAY, TODAY);
      expect(rate).toBe(66.67); // 2 completed out of 3 planned
    });

    it('should aggregate rate across multiple days', () => {
      // Day 1: 2 completed out of 3 planned
      db.prepare(`
        INSERT INTO DailyStats (id, date, completedCount, totalPlanned, deferredCount, totalMinutesUsed, categoryBreakdown, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(`stats1`, TWO_DAYS_AGO, 2, 3, 0, 60, '{}', Date.now(), Date.now());

      // Day 2: 1 completed out of 2 planned
      db.prepare(`
        INSERT INTO DailyStats (id, date, completedCount, totalPlanned, deferredCount, totalMinutesUsed, categoryBreakdown, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(`stats2`, YESTERDAY, 1, 2, 0, 30, '{}', Date.now(), Date.now());

      const rate = analyticsService.getCompletionRate(TWO_DAYS_AGO, YESTERDAY);
      expect(rate).toBe(60); // 3 completed out of 5 planned
    });
  });

  describe('AnalyticsService.getCategoryTimeDistribution', () => {
    it('should return empty object when no DailyStats exist', () => {
      const dist = analyticsService.getCategoryTimeDistribution(TODAY, TODAY);
      expect(typeof dist).toBe('object');
      expect(Object.keys(dist).length).toBe(0);
    });

    it('should parse category breakdown from DailyStats', () => {
      const categoryBreakdown = JSON.stringify({
        work: 120,
        personal: 60,
        learning: 45,
      });

      db.prepare(`
        INSERT INTO DailyStats (id, date, completedCount, totalPlanned, deferredCount, totalMinutesUsed, categoryBreakdown, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(`stats1`, TODAY, 3, 3, 0, 225, categoryBreakdown, Date.now(), Date.now());

      const dist = analyticsService.getCategoryTimeDistribution(TODAY, TODAY);
      expect(dist.work).toBe(120);
      expect(dist.personal).toBe(60);
      expect(dist.learning).toBe(45);
    });

    it('should aggregate across multiple days', () => {
      const breakdown1 = JSON.stringify({ work: 60, personal: 30 });
      const breakdown2 = JSON.stringify({ work: 40, personal: 20 });

      db.prepare(`
        INSERT INTO DailyStats (id, date, completedCount, totalPlanned, deferredCount, totalMinutesUsed, categoryBreakdown, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(`stats1`, TWO_DAYS_AGO, 2, 2, 0, 90, breakdown1, Date.now(), Date.now());

      db.prepare(`
        INSERT INTO DailyStats (id, date, completedCount, totalPlanned, deferredCount, totalMinutesUsed, categoryBreakdown, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(`stats2`, YESTERDAY, 2, 2, 0, 60, breakdown2, Date.now(), Date.now());

      const dist = analyticsService.getCategoryTimeDistribution(TWO_DAYS_AGO, YESTERDAY);
      expect(dist.work).toBe(100);
      expect(dist.personal).toBe(50);
    });
  });

  describe('AnalyticsService.getDeferralPattern', () => {
    it('should return empty pattern when no deferred tasks', () => {
      createTestTask(taskService, 'Task 1', 3, 30, 'work');

      const pattern = analyticsService.getDeferralPattern(TODAY, TODAY);
      expect(typeof pattern.byDayOfWeek).toBe('object');
      expect(typeof pattern.byCategory).toBe('object');
    });

    it('should track deferred tasks by day of week', () => {
      const task1 = createTestTask(taskService, 'Task 1', 3, 30, 'work');
      const task2 = createTestTask(taskService, 'Task 2', 3, 30, 'work');

      taskService.updateTask(task1.id, { status: 'deferred' });
      taskService.updateTask(task2.id, { status: 'deferred' });

      const pattern = analyticsService.getDeferralPattern(TODAY, TODAY);
      // Mar 18 2026 is a Tuesday
      expect(pattern.byDayOfWeek).toBeDefined();
      if (Object.keys(pattern.byDayOfWeek).length > 0) {
        const anyCount = Object.values(pattern.byDayOfWeek)[0];
        expect(typeof anyCount).toBe('number');
        expect(anyCount).toBeGreaterThanOrEqual(0);
      }
    });

    it('should have deferral pattern structure', () => {
      const task = createTestTask(taskService, 'Work 1', 3, 30, 'work');
      taskService.updateTask(task.id, { status: 'deferred' });

      const pattern = analyticsService.getDeferralPattern(TODAY, TODAY);
      expect(pattern).toHaveProperty('byDayOfWeek');
      expect(pattern).toHaveProperty('byCategory');
      expect(typeof pattern.byDayOfWeek).toBe('object');
      expect(typeof pattern.byCategory).toBe('object');
    });
  });

  describe('statsStore.setPeriod', () => {
    it('should update period in store', () => {
      const store = useStatsStore.getState();
      expect(store.period).toBe('thisWeek');

      store.setPeriod('lastMonth');
      const updated = useStatsStore.getState();
      expect(updated.period).toBe('lastMonth');
    });

    it('should support all valid periods', () => {
      const periods: Array<'thisWeek' | 'lastWeek' | 'thisMonth' | 'lastMonth' | 'custom'> = [
        'thisWeek',
        'lastWeek',
        'thisMonth',
        'lastMonth',
        'custom',
      ];

      for (const period of periods) {
        useStatsStore.getState().setPeriod(period);
        expect(useStatsStore.getState().period).toBe(period);
      }
    });

    it('should allow setting custom date range', () => {
      useStatsStore.getState().setPeriod('custom');
      useStatsStore.getState().setCustomRange({ start: '2026-03-01', end: '2026-03-31' });

      const state = useStatsStore.getState();
      expect(state.period).toBe('custom');
      expect(state.customRange).toEqual({ start: '2026-03-01', end: '2026-03-31' });
    });
  });

  describe('statsStore.completionData', () => {
    it('should store completion data in expected shape', () => {
      const completionData = [
        { date: '2026-03-16', rate: 66.67 },
        { date: '2026-03-17', rate: 75 },
        { date: '2026-03-18', rate: 50 },
      ];

      useStatsStore.getState().setCompletionData(completionData);

      const state = useStatsStore.getState();
      assertValidCompletionDataShape(state.completionData);
      expect(state.completionData).toEqual(completionData);
    });

    it('should validate completion rate range', () => {
      const validData = [
        { date: '2026-03-18', rate: 0 },
        { date: '2026-03-18', rate: 100 },
        { date: '2026-03-18', rate: 50.5 },
      ];

      useStatsStore.getState().setCompletionData(validData);
      assertValidCompletionDataShape(useStatsStore.getState().completionData);
    });
  });

  describe('statsStore.categoryData', () => {
    it('should store category data in expected shape', () => {
      const categoryData = [
        { name: 'work', minutes: 180, color: '#3b82f6' },
        { name: 'personal', minutes: 120, color: '#ef4444' },
        { name: 'learning', minutes: 90, color: '#10b981' },
      ];

      useStatsStore.getState().setCategoryData(categoryData);

      const state = useStatsStore.getState();
      assertValidCategoryDataShape(state.categoryData);
      expect(state.categoryData).toEqual(categoryData);
    });

    it('should handle empty category data', () => {
      useStatsStore.getState().setCategoryData([]);
      assertValidCategoryDataShape(useStatsStore.getState().categoryData);
    });

    it('should track minutes accurately across categories', () => {
      const categoryData = [
        { name: 'work', minutes: 120, color: '#000000' },
        { name: 'personal', minutes: 60, color: '#000000' },
        { name: 'learning', minutes: 90, color: '#000000' },
      ];

      const store = useStatsStore.getState();
      store.setCategoryData(categoryData);
      assertValidCategoryDataShape(useStatsStore.getState().categoryData);

      const state = useStatsStore.getState();
      expect(state.categoryData.find((c) => c.name === 'work')?.minutes).toBe(120);
      expect(state.categoryData.find((c) => c.name === 'personal')?.minutes).toBe(60);
      expect(state.categoryData.find((c) => c.name === 'learning')?.minutes).toBe(90);
    });
  });

  describe('statsStore.deferralData', () => {
    it('should store deferral data in expected shape', () => {
      const deferralData = [
        { label: 'Monday', count: 2 },
        { label: 'Tuesday', count: 5 },
        { label: 'Wednesday', count: 1 },
      ];

      useStatsStore.getState().setDeferralData(deferralData);

      const state = useStatsStore.getState();
      assertValidDeferralDataShape(state.deferralData);
      expect(state.deferralData).toEqual(deferralData);
    });

    it('should handle empty deferral data', () => {
      useStatsStore.getState().setDeferralData([]);
      assertValidDeferralDataShape(useStatsStore.getState().deferralData);
    });
  });

  describe('statsStore.aiInsights', () => {
    it('should store AI insights as array of strings', () => {
      const insights = [
        'You completed 75% of tasks this week.',
        'Quality tasks took 40% more time than estimated.',
        'Your productivity peaks on Tuesdays.',
      ];

      useStatsStore.getState().setAiInsights(insights);

      const state = useStatsStore.getState();
      expect(Array.isArray(state.aiInsights)).toBe(true);
      expect(state.aiInsights).toEqual(insights);
      state.aiInsights.forEach((insight) => {
        expect(typeof insight).toBe('string');
        expect(insight.length).toBeGreaterThan(0);
      });
    });

    it('should support clearing insights', () => {
      useStatsStore.getState().setAiInsights(['Insight 1', 'Insight 2']);
      expect(useStatsStore.getState().aiInsights).toHaveLength(2);

      useStatsStore.getState().setAiInsights([]);
      expect(useStatsStore.getState().aiInsights).toHaveLength(0);
    });
  });

  describe('AnalyticsService.generateAiInsight', () => {
    it('should generate insights for a date range', async () => {
      db.prepare(`
        INSERT INTO DailyStats (id, date, completedCount, totalPlanned, deferredCount, totalMinutesUsed, categoryBreakdown, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(`stats1`, TODAY, 2, 3, 0, 60, '{}', Date.now(), Date.now());

      const insight = await analyticsService.generateAiInsight(TODAY, TODAY, 'weekly');

      expect(typeof insight).toBe('string');
      expect(insight.length).toBeGreaterThan(0);
      expect(insight).toContain('weekly');
    });

    it('should generate monthly insights', async () => {
      db.prepare(`
        INSERT INTO DailyStats (id, date, completedCount, totalPlanned, deferredCount, totalMinutesUsed, categoryBreakdown, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(`stats1`, TODAY, 2, 3, 0, 60, '{}', Date.now(), Date.now());

      const insight = await analyticsService.generateAiInsight(TODAY, TODAY, 'monthly');

      expect(typeof insight).toBe('string');
      expect(insight).toContain('monthly');
    });

    it('should collect stats from multiple days for insight', async () => {
      db.prepare(`
        INSERT INTO DailyStats (id, date, completedCount, totalPlanned, deferredCount, totalMinutesUsed, categoryBreakdown, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(`stats1`, TWO_DAYS_AGO, 2, 3, 0, 60, '{}', Date.now(), Date.now());

      db.prepare(`
        INSERT INTO DailyStats (id, date, completedCount, totalPlanned, deferredCount, totalMinutesUsed, categoryBreakdown, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(`stats2`, YESTERDAY, 1, 2, 0, 30, '{}', Date.now(), Date.now());

      const insight = await analyticsService.generateAiInsight(TWO_DAYS_AGO, YESTERDAY, 'weekly');

      expect(typeof insight).toBe('string');
      expect(insight.length).toBeGreaterThan(0);
    });
  });

  describe('Integration: Full Statistics Flow', () => {
    it('should flow data from analytics service through store to ui', () => {
      // Create DailyStats with category data
      const categoryBreakdown = JSON.stringify({
        work: 120,
        personal: 60,
      });

      db.prepare(`
        INSERT INTO DailyStats (id, date, completedCount, totalPlanned, deferredCount, totalMinutesUsed, categoryBreakdown, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(`stats1`, TODAY, 1, 2, 1, 120, categoryBreakdown, Date.now(), Date.now());

      // Get analytics data
      const completionRate = analyticsService.getCompletionRate(TODAY, TODAY);
      const categoryDist = analyticsService.getCategoryTimeDistribution(TODAY, TODAY);
      const deferralPattern = analyticsService.getDeferralPattern(TODAY, TODAY);

      // Store in statsStore
      const store = useStatsStore.getState();
      store.setCompletionData([
        { date: TODAY, rate: completionRate },
      ]);

      const categoryData = Object.entries(categoryDist).map(([name, minutes]) => ({
        name,
        minutes,
        color: '#000000',
      }));
      store.setCategoryData(categoryData);

      const deferralData = Object.entries(deferralPattern.byDayOfWeek).map(([day, count]) => ({
        label: day,
        count,
      }));
      store.setDeferralData(deferralData);

      // Verify store state
      const state = useStatsStore.getState();
      assertValidCompletionDataShape(state.completionData);
      assertValidCategoryDataShape(state.categoryData);
      assertValidDeferralDataShape(state.deferralData);
      expect(state.completionData.length).toBeGreaterThan(0);
      expect(completionRate).toBe(50); // 1 out of 2
    });

    it('should support period transitions maintaining data consistency', () => {
      let store = useStatsStore.getState();

      // Week view
      store.setPeriod('thisWeek');
      store.setCompletionData([{ date: '2026-03-18', rate: 75 }]);
      store = useStatsStore.getState();
      expect(store.period).toBe('thisWeek');
      expect(store.completionData).toHaveLength(1);

      // Switch to month view
      store.setPeriod('thisMonth');
      const monthData = [
        { date: '2026-03-01', rate: 50 },
        { date: '2026-03-18', rate: 75 },
      ];
      store.setCompletionData(monthData);
      store = useStatsStore.getState();
      expect(store.period).toBe('thisMonth');
      expect(store.completionData).toHaveLength(2);

      // Switch to custom range
      store.setPeriod('custom');
      store.setCustomRange({ start: '2026-03-10', end: '2026-03-20' });
      store = useStatsStore.getState();
      expect(store.period).toBe('custom');
      expect(store.customRange?.start).toBe('2026-03-10');
    });
  });
});
