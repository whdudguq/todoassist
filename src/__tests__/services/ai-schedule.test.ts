/**
 * @TASK P3-R2 - AI Schedule Auto-Generation Service (TDD_MODE:RED_FIRST)
 * @SPEC docs/planning/02-trd.md#AI-Schedule
 * @TEST src/__tests__/services/ai-schedule.test.ts
 *
 * Tests for AiScheduleService
 * - collectUnscheduledTasks: tasks with no timebox for given date
 * - generateAiSchedule: calls Claude API, returns proposed slots
 * - applySchedule: creates timeboxes from AI slots (overlap check)
 * - Lunch break exclusion (slots 24-25 = 12:00-13:00)
 * - Work hours boundary (default 09:00-18:00 = slots 18-35)
 * - Existing timeboxes preserved (only fill gaps)
 * - Conflict resolution (skip overlapping slots)
 * - Mock ClaudeApiService (never real API calls)
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Database from 'better-sqlite3';
import { runMigrations } from '../../main/database/migrations';
import { TaskCrudService } from '../../main/services/task-crud';
import { TimeBoxCrudService } from '../../main/services/timebox-crud';
import { ClaudeApiService } from '../../main/services/claude-api';
import { AiScheduleService, ScheduleSlot } from '../../main/services/ai-schedule';
import type { Task } from '@shared/types';

// ============================================
// Mock ClaudeApiService
// ============================================
function createMockClaudeService(
  scheduleResponse: Array<{ taskId: string; date: string; startSlot: number; endSlot: number }> = [],
): ClaudeApiService {
  return {
    generateSchedule: vi.fn().mockResolvedValue(scheduleResponse),
    generateEncouragement: vi.fn(),
    estimateTaskMetadata: vi.fn(),
    generateInsight: vi.fn(),
    splitTask: vi.fn(),
    chat: vi.fn(),
    testConnection: vi.fn(),
  } as unknown as ClaudeApiService;
}

describe('AiScheduleService', () => {
  let db: Database.Database;
  let taskService: TaskCrudService;
  let timeboxService: TimeBoxCrudService;
  let mockClaude: ClaudeApiService;
  let service: AiScheduleService;

  const TEST_DATE = '2026-03-18';

  beforeEach(() => {
    db = new Database(':memory:');
    db.pragma('foreign_keys = ON');
    runMigrations(db);
    taskService = new TaskCrudService(db);
    timeboxService = new TimeBoxCrudService(db);
    mockClaude = createMockClaudeService();
    service = new AiScheduleService(taskService, timeboxService, mockClaude);
  });

  afterEach(() => {
    if (db) {
      db.close();
    }
  });

  // ============================================
  // collectUnscheduledTasks
  // ============================================
  describe('collectUnscheduledTasks', () => {
    it('should return pending tasks with no timebox for the date', () => {
      const task = taskService.createTask({
        title: 'Unscheduled Task',
        status: 'pending',
        estimatedMinutes: 60,
        importance: 3,
      });

      const result = service.collectUnscheduledTasks(TEST_DATE);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(task.id);
    });

    it('should return deferred tasks as well', () => {
      taskService.createTask({
        title: 'Deferred Task',
        status: 'deferred',
        estimatedMinutes: 30,
        importance: 2,
      });

      const result = service.collectUnscheduledTasks(TEST_DATE);

      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('Deferred Task');
    });

    it('should NOT return completed tasks', () => {
      const task = taskService.createTask({
        title: 'Completed Task',
        status: 'pending',
        estimatedMinutes: 30,
        importance: 3,
      });
      taskService.updateTask(task.id, { status: 'completed' });

      const result = service.collectUnscheduledTasks(TEST_DATE);

      expect(result).toHaveLength(0);
    });

    it('should NOT return tasks that already have a timebox for the date', () => {
      const task = taskService.createTask({
        title: 'Already Scheduled',
        status: 'pending',
        estimatedMinutes: 30,
        importance: 3,
      });
      timeboxService.createTimeBox({
        taskId: task.id,
        date: TEST_DATE,
        startSlot: 18,
        endSlot: 19,
      });

      const result = service.collectUnscheduledTasks(TEST_DATE);

      expect(result).toHaveLength(0);
    });

    it('should return tasks that have a timebox on a DIFFERENT date', () => {
      const task = taskService.createTask({
        title: 'Scheduled on another day',
        status: 'pending',
        estimatedMinutes: 30,
        importance: 3,
      });
      timeboxService.createTimeBox({
        taskId: task.id,
        date: '2026-03-19',
        startSlot: 18,
        endSlot: 19,
      });

      const result = service.collectUnscheduledTasks(TEST_DATE);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(task.id);
    });

    it('should return multiple unscheduled tasks', () => {
      taskService.createTask({ title: 'Task A', status: 'pending', estimatedMinutes: 30, importance: 3 });
      taskService.createTask({ title: 'Task B', status: 'pending', estimatedMinutes: 60, importance: 5 });
      taskService.createTask({ title: 'Task C', status: 'deferred', estimatedMinutes: 90, importance: 1 });

      const result = service.collectUnscheduledTasks(TEST_DATE);

      expect(result).toHaveLength(3);
    });
  });

  // ============================================
  // generateAiSchedule
  // ============================================
  describe('generateAiSchedule', () => {
    it('should call ClaudeApiService.generateSchedule with unscheduled tasks', async () => {
      const task = taskService.createTask({
        title: 'Need Schedule',
        status: 'pending',
        estimatedMinutes: 60,
        importance: 4,
      });

      const mockResponse = [
        { taskId: task.id, date: TEST_DATE, startSlot: 18, endSlot: 19 },
      ];
      (mockClaude.generateSchedule as ReturnType<typeof vi.fn>).mockResolvedValue(mockResponse);

      const slots = await service.generateAiSchedule(TEST_DATE);

      expect(mockClaude.generateSchedule).toHaveBeenCalledTimes(1);
      expect(slots).toHaveLength(1);
      expect(slots[0].taskId).toBe(task.id);
    });

    it('should use default work hours (slots 18-35 = 09:00-17:30)', async () => {
      taskService.createTask({
        title: 'Work Task',
        status: 'pending',
        estimatedMinutes: 30,
        importance: 3,
      });

      (mockClaude.generateSchedule as ReturnType<typeof vi.fn>).mockResolvedValue([]);

      await service.generateAiSchedule(TEST_DATE);

      const callArgs = (mockClaude.generateSchedule as ReturnType<typeof vi.fn>).mock.calls[0];
      // Should pass work hours info: 09:00 and 17:30 (or 18:00)
      expect(callArgs[1]).toBe('09:00');
      expect(callArgs[2]).toBe('17:30');
    });

    it('should accept custom work hour slots', async () => {
      taskService.createTask({
        title: 'Custom Hours',
        status: 'pending',
        estimatedMinutes: 30,
        importance: 3,
      });

      (mockClaude.generateSchedule as ReturnType<typeof vi.fn>).mockResolvedValue([]);

      await service.generateAiSchedule(TEST_DATE, 16, 40);

      const callArgs = (mockClaude.generateSchedule as ReturnType<typeof vi.fn>).mock.calls[0];
      // Custom: slot 16 = 08:00, slot 40 = 20:00
      expect(callArgs[1]).toBe('08:00');
      expect(callArgs[2]).toBe('20:00');
    });

    it('should return empty array when no unscheduled tasks exist', async () => {
      const slots = await service.generateAiSchedule(TEST_DATE);

      expect(mockClaude.generateSchedule).not.toHaveBeenCalled();
      expect(slots).toHaveLength(0);
    });

    it('should filter out AI-proposed slots that fall in lunch break (24-25)', async () => {
      const task = taskService.createTask({
        title: 'Lunch Conflict',
        status: 'pending',
        estimatedMinutes: 60,
        importance: 3,
      });

      const mockResponse = [
        { taskId: task.id, date: TEST_DATE, startSlot: 23, endSlot: 24 }, // overlaps lunch slot 24
        { taskId: task.id, date: TEST_DATE, startSlot: 26, endSlot: 27 }, // after lunch, OK
      ];
      (mockClaude.generateSchedule as ReturnType<typeof vi.fn>).mockResolvedValue(mockResponse);

      const slots = await service.generateAiSchedule(TEST_DATE);

      // Slot [23,24] overlaps lunch (24-25), should be filtered
      expect(slots).toHaveLength(1);
      expect(slots[0].startSlot).toBe(26);
    });

    it('should filter out AI-proposed slots outside work hours', async () => {
      const task = taskService.createTask({
        title: 'Early Bird',
        status: 'pending',
        estimatedMinutes: 30,
        importance: 3,
      });

      const mockResponse = [
        { taskId: task.id, date: TEST_DATE, startSlot: 10, endSlot: 11 }, // before 09:00
        { taskId: task.id, date: TEST_DATE, startSlot: 20, endSlot: 21 }, // within work hours
        { taskId: task.id, date: TEST_DATE, startSlot: 36, endSlot: 37 }, // after 17:30
      ];
      (mockClaude.generateSchedule as ReturnType<typeof vi.fn>).mockResolvedValue(mockResponse);

      const slots = await service.generateAiSchedule(TEST_DATE);

      expect(slots).toHaveLength(1);
      expect(slots[0].startSlot).toBe(20);
    });

    it('should filter out slots that overlap with existing timeboxes', async () => {
      const existingTask = taskService.createTask({
        title: 'Already Booked',
        status: 'pending',
        estimatedMinutes: 30,
        importance: 5,
      });
      timeboxService.createTimeBox({
        taskId: existingTask.id,
        date: TEST_DATE,
        startSlot: 20,
        endSlot: 21,
      });

      const newTask = taskService.createTask({
        title: 'Need Slot',
        status: 'pending',
        estimatedMinutes: 60,
        importance: 3,
      });

      const mockResponse = [
        { taskId: newTask.id, date: TEST_DATE, startSlot: 20, endSlot: 21 }, // conflicts
        { taskId: newTask.id, date: TEST_DATE, startSlot: 22, endSlot: 23 }, // OK
      ];
      (mockClaude.generateSchedule as ReturnType<typeof vi.fn>).mockResolvedValue(mockResponse);

      const slots = await service.generateAiSchedule(TEST_DATE);

      expect(slots).toHaveLength(1);
      expect(slots[0].startSlot).toBe(22);
    });
  });

  // ============================================
  // applySchedule
  // ============================================
  describe('applySchedule', () => {
    it('should create timeboxes from proposed slots', () => {
      const task = taskService.createTask({
        title: 'Apply Me',
        status: 'pending',
        estimatedMinutes: 60,
        importance: 3,
      });

      const slots: ScheduleSlot[] = [
        { taskId: task.id, date: TEST_DATE, startSlot: 18, endSlot: 19 },
        { taskId: task.id, date: TEST_DATE, startSlot: 20, endSlot: 21 },
      ];

      const result = service.applySchedule(slots);

      expect(result.created).toBe(2);
      expect(result.skipped).toBe(0);

      const boxes = timeboxService.getTimeBoxesByDate(TEST_DATE);
      expect(boxes).toHaveLength(2);
      expect(boxes[0].aiSuggested).toBe(true);
    });

    it('should skip slots that overlap with existing timeboxes', () => {
      const existingTask = taskService.createTask({
        title: 'Existing',
        status: 'pending',
        estimatedMinutes: 30,
        importance: 5,
      });
      timeboxService.createTimeBox({
        taskId: existingTask.id,
        date: TEST_DATE,
        startSlot: 18,
        endSlot: 19,
      });

      const newTask = taskService.createTask({
        title: 'New',
        status: 'pending',
        estimatedMinutes: 60,
        importance: 3,
      });

      const slots: ScheduleSlot[] = [
        { taskId: newTask.id, date: TEST_DATE, startSlot: 18, endSlot: 19 }, // overlaps
        { taskId: newTask.id, date: TEST_DATE, startSlot: 20, endSlot: 21 }, // OK
      ];

      const result = service.applySchedule(slots);

      expect(result.created).toBe(1);
      expect(result.skipped).toBe(1);
    });

    it('should preserve existing timeboxes (not modify them)', () => {
      const existingTask = taskService.createTask({
        title: 'Existing',
        status: 'pending',
        estimatedMinutes: 30,
        importance: 5,
      });
      const existingBox = timeboxService.createTimeBox({
        taskId: existingTask.id,
        date: TEST_DATE,
        startSlot: 18,
        endSlot: 19,
      });

      const newTask = taskService.createTask({
        title: 'New',
        status: 'pending',
        estimatedMinutes: 30,
        importance: 3,
      });

      const slots: ScheduleSlot[] = [
        { taskId: newTask.id, date: TEST_DATE, startSlot: 22, endSlot: 23 },
      ];

      service.applySchedule(slots);

      // Existing box should be untouched
      const preserved = timeboxService.getTimeBoxById(existingBox.id);
      expect(preserved).not.toBeNull();
      expect(preserved!.startSlot).toBe(18);
      expect(preserved!.endSlot).toBe(19);
    });

    it('should set aiSuggested=true on created timeboxes', () => {
      const task = taskService.createTask({
        title: 'AI Suggested',
        status: 'pending',
        estimatedMinutes: 30,
        importance: 3,
      });

      const slots: ScheduleSlot[] = [
        { taskId: task.id, date: TEST_DATE, startSlot: 26, endSlot: 27 },
      ];

      service.applySchedule(slots);

      const boxes = timeboxService.getTimeBoxesByDate(TEST_DATE);
      expect(boxes).toHaveLength(1);
      expect(boxes[0].aiSuggested).toBe(true);
    });

    it('should return { created: 0, skipped: 0 } for empty slots array', () => {
      const result = service.applySchedule([]);

      expect(result.created).toBe(0);
      expect(result.skipped).toBe(0);
    });

    it('should handle multiple slots with some conflicts', () => {
      const existingTask = taskService.createTask({
        title: 'Existing',
        status: 'pending',
        estimatedMinutes: 30,
        importance: 5,
      });
      timeboxService.createTimeBox({
        taskId: existingTask.id,
        date: TEST_DATE,
        startSlot: 18,
        endSlot: 19,
      });
      timeboxService.createTimeBox({
        taskId: existingTask.id,
        date: TEST_DATE,
        startSlot: 26,
        endSlot: 27,
      });

      const newTask = taskService.createTask({
        title: 'New',
        status: 'pending',
        estimatedMinutes: 120,
        importance: 3,
      });

      const slots: ScheduleSlot[] = [
        { taskId: newTask.id, date: TEST_DATE, startSlot: 18, endSlot: 19 }, // conflict
        { taskId: newTask.id, date: TEST_DATE, startSlot: 20, endSlot: 21 }, // OK
        { taskId: newTask.id, date: TEST_DATE, startSlot: 26, endSlot: 27 }, // conflict
        { taskId: newTask.id, date: TEST_DATE, startSlot: 28, endSlot: 29 }, // OK
      ];

      const result = service.applySchedule(slots);

      expect(result.created).toBe(2);
      expect(result.skipped).toBe(2);
    });
  });

  // ============================================
  // Lunch break exclusion
  // ============================================
  describe('lunch break exclusion', () => {
    it('should exclude slots 24-25 (12:00-13:00) from AI schedule', async () => {
      const task = taskService.createTask({
        title: 'Through Lunch',
        status: 'pending',
        estimatedMinutes: 120,
        importance: 3,
      });

      const mockResponse = [
        { taskId: task.id, date: TEST_DATE, startSlot: 22, endSlot: 23 }, // 11:00-11:30, OK
        { taskId: task.id, date: TEST_DATE, startSlot: 24, endSlot: 25 }, // 12:00-13:00, LUNCH
        { taskId: task.id, date: TEST_DATE, startSlot: 25, endSlot: 26 }, // 12:30-13:00, LUNCH overlap
        { taskId: task.id, date: TEST_DATE, startSlot: 26, endSlot: 27 }, // 13:00-13:30, OK
      ];
      (mockClaude.generateSchedule as ReturnType<typeof vi.fn>).mockResolvedValue(mockResponse);

      const slots = await service.generateAiSchedule(TEST_DATE);

      // Only slots outside lunch: [22,23] and [26,27]
      expect(slots).toHaveLength(2);
      expect(slots[0].startSlot).toBe(22);
      expect(slots[1].startSlot).toBe(26);
    });
  });

  // ============================================
  // Work hours boundary
  // ============================================
  describe('work hours boundary', () => {
    it('should default to slots 18-35 (09:00-17:30)', async () => {
      const task = taskService.createTask({
        title: 'Boundary Test',
        status: 'pending',
        estimatedMinutes: 30,
        importance: 3,
      });

      const mockResponse = [
        { taskId: task.id, date: TEST_DATE, startSlot: 17, endSlot: 17 }, // 08:30, out
        { taskId: task.id, date: TEST_DATE, startSlot: 18, endSlot: 18 }, // 09:00, IN
        { taskId: task.id, date: TEST_DATE, startSlot: 35, endSlot: 35 }, // 17:30, IN (last valid)
        { taskId: task.id, date: TEST_DATE, startSlot: 36, endSlot: 36 }, // 18:00, out
      ];
      (mockClaude.generateSchedule as ReturnType<typeof vi.fn>).mockResolvedValue(mockResponse);

      const slots = await service.generateAiSchedule(TEST_DATE);

      expect(slots).toHaveLength(2);
      expect(slots[0].startSlot).toBe(18);
      expect(slots[1].startSlot).toBe(35);
    });

    it('should respect custom work start/end slots', async () => {
      const task = taskService.createTask({
        title: 'Custom Boundary',
        status: 'pending',
        estimatedMinutes: 30,
        importance: 3,
      });

      const mockResponse = [
        { taskId: task.id, date: TEST_DATE, startSlot: 14, endSlot: 15 }, // 07:00, out (custom start=16)
        { taskId: task.id, date: TEST_DATE, startSlot: 16, endSlot: 17 }, // 08:00, IN
        { taskId: task.id, date: TEST_DATE, startSlot: 39, endSlot: 40 }, // 19:30-20:00, IN (custom end=40)
        { taskId: task.id, date: TEST_DATE, startSlot: 41, endSlot: 42 }, // 20:30, out
      ];
      (mockClaude.generateSchedule as ReturnType<typeof vi.fn>).mockResolvedValue(mockResponse);

      const slots = await service.generateAiSchedule(TEST_DATE, 16, 40);

      expect(slots).toHaveLength(2);
      expect(slots[0].startSlot).toBe(16);
      expect(slots[1].startSlot).toBe(39);
    });
  });

  // ============================================
  // Existing timeboxes preserved
  // ============================================
  describe('existing timeboxes preserved', () => {
    it('should only fill gaps around existing timeboxes', async () => {
      const existingTask = taskService.createTask({
        title: 'Existing Meeting',
        status: 'in_progress',
        estimatedMinutes: 60,
        importance: 5,
      });
      // Existing: slots 20-21 (10:00-11:00)
      timeboxService.createTimeBox({
        taskId: existingTask.id,
        date: TEST_DATE,
        startSlot: 20,
        endSlot: 21,
      });

      const newTask = taskService.createTask({
        title: 'Fill Gaps',
        status: 'pending',
        estimatedMinutes: 60,
        importance: 3,
      });

      const mockResponse = [
        { taskId: newTask.id, date: TEST_DATE, startSlot: 18, endSlot: 19 }, // before existing, OK
        { taskId: newTask.id, date: TEST_DATE, startSlot: 22, endSlot: 23 }, // after existing, OK
      ];
      (mockClaude.generateSchedule as ReturnType<typeof vi.fn>).mockResolvedValue(mockResponse);

      const slots = await service.generateAiSchedule(TEST_DATE);

      // Both should be valid (no overlap with existing 20-21)
      expect(slots).toHaveLength(2);

      // Apply and verify existing is untouched
      service.applySchedule(slots);
      const allBoxes = timeboxService.getTimeBoxesByDate(TEST_DATE);
      expect(allBoxes).toHaveLength(3); // 1 existing + 2 new
    });
  });
});
