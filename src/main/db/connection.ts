/**
 * SQLite Database Connection Singleton
 * P0-T0.2: better-sqlite3 setup
 *
 * - Uses better-sqlite3 for synchronous SQLite access in main process
 * - Singleton pattern ensures single DB connection throughout app lifecycle
 * - WAL mode enabled for concurrent access
 * - Performance pragmas optimized for Electron app
 */

import Database from 'better-sqlite3';
import path from 'path';
import { app } from 'electron';

let dbInstance: Database.Database | null = null;

/**
 * Get or initialize the database connection
 * Production: uses app.getPath('userData')/todoassist.db
 * Tests: uses :memory: (in-memory database)
 */
export function getDb(): Database.Database {
  if (dbInstance) {
    return dbInstance;
  }

  // Determine DB file path
  let dbPath: string;
  if (process.env.NODE_ENV === 'test') {
    // In-memory database for tests
    dbPath = ':memory:';
  } else if (process.env.VITE_TESTING === 'true') {
    // Also support VITE_TESTING env var for test environments
    dbPath = ':memory:';
  } else {
    // Production: use userData directory
    const userDataPath = app.getPath('userData');
    dbPath = path.join(userDataPath, 'todoassist.db');
  }

  // Create and configure database
  dbInstance = new Database(dbPath);

  // Enable performance pragmas
  dbInstance.pragma('journal_mode = WAL');           // Write-Ahead Logging
  dbInstance.pragma('synchronous = NORMAL');         // Balance safety/speed
  dbInstance.pragma('cache_size = -64000');          // 64MB cache
  dbInstance.pragma('foreign_keys = ON');            // Enforce foreign key constraints
  dbInstance.pragma('temp_store = MEMORY');          // Store temp tables in memory

  // Optional: busy timeout to handle concurrent access
  dbInstance.pragma('busy_timeout = 5000');          // 5 second timeout

  return dbInstance;
}

/**
 * Close the database connection
 * Call this on app quit or during cleanup
 */
export function closeDb(): void {
  if (dbInstance) {
    try {
      dbInstance.close();
    } catch (error) {
      console.error('Error closing database:', error);
    } finally {
      dbInstance = null;
    }
  }
}

/**
 * Get database file path (for diagnostics/testing)
 */
export function getDbPath(): string {
  if (process.env.NODE_ENV === 'test' || process.env.VITE_TESTING === 'true') {
    return ':memory:';
  }
  const userDataPath = app.getPath('userData');
  return path.join(userDataPath, 'todoassist.db');
}

/**
 * Check if database is initialized
 */
export function isDbInitialized(): boolean {
  return dbInstance !== null;
}
