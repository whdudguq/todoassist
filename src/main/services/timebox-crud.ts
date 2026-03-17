/**
 * @TASK P3-R1 - TimeBox CRUD API
 * @SPEC docs/planning/04-database-design.md#TimeBox
 *
 * TimeBoxCrudService - All CRUD operations for TimeBox table
 * - Uses better-sqlite3 synchronous API
 * - Slot validation (0-47, startSlot <= endSlot)
 * - Overlap detection before create/update
 * - Status transitions (scheduled -> in_progress -> completed/skipped)
 */

import Database from 'better-sqlite3';
import { randomUUID } from 'crypto';
import type { TimeBox, TimeBoxStatus } from '@shared/types';

// ============================================
// Types
// ============================================

export interface CreateTimeBoxInput {
  taskId: string;
  date: string;        // 'YYYY-MM-DD'
  startSlot: number;   // 0-47
  endSlot: number;     // 0-47
  aiSuggested?: boolean;
}

export interface UpdateTimeBoxInput {
  startSlot?: number;
  endSlot?: number;
  status?: TimeBoxStatus;
}

// ============================================
// Row mapper: DB row -> TimeBox object
// ============================================

interface TimeBoxRow {
  id: string;
  taskId: string;
  date: string;
  startSlot: number;
  endSlot: number;
  status: string;
  aiSuggested: number;  // SQLite stores as 0/1
  createdAt: number;
  updatedAt: number;
}

function rowToTimeBox(row: TimeBoxRow): TimeBox {
  return {
    id: row.id,
    taskId: row.taskId,
    date: row.date,
    startSlot: row.startSlot,
    endSlot: row.endSlot,
    status: row.status as TimeBoxStatus,
    aiSuggested: row.aiSuggested === 1,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

// ============================================
// Validation helpers
// ============================================

function validateSlots(startSlot: number, endSlot: number): void {
  if (startSlot < 0 || startSlot > 47) {
    throw new Error(`Invalid startSlot: ${startSlot}. Must be 0-47.`);
  }
  if (endSlot < 0 || endSlot > 47) {
    throw new Error(`Invalid endSlot: ${endSlot}. Must be 0-47.`);
  }
  if (startSlot > endSlot) {
    throw new Error(`startSlot (${startSlot}) must be <= endSlot (${endSlot}).`);
  }
}

// ============================================
// TimeBoxCrudService
// ============================================

export class TimeBoxCrudService {
  constructor(private db: Database.Database) {}

  /**
   * Create a new timebox
   * - Validates slots (0-47, start <= end)
   * - Checks for overlap before insert
   * - Generates UUID for id
   * - Sets createdAt/updatedAt to Date.now()
   */
  createTimeBox(input: CreateTimeBoxInput): TimeBox {
    validateSlots(input.startSlot, input.endSlot);

    // Check overlap before inserting
    if (this.checkOverlap(input.date, input.startSlot, input.endSlot)) {
      throw new Error(
        `Overlap detected: date=${input.date}, slots=[${input.startSlot}, ${input.endSlot}]`
      );
    }

    const id = randomUUID();
    const now = Date.now();

    const stmt = this.db.prepare(`
      INSERT INTO TimeBox (
        id, taskId, date, startSlot, endSlot,
        status, aiSuggested, createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      input.taskId,
      input.date,
      input.startSlot,
      input.endSlot,
      'scheduled',
      input.aiSuggested ? 1 : 0,
      now,
      now,
    );

    return this.getTimeBoxById(id)!;
  }

  /**
   * Get a single timebox by id
   * Returns null if not found
   */
  getTimeBoxById(id: string): TimeBox | null {
    const row = this.db.prepare(
      'SELECT * FROM TimeBox WHERE id = ?'
    ).get(id) as TimeBoxRow | undefined;
    return row ? rowToTimeBox(row) : null;
  }

  /**
   * Get all timeboxes for a date, sorted by startSlot ASC
   */
  getTimeBoxesByDate(date: string): TimeBox[] {
    const rows = this.db.prepare(
      'SELECT * FROM TimeBox WHERE date = ? ORDER BY startSlot ASC'
    ).all(date) as TimeBoxRow[];
    return rows.map(rowToTimeBox);
  }

  /**
   * Partial update of a timebox
   * - Validates slot values if provided
   * - Checks overlap if slots change
   * - Always updates updatedAt
   */
  updateTimeBox(id: string, updates: UpdateTimeBoxInput): TimeBox {
    const existing = this.getTimeBoxById(id);
    if (!existing) {
      throw new Error(`TimeBox not found: ${id}`);
    }

    const newStartSlot = updates.startSlot ?? existing.startSlot;
    const newEndSlot = updates.endSlot ?? existing.endSlot;

    // Validate new slot values
    validateSlots(newStartSlot, newEndSlot);

    // Check overlap if slots changed (exclude self)
    const slotsChanged =
      newStartSlot !== existing.startSlot || newEndSlot !== existing.endSlot;
    if (slotsChanged) {
      if (this.checkOverlap(existing.date, newStartSlot, newEndSlot, id)) {
        throw new Error(
          `Overlap detected: date=${existing.date}, slots=[${newStartSlot}, ${newEndSlot}]`
        );
      }
    }

    const now = Date.now();
    const fields: string[] = [];
    const values: unknown[] = [];

    if (updates.startSlot !== undefined) {
      fields.push('startSlot = ?');
      values.push(updates.startSlot);
    }
    if (updates.endSlot !== undefined) {
      fields.push('endSlot = ?');
      values.push(updates.endSlot);
    }
    if (updates.status !== undefined) {
      fields.push('status = ?');
      values.push(updates.status);
    }

    fields.push('updatedAt = ?');
    values.push(now);

    values.push(id);

    const sql = `UPDATE TimeBox SET ${fields.join(', ')} WHERE id = ?`;
    this.db.prepare(sql).run(...values);

    return this.getTimeBoxById(id)!;
  }

  /**
   * Delete a timebox by id
   * Returns true if deleted, false if not found
   */
  deleteTimeBox(id: string): boolean {
    const result = this.db.prepare('DELETE FROM TimeBox WHERE id = ?').run(id);
    return result.changes > 0;
  }

  /**
   * Check if a time range overlaps with existing non-skipped timeboxes
   * Uses range overlap logic: existing.startSlot < newEndSlot+1 AND existing.endSlot+1 > newStartSlot
   * Simplified: existing.startSlot <= newEndSlot AND existing.endSlot >= newStartSlot
   *
   * @param date - Date to check
   * @param startSlot - Start slot of new range
   * @param endSlot - End slot of new range
   * @param excludeId - Optional ID to exclude (for updates)
   */
  checkOverlap(
    date: string,
    startSlot: number,
    endSlot: number,
    excludeId?: string,
  ): boolean {
    const row = this.db.prepare(`
      SELECT COUNT(*) as cnt
      FROM TimeBox
      WHERE date = ?
        AND startSlot <= ?
        AND endSlot >= ?
        AND status != 'skipped'
        AND id != ?
    `).get(
      date,
      endSlot,
      startSlot,
      excludeId ?? '',
    ) as { cnt: number };

    return row.cnt > 0;
  }
}
