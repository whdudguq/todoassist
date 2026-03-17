/**
 * @TASK P2-R3 - Template CRUD API (TDD_MODE:RED_FIRST)
 * @SPEC docs/planning/04-database-design.md#Template
 * @TEST src/__tests__/services/template-crud.test.ts
 *
 * Tests for TemplateCrudService
 * - CRUD operations on Template table
 * - JSON serialization roundtrip (taskTree)
 * - Unique name constraint
 * - loadTemplate: deserialize -> create tasks via TaskCrudService
 * - Loaded tasks get new IDs, correct parent-child relationships
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { runMigrations } from '../../main/database/migrations';
import { TaskCrudService } from '../../main/services/task-crud';
import {
  TemplateCrudService,
  TemplateTaskNode,
} from '../../main/services/template-crud';
import type { Template } from '@shared/types';

describe('TemplateCrudService', () => {
  let db: Database.Database;
  let taskService: TaskCrudService;
  let service: TemplateCrudService;

  beforeEach(() => {
    db = new Database(':memory:');
    db.pragma('foreign_keys = ON');
    runMigrations(db);
    taskService = new TaskCrudService(db);
    service = new TemplateCrudService(db, taskService);
  });

  afterEach(() => {
    if (db) {
      db.close();
    }
  });

  // ============================================
  // saveTemplate
  // ============================================
  describe('saveTemplate', () => {
    it('should save a template and return Template object with generated id', () => {
      const taskTree: TemplateTaskNode[] = [
        { title: 'Step 1', description: 'First step', estimatedMinutes: 30 },
        { title: 'Step 2', estimatedMinutes: 15 },
      ];

      const template = service.saveTemplate('Morning Routine', 'Daily morning tasks', taskTree);

      expect(template).toBeDefined();
      expect(template.id).toBeDefined();
      expect(typeof template.id).toBe('string');
      expect(template.id.length).toBeGreaterThan(0);
      expect(template.name).toBe('Morning Routine');
      expect(template.description).toBe('Daily morning tasks');
      expect(template.createdAt).toBeGreaterThan(0);
    });

    it('should serialize taskTree as JSON string', () => {
      const taskTree: TemplateTaskNode[] = [
        { title: 'Task A', importance: 4, category: 'Quality' },
      ];

      const template = service.saveTemplate('Test Template', 'desc', taskTree);
      const parsed = JSON.parse(template.taskTree);

      expect(parsed).toEqual(taskTree);
    });

    it('should enforce unique name constraint', () => {
      const tree: TemplateTaskNode[] = [{ title: 'A' }];
      service.saveTemplate('Unique Name', 'first', tree);

      expect(() => {
        service.saveTemplate('Unique Name', 'second', tree);
      }).toThrow();
    });
  });

  // ============================================
  // getTemplateById
  // ============================================
  describe('getTemplateById', () => {
    it('should return template by id', () => {
      const tree: TemplateTaskNode[] = [{ title: 'X' }];
      const created = service.saveTemplate('Find Me', 'desc', tree);

      const found = service.getTemplateById(created.id);

      expect(found).toBeDefined();
      expect(found!.id).toBe(created.id);
      expect(found!.name).toBe('Find Me');
    });

    it('should return null for non-existent id', () => {
      const found = service.getTemplateById('non-existent-id');
      expect(found).toBeNull();
    });
  });

  // ============================================
  // getAllTemplates
  // ============================================
  describe('getAllTemplates', () => {
    it('should return empty array when no templates exist', () => {
      const all = service.getAllTemplates();
      expect(all).toEqual([]);
    });

    it('should return all saved templates', () => {
      const tree: TemplateTaskNode[] = [{ title: 'T' }];
      service.saveTemplate('Template A', 'a', tree);
      service.saveTemplate('Template B', 'b', tree);
      service.saveTemplate('Template C', 'c', tree);

      const all = service.getAllTemplates();
      expect(all).toHaveLength(3);
    });
  });

  // ============================================
  // deleteTemplate
  // ============================================
  describe('deleteTemplate', () => {
    it('should delete template and return true', () => {
      const tree: TemplateTaskNode[] = [{ title: 'Del' }];
      const created = service.saveTemplate('To Delete', 'desc', tree);

      const result = service.deleteTemplate(created.id);

      expect(result).toBe(true);
      expect(service.getTemplateById(created.id)).toBeNull();
    });

    it('should return false for non-existent id', () => {
      const result = service.deleteTemplate('non-existent');
      expect(result).toBe(false);
    });
  });

  // ============================================
  // JSON serialization roundtrip
  // ============================================
  describe('JSON serialization roundtrip', () => {
    it('should preserve nested tree structure through save/load cycle', () => {
      const taskTree: TemplateTaskNode[] = [
        {
          title: 'Parent Task',
          description: 'Top level',
          estimatedMinutes: 60,
          importance: 5,
          category: 'Quality',
          children: [
            {
              title: 'Child 1',
              estimatedMinutes: 20,
              children: [
                { title: 'Grandchild 1-1', estimatedMinutes: 10 },
                { title: 'Grandchild 1-2', estimatedMinutes: 10 },
              ],
            },
            {
              title: 'Child 2',
              estimatedMinutes: 30,
            },
          ],
        },
        {
          title: 'Independent Task',
          importance: 3,
        },
      ];

      const saved = service.saveTemplate('Nested Template', 'Complex tree', taskTree);
      const retrieved = service.getTemplateById(saved.id)!;
      const parsed = JSON.parse(retrieved.taskTree) as TemplateTaskNode[];

      expect(parsed).toEqual(taskTree);
      expect(parsed[0].children).toHaveLength(2);
      expect(parsed[0].children![0].children).toHaveLength(2);
      expect(parsed[0].children![0].children![0].title).toBe('Grandchild 1-1');
    });
  });

  // ============================================
  // loadTemplate
  // ============================================
  describe('loadTemplate', () => {
    it('should create tasks from template and return task IDs', () => {
      const taskTree: TemplateTaskNode[] = [
        { title: 'Task A', estimatedMinutes: 30 },
        { title: 'Task B', estimatedMinutes: 15 },
      ];
      const template = service.saveTemplate('Load Test', 'desc', taskTree);

      const taskIds = service.loadTemplate(template.id);

      expect(taskIds).toHaveLength(2);
      taskIds.forEach(id => {
        const task = taskService.getTaskById(id);
        expect(task).toBeDefined();
        expect(task!.status).toBe('pending');
        expect(task!.progress).toBe(0);
      });
    });

    it('should create tasks with correct properties from template nodes', () => {
      const taskTree: TemplateTaskNode[] = [
        {
          title: 'Quality Check',
          description: 'Perform quality inspection',
          estimatedMinutes: 45,
          importance: 5,
          category: 'Quality',
        },
      ];
      const template = service.saveTemplate('QC Template', 'desc', taskTree);

      const taskIds = service.loadTemplate(template.id);
      const task = taskService.getTaskById(taskIds[0])!;

      expect(task.title).toBe('Quality Check');
      expect(task.description).toBe('Perform quality inspection');
      expect(task.estimatedMinutes).toBe(45);
      expect(task.importance).toBe(5);
      expect(task.category).toBe('Quality');
    });

    it('should give loaded tasks new IDs (not template task IDs)', () => {
      const taskTree: TemplateTaskNode[] = [
        { title: 'Task 1' },
        { title: 'Task 2' },
      ];
      const template = service.saveTemplate('New IDs Test', 'desc', taskTree);

      const ids1 = service.loadTemplate(template.id);
      const ids2 = service.loadTemplate(template.id);

      // Each load creates new tasks with new IDs
      expect(ids1).not.toEqual(ids2);
      // All IDs should be unique
      const allIds = [...ids1, ...ids2];
      const uniqueIds = new Set(allIds);
      expect(uniqueIds.size).toBe(allIds.length);
    });

    it('should create correct parent-child relationships for nested trees', () => {
      const taskTree: TemplateTaskNode[] = [
        {
          title: 'Parent',
          children: [
            {
              title: 'Child 1',
              children: [
                { title: 'Grandchild 1-1' },
              ],
            },
            { title: 'Child 2' },
          ],
        },
      ];
      const template = service.saveTemplate('Nested Load', 'desc', taskTree);

      const taskIds = service.loadTemplate(template.id);

      // Should have 4 tasks total: Parent, Child 1, Grandchild 1-1, Child 2
      expect(taskIds).toHaveLength(4);

      // Find tasks by title
      const allTasks = taskService.getAllTasks();
      const parent = allTasks.find(t => t.title === 'Parent')!;
      const child1 = allTasks.find(t => t.title === 'Child 1')!;
      const child2 = allTasks.find(t => t.title === 'Child 2')!;
      const grandchild = allTasks.find(t => t.title === 'Grandchild 1-1')!;

      // Parent has no parentId
      expect(parent.parentId).toBeNull();

      // Children point to parent
      expect(child1.parentId).toBe(parent.id);
      expect(child2.parentId).toBe(parent.id);

      // Grandchild points to child1
      expect(grandchild.parentId).toBe(child1.id);
    });

    it('should set all loaded tasks to pending status and progress=0', () => {
      const taskTree: TemplateTaskNode[] = [
        {
          title: 'Root',
          children: [
            { title: 'Sub 1' },
            { title: 'Sub 2' },
          ],
        },
      ];
      const template = service.saveTemplate('Status Test', 'desc', taskTree);

      const taskIds = service.loadTemplate(template.id);

      taskIds.forEach(id => {
        const task = taskService.getTaskById(id)!;
        expect(task.status).toBe('pending');
        expect(task.progress).toBe(0);
      });
    });

    it('should support parentId parameter for loading under existing task', () => {
      // Create an existing parent task
      const existingParent = taskService.createTask({ title: 'Existing Parent' });

      const taskTree: TemplateTaskNode[] = [
        { title: 'Template Task A' },
        { title: 'Template Task B' },
      ];
      const template = service.saveTemplate('Under Parent', 'desc', taskTree);

      const taskIds = service.loadTemplate(template.id, existingParent.id);

      taskIds.forEach(id => {
        const task = taskService.getTaskById(id)!;
        // Top-level template tasks should be under the existing parent
        if (task.title === 'Template Task A' || task.title === 'Template Task B') {
          expect(task.parentId).toBe(existingParent.id);
        }
      });
    });

    it('should throw for non-existent template id', () => {
      expect(() => {
        service.loadTemplate('non-existent-template');
      }).toThrow();
    });
  });
});
