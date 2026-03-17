/**
 * @TASK P3-R1 - TimeBox CRUD API (TDD_MODE:RED_FIRST)
 * @SPEC docs/planning/04-database-design.md#TimeBox
 * @TEST src/__tests__/services/timebox-crud.test.ts
 *
 * Tests for TimeBoxCrudService
 * - CRUD operations on TimeBox table
 * - Slot validation (0-47, startSlot <= endSlot)
 * - Overlap detection (unique index on date+startSlot where status != 'skipped')
 * - Cascade delete (Task FK)
 * - aiSuggested flag
 * - Status transitions (scheduled -> in_progress -> completed/skipped)
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { runMigrations } from '../../main/database/migrations';
import { TaskCrudService } from '../../main/services/task-crud';
import {
  TimeBoxCrudService,
  CreateTimeBoxInput,
} from '../../main/services/timebox-crud';
import type { Task, TimeBox, TimeBoxStatus } from '@shared/types';

describe('TimeBoxCrudService', () => {
  let db: Database.Database;
  let taskService: TaskCrudService;
  let service: TimeBoxCrudService;
  let testTask: Task;

  beforeEach(() => {
    db = new Database(':memory:');
    db.pragma('foreign_keys = ON');
    runMigrations(db);
    taskService = new TaskCrudService(db);
    service = new TimeBoxCrudService(db);

    // Create a task for FK requirement
    testTask = taskService.createTask({
      title: 'Test Task for TimeBox',
      description: 'FK parent',
      importance: 3,
    });
  });

  afterEach(() => {
    if (db) {
      db.close();
    }
  });

  // ============================================
  // createTimeBox
  // ============================================
  describe('createTimeBox', () => {
    it('should create a timebox with generated id and return TimeBox object', () => {
      const input: CreateTimeBoxInput = {
        taskId: testTask.id,
        date: '2026-03-18',
        startSlot: 18,
        endSlot: 19,
      };

      const tb = service.createTimeBox(input);

      expect(tb).toBeDefined();
      expect(tb.id).toBeDefined();
      expect(typeof tb.id).toBe('string');
      expect(tb.id.length).toBeGreaterThan(0);
      expect(tb.taskId).toBe(testTask.id);
      expect(tb.date).toBe('2026-03-18');
      expect(tb.startSlot).toBe(18);
      expect(tb.endSlot).toBe(19);
      expect(tb.status).toBe('scheduled');
      expect(tb.aiSuggested).toBe(false);
      expect(tb.createdAt).toBeGreaterThan(0);
      expect(tb.updatedAt).toBeGreaterThan(0);
    });

    it('should create a timebox with aiSuggested=true', () => {
      const tb = service.createTimeBox({
        taskId: testTask.id,
        date: '2026-03-18',
        startSlot: 20,
        endSlot: 21,
        aiSuggested: true,
      });

      expect(tb.aiSuggested).toBe(true);
    });

    it('should create a timebox with same start and end slot (single 30-min block)', () => {
      const tb = service.createTimeBox({
        taskId: testTask.id,
        date: '2026-03-18',
        startSlot: 0,
        endSlot: 0,
      });

      expect(tb.startSlot).toBe(0);
      expect(tb.endSlot).toBe(0);
    });

    it('should create a timebox at boundary slots (0 and 47)', () => {
      const tb = service.createTimeBox({
        taskId: testTask.id,
        date: '2026-03-18',
        startSlot: 47,
        endSlot: 47,
      });

      expect(tb.startSlot).toBe(47);
      expect(tb.endSlot).toBe(47);
    });
  });

  // ============================================
  // Slot validation
  // ============================================
  describe('slot validation', () => {
    it('should reject startSlot < 0', () => {
      expect(() =>
        service.createTimeBox({
          taskId: testTask.id,
          date: '2026-03-18',
          startSlot: -1,
          endSlot: 5,
        })
      ).toThrow();
    });

    it('should reject endSlot > 47', () => {
      expect(() =>
        service.createTimeBox({
          taskId: testTask.id,
          date: '2026-03-18',
          startSlot: 5,
          endSlot: 48,
        })
      ).toThrow();
    });

    it('should reject startSlot > endSlot', () => {
      expect(() =>
        service.createTimeBox({
          taskId: testTask.id,
          date: '2026-03-18',
          startSlot: 20,
          endSlot: 10,
        })
      ).toThrow();
    });
  });

  // ============================================
  // getTimeBoxById
  // ============================================
  describe('getTimeBoxById', () => {
    it('should return timebox by id', () => {
      const created = service.createTimeBox({
        taskId: testTask.id,
        date: '2026-03-18',
        startSlot: 10,
        endSlot: 12,
      });

      const found = service.getTimeBoxById(created.id);
      expect(found).not.toBeNull();
      expect(found!.id).toBe(created.id);
      expect(found!.taskId).toBe(testTask.id);
      expect(found!.startSlot).toBe(10);
      expect(found!.endSlot).toBe(12);
    });

    it('should return null for non-existent id', () => {
      const found = service.getTimeBoxById('non-existent-id');
      expect(found).toBeNull();
    });
  });

  // ============================================
  // getTimeBoxesByDate
  // ============================================
  describe('getTimeBoxesByDate', () => {
    it('should return all timeboxes for a date sorted by startSlot', () => {
      service.createTimeBox({
        taskId: testTask.id,
        date: '2026-03-18',
        startSlot: 20,
        endSlot: 21,
      });
      service.createTimeBox({
        taskId: testTask.id,
        date: '2026-03-18',
        startSlot: 10,
        endSlot: 11,
      });
      service.createTimeBox({
        taskId: testTask.id,
        date: '2026-03-18',
        startSlot: 30,
        endSlot: 31,
      });

      const boxes = service.getTimeBoxesByDate('2026-03-18');
      expect(boxes).toHaveLength(3);
      expect(boxes[0].startSlot).toBe(10);
      expect(boxes[1].startSlot).toBe(20);
      expect(boxes[2].startSlot).toBe(30);
    });

    it('should return empty array for date with no timeboxes', () => {
      const boxes = service.getTimeBoxesByDate('2099-01-01');
      expect(boxes).toHaveLength(0);
    });

    it('should not return timeboxes from other dates', () => {
      service.createTimeBox({
        taskId: testTask.id,
        date: '2026-03-18',
        startSlot: 10,
        endSlot: 11,
      });
      service.createTimeBox({
        taskId: testTask.id,
        date: '2026-03-19',
        startSlot: 10,
        endSlot: 11,
      });

      const boxes = service.getTimeBoxesByDate('2026-03-18');
      expect(boxes).toHaveLength(1);
      expect(boxes[0].date).toBe('2026-03-18');
    });
  });

  // ============================================
  // updateTimeBox
  // ============================================
  describe('updateTimeBox', () => {
    it('should update startSlot and endSlot', () => {
      const created = service.createTimeBox({
        taskId: testTask.id,
        date: '2026-03-18',
        startSlot: 10,
        endSlot: 12,
      });

      const updated = service.updateTimeBox(created.id, {
        startSlot: 14,
        endSlot: 16,
      });

      expect(updated.startSlot).toBe(14);
      expect(updated.endSlot).toBe(16);
      expect(updated.updatedAt).toBeGreaterThanOrEqual(created.updatedAt);
    });

    it('should update status', () => {
      const created = service.createTimeBox({
        taskId: testTask.id,
        date: '2026-03-18',
        startSlot: 10,
        endSlot: 12,
      });

      const updated = service.updateTimeBox(created.id, {
        status: 'in_progress',
      });

      expect(updated.status).toBe('in_progress');
    });

    it('should throw for non-existent id', () => {
      expect(() =>
        service.updateTimeBox('non-existent', { status: 'completed' })
      ).toThrow();
    });

    it('should reject invalid slot values on update', () => {
      const created = service.createTimeBox({
        taskId: testTask.id,
        date: '2026-03-18',
        startSlot: 10,
        endSlot: 12,
      });

      expect(() =>
        service.updateTimeBox(created.id, { startSlot: -1 })
      ).toThrow();
    });
  });

  // ============================================
  // deleteTimeBox
  // ============================================
  describe('deleteTimeBox', () => {
    it('should delete a timebox and return true', () => {
      const created = service.createTimeBox({
        taskId: testTask.id,
        date: '2026-03-18',
        startSlot: 10,
        endSlot: 12,
      });

      const deleted = service.deleteTimeBox(created.id);
      expect(deleted).toBe(true);

      const found = service.getTimeBoxById(created.id);
      expect(found).toBeNull();
    });

    it('should return false for non-existent id', () => {
      const deleted = service.deleteTimeBox('non-existent');
      expect(deleted).toBe(false);
    });
  });

  // ============================================
  // Overlap detection
  // ============================================
  describe('overlap detection', () => {
    it('should detect overlap on same date and same startSlot', () => {
      service.createTimeBox({
        taskId: testTask.id,
        date: '2026-03-18',
        startSlot: 10,
        endSlot: 12,
      });

      // Same date, same startSlot -> unique index violation
      expect(() =>
        service.createTimeBox({
          taskId: testTask.id,
          date: '2026-03-18',
          startSlot: 10,
          endSlot: 14,
        })
      ).toThrow();
    });

    it('should detect range overlap via checkOverlap', () => {
      service.createTimeBox({
        taskId: testTask.id,
        date: '2026-03-18',
        startSlot: 10,
        endSlot: 14,
      });

      // Overlaps: new range [12, 16] overlaps with [10, 14]
      const hasOverlap = service.checkOverlap('2026-03-18', 12, 16);
      expect(hasOverlap).toBe(true);
    });

    it('should not detect overlap on different dates', () => {
      service.createTimeBox({
        taskId: testTask.id,
        date: '2026-03-18',
        startSlot: 10,
        endSlot: 12,
      });

      const hasOverlap = service.checkOverlap('2026-03-19', 10, 12);
      expect(hasOverlap).toBe(false);
    });

    it('should not detect overlap with adjacent slots (no gap)', () => {
      service.createTimeBox({
        taskId: testTask.id,
        date: '2026-03-18',
        startSlot: 10,
        endSlot: 12,
      });

      // Starts right after: [13, 15] does not overlap with [10, 12]
      const hasOverlap = service.checkOverlap('2026-03-18', 13, 15);
      expect(hasOverlap).toBe(false);
    });

    it('should allow excludeId to skip a specific timebox in overlap check', () => {
      const tb = service.createTimeBox({
        taskId: testTask.id,
        date: '2026-03-18',
        startSlot: 10,
        endSlot: 12,
      });

      // Same range but excluding itself -> no overlap
      const hasOverlap = service.checkOverlap('2026-03-18', 10, 12, tb.id);
      expect(hasOverlap).toBe(false);
    });
  });

  // ============================================
  // Skipped timeboxes don't count for overlap
  // ============================================
  describe('skipped timeboxes and overlap', () => {
    it('should not count skipped timeboxes for overlap', () => {
      const tb = service.createTimeBox({
        taskId: testTask.id,
        date: '2026-03-18',
        startSlot: 10,
        endSlot: 12,
      });

      // Skip it
      service.updateTimeBox(tb.id, { status: 'skipped' });

      // Same slot should now be allowed (skipped doesn't count)
      const hasOverlap = service.checkOverlap('2026-03-18', 10, 12);
      expect(hasOverlap).toBe(false);
    });

    it('should allow creating a timebox at a skipped slot', () => {
      const tb1 = service.createTimeBox({
        taskId: testTask.id,
        date: '2026-03-18',
        startSlot: 10,
        endSlot: 12,
      });

      service.updateTimeBox(tb1.id, { status: 'skipped' });

      // Create another at the same startSlot - unique index allows it because skipped
      const tb2 = service.createTimeBox({
        taskId: testTask.id,
        date: '2026-03-18',
        startSlot: 10,
        endSlot: 14,
      });

      expect(tb2).toBeDefined();
      expect(tb2.startSlot).toBe(10);
    });
  });

  // ============================================
  // Cascade delete (task deletion)
  // ============================================
  describe('cascade delete', () => {
    it('should delete timeboxes when parent task is deleted', () => {
      const tb = service.createTimeBox({
        taskId: testTask.id,
        date: '2026-03-18',
        startSlot: 10,
        endSlot: 12,
      });

      // Delete the task
      taskService.deleteTask(testTask.id);

      // TimeBox should be gone
      const found = service.getTimeBoxById(tb.id);
      expect(found).toBeNull();
    });
  });

  // ============================================
  // aiSuggested flag
  // ============================================
  describe('aiSuggested flag', () => {
    it('should default aiSuggested to false', () => {
      const tb = service.createTimeBox({
        taskId: testTask.id,
        date: '2026-03-18',
        startSlot: 10,
        endSlot: 12,
      });

      expect(tb.aiSuggested).toBe(false);
    });

    it('should set aiSuggested to true when specified', () => {
      const tb = service.createTimeBox({
        taskId: testTask.id,
        date: '2026-03-18',
        startSlot: 10,
        endSlot: 12,
        aiSuggested: true,
      });

      expect(tb.aiSuggested).toBe(true);
    });
  });

  // ============================================
  // Status transitions
  // ============================================
  describe('status transitions', () => {
    it('should start with scheduled status', () => {
      const tb = service.createTimeBox({
        taskId: testTask.id,
        date: '2026-03-18',
        startSlot: 10,
        endSlot: 12,
      });

      expect(tb.status).toBe('scheduled');
    });

    it('should transition scheduled -> in_progress', () => {
      const tb = service.createTimeBox({
        taskId: testTask.id,
        date: '2026-03-18',
        startSlot: 10,
        endSlot: 12,
      });

      const updated = service.updateTimeBox(tb.id, { status: 'in_progress' });
      expect(updated.status).toBe('in_progress');
    });

    it('should transition in_progress -> completed', () => {
      const tb = service.createTimeBox({
        taskId: testTask.id,
        date: '2026-03-18',
        startSlot: 10,
        endSlot: 12,
      });

      service.updateTimeBox(tb.id, { status: 'in_progress' });
      const updated = service.updateTimeBox(tb.id, { status: 'completed' });
      expect(updated.status).toBe('completed');
    });

    it('should transition scheduled -> skipped', () => {
      const tb = service.createTimeBox({
        taskId: testTask.id,
        date: '2026-03-18',
        startSlot: 10,
        endSlot: 12,
      });

      const updated = service.updateTimeBox(tb.id, { status: 'skipped' });
      expect(updated.status).toBe('skipped');
    });
  });

  // ============================================
  // checkOverlap method
  // ============================================
  describe('checkOverlap', () => {
    it('should return false when no timeboxes exist', () => {
      const hasOverlap = service.checkOverlap('2026-03-18', 10, 12);
      expect(hasOverlap).toBe(false);
    });

    it('should return true when range overlaps existing', () => {
      service.createTimeBox({
        taskId: testTask.id,
        date: '2026-03-18',
        startSlot: 10,
        endSlot: 14,
      });

      expect(service.checkOverlap('2026-03-18', 12, 16)).toBe(true);
      expect(service.checkOverlap('2026-03-18', 8, 11)).toBe(true);
      expect(service.checkOverlap('2026-03-18', 10, 14)).toBe(true);
    });

    it('should return false when range does not overlap', () => {
      service.createTimeBox({
        taskId: testTask.id,
        date: '2026-03-18',
        startSlot: 10,
        endSlot: 14,
      });

      // Completely before
      expect(service.checkOverlap('2026-03-18', 0, 9)).toBe(false);
      // Completely after
      expect(service.checkOverlap('2026-03-18', 15, 20)).toBe(false);
    });
  });
});
