/**
 * @TASK P3-S2-V - Kanban Board Integration Tests
 * @SPEC docs/planning/04-database-design.md
 * @TEST src/__tests__/integration/kanban-integration.test.ts
 *
 * Integration tests for complete Kanban data flow:
 * TimeBoxCrudService → AiScheduleService → useTimeboxStore → TimeGrid UI
 *
 * Tests verify:
 * 1. Backend data shapes match store expectations
 * 2. TimeBox CRUD operations work correctly
 * 3. Slot assignment and overlap detection function
 * 4. AI schedule generation (with mocked Claude API)
 * 5. Store filters timeboxes by selected date
 * 6. UI receives properly formatted data
 * 7. Time conflict prevention works
 * 8. Performance with bulk operations
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Database from 'better-sqlite3';
import { runMigrations } from '../../main/database/migrations';
import { TimeBoxCrudService } from '../../main/services/timebox-crud';
import { TaskCrudService } from '../../main/services/task-crud';
import { AiScheduleService } from '../../main/services/ai-schedule';
import type { TimeBox, Task } from '@shared/types';
import { useTimeboxStore } from '@renderer/stores/timeboxStore';

// ============================================
// Test Utilities
// ============================================

/**
 * Create test task with sensible defaults
 */
function createTestTask(taskService: TaskCrudService, title: string = 'Test Task'): Task {
  return taskService.createTask({
    title,
    description: `Description for ${title}`,
    importance: 3,
    estimatedMinutes: 30,
    category: 'work',
    status: 'pending',
  });
}

/**
 * Verify TimeBox data shape matches interface
 */
