/**
 * @TASK P2-R2 - Category CRUD API
 * @SPEC docs/planning/04-database-design.md#Category
 * @TEST src/__tests__/services/category-crud.test.ts
 *
 * CRUD operations for the Category table.
 * - Uses better-sqlite3 synchronous API
 * - Validates color format (must start with '#')
 * - Enforces unique name constraint via DB
 */

import Database from 'better-sqlite3';
import { randomUUID } from 'crypto';
import type { Category } from '@shared/types';

export interface CreateCategoryInput {
  name: string;
  color: string; // HEX e.g. '#FF6B6B'
  icon: string;
}

export class CategoryCrudService {
  private stmtInsert: Database.Statement;
  private stmtGetById: Database.Statement;
  private stmtGetAll: Database.Statement;
  private stmtDelete: Database.Statement;

  constructor(private db: Database.Database) {
    this.stmtInsert = db.prepare(
      'INSERT INTO Category (id, name, color, icon, createdAt) VALUES (?, ?, ?, ?, ?)'
    );
    this.stmtGetById = db.prepare('SELECT * FROM Category WHERE id = ?');
    this.stmtGetAll = db.prepare('SELECT * FROM Category ORDER BY createdAt ASC');
    this.stmtDelete = db.prepare('DELETE FROM Category WHERE id = ?');
  }

  createCategory(input: CreateCategoryInput): Category {
    // Layer 2: Domain validation (color format)
    if (!input.color.startsWith('#')) {
      throw new Error(`Invalid color format: "${input.color}". Must start with '#'.`);
    }

    const id = randomUUID();
    const createdAt = Date.now();

    this.stmtInsert.run(id, input.name, input.color, input.icon, createdAt);

    return { id, name: input.name, color: input.color, icon: input.icon, createdAt };
  }

  getCategoryById(id: string): Category | null {
    const row = this.stmtGetById.get(id) as Category | undefined;
    return row ?? null;
  }

  getAllCategories(): Category[] {
    return this.stmtGetAll.all() as Category[];
  }

  updateCategory(id: string, updates: Partial<CreateCategoryInput>): Category {
    // Verify category exists
    const existing = this.getCategoryById(id);
    if (!existing) {
      throw new Error(`Category not found: ${id}`);
    }

    // Layer 2: Domain validation (color format)
    if (updates.color !== undefined && !updates.color.startsWith('#')) {
      throw new Error(`Invalid color format: "${updates.color}". Must start with '#'.`);
    }

    // Build dynamic UPDATE query
    const fields: string[] = [];
    const values: unknown[] = [];

    if (updates.name !== undefined) {
      fields.push('name = ?');
      values.push(updates.name);
    }
    if (updates.color !== undefined) {
      fields.push('color = ?');
      values.push(updates.color);
    }
    if (updates.icon !== undefined) {
      fields.push('icon = ?');
      values.push(updates.icon);
    }

    if (fields.length === 0) {
      return existing;
    }

    values.push(id);
    const sql = `UPDATE Category SET ${fields.join(', ')} WHERE id = ?`;
    this.db.prepare(sql).run(...values);

    return this.getCategoryById(id)!;
  }

  deleteCategory(id: string): boolean {
    const result = this.stmtDelete.run(id);
    return result.changes > 0;
  }
}
