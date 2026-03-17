/**
 * @TASK P2-R1 - Task CRUD API (TDD_MODE:RED_FIRST)
 * @SPEC docs/planning/04-database-design.md
 * @TEST src/__tests__/services/task-crud.test.ts
 *
 * Tests for TaskCrudService
 * - CRUD operations on Task table
 * - Tree structure (parent/child, recursive CTE)
 * - Progress auto-calculation
 * - Cascade delete
 * - Status transitions & completedAt auto-set
 * - Search, filter, sort
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { runMigrations } from '../../main/database/migrations';
import {
  TaskCrudService,
  CreateTaskInput,
  TaskFilter,
} from '../../main/services/task-crud';
import type { Task, TaskStatus } from '@shared/types';

describe('TaskCrudService', () => {
  let db: Database.Database;
  let service: TaskCrudService;

  beforeEach(() => {
    db = new Database(':memory:');
    db.pragma('foreign_keys = ON');
    runMigrations(db);
    service = new TaskCrudService(db);
  });

  afterEach(() => {
    if (db) {
      db.close();
    }
  });

  // ============================================
  // createTask
  // ============================================
  describe('createTask', () => {
    it('should create a task with generated id and return Task object', () => {
      const input: CreateTaskInput = {
        title: 'Test Task',
        description: 'A test task description',
        importance: 4,
        category: '품질검사',
      };

      const task = service.createTask(input);

      expect(task).toBeDefined();
      expect(task.id).toBeDefined();
      expect(typeof task.id).toBe('string');
      expect(task.id.length).toBeGreaterThan(0);
      expect(task.title).toBe('Test Task');
      expect(task.description).toBe('A test task description');
      expect(task.importance).toBe(4);
      expect(task.category).toBe('품질검사');
      expect(task.status).toBe('pending');
      expect(task.progress).toBe(0);
      expect(task.parentId).toBeNull();
      expect(task.deadline).toBeNull();
      expect(task.templateId).toBeNull();
      expect(task.completedAt).toBeNull();
      expect(task.createdAt).toBeGreaterThan(0);
      expect(task.updatedAt).toBeGreaterThan(0);
    });

    it('should use default values for optional fields', () => {
      const task = service.createTask({ title: 'Minimal Task' });

      expect(task.title).toBe('Minimal Task');
      expect(task.description).toBe('');
      expect(task.importance).toBe(3);
      expect(task.estimatedMinutes).toBe(0);
      expect(task.category).toBe('');
      expect(task.relatedClass).toBe('');
      expect(task.status).toBe('pending');
      expect(task.progress).toBe(0);
      expect(task.parentId).toBeNull();
      expect(task.deadline).toBeNull();
    });

    it('should create a child task with parentId', () => {
      const parent = service.createTask({ title: 'Parent Task' });
      const child = service.createTask({
        title: 'Child Task',
        parentId: parent.id,
      });

      expect(child.parentId).toBe(parent.id);
    });

    it('should create task with custom status', () => {
      const task = service.createTask({
        title: 'In Progress Task',
        status: 'in_progress',
      });

      expect(task.status).toBe('in_progress');
    });

    it('should create task with deadline', () => {
      const deadline = Date.now() + 86400000; // tomorrow
      const task = service.createTask({
        title: 'Deadline Task',
        deadline,
      });

      expect(task.deadline).toBe(deadline);
    });
  });

  // ============================================
  // getTaskById
  // ============================================
  describe('getTaskById', () => {
    it('should return a task by id', () => {
      const created = service.createTask({ title: 'Find Me' });
      const found = service.getTaskById(created.id);

      expect(found).not.toBeNull();
      expect(found!.id).toBe(created.id);
      expect(found!.title).toBe('Find Me');
    });

    it('should return null for non-existent id', () => {
      const result = service.getTaskById('non-existent-id');
      expect(result).toBeNull();
    });
  });

  // ============================================
  // getAllTasks
  // ============================================
  describe('getAllTasks', () => {
    it('should return empty array when no tasks exist', () => {
      const tasks = service.getAllTasks();
      expect(tasks).toEqual([]);
    });

    it('should return all tasks', () => {
      service.createTask({ title: 'Task 1' });
      service.createTask({ title: 'Task 2' });
      service.createTask({ title: 'Task 3' });

      const tasks = service.getAllTasks();
      expect(tasks.length).toBe(3);
    });
  });

  // ============================================
  // getChildTasks
  // ============================================
  describe('getChildTasks', () => {
    it('should return children of a parent task', () => {
      const parent = service.createTask({ title: 'Parent' });
      service.createTask({ title: 'Child 1', parentId: parent.id });
      service.createTask({ title: 'Child 2', parentId: parent.id });
      service.createTask({ title: 'Other Task' }); // no parent

      const children = service.getChildTasks(parent.id);
      expect(children.length).toBe(2);
      expect(children.every(c => c.parentId === parent.id)).toBe(true);
    });

    it('should return empty array for task with no children', () => {
      const task = service.createTask({ title: 'Lonely Task' });
      const children = service.getChildTasks(task.id);
      expect(children).toEqual([]);
    });
  });

  // ============================================
  // getTaskTree (recursive CTE)
  // ============================================
  describe('getTaskTree', () => {
    it('should return tasks with depth using recursive CTE', () => {
      const root = service.createTask({ title: 'Root' });
      const child = service.createTask({ title: 'Child', parentId: root.id });
      service.createTask({ title: 'Grandchild', parentId: child.id });

      const tree = service.getTaskTree();

      expect(tree.length).toBe(3);

      const rootNode = tree.find(t => t.title === 'Root');
      const childNode = tree.find(t => t.title === 'Child');
      const grandchildNode = tree.find(t => t.title === 'Grandchild');

      expect(rootNode!.depth).toBe(0);
      expect(childNode!.depth).toBe(1);
      expect(grandchildNode!.depth).toBe(2);
    });

    it('should return empty array when no tasks exist', () => {
      const tree = service.getTaskTree();
      expect(tree).toEqual([]);
    });
  });

  // ============================================
  // updateTask
  // ============================================
  describe('updateTask', () => {
    it('should update task title', () => {
      const task = service.createTask({ title: 'Original' });
      const updated = service.updateTask(task.id, { title: 'Updated' });

      expect(updated.title).toBe('Updated');
      expect(updated.updatedAt).toBeGreaterThanOrEqual(task.updatedAt);
    });

    it('should partial update without touching other fields', () => {
      const task = service.createTask({
        title: 'Task',
        description: 'Desc',
        importance: 4,
        category: '보고서',
      });

      const updated = service.updateTask(task.id, { title: 'New Title' });

      expect(updated.title).toBe('New Title');
      expect(updated.description).toBe('Desc');
      expect(updated.importance).toBe(4);
      expect(updated.category).toBe('보고서');
    });

    it('should update progress', () => {
      const task = service.createTask({ title: 'Task' });
      const updated = service.updateTask(task.id, { progress: 75 });

      expect(updated.progress).toBe(75);
    });

    it('should update updatedAt timestamp', () => {
      const task = service.createTask({ title: 'Task' });

      // Small delay to ensure different timestamp
      const beforeUpdate = Date.now();
      const updated = service.updateTask(task.id, { title: 'Updated' });

      expect(updated.updatedAt).toBeGreaterThanOrEqual(beforeUpdate);
    });

    it('should throw when updating non-existent task', () => {
      expect(() => {
        service.updateTask('non-existent', { title: 'Fail' });
      }).toThrow();
    });
  });

  // ============================================
  // deleteTask
  // ============================================
  describe('deleteTask', () => {
    it('should delete a task and return true', () => {
      const task = service.createTask({ title: 'Delete Me' });
      const result = service.deleteTask(task.id);

      expect(result).toBe(true);
      expect(service.getTaskById(task.id)).toBeNull();
    });

    it('should return false for non-existent task', () => {
      const result = service.deleteTask('non-existent');
      expect(result).toBe(false);
    });

    it('should cascade delete children when parent is deleted', () => {
      const parent = service.createTask({ title: 'Parent' });
      const child1 = service.createTask({ title: 'Child 1', parentId: parent.id });
      const child2 = service.createTask({ title: 'Child 2', parentId: parent.id });
      const grandchild = service.createTask({ title: 'Grandchild', parentId: child1.id });

      service.deleteTask(parent.id);

      expect(service.getTaskById(parent.id)).toBeNull();
      expect(service.getTaskById(child1.id)).toBeNull();
      expect(service.getTaskById(child2.id)).toBeNull();
      expect(service.getTaskById(grandchild.id)).toBeNull();
    });
  });

  // ============================================
  // recalculateParentProgress
  // ============================================
  describe('recalculateParentProgress', () => {
    it('should calculate parent progress as AVG of children progress', () => {
      const parent = service.createTask({ title: 'Parent' });
      service.createTask({ title: 'Child 1', parentId: parent.id });
      service.createTask({ title: 'Child 2', parentId: parent.id });
      service.createTask({ title: 'Child 3', parentId: parent.id });

      // Set children progress: [100, 50, 0]
      const children = service.getChildTasks(parent.id);
      service.updateTask(children[0].id, { progress: 100 });
      service.updateTask(children[1].id, { progress: 50 });
      service.updateTask(children[2].id, { progress: 0 });

      const avgProgress = service.recalculateParentProgress(parent.id);

      expect(avgProgress).toBe(50); // (100 + 50 + 0) / 3 = 50
      const updatedParent = service.getTaskById(parent.id);
      expect(updatedParent!.progress).toBe(50);
    });

    it('should return 0 for parent with no children', () => {
      const parent = service.createTask({ title: 'No Children' });
      const progress = service.recalculateParentProgress(parent.id);
      expect(progress).toBe(0);
    });
  });

  // ============================================
  // Status transitions & completedAt
  // ============================================
  describe('status transitions', () => {
    it('should auto-set completedAt when status changes to completed', () => {
      const task = service.createTask({ title: 'Task' });
      expect(task.completedAt).toBeNull();

      const beforeComplete = Date.now();
      const updated = service.updateTask(task.id, { status: 'completed' });

      expect(updated.status).toBe('completed');
      expect(updated.completedAt).not.toBeNull();
      expect(updated.completedAt!).toBeGreaterThanOrEqual(beforeComplete);
    });

    it('should clear completedAt when status changes from completed', () => {
      // First complete the task
      const task = service.createTask({ title: 'Task' });
      service.updateTask(task.id, { status: 'completed' });

      // Then change status back
      const updated = service.updateTask(task.id, { status: 'in_progress' });

      expect(updated.status).toBe('in_progress');
      expect(updated.completedAt).toBeNull();
    });

    it('should transition through valid statuses', () => {
      const task = service.createTask({ title: 'Task' });
      expect(task.status).toBe('pending');

      const inProgress = service.updateTask(task.id, { status: 'in_progress' });
      expect(inProgress.status).toBe('in_progress');

      const completed = service.updateTask(task.id, { status: 'completed' });
      expect(completed.status).toBe('completed');

      const deferred = service.updateTask(task.id, { status: 'deferred' });
      expect(deferred.status).toBe('deferred');
      expect(deferred.completedAt).toBeNull();
    });
  });

  // ============================================
  // searchTasks
  // ============================================
  describe('searchTasks', () => {
    beforeEach(() => {
      service.createTask({ title: '품질 리포트 작성', category: '품질검사' });
      service.createTask({ title: '월간 보고서 제출', category: '보고서' });
      service.createTask({ title: '품질 데이터 수집', category: '품질검사' });
      service.createTask({ title: '회의 준비', category: '회의' });
    });

    it('should search tasks by title (LIKE %query%)', () => {
      const results = service.searchTasks('품질');
      expect(results.length).toBe(2);
      expect(results.every(t => t.title.includes('품질'))).toBe(true);
    });

    it('should return empty array for no matches', () => {
      const results = service.searchTasks('존재하지않는');
      expect(results).toEqual([]);
    });

    it('should be case-insensitive for ASCII', () => {
      service.createTask({ title: 'ABC Report' });
      const results = service.searchTasks('abc');
      expect(results.length).toBe(1);
    });
  });

  // ============================================
  // filterTasks
  // ============================================
  describe('filterTasks', () => {
    beforeEach(() => {
      const now = Date.now();
      service.createTask({
        title: 'Task A',
        category: '품질검사',
        importance: 5,
        status: 'pending',
        deadline: now + 86400000, // +1 day
      });
      service.createTask({
        title: 'Task B',
        category: '보고서',
        importance: 3,
        status: 'in_progress',
        deadline: now + 172800000, // +2 days
      });
      service.createTask({
        title: 'Task C',
        category: '품질검사',
        importance: 1,
        status: 'completed',
        deadline: now + 259200000, // +3 days
      });
      service.createTask({
        title: 'Task D',
        category: '회의',
        importance: 4,
        status: 'deferred',
      });
    });

    it('should filter by category', () => {
      const results = service.filterTasks({ category: '품질검사' });
      expect(results.length).toBe(2);
      expect(results.every(t => t.category === '품질검사')).toBe(true);
    });

    it('should filter by importance array', () => {
      const results = service.filterTasks({ importance: [4, 5] });
      expect(results.length).toBe(2);
      expect(results.every(t => [4, 5].includes(t.importance))).toBe(true);
    });

    it('should filter by status array', () => {
      const results = service.filterTasks({ status: ['pending', 'in_progress'] });
      expect(results.length).toBe(2);
      expect(results.every(t => ['pending', 'in_progress'].includes(t.status))).toBe(true);
    });

    it('should filter by deadline range', () => {
      const now = Date.now();
      const results = service.filterTasks({
        deadlineRange: [now, now + 200000000],
      });
      // Task A (+1 day) and Task B (+2 days) should match
      expect(results.length).toBe(2);
    });

    it('should combine multiple filters', () => {
      const results = service.filterTasks({
        category: '품질검사',
        status: ['pending'],
      });
      expect(results.length).toBe(1);
      expect(results[0].title).toBe('Task A');
    });

    it('should return all tasks with empty filter', () => {
      const results = service.filterTasks({});
      expect(results.length).toBe(4);
    });
  });

  // ============================================
  // sortTasks
  // ============================================
  describe('sortTasks', () => {
    it('should sort by createdAt ascending', () => {
      const t1 = service.createTask({ title: 'First' });
      const t2 = service.createTask({ title: 'Second' });
      const t3 = service.createTask({ title: 'Third' });

      // Manually set distinct createdAt to ensure deterministic order
      db.prepare('UPDATE Task SET createdAt = ? WHERE id = ?').run(1000, t1.id);
      db.prepare('UPDATE Task SET createdAt = ? WHERE id = ?').run(2000, t2.id);
      db.prepare('UPDATE Task SET createdAt = ? WHERE id = ?').run(3000, t3.id);

      const tasks = service.getAllTasks();
      const sorted = service.sortTasks(tasks, 'createdAt', 'asc');

      expect(sorted[0].title).toBe('First');
      expect(sorted[2].title).toBe('Third');
    });

    it('should sort by createdAt descending', () => {
      // getAllTasks returns createdAt DESC, sortTasks should re-sort
      const t1 = service.createTask({ title: 'First' });
      const t2 = service.createTask({ title: 'Second' });
      const t3 = service.createTask({ title: 'Third' });

      // Manually set distinct createdAt to ensure deterministic order
      db.prepare('UPDATE Task SET createdAt = ? WHERE id = ?').run(1000, t1.id);
      db.prepare('UPDATE Task SET createdAt = ? WHERE id = ?').run(2000, t2.id);
      db.prepare('UPDATE Task SET createdAt = ? WHERE id = ?').run(3000, t3.id);

      const tasks = service.getAllTasks();
      const sorted = service.sortTasks(tasks, 'createdAt', 'desc');

      expect(sorted[0].title).toBe('Third');
      expect(sorted[2].title).toBe('First');
    });

    it('should sort by importance', () => {
      service.createTask({ title: 'Low', importance: 1 });
      service.createTask({ title: 'High', importance: 5 });
      service.createTask({ title: 'Mid', importance: 3 });

      const tasks = service.getAllTasks();
      const sorted = service.sortTasks(tasks, 'importance', 'desc');

      expect(sorted[0].title).toBe('High');
      expect(sorted[1].title).toBe('Mid');
      expect(sorted[2].title).toBe('Low');
    });

    it('should sort by deadline with nulls last', () => {
      const now = Date.now();
      service.createTask({ title: 'No Deadline' });
      service.createTask({ title: 'Soon', deadline: now + 1000 });
      service.createTask({ title: 'Later', deadline: now + 999999 });

      const tasks = service.getAllTasks();
      const sorted = service.sortTasks(tasks, 'deadline', 'asc');

      expect(sorted[0].title).toBe('Soon');
      expect(sorted[1].title).toBe('Later');
      expect(sorted[2].title).toBe('No Deadline');
    });

    it('should sort by progress', () => {
      const t1 = service.createTask({ title: 'Zero' });
      const t2 = service.createTask({ title: 'Half' });
      const t3 = service.createTask({ title: 'Full' });

      service.updateTask(t2.id, { progress: 50 });
      service.updateTask(t3.id, { progress: 100 });

      const tasks = service.getAllTasks();
      const sorted = service.sortTasks(tasks, 'progress', 'desc');

      expect(sorted[0].title).toBe('Full');
      expect(sorted[1].title).toBe('Half');
      expect(sorted[2].title).toBe('Zero');
    });
  });

  // ============================================
  // Integration: progress auto-calc
  // ============================================
  describe('progress auto-calculation', () => {
    it('should calculate parent progress as AVG of 3 children [100, 50, 0] = 50', () => {
      const parent = service.createTask({ title: 'Parent' });
      const c1 = service.createTask({ title: 'C1', parentId: parent.id });
      const c2 = service.createTask({ title: 'C2', parentId: parent.id });
      const c3 = service.createTask({ title: 'C3', parentId: parent.id });

      service.updateTask(c1.id, { progress: 100 });
      service.updateTask(c2.id, { progress: 50 });
      service.updateTask(c3.id, { progress: 0 });

      const avg = service.recalculateParentProgress(parent.id);
      expect(avg).toBe(50);

      const updatedParent = service.getTaskById(parent.id);
      expect(updatedParent!.progress).toBe(50);
    });
  });

  // ============================================
  // Integration: cascade delete
  // ============================================
  describe('cascade delete integration', () => {
    it('should delete parent and all descendants', () => {
      const root = service.createTask({ title: 'Root' });
      const child = service.createTask({ title: 'Child', parentId: root.id });
      const grandchild = service.createTask({ title: 'Grandchild', parentId: child.id });

      expect(service.getAllTasks().length).toBe(3);

      service.deleteTask(root.id);

      expect(service.getAllTasks().length).toBe(0);
      expect(service.getTaskById(root.id)).toBeNull();
      expect(service.getTaskById(child.id)).toBeNull();
      expect(service.getTaskById(grandchild.id)).toBeNull();
    });
  });
});
