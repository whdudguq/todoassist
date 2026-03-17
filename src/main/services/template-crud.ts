/**
 * @TASK P2-R3 - Template CRUD API
 * @SPEC docs/planning/04-database-design.md#Template
 *
 * TemplateCrudService - CRUD operations for Template table
 * - Saves reusable task trees as JSON
 * - Loads templates by creating real tasks via TaskCrudService
 * - Recursive tree creation for nested children
 */

import Database from 'better-sqlite3';
import { randomUUID } from 'crypto';
import type { Template } from '@shared/types';
import { TaskCrudService } from './task-crud';

// ============================================
// Types
// ============================================

export interface TemplateTaskNode {
  title: string;
  description?: string;
  estimatedMinutes?: number;
  importance?: number;
  category?: string;
  children?: TemplateTaskNode[];
}

// ============================================
// Row mapper: DB row -> Template object
// ============================================

interface TemplateRow {
  id: string;
  name: string;
  description: string | null;
  taskTree: string;
  category: string | null;
  createdAt: number;
}

function rowToTemplate(row: TemplateRow): Template {
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? '',
    taskTree: row.taskTree,
    category: row.category ?? '',
    createdAt: row.createdAt,
  };
}

// ============================================
// TemplateCrudService
// ============================================

export class TemplateCrudService {
  constructor(
    private db: Database.Database,
    private taskService: TaskCrudService
  ) {}

  /**
   * Save a new template
   * - Generates UUID for id
   * - Serializes taskTree to JSON string
   * - Sets createdAt to Date.now()
   */
  saveTemplate(
    name: string,
    description: string,
    taskTree: TemplateTaskNode[]
  ): Template {
    const id = randomUUID();
    const now = Date.now();
    const taskTreeJson = JSON.stringify(taskTree);

    const stmt = this.db.prepare(`
      INSERT INTO Template (id, name, description, taskTree, category, createdAt)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    stmt.run(id, name, description, taskTreeJson, '', now);

    return this.getTemplateById(id)!;
  }

  /**
   * Get a single template by id
   * Returns null if not found
   */
  getTemplateById(id: string): Template | null {
    const row = this.db
      .prepare('SELECT * FROM Template WHERE id = ?')
      .get(id) as TemplateRow | undefined;
    return row ? rowToTemplate(row) : null;
  }

  /**
   * Get all templates ordered by createdAt DESC
   */
  getAllTemplates(): Template[] {
    const rows = this.db
      .prepare('SELECT * FROM Template ORDER BY createdAt DESC')
      .all() as TemplateRow[];
    return rows.map(rowToTemplate);
  }

  /**
   * Delete a template by id
   * Returns true if deleted, false if not found
   */
  deleteTemplate(id: string): boolean {
    const result = this.db
      .prepare('DELETE FROM Template WHERE id = ?')
      .run(id);
    return result.changes > 0;
  }

  /**
   * Load a template: deserialize JSON taskTree and create real tasks
   * - Recursively creates tasks via TaskCrudService
   * - All tasks created with status='pending', progress=0
   * - Returns array of all created task IDs (flat)
   *
   * @param templateId - ID of the template to load
   * @param parentId - Optional parent task ID (for loading under existing task)
   * @returns Array of created task IDs
   */
  loadTemplate(templateId: string, parentId?: string | null): string[] {
    const template = this.getTemplateById(templateId);
    if (!template) {
      throw new Error(`Template not found: ${templateId}`);
    }

    const taskTree = JSON.parse(template.taskTree) as TemplateTaskNode[];
    const createdIds: string[] = [];

    // Recursively create tasks from tree nodes
    const createTasksFromNodes = (
      nodes: TemplateTaskNode[],
      nodeParentId: string | null
    ): void => {
      for (const node of nodes) {
        const task = this.taskService.createTask({
          title: node.title,
          description: node.description,
          estimatedMinutes: node.estimatedMinutes,
          importance: node.importance,
          category: node.category,
          parentId: nodeParentId,
          status: 'pending',
        });

        createdIds.push(task.id);

        // Recursively create children
        if (node.children && node.children.length > 0) {
          createTasksFromNodes(node.children, task.id);
        }
      }
    };

    createTasksFromNodes(taskTree, parentId ?? null);

    return createdIds;
  }
}
