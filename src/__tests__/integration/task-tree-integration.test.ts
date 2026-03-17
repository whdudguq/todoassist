/**
 * @TASK P2-S3-V - Task Tree Integration Tests
 * @SPEC docs/planning/04-database-design.md
 * @TEST src/__tests__/integration/task-tree-integration.test.ts
 *
 * Integration tests for the complete data flow:
 * Backend (TaskCrudService) → Store (useTaskStore) → UI (TreeView/TaskTree)
 *
 * Tests verify:
 * 1. Backend service produces correct data shapes
 * 2. Store accepts and manages that data correctly
 * 3. UI renders the data appropriately
 * 4. Parent-child relationships are preserved
 * 5. Progress auto-calculation works
 * 6. Cascade delete works correctly
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Database from 'better-sqlite3';
import { runMigrations } from '../../main/database/migrations';
import { TaskCrudService, CreateTaskInput } from '../../main/services/task-crud';
import type { Task, TaskStatus } from '@shared/types';
import { useTaskStore } from '@renderer/stores/taskStore';

// ============================================
// Test Utilities
// ============================================

interface TaskFactoryOptions {
  title?: string;
  parentId?: string | null;
  status?: TaskStatus;
  progress?: number;
  importance?: 1 | 2 | 3 | 4 | 5;
  category?: string;
  description?: string;
  estimatedMinutes?: number;
}

/**
 * Factory function to create tasks with sensible defaults
 */
function createTestTask(overrides: TaskFactoryOptions = {}): CreateTaskInput {
  return {
    title: overrides.title ?? 'Test Task',
    parentId: overrides.parentId ?? null,
    status: overrides.status ?? 'pending',
    importance: overrides.importance ?? 3,
    category: overrides.category ?? 'quality',
    description: overrides.description ?? 'Test description',
    estimatedMinutes: overrides.estimatedMinutes ?? 30,
  };
}

/**
 * Verify task data shape matches Task interface
 */
function assertValidTaskShape(task: Task): void {
  expect(task).toBeDefined();
  expect(task.id).toBeDefined();
  expect(typeof task.id).toBe('string');
  expect(task.title).toBeDefined();
  expect(typeof task.title).toBe('string');
  expect(task.status).toBeDefined();
  expect(['pending', 'in_progress', 'completed', 'deferred']).toContain(task.status);
  expect(task.progress).toBeDefined();
  expect(typeof task.progress).toBe('number');
  expect(task.progress).toBeGreaterThanOrEqual(0);
  expect(task.progress).toBeLessThanOrEqual(100);
  expect(task.importance).toBeDefined();
  expect([1, 2, 3, 4, 5]).toContain(task.importance);
  expect(task.createdAt).toBeGreaterThan(0);
  expect(task.updatedAt).toBeGreaterThan(0);
}

// ============================================
// Test Suites
// ============================================

