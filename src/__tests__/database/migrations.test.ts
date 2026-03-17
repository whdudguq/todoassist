/**
 * @TASK P1-R1 - DB 마이그레이션 + 스키마 생성 (TDD_MODE:RED_FIRST)
 * @SPEC docs/planning/04-database-design.md
 *
 * Database migration and schema tests
 * - Tests that all 7 tables are created correctly
 * - Tests column existence and types
 * - Tests constraints (CHECK, FK, UNIQUE)
 * - Tests indexes
 * - Tests seed data
 * - Tests idempotency
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { runMigrations } from '../../main/database/migrations';

describe('Database Migrations', () => {
  let db: Database.Database;

  beforeEach(() => {
    // Create fresh in-memory database for each test
    db = new Database(':memory:');
    // Enable foreign keys
    db.pragma('foreign_keys = ON');
  });

  afterEach(() => {
    if (db) {
      db.close();
    }
  });

  describe('Schema Creation', () => {
    it('should create all 7 required tables', () => {
      runMigrations(db);

      const tables = db.prepare(`
        SELECT name FROM sqlite_master
        WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name != '_migrations'
        ORDER BY name
      `).all() as Array<{ name: string }>;

      const tableNames = tables.map(t => t.name).sort();
      expect(tableNames).toEqual([
        'Category',
        'DailyStats',
        'Encouragement',
        'Setting',
        'Task',
        'Template',
        'TimeBox',
      ]);
    });

    describe('Task table', () => {
      beforeEach(() => {
        runMigrations(db);
      });

      it('should have correct columns', () => {
        const columns = db.prepare('PRAGMA table_info(Task)').all() as Array<{
          cid: number;
          name: string;
          type: string;
          notnull: 0 | 1;
          dflt_value: unknown;
          pk: 0 | 1;
        }>;

        const columnMap = Object.fromEntries(columns.map(c => [c.name, c]));

        expect(columnMap.id.pk).toBe(1); // PRIMARY KEY
        expect(columnMap.id.type).toBe('TEXT');

        expect(columnMap.title.type).toBe('TEXT');
        expect(columnMap.title.notnull).toBe(1); // NOT NULL

        expect(columnMap.description.type).toBe('TEXT');
        expect(columnMap.deadline.type).toBe('INTEGER');
        expect(columnMap.estimatedMinutes.type).toBe('INTEGER');
        expect(columnMap.importance.type).toBe('INTEGER');
        expect(columnMap.category.type).toBe('TEXT');
        expect(columnMap.relatedClass.type).toBe('TEXT');
        expect(columnMap.parentId.type).toBe('TEXT');
        expect(columnMap.status.type).toBe('TEXT');
        expect(columnMap.status.notnull).toBe(1); // NOT NULL
        expect(columnMap.progress.type).toBe('INTEGER');
        expect(columnMap.templateId.type).toBe('TEXT');
        expect(columnMap.createdAt.type).toBe('INTEGER');
        expect(columnMap.createdAt.notnull).toBe(1); // NOT NULL
        expect(columnMap.updatedAt.type).toBe('INTEGER');
        expect(columnMap.updatedAt.notnull).toBe(1); // NOT NULL
        expect(columnMap.completedAt.type).toBe('INTEGER');
      });

      it('should have CHECK constraints on importance (1-5)', () => {
        const now = Date.now();
        // Valid: importance = 3
        const stmt1 = db.prepare(`
          INSERT INTO Task (id, title, status, importance, createdAt, updatedAt)
          VALUES (?, ?, ?, ?, ?, ?)
        `);
        expect(() => {
          stmt1.run('task-1', 'Test Task', 'pending', 3, now, now);
        }).not.toThrow();

        // Invalid: importance = 0
        expect(() => {
          stmt1.run('task-2', 'Test Task 2', 'pending', 0, now, now);
        }).toThrow();

        // Invalid: importance = 6
        expect(() => {
          stmt1.run('task-3', 'Test Task 3', 'pending', 6, now, now);
        }).toThrow();
      });

      it('should have CHECK constraint on progress (0-100)', () => {
        const now = Date.now();
        const stmt = db.prepare(`
          INSERT INTO Task (id, title, status, progress, createdAt, updatedAt)
          VALUES (?, ?, ?, ?, ?, ?)
        `);

        // Valid: progress = 50
        expect(() => {
          stmt.run('task-1', 'Test', 'pending', 50, now, now);
        }).not.toThrow();

        // Invalid: progress = 101
        expect(() => {
          stmt.run('task-2', 'Test 2', 'pending', 101, now, now);
        }).toThrow();

        // Invalid: progress = -1
        expect(() => {
          stmt.run('task-3', 'Test 3', 'pending', -1, now, now);
        }).toThrow();
      });

      it('should have CHECK constraint on status values', () => {
        const now = Date.now();
        const stmt = db.prepare(`
          INSERT INTO Task (id, title, status, createdAt, updatedAt)
          VALUES (?, ?, ?, ?, ?)
        `);

        // Valid statuses
        for (const status of ['pending', 'in_progress', 'completed', 'deferred']) {
          expect(() => {
            stmt.run(`task-${status}`, 'Test', status, now, now);
          }).not.toThrow();
        }

        // Invalid status
        expect(() => {
          stmt.run('task-invalid', 'Test', 'invalid_status', now, now);
        }).toThrow();
      });

      it('should enforce self-referencing FK on parentId', () => {
        const now = Date.now();
        const insert = db.prepare(`
          INSERT INTO Task (id, title, status, createdAt, updatedAt)
          VALUES (?, ?, ?, ?, ?)
        `);

        // Insert root task
        insert.run('task-1', 'Root', 'pending', now, now);

        // Valid: parentId references existing task
        const insertChild = db.prepare(`
          INSERT INTO Task (id, title, status, parentId, createdAt, updatedAt)
          VALUES (?, ?, ?, ?, ?, ?)
        `);
        expect(() => {
          insertChild.run('task-2', 'Child', 'pending', 'task-1', now, now);
        }).not.toThrow();

        // Invalid: parentId references non-existent task
        expect(() => {
          insertChild.run('task-3', 'Child 2', 'pending', 'non-existent', now, now);
        }).toThrow();
      });
    });

    describe('TimeBox table', () => {
      beforeEach(() => {
        runMigrations(db);
      });

      it('should have correct columns', () => {
        const columns = db.prepare('PRAGMA table_info(TimeBox)').all() as Array<{
          name: string;
          type: string;
          notnull: 0 | 1;
          pk: 0 | 1;
        }>;

        const columnMap = Object.fromEntries(columns.map(c => [c.name, c]));

        expect(columnMap.id.pk).toBe(1); // PRIMARY KEY
        expect(columnMap.id.type).toBe('TEXT');
        expect(columnMap.taskId.type).toBe('TEXT');
        expect(columnMap.taskId.notnull).toBe(1); // NOT NULL
        expect(columnMap.date.type).toBe('TEXT');
        expect(columnMap.date.notnull).toBe(1); // NOT NULL
        expect(columnMap.startSlot.type).toBe('INTEGER');
        expect(columnMap.startSlot.notnull).toBe(1);
        expect(columnMap.endSlot.type).toBe('INTEGER');
        expect(columnMap.endSlot.notnull).toBe(1);
        expect(columnMap.status.type).toBe('TEXT');
        expect(columnMap.status.notnull).toBe(1);
        expect(columnMap.aiSuggested.type).toBe('INTEGER');
        expect(columnMap.createdAt.type).toBe('INTEGER');
        expect(columnMap.updatedAt.type).toBe('INTEGER');
      });

      it('should enforce FK constraint on taskId', () => {
        const now = Date.now();

        // Insert a task first
        db.prepare(`
          INSERT INTO Task (id, title, status, createdAt, updatedAt)
          VALUES (?, ?, ?, ?, ?)
        `).run('task-1', 'Test Task', 'pending', now, now);

        // Valid: taskId references existing task
        expect(() => {
          db.prepare(`
            INSERT INTO TimeBox (id, taskId, date, startSlot, endSlot, status, createdAt, updatedAt)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `).run('tb-1', 'task-1', '2026-03-20', 0, 2, 'scheduled', now, now);
        }).not.toThrow();

        // Invalid: taskId references non-existent task
        expect(() => {
          db.prepare(`
            INSERT INTO TimeBox (id, taskId, date, startSlot, endSlot, status, createdAt, updatedAt)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `).run('tb-2', 'non-existent', '2026-03-20', 3, 5, 'scheduled', now, now);
        }).toThrow();
      });

      it('should have CHECK constraints on slots (0-47)', () => {
        const now = Date.now();

        db.prepare(`
          INSERT INTO Task (id, title, status, createdAt, updatedAt)
          VALUES (?, ?, ?, ?, ?)
        `).run('task-1', 'Test Task', 'pending', now, now);

        const stmt = db.prepare(`
          INSERT INTO TimeBox (id, taskId, date, startSlot, endSlot, status, createdAt, updatedAt)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `);

        // Valid: slots within range
        expect(() => {
          stmt.run('tb-1', 'task-1', '2026-03-20', 0, 47, 'scheduled', now, now);
        }).not.toThrow();

        // Invalid: startSlot < 0
        expect(() => {
          stmt.run('tb-2', 'task-1', '2026-03-20', -1, 5, 'scheduled', now, now);
        }).toThrow();

        // Invalid: endSlot > 47
        expect(() => {
          stmt.run('tb-3', 'task-1', '2026-03-20', 0, 48, 'scheduled', now, now);
        }).toThrow();

        // Invalid: startSlot > endSlot
        expect(() => {
          stmt.run('tb-4', 'task-1', '2026-03-20', 10, 5, 'scheduled', now, now);
        }).toThrow();
      });

      it('should have CHECK constraint on status values', () => {
        const now = Date.now();

        db.prepare(`
          INSERT INTO Task (id, title, status, createdAt, updatedAt)
          VALUES (?, ?, ?, ?, ?)
        `).run('task-1', 'Test Task', 'pending', now, now);

        const stmt = db.prepare(`
          INSERT INTO TimeBox (id, taskId, date, startSlot, endSlot, status, createdAt, updatedAt)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `);

        // Valid statuses (use different slots to avoid unique constraint violation)
        let slotCounter = 0;
        for (const status of ['scheduled', 'in_progress', 'completed', 'skipped']) {
          expect(() => {
            stmt.run(`tb-${status}`, 'task-1', '2026-03-21', slotCounter, slotCounter + 2, status, now, now);
          }).not.toThrow();
          slotCounter += 3; // Increment slot to avoid overlap
        }

        // Invalid status
        expect(() => {
          stmt.run('tb-invalid', 'task-1', '2026-03-22', 0, 2, 'invalid', now, now);
        }).toThrow();
      });
    });

    describe('Encouragement table', () => {
      beforeEach(() => {
        runMigrations(db);
      });

      it('should have correct columns', () => {
        const columns = db.prepare('PRAGMA table_info(Encouragement)').all() as Array<{
          name: string;
          type: string;
          notnull: 0 | 1;
          pk: 0 | 1;
        }>;

        const columnMap = Object.fromEntries(columns.map(c => [c.name, c]));

        expect(columnMap.id.pk).toBe(1);
        expect(columnMap.taskId.type).toBe('TEXT');
        expect(columnMap.taskId.notnull).toBe(1);
        expect(columnMap.type.type).toBe('TEXT');
        expect(columnMap.type.notnull).toBe(1);
        expect(columnMap.message.type).toBe('TEXT');
        expect(columnMap.message.notnull).toBe(1);
        expect(columnMap.tone.type).toBe('TEXT');
        expect(columnMap.tone.notnull).toBe(1);
        expect(columnMap.createdAt.type).toBe('INTEGER');
        expect(columnMap.createdAt.notnull).toBe(1);
      });

      it('should enforce FK constraint on taskId', () => {
        const now = Date.now();

        db.prepare(`
          INSERT INTO Task (id, title, status, createdAt, updatedAt)
          VALUES (?, ?, ?, ?, ?)
        `).run('task-1', 'Test Task', 'pending', now, now);

        // Valid
        expect(() => {
          db.prepare(`
            INSERT INTO Encouragement (id, taskId, type, message, tone, createdAt)
            VALUES (?, ?, ?, ?, ?, ?)
          `).run('enc-1', 'task-1', 'start', 'Good luck!', 'warm', now);
        }).not.toThrow();

        // Invalid
        expect(() => {
          db.prepare(`
            INSERT INTO Encouragement (id, taskId, type, message, tone, createdAt)
            VALUES (?, ?, ?, ?, ?, ?)
          `).run('enc-2', 'non-existent', 'start', 'Good luck!', 'warm', now);
        }).toThrow();
      });

      it('should have CHECK constraints on type and tone', () => {
        const now = Date.now();

        db.prepare(`
          INSERT INTO Task (id, title, status, createdAt, updatedAt)
          VALUES (?, ?, ?, ?, ?)
        `).run('task-1', 'Test Task', 'pending', now, now);

        const stmt = db.prepare(`
          INSERT INTO Encouragement (id, taskId, type, message, tone, createdAt)
          VALUES (?, ?, ?, ?, ?, ?)
        `);

        // Valid types
        for (const type of ['start', 'complete', 'milestone', 'nudge', 'morning']) {
          expect(() => {
            stmt.run(`enc-${type}`, 'task-1', type, 'Message', 'warm', now);
          }).not.toThrow();
        }

        // Invalid type
        expect(() => {
          stmt.run('enc-invalid-type', 'task-1', 'invalid', 'Message', 'warm', now);
        }).toThrow();

        // Valid tones
        for (const tone of ['warm', 'urgent', 'humorous', 'professional']) {
          expect(() => {
            stmt.run(`enc-${tone}`, 'task-1', 'start', 'Message', tone, now);
          }).not.toThrow();
        }

        // Invalid tone
        expect(() => {
          stmt.run('enc-invalid-tone', 'task-1', 'start', 'Message', 'invalid', now);
        }).toThrow();
      });
    });

    describe('Category table', () => {
      beforeEach(() => {
        runMigrations(db);
      });

      it('should have correct columns', () => {
        const columns = db.prepare('PRAGMA table_info(Category)').all() as Array<{
          name: string;
          type: string;
          notnull: 0 | 1;
          pk: 0 | 1;
        }>;

        const columnMap = Object.fromEntries(columns.map(c => [c.name, c]));

        expect(columnMap.id.pk).toBe(1);
        expect(columnMap.name.type).toBe('TEXT');
        expect(columnMap.name.notnull).toBe(1);
        expect(columnMap.color.type).toBe('TEXT');
        expect(columnMap.color.notnull).toBe(1);
        expect(columnMap.icon.type).toBe('TEXT');
        expect(columnMap.icon.notnull).toBe(1);
        expect(columnMap.createdAt.type).toBe('INTEGER');
        expect(columnMap.createdAt.notnull).toBe(1);
      });

      it('should have 5 default categories', () => {
        const categories = db.prepare('SELECT name FROM Category ORDER BY name').all() as Array<{
          name: string;
        }>;

        expect(categories.length).toBe(5);
        const names = categories.map(c => c.name);
        expect(names.sort()).toEqual([
          '기타',
          '보고서',
          '이메일',
          '회의',
          '품질검사',
        ].sort());
      });

      it('should have unique constraint on name', () => {
        const now = Date.now();
        const stmt = db.prepare(`
          INSERT INTO Category (id, name, color, icon, createdAt)
          VALUES (?, ?, ?, ?, ?)
        `);

        // First insert succeeds
        expect(() => {
          stmt.run('cat-new', 'NewCategory', '#FF5733', 'icon', now);
        }).not.toThrow();

        // Duplicate name fails
        expect(() => {
          stmt.run('cat-dup', 'NewCategory', '#FF5733', 'icon', now);
        }).toThrow();
      });
    });

    describe('Template table', () => {
      beforeEach(() => {
        runMigrations(db);
      });

      it('should have correct columns', () => {
        const columns = db.prepare('PRAGMA table_info(Template)').all() as Array<{
          name: string;
          type: string;
          notnull: 0 | 1;
          pk: 0 | 1;
        }>;

        const columnMap = Object.fromEntries(columns.map(c => [c.name, c]));

        expect(columnMap.id.pk).toBe(1);
        expect(columnMap.name.type).toBe('TEXT');
        expect(columnMap.name.notnull).toBe(1);
        expect(columnMap.description.type).toBe('TEXT');
        expect(columnMap.taskTree.type).toBe('TEXT');
        expect(columnMap.taskTree.notnull).toBe(1);
        expect(columnMap.category.type).toBe('TEXT');
        expect(columnMap.createdAt.type).toBe('INTEGER');
        expect(columnMap.createdAt.notnull).toBe(1);
      });

      it('should have unique constraint on name', () => {
        const now = Date.now();
        const stmt = db.prepare(`
          INSERT INTO Template (id, name, description, taskTree, category, createdAt)
          VALUES (?, ?, ?, ?, ?, ?)
        `);

        // First insert succeeds
        expect(() => {
          stmt.run('tpl-1', 'Template1', 'Desc', '{"tasks":[]}', 'cat1', now);
        }).not.toThrow();

        // Duplicate name fails
        expect(() => {
          stmt.run('tpl-2', 'Template1', 'Desc2', '{"tasks":[]}', 'cat1', now);
        }).toThrow();
      });
    });

    describe('Setting table', () => {
      beforeEach(() => {
        runMigrations(db);
      });

      it('should have correct columns', () => {
        const columns = db.prepare('PRAGMA table_info(Setting)').all() as Array<{
          name: string;
          type: string;
          notnull: 0 | 1;
          pk: 0 | 1;
        }>;

        const columnMap = Object.fromEntries(columns.map(c => [c.name, c]));

        expect(columnMap.id.pk).toBe(1);
        expect(columnMap.key.type).toBe('TEXT');
        expect(columnMap.key.notnull).toBe(1);
        expect(columnMap.value.type).toBe('TEXT');
        expect(columnMap.value.notnull).toBe(1);
      });

      it('should have 10 default settings', () => {
        const settings = db.prepare('SELECT key FROM Setting ORDER BY key').all() as Array<{
          key: string;
        }>;

        expect(settings.length).toBe(10);
      });

      it('should have unique constraint on key', () => {
        const stmt = db.prepare(`
          INSERT INTO Setting (id, key, value)
          VALUES (?, ?, ?)
        `);

        // Duplicate key fails
        expect(() => {
          stmt.run('set-dup', 'workStartHour', '9');
        }).toThrow();
      });
    });

    describe('DailyStats table', () => {
      beforeEach(() => {
        runMigrations(db);
      });

      it('should have correct columns', () => {
        const columns = db.prepare('PRAGMA table_info(DailyStats)').all() as Array<{
          name: string;
          type: string;
          notnull: 0 | 1;
          pk: 0 | 1;
        }>;

        const columnMap = Object.fromEntries(columns.map(c => [c.name, c]));

        expect(columnMap.id.pk).toBe(1);
        expect(columnMap.date.type).toBe('TEXT');
        expect(columnMap.date.notnull).toBe(1);
        expect(columnMap.completedCount.type).toBe('INTEGER');
        expect(columnMap.totalPlanned.type).toBe('INTEGER');
        expect(columnMap.deferredCount.type).toBe('INTEGER');
        expect(columnMap.totalMinutesUsed.type).toBe('INTEGER');
        expect(columnMap.categoryBreakdown.type).toBe('TEXT');
        expect(columnMap.createdAt.type).toBe('INTEGER');
        expect(columnMap.createdAt.notnull).toBe(1);
        expect(columnMap.updatedAt.type).toBe('INTEGER');
        expect(columnMap.updatedAt.notnull).toBe(1);
      });

      it('should have unique constraint on date', () => {
        const now = Date.now();
        const stmt = db.prepare(`
          INSERT INTO DailyStats (id, date, completedCount, totalPlanned, deferredCount, totalMinutesUsed, categoryBreakdown, createdAt, updatedAt)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        // First insert succeeds
        expect(() => {
          stmt.run('stat-1', '2026-03-20', 5, 10, 0, 300, '{}', now, now);
        }).not.toThrow();

        // Duplicate date fails
        expect(() => {
          stmt.run('stat-2', '2026-03-20', 6, 11, 1, 350, '{}', now, now);
        }).toThrow();
      });
    });
  });

  describe('Indexes', () => {
    beforeEach(() => {
      runMigrations(db);
    });

    it('should have indexes on Task table', () => {
      const indexes = db.prepare(`
        SELECT name FROM sqlite_master
        WHERE type='index' AND tbl_name='Task' AND name LIKE 'idx_%'
        ORDER BY name
      `).all() as Array<{ name: string }>;

      const indexNames = indexes.map(i => i.name);

      expect(indexNames).toContain('idx_task_deadline');
      expect(indexNames).toContain('idx_task_status');
      expect(indexNames).toContain('idx_task_category');
      expect(indexNames).toContain('idx_task_parentId');
      expect(indexNames).toContain('idx_task_createdAt');
      expect(indexNames).toContain('idx_task_completedAt');
    });

    it('should have indexes on TimeBox table', () => {
      const indexes = db.prepare(`
        SELECT name FROM sqlite_master
        WHERE type='index' AND tbl_name='TimeBox' AND name LIKE 'idx_%'
        ORDER BY name
      `).all() as Array<{ name: string }>;

      const indexNames = indexes.map(i => i.name);

      expect(indexNames).toContain('idx_timebox_taskId');
      expect(indexNames).toContain('idx_timebox_date');
      expect(indexNames).toContain('idx_timebox_date_slot');
    });

    it('should have indexes on Encouragement table', () => {
      const indexes = db.prepare(`
        SELECT name FROM sqlite_master
        WHERE type='index' AND tbl_name='Encouragement' AND name LIKE 'idx_%'
        ORDER BY name
      `).all() as Array<{ name: string }>;

      const indexNames = indexes.map(i => i.name);

      expect(indexNames).toContain('idx_encouragement_taskId');
      expect(indexNames).toContain('idx_encouragement_type');
      expect(indexNames).toContain('idx_encouragement_createdAt');
    });
  });

  describe('Foreign Key Cascades', () => {
    beforeEach(() => {
      runMigrations(db);
    });

    it('should cascade delete TimeBox when Task is deleted', () => {
      const now = Date.now();

      // Insert task
      db.prepare(`
        INSERT INTO Task (id, title, status, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?)
      `).run('task-1', 'Test Task', 'pending', now, now);

      // Insert timebox
      db.prepare(`
        INSERT INTO TimeBox (id, taskId, date, startSlot, endSlot, status, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run('tb-1', 'task-1', '2026-03-20', 0, 2, 'scheduled', now, now);

      // Verify timebox exists
      let count = db.prepare('SELECT COUNT(*) as cnt FROM TimeBox').get() as { cnt: number };
      expect(count.cnt).toBe(1);

      // Delete task
      db.prepare('DELETE FROM Task WHERE id = ?').run('task-1');

      // Verify timebox is also deleted
      count = db.prepare('SELECT COUNT(*) as cnt FROM TimeBox').get() as { cnt: number };
      expect(count.cnt).toBe(0);
    });

    it('should cascade delete Encouragement when Task is deleted', () => {
      const now = Date.now();

      // Insert task
      db.prepare(`
        INSERT INTO Task (id, title, status, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?)
      `).run('task-1', 'Test Task', 'pending', now, now);

      // Insert encouragement
      db.prepare(`
        INSERT INTO Encouragement (id, taskId, type, message, tone, createdAt)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run('enc-1', 'task-1', 'start', 'Good luck!', 'warm', now);

      // Verify encouragement exists
      let count = db.prepare('SELECT COUNT(*) as cnt FROM Encouragement').get() as { cnt: number };
      expect(count.cnt).toBe(1);

      // Delete task
      db.prepare('DELETE FROM Task WHERE id = ?').run('task-1');

      // Verify encouragement is also deleted
      count = db.prepare('SELECT COUNT(*) as cnt FROM Encouragement').get() as { cnt: number };
      expect(count.cnt).toBe(0);
    });

    it('should cascade delete child Tasks when parent Task is deleted', () => {
      const now = Date.now();

      // Insert parent task
      db.prepare(`
        INSERT INTO Task (id, title, status, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?)
      `).run('parent', 'Parent Task', 'pending', now, now);

      // Insert child task
      db.prepare(`
        INSERT INTO Task (id, title, status, parentId, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run('child', 'Child Task', 'pending', 'parent', now, now);

      // Verify child exists
      let count = db.prepare('SELECT COUNT(*) as cnt FROM Task WHERE parentId IS NOT NULL').get() as { cnt: number };
      expect(count.cnt).toBe(1);

      // Delete parent
      db.prepare('DELETE FROM Task WHERE id = ?').run('parent');

      // Verify child is also deleted
      count = db.prepare('SELECT COUNT(*) as cnt FROM Task WHERE parentId IS NOT NULL').get() as { cnt: number };
      expect(count.cnt).toBe(0);
    });
  });

  describe('Migration Idempotency', () => {
    it('should handle running migrations twice without error', () => {
      // First run
      expect(() => {
        runMigrations(db);
      }).not.toThrow();

      // Second run should not fail
      expect(() => {
        runMigrations(db);
      }).not.toThrow();

      // Verify tables still exist and data is intact (excluding _migrations table)
      const tables = db.prepare(`
        SELECT COUNT(*) as cnt FROM sqlite_master
        WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name != '_migrations'
      `).get() as { cnt: number };

      expect(tables.cnt).toBe(7);

      // Verify seed data is still present
      const categories = db.prepare('SELECT COUNT(*) as cnt FROM Category').get() as { cnt: number };
      expect(categories.cnt).toBe(5);

      const settings = db.prepare('SELECT COUNT(*) as cnt FROM Setting').get() as { cnt: number };
      expect(settings.cnt).toBe(10);
    });
  });

  describe('Seed Data', () => {
    beforeEach(() => {
      runMigrations(db);
    });

    it('should have 5 default categories with proper structure', () => {
      const categories = db.prepare(`
        SELECT id, name, color, icon, createdAt
        FROM Category
        ORDER BY name
      `).all() as Array<{
        id: string;
        name: string;
        color: string;
        icon: string;
        createdAt: number;
      }>;

      expect(categories.length).toBe(5);

      const categoryMap = Object.fromEntries(categories.map(c => [c.name, c]));

      // Check each category
      expect(categoryMap['품질검사']).toBeDefined();
      expect(categoryMap['품질검사'].color).toBe('#FF6B6B');
      expect(categoryMap['품질검사'].icon).toBe('check_circle');

      expect(categoryMap['보고서']).toBeDefined();
      expect(categoryMap['보고서'].color).toBe('#4ECDC4');

      expect(categoryMap['회의']).toBeDefined();
      expect(categoryMap['회의'].color).toBe('#45B7D1');

      expect(categoryMap['이메일']).toBeDefined();
      expect(categoryMap['이메일'].color).toBe('#FFA07A');

      expect(categoryMap['기타']).toBeDefined();
      expect(categoryMap['기타'].color).toBe('#95A5A6');
    });

    it('should have 10 default settings', () => {
      const settings = db.prepare(`
        SELECT key, value FROM Setting ORDER BY key
      `).all() as Array<{ key: string; value: string }>;

      expect(settings.length).toBe(10);

      const settingMap = Object.fromEntries(settings.map(s => [s.key, s.value]));

      expect(settingMap.workStartHour).toBe('8');
      expect(settingMap.workEndHour).toBe('17');
      expect(settingMap.workStartMinute).toBe('30');
      expect(settingMap.workEndMinute).toBe('30');
      expect(settingMap.aiTone).toBe('"warm"');
      expect(settingMap.notificationEnabled).toBe('true');
      expect(settingMap.soundEnabled).toBe('true');
      expect(settingMap.claudeApiKey).toBe('""');
      expect(settingMap.darkMode).toBe('false');
      expect(settingMap.language).toBe('"ko"');
    });
  });
});
