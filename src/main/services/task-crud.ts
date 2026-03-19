/**
 * @TASK P2-R1 - Task CRUD API
 * @SPEC docs/planning/04-database-design.md
 *
 * TaskCrudService - All CRUD operations for Task table
 * - Uses better-sqlite3 synchronous API
 * - Prepared statements for performance
 * - Transactions for write operations
 * - Recursive CTE for tree queries
 */

import Database from 'better-sqlite3';
import { randomUUID } from 'crypto';
import type { Task, TaskStatus, Importance } from '@shared/types';

// ============================================
// Types
// ============================================

export interface CreateTaskInput {
  title: string;
  description?: string;
  deadline?: number | null;
  estimatedMinutes?: number;
  importance?: number;
  category?: string;
  relatedClass?: string;
  parentId?: string | null;
  status?: TaskStatus;
}

export interface TaskFilter {
  category?: string;
  importance?: number[];
  status?: TaskStatus[];
  deadlineRange?: [number, number];
}

export type SortField = 'createdAt' | 'deadline' | 'importance' | 'progress';

// ============================================
// Row mapper: DB row -> Task object
// ============================================

interface TaskRow {
  id: string;
  title: string;
  description: string | null;
  deadline: number | null;
  estimatedMinutes: number | null;
  importance: number;
  category: string | null;
  relatedClass: string | null;
  parentId: string | null;
  status: string;
  progress: number;
  templateId: string | null;
  createdAt: number;
  updatedAt: number;
  completedAt: number | null;
  scheduledDate: number | null;
}

function rowToTask(row: TaskRow): Task {
  return {
    id: row.id,
    title: row.title,
    description: row.description ?? '',
    deadline: row.deadline,
    estimatedMinutes: row.estimatedMinutes ?? 0,
    importance: (row.importance ?? 3) as Importance,
    category: row.category ?? '',
    relatedClass: row.relatedClass ?? '',
    parentId: row.parentId,
    status: row.status as TaskStatus,
    progress: row.progress ?? 0,
    templateId: row.templateId,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    completedAt: row.completedAt,
    scheduledDate: row.scheduledDate,
  };
}

// ============================================
// TaskCrudService
// ============================================

export class TaskCrudService {
  constructor(private db: Database.Database) {}

  /**
   * Create a new task
   * - Generates UUID for id
   * - Sets createdAt and updatedAt to Date.now()
   * - Uses defaults for optional fields
   */
  createTask(input: CreateTaskInput): Task {
    const id = randomUUID();
    const now = Date.now();

    const stmt = this.db.prepare(`
      INSERT INTO Task (
        id, title, description, deadline, estimatedMinutes,
        importance, category, relatedClass, parentId,
        status, progress, templateId, createdAt, updatedAt, completedAt
      ) VALUES (
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?
      )
    `);

    stmt.run(
      id,
      input.title,
      input.description ?? '',
      input.deadline ?? null,
      input.estimatedMinutes ?? 0,
      input.importance ?? 3,
      input.category ?? '',
      input.relatedClass ?? '',
      input.parentId ?? null,
      input.status ?? 'pending',
      0, // progress starts at 0
      null, // templateId
      now,
      now,
      null, // completedAt
    );

    return this.getTaskById(id)!;
  }

  /**
   * Get a single task by id
   * Returns null if not found
   */
  getTaskById(id: string): Task | null {
    const row = this.db.prepare('SELECT * FROM Task WHERE id = ?').get(id) as TaskRow | undefined;
    return row ? rowToTask(row) : null;
  }

  /**
   * Get all tasks ordered by createdAt DESC
   */
  getAllTasks(): Task[] {
    const rows = this.db.prepare('SELECT * FROM Task ORDER BY createdAt DESC').all() as TaskRow[];
    return rows.map(rowToTask);
  }

  /**
   * Get child tasks of a parent
   */
  getChildTasks(parentId: string): Task[] {
    const rows = this.db.prepare(
      'SELECT * FROM Task WHERE parentId = ? ORDER BY createdAt ASC'
    ).all(parentId) as TaskRow[];
    return rows.map(rowToTask);
  }

  /**
   * Get full task tree using recursive CTE
   * Returns tasks with depth field
   * @SPEC docs/planning/04-database-design.md#3.1
   */
  getTaskTree(): Array<Task & { depth: number }> {
    const rows = this.db.prepare(`
      WITH RECURSIVE task_tree AS (
        SELECT *, 0 as depth
        FROM Task
        WHERE parentId IS NULL

        UNION ALL

        SELECT t.*, tt.depth + 1
        FROM Task t
        JOIN task_tree tt ON t.parentId = tt.id
      )
      SELECT * FROM task_tree ORDER BY depth, importance DESC
    `).all() as Array<TaskRow & { depth: number }>;

    return rows.map(row => ({
      ...rowToTask(row),
      depth: row.depth,
    }));
  }

