/**
 * @TASK P-REFLECTION - DailyReflection CRUD Service
 * @SPEC docs/planning/04-database-design.md#DailyReflection
 *
 * ReflectionCrudService - CRUD operations for DailyReflection table
 * - Uses better-sqlite3 synchronous API
 * - One reflection per date (unique index on date)
 * - Upsert pattern: INSERT OR REPLACE
 */

import Database from 'better-sqlite3';
import { randomUUID } from 'crypto';
import type { DailyReflection } from '@shared/types';

// ============================================
// Row mapper: DB row -> DailyReflection object
// ============================================

interface DailyReflectionRow {
  id: string;
  date: string;
  gratitude: string | null;
  feedbackStart: string | null;
  feedbackMid: string | null;
  feedbackEnd: string | null;
  createdAt: number;
  updatedAt: number;
}

function rowToReflection(row: DailyReflectionRow): DailyReflection {
  return {
    id: row.id,
    date: row.date,
    gratitude: row.gratitude,
    feedbackStart: row.feedbackStart,
    feedbackMid: row.feedbackMid,
    feedbackEnd: row.feedbackEnd,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

// ============================================
// ReflectionCrudService
// ============================================

export class ReflectionCrudService {
  constructor(private db: Database.Database) {}

  /**
   * Get a reflection by date
   * Returns null if no reflection exists for the date
   */
  getByDate(date: string): DailyReflection | null {
    const row = this.db.prepare(
      'SELECT * FROM DailyReflection WHERE date = ?'
    ).get(date) as DailyReflectionRow | undefined;

    return row ? rowToReflection(row) : null;
  }

  /**
   * Upsert a reflection for a given date
   * - If no reflection exists, creates a new one with crypto.randomUUID()
   * - If one exists, updates only the provided fields
   * - Always updates updatedAt
   */
  upsert(date: string, updates: Partial<DailyReflection>): DailyReflection {
    const existing = this.getByDate(date);
    const now = Date.now();

    if (existing) {
      // Update existing reflection
      const fields: string[] = [];
      const values: unknown[] = [];

      if (updates.gratitude !== undefined) {
        fields.push('gratitude = ?');
        values.push(updates.gratitude);
      }
      if (updates.feedbackStart !== undefined) {
        fields.push('feedbackStart = ?');
        values.push(updates.feedbackStart);
      }
      if (updates.feedbackMid !== undefined) {
        fields.push('feedbackMid = ?');
        values.push(updates.feedbackMid);
      }
      if (updates.feedbackEnd !== undefined) {
        fields.push('feedbackEnd = ?');
        values.push(updates.feedbackEnd);
      }

      fields.push('updatedAt = ?');
      values.push(now);
      values.push(existing.id);

      const sql = `UPDATE DailyReflection SET ${fields.join(', ')} WHERE id = ?`;
      this.db.prepare(sql).run(...values);

      return this.getByDate(date)!;
    } else {
      // Create new reflection
      const id = randomUUID();

      this.db.prepare(`
        INSERT INTO DailyReflection (
          id, date, gratitude, feedbackStart, feedbackMid, feedbackEnd,
          createdAt, updatedAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id,
        date,
        updates.gratitude ?? null,
        updates.feedbackStart ?? null,
        updates.feedbackMid ?? null,
        updates.feedbackEnd ?? null,
        now,
        now,
      );

      return this.getByDate(date)!;
    }
  }
}
