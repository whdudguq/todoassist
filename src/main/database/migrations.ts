/**
 * @TASK P1-R1 - DB 마이그레이션 + 스키마 생성 (TDD_MODE:RED_FIRST)
 * @SPEC docs/planning/04-database-design.md
 *
 * Database migration system
 * - Runs all pending migrations using schema.sql
 * - Tracks migration version in _migrations table
 * - Executes SQL in transactions
 * - Handles idempotency with INSERT OR IGNORE for seed data
 */

import Database from 'better-sqlite3';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

/** Get Electron's resourcesPath if running in packaged app */
function getResourcesPath(): string | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { app } = require('electron');
    return app?.isPackaged ? process.resourcesPath ?? null : null;
  } catch {
    return null;
  }
}

// In CJS (Electron build): __dirname is available natively
// In ESM (vitest): __dirname is shimmed by vitest
// We use process.cwd() as primary fallback for schema.sql discovery
const __currentDir = typeof __dirname !== 'undefined' ? __dirname : process.cwd();

/**
 * Migration version table
 * Stores applied migration versions
 */
interface MigrationRecord {
  version: number;
  appliedAt: number;
}

/**
 * Create migration tracking table if it doesn't exist
 */
function ensureMigrationsTable(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS _migrations (
      version INTEGER PRIMARY KEY,
      appliedAt INTEGER NOT NULL
    )
  `);
}

/**
 * Get current migration version
 */
function getCurrentVersion(db: Database.Database): number {
  const result = db.prepare('SELECT MAX(version) as maxVersion FROM _migrations').get() as {
    maxVersion: number | null;
  };
  return result.maxVersion || 0;
}

/**
 * Record a migration as applied
 */
function recordMigration(db: Database.Database, version: number): void {
  db.prepare('INSERT INTO _migrations (version, appliedAt) VALUES (?, ?)').run(
    version,
    Date.now()
  );
}

/**
 * Find schema.sql file by trying multiple paths
 */
function findSchemaPath(): string {
  const resPath = getResourcesPath();
  const possiblePaths = [
    // Packaged app: extraResources → resources/database/schema.sql
    ...(resPath ? [join(resPath, 'database', 'schema.sql')] : []),
    // Running from src directory (development)
    join(__currentDir, 'schema.sql'),
    // Running from dist directory (compiled)
    join(__currentDir, 'schema.sql'),
    // For tests that might be run from project root
    join(process.cwd(), 'src/main/database/schema.sql'),
  ];

  for (const path of possiblePaths) {
    if (existsSync(path)) {
      return path;
    }
  }

  // If not found by file path, try to construct from alternatives
  const alternatives = [
    './schema.sql',
    '../database/schema.sql',
    '../../main/database/schema.sql',
  ];

  for (const alt of alternatives) {
    const path = join(__currentDir, alt);
    if (existsSync(path)) {
      return path;
    }
  }

  throw new Error(
    `Cannot find schema.sql. Tried: ${possiblePaths.join(', ')}`
  );
}

/**
 * Run all pending migrations
 * - Loads schema.sql
 * - Tracks migration state in _migrations table
 * - Executes in transaction
 *
 * @param db - Database instance
 */
export function runMigrations(db: Database.Database): void {
  try {
    // Ensure migration table exists
    ensureMigrationsTable(db);

    const currentVersion = getCurrentVersion(db);
    const targetVersion = 2;

    if (currentVersion >= targetVersion) {
      // Migrations already applied
      return;
    }

    // Version 1: Initial schema from schema.sql
    if (currentVersion < 1) {
      const schemaPath = findSchemaPath();
      const schemaSql = readFileSync(schemaPath, 'utf-8');

      const transaction1 = db.transaction(() => {
        db.exec(schemaSql);
        recordMigration(db, 1);
      });

      transaction1();
      console.log('[Migration] Applied version 1 (initial schema)');
    }

    // Version 2: DailyReflection table
    if (currentVersion < 2) {
      const transaction2 = db.transaction(() => {
        db.exec(`
          CREATE TABLE IF NOT EXISTS DailyReflection (
            id TEXT PRIMARY KEY,
            date TEXT NOT NULL,
            gratitude TEXT,
            feedbackStart TEXT,
            feedbackMid TEXT,
            feedbackEnd TEXT,
            createdAt INTEGER NOT NULL,
            updatedAt INTEGER NOT NULL
          );
          CREATE UNIQUE INDEX IF NOT EXISTS idx_reflection_date ON DailyReflection(date);
        `);
        recordMigration(db, 2);
      });
      transaction2();
      console.log('[Migration] Applied version 2 (DailyReflection)');
    }
  } catch (error) {
    console.error('[Migration] Error:', error);
    throw error;
  }
}

/**
 * Check if all migrations are applied
 */
export function isMigrationComplete(db: Database.Database): boolean {
  try {
    ensureMigrationsTable(db);
    const currentVersion = getCurrentVersion(db);
    return currentVersion >= 2;
  } catch {
    return false;
  }
}

/**
 * Get migration status for debugging
 */
export function getMigrationStatus(db: Database.Database): {
  currentVersion: number;
  targetVersion: number;
  isComplete: boolean;
  appliedMigrations: MigrationRecord[];
} {
  try {
    ensureMigrationsTable(db);
    const currentVersion = getCurrentVersion(db);
    const targetVersion = 2;
    const appliedMigrations = db.prepare('SELECT version, appliedAt FROM _migrations ORDER BY version').all() as MigrationRecord[];

    return {
      currentVersion,
      targetVersion,
      isComplete: currentVersion >= targetVersion,
      appliedMigrations,
    };
  } catch (error) {
    return {
      currentVersion: 0,
      targetVersion: 2,
      isComplete: false,
      appliedMigrations: [],
    };
  }
}