function assertValidTimeBoxShape(tb: TimeBox): void {
  expect(tb).toBeDefined();
  expect(tb.id).toBeDefined();
  expect(typeof tb.id).toBe('string');
  expect(tb.taskId).toBeDefined();
  expect(typeof tb.taskId).toBe('string');
  expect(tb.date).toBeDefined();
  expect(tb.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  expect(tb.startSlot).toBeDefined();
  expect(typeof tb.startSlot).toBe('number');
  expect(tb.startSlot).toBeGreaterThanOrEqual(0);
  expect(tb.startSlot).toBeLessThanOrEqual(47);
  expect(tb.endSlot).toBeDefined();
  expect(typeof tb.endSlot).toBe('number');
  expect(tb.endSlot).toBeGreaterThanOrEqual(tb.startSlot);
  expect(tb.endSlot).toBeLessThanOrEqual(47);
  expect(tb.status).toBeDefined();
  expect(['scheduled', 'in_progress', 'completed', 'skipped']).toContain(tb.status);
  expect(tb.aiSuggested).toBeDefined();
  expect(typeof tb.aiSuggested).toBe('boolean');
  expect(tb.createdAt).toBeGreaterThan(0);
  expect(tb.updatedAt).toBeGreaterThan(0);
}

// ============================================
// Test Suites
// ============================================

describe('Kanban Integration Tests', () => {
  let db: Database.Database;
  let timeboxService: TimeBoxCrudService;
  let taskService: TaskCrudService;
  let aiScheduleService: AiScheduleService;
  let claudeService: any;

  const testDate = '2025-06-20';

  beforeEach(() => {
    // Create fresh in-memory DB for each test
    db = new Database(':memory:');
    db.pragma('foreign_keys = ON');
    runMigrations(db);

    timeboxService = new TimeBoxCrudService(db);
    taskService = new TaskCrudService(db);

    // Create mock Claude API service (don't instantiate real client)
    claudeService = {
      generateSchedule: vi.fn().mockResolvedValue([]),
      testConnection: vi.fn().mockResolvedValue(true),
      generateEncouragement: vi.fn().mockResolvedValue('Test message'),
      estimateTaskMetadata: vi.fn().mockResolvedValue({
        estimatedMinutes: 30,
        importance: 3,
        category: 'work',
      }),
      generateInsight: vi.fn().mockResolvedValue('Test insight'),
      splitTask: vi.fn().mockResolvedValue([]),
      chat: vi.fn().mockResolvedValue('Test response'),
    } as unknown as ClaudeApiService;

    aiScheduleService = new AiScheduleService(taskService, timeboxService, claudeService);

    // Reset timeboxStore
    useTimeboxStore.setState({
      timeboxes: [],
      selectedDate: testDate,
      isLoading: false,
    });
  });

  afterEach(() => {
    db.close();
    vi.clearAllMocks();
  });

  // ============================================
  // Backend Data Flow Tests
  // ============================================

  describe('Backend Data Flow', () => {
    it('Test 1: TimeBoxCrudService.getTimeBoxesByDate returns correctly shaped data', () => {
      const task = createTestTask(taskService, 'Task 1');

      const created = timeboxService.createTimeBox({
        taskId: task.id,
        date: testDate,
        startSlot: 18,
        endSlot: 20,
        aiSuggested: false,
      });

      const fetched = timeboxService.getTimeBoxesByDate(testDate);

      expect(fetched).toHaveLength(1);
      expect(fetched[0]).toEqual(created);
      assertValidTimeBoxShape(fetched[0]);
    });

    it('Test 2: TimeBoxCrudService.createTimeBox assigns correct slot', () => {
      const task = createTestTask(taskService, 'Task with slots');

      const tb = timeboxService.createTimeBox({
        taskId: task.id,
        date: testDate,
        startSlot: 18,
        endSlot: 22,
        aiSuggested: false,
      });

      expect(tb.startSlot).toBe(18);
      expect(tb.endSlot).toBe(22);
      expect(tb.status).toBe('scheduled');
      expect(tb.aiSuggested).toBe(false);
    });

    it('Test 3: TimeBoxCrudService.updateTimeBox moves slot correctly', () => {
      const task = createTestTask(taskService, 'Task to move');

      const tb1 = timeboxService.createTimeBox({
        taskId: task.id,
        date: testDate,
        startSlot: 18,
        endSlot: 20,
      });

      const updated = timeboxService.updateTimeBox(tb1.id, {
        startSlot: 28,
        endSlot: 30,
      });

      expect(updated.startSlot).toBe(28);
      expect(updated.endSlot).toBe(30);
      expect(updated.id).toBe(tb1.id);
      expect(updated.updatedAt).toBeGreaterThanOrEqual(tb1.updatedAt);
    });

    it('Test 4: TimeBoxCrudService.checkOverlap prevents double-booking', () => {
      const task1 = createTestTask(taskService, 'Task 1');
      const task2 = createTestTask(taskService, 'Task 2');

      // Create first timebox at slots 18-20
      timeboxService.createTimeBox({
        taskId: task1.id,
        date: testDate,
        startSlot: 18,
        endSlot: 20,
      });

      // Attempt to create overlapping timebox should fail
      expect(() => {
        timeboxService.createTimeBox({
          taskId: task2.id,
          date: testDate,
          startSlot: 19,
          endSlot: 21,
        });
      }).toThrow(/Overlap detected/);
    });

    it('Test 5: AiScheduleService.collectUnscheduledTasks returns correct list', () => {
      const task1 = taskService.createTask({
        title: 'Pending task',
        status: 'pending',
        estimatedMinutes: 30,
        importance: 3,
      });

      const task2 = taskService.createTask({
        title: 'Deferred task',
        status: 'deferred',
        estimatedMinutes: 45,
        importance: 2,
      });

      const task3 = taskService.createTask({
        title: 'Completed task',
        status: 'completed',
        estimatedMinutes: 60,
        importance: 4,
      });

      const unscheduled = aiScheduleService.collectUnscheduledTasks(testDate);

      expect(unscheduled).toHaveLength(2);
      expect(unscheduled.map((t) => t.id)).toContain(task1.id);
      expect(unscheduled.map((t) => t.id)).toContain(task2.id);
      expect(unscheduled.map((t) => t.id)).not.toContain(task3.id);
    });

    it('Test 6: AiScheduleService.applySchedule creates timeboxes and skips overlaps', async () => {
      const task1 = createTestTask(taskService, 'Task 1');
      const task2 = createTestTask(taskService, 'Task 2');
      const task3 = createTestTask(taskService, 'Task 3');

      // Create one timebox first at slots 20-22
      timeboxService.createTimeBox({
        taskId: task1.id,
        date: testDate,
        startSlot: 20,
        endSlot: 22,
      });

      // Propose schedule with one overlapping, one new (no overlap)
      const slots = [
        {
          taskId: task2.id,
          date: testDate,
          startSlot: 20,
          endSlot: 22,
        }, // overlaps with existing
        {
          taskId: task3.id,
          date: testDate,
          startSlot: 28,
          endSlot: 30,
        }, // no overlap, should be created
      ];

      const result = aiScheduleService.applySchedule(slots);

      expect(result.created).toBe(1);
      expect(result.skipped).toBe(1);

      const allBoxes = timeboxService.getTimeBoxesByDate(testDate);
      expect(allBoxes).toHaveLength(2);
      expect(allBoxes.filter((tb) => tb.status === 'scheduled')).toHaveLength(2);
    });
  });

  // ============================================
  // Store → UI Compatibility Tests
  // ============================================

  describe('Store → UI Compatibility', () => {
    it('Test 7: timeboxStore with timeboxes provides correct data for TimeGrid', () => {
      const task = createTestTask(taskService, 'Task for grid');

      const tb1 = timeboxService.createTimeBox({
        taskId: task.id,
        date: testDate,
        startSlot: 18,
        endSlot: 20,
      });

      const tb2 = timeboxService.createTimeBox({
        taskId: task.id,
        date: testDate,
        startSlot: 28,
        endSlot: 30,
      });

      useTimeboxStore.setState({
        timeboxes: [tb1, tb2],
        selectedDate: testDate,
      });

      const state = useTimeboxStore.getState();
      expect(state.timeboxes).toHaveLength(2);
      expect(state.selectedDate).toBe(testDate);
      expect(state.timeboxes[0].startSlot).toBe(18);
      expect(state.timeboxes[1].startSlot).toBe(28);
    });

    it('Test 8: timeboxStore.selectedDate change filters timeboxes correctly', () => {
      const task = createTestTask(taskService, 'Task with dates');

      const date1 = '2025-06-20';
      const date2 = '2025-06-21';

      const tb1 = timeboxService.createTimeBox({
        taskId: task.id,
        date: date1,
        startSlot: 18,
        endSlot: 20,
      });

      const tb2 = timeboxService.createTimeBox({
        taskId: task.id,
        date: date2,
        startSlot: 18,
        endSlot: 20,
      });

      // Set store with both dates
      useTimeboxStore.setState({
        timeboxes: [tb1, tb2],
        selectedDate: date1,
      });

      let state = useTimeboxStore.getState();
      expect(state.selectedDate).toBe(date1);

      // Filter by selected date in UI layer (simulated)
      const filteredForDate1 = state.timeboxes.filter((tb) => tb.date === state.selectedDate);
      expect(filteredForDate1).toHaveLength(1);
      expect(filteredForDate1[0].date).toBe(date1);

      // Change selected date
      useTimeboxStore.setState({ selectedDate: date2 });

      state = useTimeboxStore.getState();
      const filteredForDate2 = state.timeboxes.filter((tb) => tb.date === state.selectedDate);
      expect(filteredForDate2).toHaveLength(1);
      expect(filteredForDate2[0].date).toBe(date2);
    });
  });

  // ============================================
  // Time Conflict Prevention Tests
  // ============================================

  describe('Time Conflict Prevention', () => {
    it('Test 9: Create timebox at slot 20 → attempt same slot → error/overlap detected', () => {
      const task1 = createTestTask(taskService, 'Task occupying slot 20');
      const task2 = createTestTask(taskService, 'Task trying slot 20');

      // Create at slot 20-22
      timeboxService.createTimeBox({
        taskId: task1.id,
        date: testDate,
        startSlot: 20,
        endSlot: 22,
      });

      // Attempt to create at same slot should fail
      expect(() => {
        timeboxService.createTimeBox({
          taskId: task2.id,
          date: testDate,
          startSlot: 20,
          endSlot: 22,
        });
      }).toThrow(/Overlap detected/);
    });

    it('Test 10: Skipped timebox at slot 20 → new timebox at same slot → allowed', () => {
      const task1 = createTestTask(taskService, 'Task to skip');
      const task2 = createTestTask(taskService, 'Task after skip');

      // Create and mark as skipped
      const tb1 = timeboxService.createTimeBox({
        taskId: task1.id,
        date: testDate,
        startSlot: 20,
        endSlot: 22,
      });

      timeboxService.updateTimeBox(tb1.id, { status: 'skipped' });

      // Now creating at same slot should succeed (skipped slots don't block)
      const tb2 = timeboxService.createTimeBox({
        taskId: task2.id,
        date: testDate,
        startSlot: 20,
        endSlot: 22,
      });

      expect(tb2).toBeDefined();
      expect(tb2.startSlot).toBe(20);

      const allBoxes = timeboxService.getTimeBoxesByDate(testDate);
      expect(allBoxes).toHaveLength(2);
      expect(allBoxes.filter((tb) => tb.status === 'skipped')).toHaveLength(1);
      expect(allBoxes.filter((tb) => tb.status === 'scheduled')).toHaveLength(1);
    });
  });

  // ============================================
  // Performance Tests
  // ============================================

  describe('Performance', () => {
    it('Test 11: Create 50 timeboxes → getTimeBoxesByDate completes < 50ms', () => {
      const tasks: Task[] = [];
      for (let i = 0; i < 50; i++) {
        tasks.push(createTestTask(taskService, `Task ${i}`));
      }

      // Create 50 timeboxes (scattered across date to avoid overlaps)
      for (let i = 0; i < 50; i++) {
        const slot = (i % 24) * 2; // Use different dates to avoid overlap
        const date = `2025-06-${String(20 + Math.floor(i / 24)).padStart(2, '0')}`;

        timeboxService.createTimeBox({
          taskId: tasks[i].id,
          date,
          startSlot: slot,
          endSlot: slot + 1,
        });
      }

      // Measure performance of fetching all timeboxes for a date with many records
      const startTime = performance.now();
      const result = timeboxService.getTimeBoxesByDate('2025-06-20');
      const endTime = performance.now();

      const duration = endTime - startTime;
      expect(duration).toBeLessThan(50);
      expect(result.length).toBeGreaterThan(0);
    });
  });

  // ============================================
  // Edge Cases
  // ============================================

  describe('Edge Cases', () => {
    it('Should handle slot validation errors', () => {
      const task = createTestTask(taskService, 'Task');

      expect(() => {
        timeboxService.createTimeBox({
          taskId: task.id,
          date: testDate,
          startSlot: -1,
          endSlot: 20,
        });
      }).toThrow(/Invalid startSlot/);

      expect(() => {
        timeboxService.createTimeBox({
          taskId: task.id,
          date: testDate,
          startSlot: 25,
          endSlot: 50,
        });
      }).toThrow(/Invalid endSlot/);

      expect(() => {
        timeboxService.createTimeBox({
          taskId: task.id,
          date: testDate,
          startSlot: 30,
          endSlot: 20,
        });
      }).toThrow(/startSlot.*must be <= endSlot/);
    });

    it('Should handle multiple timeboxes at different slots on same date', () => {
      const task1 = createTestTask(taskService, 'Morning task');
      const task2 = createTestTask(taskService, 'Afternoon task');
      const task3 = createTestTask(taskService, 'Evening task');

      const tb1 = timeboxService.createTimeBox({
        taskId: task1.id,
        date: testDate,
        startSlot: 18,
        endSlot: 20,
      });

      const tb2 = timeboxService.createTimeBox({
        taskId: task2.id,
        date: testDate,
        startSlot: 28,
        endSlot: 30,
      });

      const tb3 = timeboxService.createTimeBox({
        taskId: task3.id,
        date: testDate,
        startSlot: 36,
        endSlot: 38,
      });

      const all = timeboxService.getTimeBoxesByDate(testDate);
      expect(all).toHaveLength(3);
      expect(all[0].startSlot).toBe(18);
      expect(all[1].startSlot).toBe(28);
      expect(all[2].startSlot).toBe(36);
    });

    it('Should handle status transitions correctly', () => {
      const task = createTestTask(taskService, 'Task for status change');

      const tb = timeboxService.createTimeBox({
        taskId: task.id,
        date: testDate,
        startSlot: 18,
        endSlot: 20,
      });

      expect(tb.status).toBe('scheduled');

      const inProgress = timeboxService.updateTimeBox(tb.id, { status: 'in_progress' });
      expect(inProgress.status).toBe('in_progress');

      const completed = timeboxService.updateTimeBox(tb.id, { status: 'completed' });
      expect(completed.status).toBe('completed');

      const skipped = timeboxService.updateTimeBox(tb.id, { status: 'skipped' });
      expect(skipped.status).toBe('skipped');
    });

    it('Should handle AI-suggested flag correctly', () => {
      const task = createTestTask(taskService, 'AI suggested task');

      const tb = timeboxService.createTimeBox({
        taskId: task.id,
        date: testDate,
        startSlot: 18,
        endSlot: 20,
        aiSuggested: true,
      });

      expect(tb.aiSuggested).toBe(true);
      assertValidTimeBoxShape(tb);
    });

    it('Should preserve timebox order by slot when fetching', () => {
      const tasks = Array.from({ length: 5 }, (_, i) => createTestTask(taskService, `Task ${i}`));

      // Create in reverse slot order
      const slots = [38, 36, 28, 20, 18];
      const tbs = slots.map((slot, i) =>
        timeboxService.createTimeBox({
          taskId: tasks[i].id,
          date: testDate,
          startSlot: slot,
          endSlot: slot + 1,
        }),
      );

      const fetched = timeboxService.getTimeBoxesByDate(testDate);

      // Should be sorted by startSlot ASC
      expect(fetched[0].startSlot).toBe(18);
      expect(fetched[1].startSlot).toBe(20);
      expect(fetched[2].startSlot).toBe(28);
      expect(fetched[3].startSlot).toBe(36);
      expect(fetched[4].startSlot).toBe(38);
    });
  });
});