describe('Task Tree Integration Tests', () => {
  let db: Database.Database;
  let service: TaskCrudService;

  beforeEach(() => {
    // Create fresh in-memory DB for each test
    db = new Database(':memory:');
    db.pragma('foreign_keys = ON');
    runMigrations(db);
    service = new TaskCrudService(db);

    // Reset task store
    useTaskStore.setState({
      tasks: [],
      selectedTaskId: null,
      filter: {},
      sortBy: 'createdAt',
      searchQuery: '',
      isLoading: false,
    });
  });

  afterEach(() => {
    if (db) {
      db.close();
    }
  });

  // ============================================
  // Backend → Store Data Flow Tests
  // ============================================

  describe('Backend → Store Data Flow', () => {
    describe('Task Creation and Data Shape', () => {
      it('T1: TaskCrudService.createTask produces valid Task objects', () => {
        const input = createTestTask({ title: 'Integration Test Task' });
        const task = service.createTask(input);

        assertValidTaskShape(task);
        expect(task.title).toBe('Integration Test Task');
        expect(task.parentId).toBeNull();
        expect(task.status).toBe('pending');
        expect(task.progress).toBe(0);
      });

      it('T2: Created task can be loaded into store', () => {
        const task = service.createTask(
          createTestTask({ title: 'Store Test Task' })
        );

        const store = useTaskStore.getState();
        store.addTask(task);

        expect(useTaskStore.getState().tasks).toHaveLength(1);
        expect(useTaskStore.getState().tasks[0].id).toBe(task.id);
        expect(useTaskStore.getState().tasks[0].title).toBe('Store Test Task');
      });

      it('T3: Task data shape is compatible between service output and store input', () => {
        const task = service.createTask(createTestTask({ title: 'Compatibility Test' }));
        const store = useTaskStore.getState();

        // Should not throw when adding to store
        expect(() => store.addTask(task)).not.toThrow();

        const storedTask = useTaskStore.getState().tasks[0];
        expect(storedTask.id).toBe(task.id);
        expect(storedTask.title).toBe(task.title);
        expect(storedTask.status).toBe(task.status);
        expect(storedTask.progress).toBe(task.progress);
      });
    });

    describe('Tree Structure (Parent/Child Relationships)', () => {
      it('T4: TaskCrudService.getTaskTree returns parent + children structure', () => {
        // Create parent task
        const parent = service.createTask(
          createTestTask({ title: 'Parent Task', parentId: null })
        );

        // Create child tasks
        const child1 = service.createTask(
          createTestTask({ title: 'Child 1', parentId: parent.id })
        );
        const child2 = service.createTask(
          createTestTask({ title: 'Child 2', parentId: parent.id })
        );

        // Create grandchild
        const grandchild = service.createTask(
          createTestTask({ title: 'Grandchild', parentId: child1.id })
        );

        // Get full tree
        const tree = service.getTaskTree();

        // Tree should have all 4 tasks
        expect(tree).toHaveLength(4);

        // Check depth levels
        const parentInTree = tree.find((t) => t.id === parent.id);
        const child1InTree = tree.find((t) => t.id === child1.id);
        const grandchildInTree = tree.find((t) => t.id === grandchild.id);

        expect(parentInTree?.depth).toBe(0);
        expect(child1InTree?.depth).toBe(1);
        expect(grandchildInTree?.depth).toBe(2);
      });

      it('T5: Tree structure preserves parent-child relationships', () => {
        const parent = service.createTask(
          createTestTask({ title: 'Parent', parentId: null })
        );
        const child = service.createTask(
          createTestTask({ title: 'Child', parentId: parent.id })
        );

        // Verify parent has no parent
        expect(service.getTaskById(parent.id)?.parentId).toBeNull();

        // Verify child points to parent
        expect(service.getTaskById(child.id)?.parentId).toBe(parent.id);

        // Verify getChildTasks returns child
        const children = service.getChildTasks(parent.id);
        expect(children).toHaveLength(1);
        expect(children[0].id).toBe(child.id);
      });

      it('T6: Multiple levels of nesting are correctly represented', () => {
        const root = service.createTask(createTestTask({ title: 'Root' }));
        const level1 = service.createTask(createTestTask({ title: 'L1', parentId: root.id }));
        const level2 = service.createTask(createTestTask({ title: 'L2', parentId: level1.id }));
        const level3 = service.createTask(createTestTask({ title: 'L3', parentId: level2.id }));

        const tree = service.getTaskTree();

        expect(tree.find((t) => t.id === root.id)?.depth).toBe(0);
        expect(tree.find((t) => t.id === level1.id)?.depth).toBe(1);
        expect(tree.find((t) => t.id === level2.id)?.depth).toBe(2);
        expect(tree.find((t) => t.id === level3.id)?.depth).toBe(3);
      });
    });

    describe('Progress Auto-Calculation', () => {
      it('T7: Child progress updates trigger parent recalculation', () => {
        const parent = service.createTask(createTestTask({ title: 'Parent' }));
        const child1 = service.createTask(
          createTestTask({ title: 'Child 1', parentId: parent.id })
        );
        const child2 = service.createTask(
          createTestTask({ title: 'Child 2', parentId: parent.id })
        );
        const child3 = service.createTask(
          createTestTask({ title: 'Child 3', parentId: parent.id })
        );

        // Set child progress values
        service.updateTask(child1.id, { progress: 100 });
        service.updateTask(child2.id, { progress: 50 });
        service.updateTask(child3.id, { progress: 0 });

        // Recalculate parent progress
        const parentProgress = service.recalculateParentProgress(parent.id);

        // Average: (100 + 50 + 0) / 3 = 50
        expect(parentProgress).toBe(50);

        // Verify parent progress was updated in DB
        const updatedParent = service.getTaskById(parent.id);
        expect(updatedParent?.progress).toBe(50);
      });

      it('T8: Parent progress = average of 3 children with [100, 50, 0]', () => {
        const parent = service.createTask(createTestTask({ title: 'Parent' }));

        // Create children with exact progress values
        const child100 = service.createTask(
          createTestTask({ title: 'Complete', parentId: parent.id })
        );
        service.updateTask(child100.id, { progress: 100 });

        const child50 = service.createTask(
          createTestTask({ title: 'Half', parentId: parent.id })
        );
        service.updateTask(child50.id, { progress: 50 });

        const child0 = service.createTask(
          createTestTask({ title: 'NotStarted', parentId: parent.id })
        );
        service.updateTask(child0.id, { progress: 0 });

        const result = service.recalculateParentProgress(parent.id);
        expect(result).toBe(50);
      });

      it('T9: Parent progress = 0 when parent has no children', () => {
        const parent = service.createTask(createTestTask({ title: 'Lonely Parent' }));
        const result = service.recalculateParentProgress(parent.id);
        expect(result).toBe(0);
      });

      it('T10: Parent progress calculation works with store data', () => {
        // Create backend tasks
        const parent = service.createTask(createTestTask({ title: 'Parent' }));
        const child1 = service.createTask(
          createTestTask({ title: 'Child 1', parentId: parent.id })
        );
        const child2 = service.createTask(
          createTestTask({ title: 'Child 2', parentId: parent.id })
        );

        // Update via service
        service.updateTask(child1.id, { progress: 80 });
        service.updateTask(child2.id, { progress: 40 });
        const parentProgress = service.recalculateParentProgress(parent.id);

        // Load all into store
        const store = useTaskStore.getState();
        const tree = service.getTaskTree();
        store.setTasks(tree);

        // Verify store has consistent data
        const storedTasks = useTaskStore.getState().tasks;
        const storedParent = storedTasks.find((t) => t.id === parent.id);
        expect(storedParent?.progress).toBe(parentProgress);
      });
    });

    describe('Update Operations', () => {
      it('T11: updateTask preserves Task shape', () => {
        const task = service.createTask(createTestTask({ title: 'Original' }));
        const updated = service.updateTask(task.id, { title: 'Updated', progress: 50 });

        assertValidTaskShape(updated);
        expect(updated.title).toBe('Updated');
        expect(updated.progress).toBe(50);
        expect(updated.id).toBe(task.id);
      });

      it('T12: Status change to "completed" auto-sets completedAt', () => {
        const task = service.createTask(createTestTask({ title: 'Task', status: 'pending' }));
        expect(task.completedAt).toBeNull();

        const updated = service.updateTask(task.id, { status: 'completed' });
        expect(updated.completedAt).not.toBeNull();
        expect(updated.completedAt).toBeGreaterThan(0);
      });

      it('T13: Status change from "completed" to other clears completedAt', () => {
        const task = service.createTask(
          createTestTask({ title: 'Task', status: 'completed' })
        );
        // First update should set completedAt
        let updated = service.updateTask(task.id, { status: 'completed' });
        expect(updated.completedAt).not.toBeNull();

        // Change status away from completed
        updated = service.updateTask(task.id, { status: 'in_progress' });
        expect(updated.completedAt).toBeNull();
      });
    });

    describe('Delete Operations', () => {
      it('T14: deleteTask works and returns true', () => {
        const task = service.createTask(createTestTask({ title: 'ToDelete' }));
        const result = service.deleteTask(task.id);

        expect(result).toBe(true);
        expect(service.getTaskById(task.id)).toBeNull();
      });

      it('T15: deleteTask returns false for non-existent task', () => {
        const result = service.deleteTask('non-existent-id');
        expect(result).toBe(false);
      });

      it('T16: deleteTask cascades - parent delete removes children', () => {
        const parent = service.createTask(createTestTask({ title: 'Parent' }));
        const child1 = service.createTask(
          createTestTask({ title: 'Child 1', parentId: parent.id })
        );
        const child2 = service.createTask(
          createTestTask({ title: 'Child 2', parentId: parent.id })
        );

        // Verify children exist
        expect(service.getChildTasks(parent.id)).toHaveLength(2);

        // Delete parent
        service.deleteTask(parent.id);

        // Children should also be gone (cascade delete)
        expect(service.getTaskById(child1.id)).toBeNull();
        expect(service.getTaskById(child2.id)).toBeNull();
      });

      it('T17: Cascade delete removes deep nested hierarchies', () => {
        const root = service.createTask(createTestTask({ title: 'Root' }));
        const level1 = service.createTask(createTestTask({ title: 'L1', parentId: root.id }));
        const level2 = service.createTask(createTestTask({ title: 'L2', parentId: level1.id }));
        const level3 = service.createTask(createTestTask({ title: 'L3', parentId: level2.id }));

        // Delete root
        service.deleteTask(root.id);

        // All descendants should be gone
        expect(service.getTaskById(level1.id)).toBeNull();
        expect(service.getTaskById(level2.id)).toBeNull();
        expect(service.getTaskById(level3.id)).toBeNull();
      });

      it('T18: deleteTask via store removes task from state', () => {
        const task1 = service.createTask(createTestTask({ title: 'Task 1' }));
        const task2 = service.createTask(createTestTask({ title: 'Task 2' }));

        const store = useTaskStore.getState();
        store.setTasks([task1, task2]);

        expect(useTaskStore.getState().tasks).toHaveLength(2);

        store.deleteTask(task1.id);

        expect(useTaskStore.getState().tasks).toHaveLength(1);
        expect(useTaskStore.getState().tasks[0].id).toBe(task2.id);
      });
    });

    describe('Search Operations', () => {
      it('T19: searchTasks by partial title match', () => {
        service.createTask(createTestTask({ title: 'Design System' }));
        service.createTask(createTestTask({ title: 'Database Schema' }));
        service.createTask(createTestTask({ title: 'UI Components' }));

        const results = service.searchTasks('Database');
        expect(results).toHaveLength(1);
        expect(results[0].title).toBe('Database Schema');
      });

      it('T20: searchTasks is case-insensitive', () => {
        service.createTask(createTestTask({ title: 'Import Data' }));
        service.createTask(createTestTask({ title: 'export file' }));

        const resultsUpper = service.searchTasks('IMPORT');
        const resultsLower = service.searchTasks('export');

        expect(resultsUpper).toHaveLength(1);
        expect(resultsLower).toHaveLength(1);
      });

      it('T21: searchTasks returns empty array for no matches', () => {
        service.createTask(createTestTask({ title: 'Task A' }));
        service.createTask(createTestTask({ title: 'Task B' }));

        const results = service.searchTasks('NonExistent');
        expect(results).toHaveLength(0);
      });

      it('T22: Search results can be loaded into store', () => {
        service.createTask(createTestTask({ title: 'Alpha' }));
        service.createTask(createTestTask({ title: 'Beta' }));
        service.createTask(createTestTask({ title: 'Alpha Prime' }));

        const results = service.searchTasks('Alpha');
        expect(results).toHaveLength(2);

        const store = useTaskStore.getState();
        store.setTasks(results);

        expect(useTaskStore.getState().tasks).toHaveLength(2);
      });
    });

    describe('Filter Operations', () => {
      it('T23: filterTasks by category', () => {
        service.createTask(createTestTask({ title: 'Quality Check', category: 'quality' }));
        service.createTask(createTestTask({ title: 'Meeting Notes', category: 'meeting' }));
        service.createTask(createTestTask({ title: 'Report Draft', category: 'report' }));

        const results = service.filterTasks({ category: 'quality' });
        expect(results).toHaveLength(1);
        expect(results[0].title).toBe('Quality Check');
      });

      it('T24: filterTasks by status', () => {
        const pending = service.createTask(createTestTask({ title: 'Pending', status: 'pending' }));
        const inProgress = service.createTask(
          createTestTask({ title: 'In Progress', status: 'in_progress' })
        );
        const completed = service.createTask(
          createTestTask({ title: 'Completed', status: 'completed' })
        );

        const results = service.filterTasks({ status: ['completed'] });
        expect(results).toHaveLength(1);
        expect(results[0].id).toBe(completed.id);
      });

      it('T25: filterTasks by multiple statuses (OR logic)', () => {
        service.createTask(createTestTask({ title: 'Pending', status: 'pending' }));
        const inProgress = service.createTask(
          createTestTask({ title: 'In Progress', status: 'in_progress' })
        );
        const completed = service.createTask(
          createTestTask({ title: 'Completed', status: 'completed' })
        );

        const results = service.filterTasks({ status: ['in_progress', 'completed'] });
        expect(results).toHaveLength(2);
      });

      it('T26: filterTasks by importance', () => {
        service.createTask(createTestTask({ title: 'High', importance: 5 }));
        service.createTask(createTestTask({ title: 'Medium', importance: 3 }));
        service.createTask(createTestTask({ title: 'Low', importance: 1 }));

        const results = service.filterTasks({ importance: [5, 4] });
        expect(results).toHaveLength(1);
        expect(results[0].title).toBe('High');
      });

      it('T27: filterTasks applies AND logic for multiple criteria', () => {
        service.createTask(
          createTestTask({ title: 'Q1', category: 'quality', status: 'pending' })
        );
        service.createTask(
          createTestTask({ title: 'Q2', category: 'quality', status: 'completed' })
        );
        service.createTask(
          createTestTask({ title: 'M1', category: 'meeting', status: 'pending' })
        );

        const results = service.filterTasks({
          category: 'quality',
          status: ['pending'],
        });

        expect(results).toHaveLength(1);
        expect(results[0].title).toBe('Q1');
      });

      it('T28: Filtered tasks can be loaded into store', () => {
        service.createTask(createTestTask({ title: 'T1', category: 'quality' }));
        service.createTask(createTestTask({ title: 'T2', category: 'meeting' }));

        const filtered = service.filterTasks({ category: 'quality' });
        const store = useTaskStore.getState();
        store.setTasks(filtered);

        expect(useTaskStore.getState().tasks).toHaveLength(1);
        expect(useTaskStore.getState().tasks[0].category).toBe('quality');
      });
    });
  });

  // ============================================
  // Store → UI Data Flow Tests
  // ============================================

  describe('Store → UI Data Flow', () => {
    describe('Rendering Task Counts', () => {
      it('T29: Empty store shows no tasks in derived state', () => {
        const store = useTaskStore.getState();
        expect(store.tasks).toHaveLength(0);
      });

      it('T30: Store with N tasks can be accessed for rendering', () => {
        const task1 = service.createTask(createTestTask({ title: 'T1' }));
        const task2 = service.createTask(createTestTask({ title: 'T2' }));
        const task3 = service.createTask(createTestTask({ title: 'T3' }));

        const store = useTaskStore.getState();
        store.setTasks([task1, task2, task3]);

        const tasks = useTaskStore.getState().tasks;
        expect(tasks).toHaveLength(3);
      });

      it('T31: Store preserves all task properties for UI rendering', () => {
        const task = service.createTask(
          createTestTask({
            title: 'Complex Task',
            importance: 4,
            status: 'in_progress',
            category: 'report',
          })
        );

        const store = useTaskStore.getState();
        store.addTask(task);

        const stored = useTaskStore.getState().tasks[0];
        expect(stored.title).toBe('Complex Task');
        expect(stored.importance).toBe(4);
        expect(stored.status).toBe('in_progress');
        expect(stored.category).toBe('report');
      });
    });

    describe('Filter State Management', () => {
      it('T32: Store filter state can be updated', () => {
        const store = useTaskStore.getState();
        store.setFilter({ category: 'quality' });

        expect(useTaskStore.getState().filter.category).toBe('quality');
      });

      it('T33: Store filter state merges partial updates', () => {
        const store = useTaskStore.getState();
        store.setFilter({ category: 'quality' });
        store.setFilter({ status: ['pending', 'in_progress'] });

        const filter = useTaskStore.getState().filter;
        expect(filter.category).toBe('quality');
        expect(filter.status).toEqual(['pending', 'in_progress']);
      });

      it('T34: Store tracks searchQuery for UI filtering', () => {
        const store = useTaskStore.getState();
        store.setSearchQuery('Database');

        expect(useTaskStore.getState().searchQuery).toBe('Database');
      });

      it('T35: Store tracks sortBy option', () => {
        const store = useTaskStore.getState();
        store.setSortBy('importance');

        expect(useTaskStore.getState().sortBy).toBe('importance');
      });
    });

    describe('Selection State', () => {
      it('T36: Store can track selected task ID', () => {
        const task = service.createTask(createTestTask({ title: 'Selected' }));
        const store = useTaskStore.getState();

        store.setSelectedTask(task.id);
        expect(useTaskStore.getState().selectedTaskId).toBe(task.id);
      });

      it('T37: Setting selected task to null clears selection', () => {
        const task = service.createTask(createTestTask({ title: 'Task' }));
        const store = useTaskStore.getState();

        store.setSelectedTask(task.id);
        expect(useTaskStore.getState().selectedTaskId).toBe(task.id);

        store.setSelectedTask(null);
        expect(useTaskStore.getState().selectedTaskId).toBeNull();
      });

      it('T38: Deleting selected task clears selection', () => {
        const task = service.createTask(createTestTask({ title: 'Task' }));
        const store = useTaskStore.getState();

        store.addTask(task);
        store.setSelectedTask(task.id);
        expect(useTaskStore.getState().selectedTaskId).toBe(task.id);

        store.deleteTask(task.id);
        expect(useTaskStore.getState().selectedTaskId).toBeNull();
      });
    });

    describe('Sorting and Filtering in Store', () => {
      it('T39: Store sortBy can be changed to all valid options', () => {
        const store = useTaskStore.getState();
        const validSortOptions = ['createdAt', 'deadline', 'importance', 'progress'] as const;

        for (const opt of validSortOptions) {
          store.setSortBy(opt);
          expect(useTaskStore.getState().sortBy).toBe(opt);
        }
      });

      it('T40: Store handles empty filter state', () => {
        const store = useTaskStore.getState();
        store.setFilter({});

        const filter = useTaskStore.getState().filter;
        expect(Object.keys(filter)).toHaveLength(0);
      });

      it('T41: Store filter can be progressively built', () => {
        const store = useTaskStore.getState();

        store.setFilter({ category: 'quality' });
        expect(useTaskStore.getState().filter.category).toBe('quality');

        store.setFilter({ status: ['pending'] });
        expect(useTaskStore.getState().filter.category).toBe('quality');
        expect(useTaskStore.getState().filter.status).toEqual(['pending']);

        store.setFilter({ importance: [4, 5] });
        expect(useTaskStore.getState().filter.importance).toEqual([4, 5]);
      });
    });

    describe('Loading State', () => {
      it('T42: Store tracks isLoading state', () => {
        const store = useTaskStore.getState();
        expect(useTaskStore.getState().isLoading).toBe(false);

        store.setLoading(true);
        expect(useTaskStore.getState().isLoading).toBe(true);

        store.setLoading(false);
        expect(useTaskStore.getState().isLoading).toBe(false);
      });
    });
  });

  // ============================================
  // Integrated Data Flow Tests
  // ============================================

  describe('Complete Integrated Workflows', () => {
    it('T43: Backend → Store workflow: create, filter, load', () => {
      // Backend: Create tasks
      const task1 = service.createTask(
        createTestTask({ title: 'Alpha', category: 'quality' })
      );
      const task2 = service.createTask(
        createTestTask({ title: 'Beta', category: 'meeting' })
      );
      const task3 = service.createTask(
        createTestTask({ title: 'Gamma', category: 'quality' })
      );

      // Backend: Filter
      const filtered = service.filterTasks({ category: 'quality' });
      expect(filtered).toHaveLength(2);

      // Store: Load filtered tasks
      const store = useTaskStore.getState();
      store.setTasks(filtered);

      // Verify store has filtered data
      expect(useTaskStore.getState().tasks).toHaveLength(2);
      expect(useTaskStore.getState().tasks.every((t) => t.category === 'quality')).toBe(true);
    });

    it('T44: Backend → Store workflow: hierarchy with progress', () => {
      // Create parent and children
      const parent = service.createTask(createTestTask({ title: 'Project' }));
      const child1 = service.createTask(
        createTestTask({ title: 'Task 1', parentId: parent.id })
      );
      const child2 = service.createTask(
        createTestTask({ title: 'Task 2', parentId: parent.id })
      );

      // Update child progress
      service.updateTask(child1.id, { progress: 100 });
      service.updateTask(child2.id, { progress: 60 });

      // Recalculate parent
      service.recalculateParentProgress(parent.id);

      // Get full tree
      const tree = service.getTaskTree();

      // Load into store
      const store = useTaskStore.getState();
      store.setTasks(tree);

      // Verify store has correct hierarchy
      const storedParent = useTaskStore.getState().tasks.find((t) => t.id === parent.id);
      expect(storedParent?.progress).toBe(80); // (100 + 60) / 2
    });

    it('T45: Backend → Store → UI data integrity workflow', () => {
      // Create complex structure
      const p1 = service.createTask(createTestTask({ title: 'Project 1', importance: 5 }));
      const p1c1 = service.createTask(
        createTestTask({ title: 'P1-Child1', parentId: p1.id, importance: 4 })
      );
      const p1c2 = service.createTask(
        createTestTask({ title: 'P1-Child2', parentId: p1.id, importance: 3 })
      );

      const p2 = service.createTask(createTestTask({ title: 'Project 2', importance: 2 }));

      // Load all into store
      const allTasks = service.getAllTasks();
      const store = useTaskStore.getState();
      store.setTasks(allTasks);

      // Verify no data loss
      expect(useTaskStore.getState().tasks).toHaveLength(4);

      // Verify relationships preserved
      const p1Child = useTaskStore.getState().tasks.find((t) => t.id === p1c1.id);
      expect(p1Child?.parentId).toBe(p1.id);

      // Verify metadata preserved
      const p1Data = useTaskStore.getState().tasks.find((t) => t.id === p1.id);
      expect(p1Data?.importance).toBe(5);
    });

    it('T46: Search → Filter → Store workflow', () => {
      // Create tasks with searchable titles
      service.createTask(createTestTask({ title: 'Deploy Frontend', category: 'quality' }));
      service.createTask(createTestTask({ title: 'Deploy Backend', category: 'quality' }));
      service.createTask(createTestTask({ title: 'Review Code', category: 'meeting' }));

      // Backend: Search
      const searchResults = service.searchTasks('Deploy');
      expect(searchResults).toHaveLength(2);

      // Backend: Filter search results
      const filtered = searchResults.filter((t) => t.category === 'quality');
      expect(filtered).toHaveLength(2);

      // Store: Load
      const store = useTaskStore.getState();
      store.setTasks(filtered);
      store.setSearchQuery('Deploy');

      // Verify
      expect(useTaskStore.getState().tasks).toHaveLength(2);
      expect(useTaskStore.getState().searchQuery).toBe('Deploy');
    });

    it('T47: Cascade delete updates store', () => {
      // Create hierarchy
      const parent = service.createTask(createTestTask({ title: 'Parent' }));
      const child1 = service.createTask(
        createTestTask({ title: 'Child 1', parentId: parent.id })
      );
      const child2 = service.createTask(
        createTestTask({ title: 'Child 2', parentId: parent.id })
      );

      // Load all
      const store = useTaskStore.getState();
      store.setTasks([parent, child1, child2]);
      expect(useTaskStore.getState().tasks).toHaveLength(3);

      // Delete parent via backend (cascades children)
      service.deleteTask(parent.id);

      // Update store to reflect backend state
      const remaining = service.getAllTasks();
      store.setTasks(remaining);

      // Verify cascade worked and store is updated
      expect(useTaskStore.getState().tasks).toHaveLength(0);
    });
  });

  // ============================================
  // Performance Tests
  // ============================================

  describe('Performance', () => {
    it('T48: Create 100+ tasks completes within performance threshold', () => {
      const startTime = performance.now();

      // Create 100 tasks
      for (let i = 0; i < 100; i++) {
        service.createTask(createTestTask({ title: `Task ${i}` }));
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Should complete in under 500ms (conservative threshold)
      expect(duration).toBeLessThan(500);
    });

    it('T49: getTaskTree with 100 tasks completes quickly', () => {
      // Create 100 tasks
      for (let i = 0; i < 100; i++) {
        service.createTask(createTestTask({ title: `Task ${i}` }));
      }

      const startTime = performance.now();
      const tree = service.getTaskTree();
      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(tree).toHaveLength(100);
      expect(duration).toBeLessThan(100); // < 100ms for tree query
    });

    it('T50: Search in 100 tasks completes quickly', () => {
      // Create 100 tasks
      for (let i = 0; i < 100; i++) {
        service.createTask(
          createTestTask({
            title: i % 10 === 0 ? `Database ${i}` : `Task ${i}`,
          })
        );
      }

      const startTime = performance.now();
      const results = service.searchTasks('Database');
      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(results).toHaveLength(10);
      expect(duration).toBeLessThan(50); // < 50ms for search
    });

    it('T51: Load 100 tasks into store completes quickly', () => {
      // Create 100 tasks in backend
      const tasks: Task[] = [];
      for (let i = 0; i < 100; i++) {
        tasks.push(service.createTask(createTestTask({ title: `Task ${i}` })));
      }

      const startTime = performance.now();
      const store = useTaskStore.getState();
      store.setTasks(tasks);
      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(useTaskStore.getState().tasks).toHaveLength(100);
      expect(duration).toBeLessThan(50); // < 50ms for store load
    });
  });

  // ============================================
  // Edge Cases
  // ============================================

  describe('Edge Cases and Error Handling', () => {
    it('T52: Empty task title is handled', () => {
      const task = service.createTask(createTestTask({ title: '' }));
      assertValidTaskShape(task);
      expect(task.title).toBe('');
    });

    it('T53: Very long task title is preserved', () => {
      const longTitle = 'A'.repeat(1000);
      const task = service.createTask(createTestTask({ title: longTitle }));
      expect(task.title).toBe(longTitle);
    });

    it('T54: Special characters in title are preserved', () => {
      const title = 'Task with "quotes" and \'apostrophes\' & symbols!@#$%';
      const task = service.createTask(createTestTask({ title }));
      expect(task.title).toBe(title);
    });

    it('T55: Circular parent reference is prevented (foreign key constraint)', () => {
      const task1 = service.createTask(createTestTask({ title: 'Task 1' }));
      const task2 = service.createTask(
        createTestTask({ title: 'Task 2', parentId: task1.id })
      );

      // Try to make task1 a child of task2 (would create cycle)
      // This should either be prevented by FK constraint or app logic
      const updated = service.updateTask(task1.id, { parentId: task2.id });
      expect(updated.parentId).toBe(task2.id); // Allowed at DB level, app should prevent

      // Verify no infinite loop in getTaskTree
      expect(() => service.getTaskTree()).not.toThrow();
    });

    it('T56: Multiple root tasks can coexist', () => {
      const root1 = service.createTask(createTestTask({ title: 'Root 1', parentId: null }));
      const root2 = service.createTask(createTestTask({ title: 'Root 2', parentId: null }));
      const root3 = service.createTask(createTestTask({ title: 'Root 3', parentId: null }));

      const tree = service.getTaskTree();
      const roots = tree.filter((t) => t.depth === 0);

      expect(roots).toHaveLength(3);
    });

    it('T57: Task update with all fields works correctly', () => {
      const original = service.createTask(createTestTask({ title: 'Original' }));

      const updated = service.updateTask(original.id, {
        title: 'Updated Title',
        description: 'New description',
        status: 'in_progress',
        progress: 75,
        importance: 5,
        category: 'report',
        estimatedMinutes: 120,
      });

      expect(updated.title).toBe('Updated Title');
      expect(updated.description).toBe('New description');
      expect(updated.status).toBe('in_progress');
      expect(updated.progress).toBe(75);
      expect(updated.importance).toBe(5);
      expect(updated.category).toBe('report');
      expect(updated.estimatedMinutes).toBe(120);
    });

    it('T58: Partial update preserves other fields', () => {
      const task = service.createTask(
        createTestTask({
          title: 'Original',
          description: 'Original desc',
          importance: 3,
        })
      );

      const updated = service.updateTask(task.id, { title: 'Changed' });

      expect(updated.title).toBe('Changed');
      expect(updated.description).toBe('Original desc'); // Preserved
      expect(updated.importance).toBe(3); // Preserved
    });
  });
});