  /**
   * Partial update of a task
   * - Updates only provided fields
   * - Always updates updatedAt
   * - Auto-sets completedAt when status -> 'completed'
   * - Auto-clears completedAt when status changes from 'completed'
   */
  updateTask(
    id: string,
    updates: Partial<CreateTaskInput & { progress: number; status: TaskStatus }>
  ): Task {
    const existing = this.getTaskById(id);
    if (!existing) {
      throw new Error(`Task not found: ${id}`);
    }

    const now = Date.now();

    // Determine completedAt based on status transition
    let completedAt: number | null = existing.completedAt;
    if (updates.status !== undefined) {
      if (updates.status === 'completed') {
        completedAt = now;
      } else {
        completedAt = null;
      }
    }

    // Build SET clause dynamically
    const fields: string[] = [];
    const values: unknown[] = [];

    if (updates.title !== undefined) {
      fields.push('title = ?');
      values.push(updates.title);
    }
    if (updates.description !== undefined) {
      fields.push('description = ?');
      values.push(updates.description);
    }
    if (updates.deadline !== undefined) {
      fields.push('deadline = ?');
      values.push(updates.deadline);
    }
    if (updates.estimatedMinutes !== undefined) {
      fields.push('estimatedMinutes = ?');
      values.push(updates.estimatedMinutes);
    }
    if (updates.importance !== undefined) {
      fields.push('importance = ?');
      values.push(updates.importance);
    }
    if (updates.category !== undefined) {
      fields.push('category = ?');
      values.push(updates.category);
    }
    if (updates.relatedClass !== undefined) {
      fields.push('relatedClass = ?');
      values.push(updates.relatedClass);
    }
    if (updates.parentId !== undefined) {
      fields.push('parentId = ?');
      values.push(updates.parentId);
    }
    if (updates.status !== undefined) {
      fields.push('status = ?');
      values.push(updates.status);
    }
    if (updates.progress !== undefined) {
      fields.push('progress = ?');
      values.push(updates.progress);
    }

    // Always update completedAt and updatedAt
    fields.push('completedAt = ?');
    values.push(completedAt);
    fields.push('updatedAt = ?');
    values.push(now);

    // Add WHERE clause parameter
    values.push(id);

    const sql = `UPDATE Task SET ${fields.join(', ')} WHERE id = ?`;
    this.db.prepare(sql).run(...values);

    return this.getTaskById(id)!;
  }

  /**
   * Delete a task by id
   * Cascade deletes children (via FK constraint)
   * Returns true if deleted, false if not found
   */
  deleteTask(id: string): boolean {
    const result = this.db.prepare('DELETE FROM Task WHERE id = ?').run(id);
    return result.changes > 0;
  }

  /**
   * Recalculate parent's progress as AVG of children's progress
   * Updates the parent task and returns the calculated progress
   * Returns 0 if parent has no children
   */
  recalculateParentProgress(parentId: string): number {
    const row = this.db.prepare(
      'SELECT AVG(progress) as avg FROM Task WHERE parentId = ?'
    ).get(parentId) as { avg: number | null } | undefined;

    const avg = Math.round(row?.avg ?? 0);

    this.db.prepare('UPDATE Task SET progress = ?, updatedAt = ? WHERE id = ?').run(
      avg,
      Date.now(),
      parentId
    );

    return avg;
  }

  /**
   * Search tasks by title (LIKE %query%)
   * Case-insensitive for ASCII characters
   */
  searchTasks(query: string): Task[] {
    const rows = this.db.prepare(
      'SELECT * FROM Task WHERE title LIKE ? ORDER BY createdAt DESC'
    ).all(`%${query}%`) as TaskRow[];
    return rows.map(rowToTask);
  }

  /**
   * Filter tasks by multiple criteria
   * Builds WHERE clause dynamically
   * All conditions are AND-combined
   */
  filterTasks(filter: TaskFilter): Task[] {
    const conditions: string[] = [];
    const values: unknown[] = [];

    if (filter.category !== undefined) {
      conditions.push('category = ?');
      values.push(filter.category);
    }

    if (filter.importance !== undefined && filter.importance.length > 0) {
      const placeholders = filter.importance.map(() => '?').join(', ');
      conditions.push(`importance IN (${placeholders})`);
      values.push(...filter.importance);
    }

    if (filter.status !== undefined && filter.status.length > 0) {
      const placeholders = filter.status.map(() => '?').join(', ');
      conditions.push(`status IN (${placeholders})`);
      values.push(...filter.status);
    }

    if (filter.deadlineRange !== undefined) {
      conditions.push('deadline >= ? AND deadline <= ?');
      values.push(filter.deadlineRange[0], filter.deadlineRange[1]);
    }

    const whereClause = conditions.length > 0
      ? `WHERE ${conditions.join(' AND ')}`
      : '';

    const sql = `SELECT * FROM Task ${whereClause} ORDER BY createdAt DESC`;
    const rows = this.db.prepare(sql).all(...values) as TaskRow[];
    return rows.map(rowToTask);
  }

  /**
   * Sort tasks by a given field and order
   * Handles null deadlines by placing them last
   */
  sortTasks(tasks: Task[], sortBy: SortField, order: 'asc' | 'desc'): Task[] {
    const sorted = [...tasks];
    const multiplier = order === 'asc' ? 1 : -1;

    sorted.sort((a, b) => {
      const aVal = a[sortBy];
      const bVal = b[sortBy];

      // Handle nulls (push to end regardless of order)
      if (aVal === null && bVal === null) return 0;
      if (aVal === null) return 1;
      if (bVal === null) return -1;

      return ((aVal as number) - (bVal as number)) * multiplier;
    });

    return sorted;
  }
}
