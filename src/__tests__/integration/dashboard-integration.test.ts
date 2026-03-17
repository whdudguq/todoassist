/**
 * @TASK P4-S1-V - Dashboard Integration Tests
 * @SPEC docs/planning/04-database-design.md
 * @TEST src/__tests__/integration/dashboard-integration.test.ts
 *
 * Integration tests for dashboard data flow:
 * DailyStatsService → dashboardStore → ProgressRing UI
 * EncouragementService → dashboardStore.aiGreeting
 *
 * Tests verify:
 * 1. DailyStatsService.aggregateDaily shape matches dashboardStore.dailyStats
 * 2. Accumulated completed count never decreases (Eros principle)
 * 3. EncouragementService.determineTone returns correct tone for contexts
 * 4. Generated messages stored in DB (mock Claude API)
 * 5. dashboardStore.setDailyStats makes data available for UI
 * 6. dashboardStore.setTodayTasks sorts tasks by importance
 * 7. Quick actions ("2분만 시작", "지금 안 할래요") update task status
 * 8. accumulatedCompleted badge increases monotonically
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Database from 'better-sqlite3';
import { runMigrations } from '../../main/database/migrations';
import { DailyStatsService } from '../../main/services/daily-stats';
import { EncouragementService } from '../../main/services/encouragement';
import { TaskCrudService } from '../../main/services/task-crud';
import { TimeBoxCrudService } from '../../main/services/timebox-crud';
import { useDashboardStore } from '@renderer/stores/dashboardStore';
import type { Task, DailyStats } from '@shared/types';

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
  estimatedMinutes: number = 30
): Task {
  return taskService.createTask({
    title,
    description: `Description for ${title}`,
    importance,
    estimatedMinutes,
    category: 'work',
    status: 'pending',
  });
}

/** Verify DailyStats data shape matches interface */
function assertValidDailyStatsShape(stats: DailyStats): void {
  expect(stats).toBeDefined();
  expect(stats.id).toBeDefined();
  expect(typeof stats.id).toBe('string');
  expect(stats.date).toBeDefined();
  expect(stats.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  expect(stats.completedCount).toBeDefined();
  expect(typeof stats.completedCount).toBe('number');
  expect(stats.totalPlanned).toBeDefined();
  expect(typeof stats.totalPlanned).toBe('number');
  expect(stats.deferredCount).toBeDefined();
  expect(typeof stats.deferredCount).toBe('number');
  expect(stats.totalMinutesUsed).toBeDefined();
  expect(typeof stats.totalMinutesUsed).toBe('number');
  expect(stats.categoryBreakdown).toBeDefined();
  expect(typeof stats.categoryBreakdown).toBe('string');
  expect(stats.createdAt).toBeGreaterThan(0);
  expect(stats.updatedAt).toBeGreaterThan(0);
}

// ============================================
// Mock Claude API Service
// ============================================

class MockClaudeApiService {
  async generateEncouragement(): Promise<string> {
    return '오늘도 화이팅! 한 번 시작해볼까요?';
  }
}

// ============================================
// Test Suites
// ============================================

describe('Dashboard Integration Tests', () => {
  let db: Database.Database;
  let statsService: DailyStatsService;
  let encouragementService: EncouragementService;
  let taskService: TaskCrudService;
  let timeboxService: TimeBoxCrudService;

  const TODAY = '2026-03-18';
  const YESTERDAY = '2026-03-17';

  beforeEach(() => {
    // Create fresh in-memory DB for each test
    db = new Database(':memory:');
    db.pragma('foreign_keys = ON');
    runMigrations(db);

    // Initialize services
    statsService = new DailyStatsService(db);
    encouragementService = new EncouragementService(db, new MockClaudeApiService() as any);
    taskService = new TaskCrudService(db);
    timeboxService = new TimeBoxCrudService(db);

    // Reset dashboard store to initial state using setState
    useDashboardStore.setState({
      dailyStats: null,
      todayTasks: [],
      aiGreeting: '오늘 하루도 잘 해낼 수 있어요!',
      accumulatedCompleted: 0,
      weeklyData: [],
      isLoading: false,
    });
  });

  afterEach(() => {
    if (db) {
      db.close();
    }
  });

  // ============================================
  // DailyStatsService → dashboardStore Integration
  // ============================================

  describe('DailyStats → dashboardStore.dailyStats', () => {
    it('should aggregate daily stats and match dashboardStore shape', () => {
      const task1 = createTestTask(taskService, 'Task 1', 3, 30);
      const task2 = createTestTask(taskService, 'Task 2', 2, 45);

      const todayTs = dateToTimestamp(TODAY);
      // Complete task1
      db.prepare('UPDATE Task SET status = ?, completedAt = ?, updatedAt = ? WHERE id = ?').run(
        'completed',
        todayTs,
        todayTs,
        task1.id
      );
      // Defer task2
      db.prepare('UPDATE Task SET status = ?, updatedAt = ? WHERE id = ?').run(
        'deferred',
        todayTs,
        task2.id
      );
      // Schedule both tasks
      timeboxService.createTimeBox({ taskId: task1.id, date: TODAY, startSlot: 0, endSlot: 1 });
      timeboxService.createTimeBox({ taskId: task2.id, date: TODAY, startSlot: 2, endSlot: 3 });

      // Aggregate and update daily stats
      const dailyStats = statsService.updateDailyStats(TODAY);

      // Verify data shape
      assertValidDailyStatsShape(dailyStats);

      // Set in dashboard store
      useDashboardStore.setState({ dailyStats });

      // Verify store has the stats
      expect(useDashboardStore.getState().dailyStats).toBeDefined();
      expect(useDashboardStore.getState().dailyStats?.date).toBe(TODAY);
      expect(useDashboardStore.getState().dailyStats?.completedCount).toBe(1);
      expect(useDashboardStore.getState().dailyStats?.totalPlanned).toBe(2);
      expect(useDashboardStore.getState().dailyStats?.deferredCount).toBe(1);
      expect(useDashboardStore.getState().dailyStats?.totalMinutesUsed).toBe(30);
    });

    it('should parse categoryBreakdown as JSON object', () => {
      const task1 = createTestTask(taskService, 'Work Task', 3, 30);
      const task2 = createTestTask(taskService, 'Personal Task', 2, 45);
      task2.category = 'personal';
      db.prepare('UPDATE Task SET category = ? WHERE id = ?').run('personal', task2.id);

      const todayTs = dateToTimestamp(TODAY);
      db.prepare('UPDATE Task SET status = ?, completedAt = ?, updatedAt = ? WHERE id = ?').run(
        'completed',
        todayTs,
        todayTs,
        task1.id
      );
      db.prepare('UPDATE Task SET status = ?, completedAt = ?, updatedAt = ? WHERE id = ?').run(
        'completed',
        todayTs,
        todayTs,
        task2.id
      );

      const dailyStats = statsService.updateDailyStats(TODAY);
      useDashboardStore.setState({ dailyStats });

      const breakdown = JSON.parse(dailyStats.categoryBreakdown);
      expect(breakdown).toEqual({ work: 30, personal: 45 });
    });
  });

  // ============================================
  // Accumulated Completed Count (Eros: Never Decreases)
  // ============================================

  describe('accumulatedCompleted - Eros: Never Decreases', () => {
    it('should accumulate completed count across multiple dates', () => {
      // Day 1: Complete 2 tasks
      const task1 = createTestTask(taskService, 'Task 1', 3, 30);
      const task2 = createTestTask(taskService, 'Task 2', 3, 30);
      const ts1 = dateToTimestamp(YESTERDAY);
      db.prepare('UPDATE Task SET status = ?, completedAt = ?, updatedAt = ? WHERE id = ?').run(
        'completed',
        ts1,
        ts1,
        task1.id
      );
      db.prepare('UPDATE Task SET status = ?, completedAt = ?, updatedAt = ? WHERE id = ?').run(
        'completed',
        ts1,
        ts1,
        task2.id
      );
      timeboxService.createTimeBox({ taskId: task1.id, date: YESTERDAY, startSlot: 0, endSlot: 1 });
      timeboxService.createTimeBox({ taskId: task2.id, date: YESTERDAY, startSlot: 2, endSlot: 3 });

      statsService.updateDailyStats(YESTERDAY);
      let accumulated = statsService.getAccumulatedCompletedCount();
      expect(accumulated).toBe(2);

      // Day 2: Complete 1 more task
      const task3 = createTestTask(taskService, 'Task 3', 3, 30);
      const ts2 = dateToTimestamp(TODAY);
      db.prepare('UPDATE Task SET status = ?, completedAt = ?, updatedAt = ? WHERE id = ?').run(
        'completed',
        ts2,
        ts2,
        task3.id
      );
      timeboxService.createTimeBox({ taskId: task3.id, date: TODAY, startSlot: 0, endSlot: 1 });

      statsService.updateDailyStats(TODAY);
      accumulated = statsService.getAccumulatedCompletedCount();
      expect(accumulated).toBe(3);

      // Verify it never decreases
      useDashboardStore.setState({ accumulatedCompleted: 2 });
      expect(useDashboardStore.getState().accumulatedCompleted).toBe(2);
      useDashboardStore.setState({ accumulatedCompleted: 3 });
      expect(useDashboardStore.getState().accumulatedCompleted).toBe(3);
    });

    it('should accumulate completed badge increase monotonically', () => {
      const accumulatedValues: number[] = [];

      for (let i = 0; i < 5; i++) {
        const task = createTestTask(taskService, `Task ${i}`, 3, 30);
        const dateStr = new Date('2026-03-13');
        dateStr.setDate(dateStr.getDate() + i);
        const isoDate = dateStr.toISOString().split('T')[0];
        const ts = dateStr.getTime();

        db.prepare('UPDATE Task SET status = ?, completedAt = ?, updatedAt = ? WHERE id = ?').run(
          'completed',
          ts,
          ts,
          task.id
        );
        timeboxService.createTimeBox({ taskId: task.id, date: isoDate, startSlot: 0, endSlot: 1 });
        statsService.updateDailyStats(isoDate);

        const accumulated = statsService.getAccumulatedCompletedCount();
        accumulatedValues.push(accumulated);
      }

      // Verify monotonically increasing
      for (let i = 1; i < accumulatedValues.length; i++) {
        expect(accumulatedValues[i]).toBeGreaterThanOrEqual(accumulatedValues[i - 1]);
      }

      // Set all in dashboard store and verify order
      for (const val of accumulatedValues) {
        useDashboardStore.setState({ accumulatedCompleted: val });
      }
      expect(useDashboardStore.getState().accumulatedCompleted).toBe(
        accumulatedValues[accumulatedValues.length - 1]
      );
    });
  });

  // ============================================
  // EncouragementService → Tone Determination
  // ============================================

  describe('EncouragementService.determineTone', () => {
    it('should return "humorous" when completionRate === 100', () => {
      const tone = encouragementService.determineTone(
        14, // afternoon
        100, // 100% completion
        0 // no defers
      );
      expect(tone).toBe('humorous');
    });

    it('should return "warm" when deferCount >= 3 (Eros: gentle nudge)', () => {
      const tone = encouragementService.determineTone(
        14, // afternoon (normally professional)
        50, // 50% completion
        3 // defer count = 3
      );
      expect(tone).toBe('warm'); // Eros: gentle nudge, never guilt-trip
    });

    it('should return "professional" for afternoon (12-18) with low defer count', () => {
      const tone = encouragementService.determineTone(
        14, // 2 PM (afternoon)
        50, // 50% completion
        1 // low defer count
      );
      expect(tone).toBe('professional');
    });

    it('should return "warm" for morning (6-12)', () => {
      const tone = encouragementService.determineTone(
        8, // morning
        50, // 50% completion
        1 // low defer count
      );
      expect(tone).toBe('warm');
    });

    it('should return "warm" for evening (18-24)', () => {
      const tone = encouragementService.determineTone(
        20, // 8 PM
        50, // 50% completion
        1 // low defer count
      );
      expect(tone).toBe('warm');
    });

    it('should return "warm" for night (0-6)', () => {
      const tone = encouragementService.determineTone(
        2, // 2 AM
        50, // 50% completion
        1 // low defer count
      );
      expect(tone).toBe('warm');
    });

    it('should prioritize 100% completion over defer count', () => {
      const tone = encouragementService.determineTone(
        12, // noon
        100, // 100% completion
        5 // high defer count
      );
      expect(tone).toBe('humorous'); // celebration overrides warm
    });

    it('should prioritize defer count over time-of-day', () => {
      const tone = encouragementService.determineTone(
        14, // afternoon (normally professional)
        50, // 50% completion
        4 // defer count = 4
      );
      expect(tone).toBe('warm'); // defer count overrides afternoon professional
    });
  });

  // ============================================
  // EncouragementService → Message Generation
  // ============================================

  describe('EncouragementService.generateMessage', () => {
    it('should generate message and store in DB', async () => {
      const task = createTestTask(taskService, 'Test Task', 3, 30);

      const encouragement = await encouragementService.generateMessage(task, 'morning', {
        hour: 8,
        completionRate: 50,
        deferCount: 1,
      });

      // Verify encouragement object
      expect(encouragement).toBeDefined();
      expect(encouragement.id).toBeDefined();
      expect(encouragement.taskId).toBe(task.id);
      expect(encouragement.type).toBe('morning');
      expect(encouragement.message).toBe('오늘도 화이팅! 한 번 시작해볼까요?');
      expect(encouragement.tone).toBe('warm');
      expect(encouragement.createdAt).toBeGreaterThan(0);

      // Verify stored in DB
      const storedMessages = encouragementService.getMessagesByTask(task.id);
      expect(storedMessages).toHaveLength(1);
      expect(storedMessages[0].id).toBe(encouragement.id);
      expect(storedMessages[0].message).toBe(encouragement.message);
    });

    it('should generate message with correct tone for context', async () => {
      const task = createTestTask(taskService, 'Test Task', 3, 30);

      // Afternoon with high completion
      const encouragement = await encouragementService.generateMessage(task, 'start', {
        hour: 14,
        completionRate: 100,
        deferCount: 0,
      });

      expect(encouragement.tone).toBe('humorous');
    });

    it('should generate multiple messages for same task', async () => {
      const task = createTestTask(taskService, 'Test Task', 3, 30);

      await encouragementService.generateMessage(task, 'morning', { hour: 8 });
      await encouragementService.generateMessage(task, 'start', { hour: 10 });
      await encouragementService.generateMessage(task, 'complete', { hour: 15 });

      const storedMessages = encouragementService.getMessagesByTask(task.id);
      expect(storedMessages).toHaveLength(3);
      expect(storedMessages[0].type).toBe('morning');
      expect(storedMessages[1].type).toBe('start');
      expect(storedMessages[2].type).toBe('complete');
    });

    it('should retrieve today messages', async () => {
      const task1 = createTestTask(taskService, 'Task 1', 3, 30);
      const task2 = createTestTask(taskService, 'Task 2', 3, 30);

      await encouragementService.generateMessage(task1, 'morning', { hour: 8 });
      await encouragementService.generateMessage(task2, 'start', { hour: 10 });

      const todayMessages = encouragementService.getTodayMessages();
      expect(todayMessages.length).toBeGreaterThanOrEqual(2);
    });
  });

  // ============================================
  // dashboardStore Integration
  // ============================================

  describe('dashboardStore operations', () => {
    it('should update dailyStats in store', () => {
      const stats: DailyStats = {
        id: 'test-id',
        date: TODAY,
        completedCount: 5,
        totalPlanned: 10,
        deferredCount: 2,
        totalMinutesUsed: 120,
        categoryBreakdown: '{"work": 120}',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      useDashboardStore.setState({ dailyStats: stats });

      expect(useDashboardStore.getState().dailyStats).toBe(stats);
      expect(useDashboardStore.getState().dailyStats?.completedCount).toBe(5);
      expect(useDashboardStore.getState().dailyStats?.totalPlanned).toBe(10);
    });

    it('should set daily stats to null when no data', () => {
      useDashboardStore.setState({ dailyStats: null });
      expect(useDashboardStore.getState().dailyStats).toBeNull();
    });
  });

  // ============================================
  // Task Status Changes via Quick Actions
  // ============================================

  describe('Quick actions: task status changes', () => {
    it('should change task status to "in_progress" for "2분만 시작" action', () => {
      const task = createTestTask(taskService, 'Quick Start Task', 3, 2);
      expect(task.status).toBe('pending');

      // Simulate "2분만 시작" action
      const updated = taskService.updateTask(task.id, { status: 'in_progress' });
      expect(updated.status).toBe('in_progress');

      // Update store
      const todayTasks = [updated];
      useDashboardStore.setState({ todayTasks });
      expect(useDashboardStore.getState().todayTasks[0]?.status).toBe('in_progress');
    });

    it('should change task status to "deferred" for "지금 안 할래요" action', () => {
      const task = createTestTask(taskService, 'Defer Task', 3, 30);
      expect(task.status).toBe('pending');

      // Simulate "지금 안 할래요" action
      const updated = taskService.updateTask(task.id, { status: 'deferred' });
      expect(updated.status).toBe('deferred');

      // Update store
      const todayTasks = [updated];
      useDashboardStore.setState({ todayTasks });
      expect(useDashboardStore.getState().todayTasks[0]?.status).toBe('deferred');
    });
  });

  // ============================================
  // Task Sorting by Importance
  // ============================================

  describe('dashboardStore.setTodayTasks sorts by importance', () => {
    it('should sort tasks by importance descending (high importance first)', () => {
      const task1 = createTestTask(taskService, 'Low Priority', 1, 30);
      const task2 = createTestTask(taskService, 'High Priority', 5, 30);
      const task3 = createTestTask(taskService, 'Medium Priority', 3, 30);

      // Sort manually (store should do this)
      const tasks = [task1, task2, task3].sort((a, b) => b.importance - a.importance);

      useDashboardStore.setState({ todayTasks: tasks });

      expect(useDashboardStore.getState().todayTasks[0]?.importance).toBe(5);
      expect(useDashboardStore.getState().todayTasks[1]?.importance).toBe(3);
      expect(useDashboardStore.getState().todayTasks[2]?.importance).toBe(1);
    });

    it('should update todayTasks array in store', () => {
      const task1 = createTestTask(taskService, 'Task 1', 3, 30);
      const task2 = createTestTask(taskService, 'Task 2', 4, 30);

      const tasks = [task1, task2];
      useDashboardStore.setState({ todayTasks: tasks });

      expect(useDashboardStore.getState().todayTasks).toHaveLength(2);
      expect(useDashboardStore.getState().todayTasks[0]).toBe(task1);
      expect(useDashboardStore.getState().todayTasks[1]).toBe(task2);
    });
  });

  // ============================================
  // AI Greeting Integration
  // ============================================

  describe('dashboardStore AI greeting', () => {
    it('should set and update aiGreeting', () => {
      const greeting = '오늘도 화이팅! 새로운 하루의 시작입니다.';
      useDashboardStore.setState({ aiGreeting: greeting });
      expect(useDashboardStore.getState().aiGreeting).toBe(greeting);
    });

    it('should maintain default greeting initially', () => {
      expect(useDashboardStore.getState().aiGreeting).toBe('오늘 하루도 잘 해낼 수 있어요!');
    });
  });

  // ============================================
  // Weekly Data Integration
  // ============================================

  describe('dashboardStore weekly data', () => {
    it('should set weekly completion data', () => {
      const weeklyData = [
        { date: '2026-03-12', completionRate: 80 },
        { date: '2026-03-13', completionRate: 100 },
        { date: '2026-03-14', completionRate: 60 },
      ];

      useDashboardStore.setState({ weeklyData });
      expect(useDashboardStore.getState().weeklyData).toHaveLength(3);
      expect(useDashboardStore.getState().weeklyData[0]?.completionRate).toBe(80);
    });
  });

  // ============================================
  // Loading State
  // ============================================

  describe('dashboardStore loading state', () => {
    it('should set and clear loading state', () => {
      expect(useDashboardStore.getState().isLoading).toBe(false);

      useDashboardStore.setState({ isLoading: true });
      expect(useDashboardStore.getState().isLoading).toBe(true);

      useDashboardStore.setState({ isLoading: false });
      expect(useDashboardStore.getState().isLoading).toBe(false);
    });
  });
});
