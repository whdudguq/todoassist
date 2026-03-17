/**
 * @TASK INT-1 - Settings IPC Handlers
 * @SPEC docs/planning/04-database-design.md#Setting
 *
 * Registers IPC handlers for Settings operations.
 * Maps IPC_CHANNELS.SETTINGS to direct DB queries on Setting table.
 */

import { ipcMain } from 'electron';
import type Database from 'better-sqlite3';
import { IPC_CHANNELS } from '@shared/types';
import type { Setting } from '@shared/types';

/**
 * Register all Settings IPC handlers
 *
 * @param db - Database instance (Settings use direct DB access)
 */
export function registerSettingsHandlers(db: Database.Database): void {
  // @TASK INT-1 - settings:get
  ipcMain.handle(IPC_CHANNELS.SETTINGS.GET, (_event, key: string) => {
    const row = db
      .prepare('SELECT id, key, value FROM Setting WHERE key = ?')
      .get(key) as Setting | undefined;
    return row ?? null;
  });

  // @TASK INT-1 - settings:update
  ipcMain.handle(
    IPC_CHANNELS.SETTINGS.UPDATE,
    (_event, key: string, value: string) => {
      const existing = db
        .prepare('SELECT id FROM Setting WHERE key = ?')
        .get(key) as { id: string } | undefined;

      if (existing) {
        db.prepare('UPDATE Setting SET value = ? WHERE key = ?').run(
          value,
          key,
        );
      } else {
        const { randomUUID } = require('crypto');
        db.prepare(
          'INSERT INTO Setting (id, key, value) VALUES (?, ?, ?)',
        ).run(randomUUID(), key, value);
      }

      return db
        .prepare('SELECT id, key, value FROM Setting WHERE key = ?')
        .get(key) as Setting;
    },
  );
}
