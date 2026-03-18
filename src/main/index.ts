/**
 * @TASK INT-1 - Main Process Boot Sequence
 * @SPEC docs/planning/02-trd.md
 *
 * Wires up all services and IPC handlers on app ready:
 * 1. Initialize DB + run migrations
 * 2. Read API key from Settings
 * 3. Instantiate all services
 * 4. Register all IPC handlers
 * 5. Create window
 * 6. Clean up DB on quit
 */

import { app, BrowserWindow, dialog } from 'electron';
import path from 'path';
import fs from 'fs';

// DB
import { getDb, closeDb } from './db/connection';
import { runMigrations } from './database/migrations';

// Services
import { TaskCrudService } from './services/task-crud';
import { CategoryCrudService } from './services/category-crud';
import { TemplateCrudService } from './services/template-crud';
import { TimeBoxCrudService } from './services/timebox-crud';
import { ClaudeApiService } from './services/claude-api';
import { AiScheduleService } from './services/ai-schedule';
import { DailyStatsService } from './services/daily-stats';
import { ReflectionCrudService } from './services/reflection-crud';
import { EncouragementService } from './services/encouragement';
import { AnalyticsService } from './services/analytics';

// IPC Handlers
import { registerTaskHandlers } from './ipc/task-handlers';
import { registerCategoryHandlers } from './ipc/category-handlers';
import { registerTemplateHandlers } from './ipc/template-handlers';
import { registerTimeBoxHandlers } from './ipc/timebox-handlers';
import { registerStatsHandlers } from './ipc/stats-handlers';
import { registerReflectionHandlers } from './ipc/reflection-handlers';
import { registerEncouragementHandlers } from './ipc/encouragement-handlers';
import { registerSettingsHandlers } from './ipc/settings-handlers';
import { registerAiHandlers } from './ipc/ai-handlers';

let mainWindow: BrowserWindow | null = null;

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, '../../preload/preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    title: 'TodoAssist',
  });

  if (!app.isPackaged) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    const indexPath = path.join(__dirname, '../../renderer/index.html');
    mainWindow.loadFile(indexPath);
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

/**
 * Read Claude API key from Settings table.
 * Returns empty string if not set (ClaudeApiService will fail gracefully).
 */
function getApiKeyFromDb(db: ReturnType<typeof getDb>): string {
  try {
    const row = db
      .prepare('SELECT value FROM Setting WHERE key = ?')
      .get('claudeApiKey') as { value: string } | undefined;

    if (!row || !row.value) {
      return '';
    }

    // Settings values are JSON-encoded; parse to get raw string
    try {
      const parsed = JSON.parse(row.value);
      return typeof parsed === 'string' ? parsed : '';
    } catch {
      // If not valid JSON, use raw value
      return row.value;
    }
  } catch {
    // Table may not exist yet before migrations
    return '';
  }
}

/**
 * Initialize all services and register IPC handlers.
 * Called before window creation to ensure IPC is ready.
 */
function bootstrap(): void {
  // 1. Database
  const db = getDb();
  runMigrations(db);

  // 2. API key
  const apiKey = getApiKeyFromDb(db);

  // 3. CRUD Services
  const taskService = new TaskCrudService(db);
  const categoryService = new CategoryCrudService(db);
  const templateService = new TemplateCrudService(db, taskService);
  const timeboxService = new TimeBoxCrudService(db);
  const statsService = new DailyStatsService(db);
  const reflectionService = new ReflectionCrudService(db);

  // 4. AI Services (may fail if apiKey is empty — that's OK)
  let claudeService: ClaudeApiService | null = null;
  let scheduleService: AiScheduleService | null = null;
  let encouragementService: EncouragementService | null = null;
  let analyticsService: AnalyticsService | null = null;

  if (apiKey) {
    try {
      claudeService = new ClaudeApiService(apiKey);
      scheduleService = new AiScheduleService(taskService, timeboxService, claudeService);
      encouragementService = new EncouragementService(db, claudeService);
      analyticsService = new AnalyticsService(db, claudeService);
    } catch (error) {
      console.warn('[bootstrap] Failed to initialize AI services:', error);
    }
  } else {
    console.warn('[bootstrap] No Claude API key configured. AI features disabled.');
  }

  // 5. Register IPC Handlers — CRUD (always available)
  registerTaskHandlers(taskService);
  registerCategoryHandlers(categoryService);
  registerTemplateHandlers(templateService);
  registerTimeBoxHandlers(timeboxService);
  registerSettingsHandlers(db);

  registerStatsHandlers(statsService, analyticsService);
  registerReflectionHandlers(reflectionService);

  // 6. Register IPC Handlers — AI-dependent (only if services initialized)
  if (encouragementService) {
    registerEncouragementHandlers(encouragementService);
  }
  if (claudeService && scheduleService) {
    registerAiHandlers(claudeService, scheduleService);
  }

  console.log('[bootstrap] All services and IPC handlers initialized.');
}

/** Write crash log to userData for debugging */
function writeCrashLog(error: unknown): void {
  try {
    const logPath = path.join(app.getPath('userData'), 'crash.log');
    const msg = `[${new Date().toISOString()}] ${error instanceof Error ? error.stack : String(error)}\n`;
    fs.appendFileSync(logPath, msg);
  } catch { /* ignore */ }
}

app.whenReady().then(() => {
  try {
    bootstrap();
    createWindow();
  } catch (error) {
    writeCrashLog(error);
    dialog.showErrorBox('TodoAssist 시작 오류', String(error));
    app.quit();
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

// Clean up database on quit
app.on('will-quit', () => {
  closeDb();
});
