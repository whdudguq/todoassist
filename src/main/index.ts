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

import { app, BrowserWindow, dialog, ipcMain } from 'electron';
import { IPC_CHANNELS } from '../shared/types';
import { autoUpdater } from 'electron-updater';
import path from 'path';
import fs from 'fs';

// Debug logger — writes to userData/debug.log for production diagnostics
function debugLog(msg: string): void {
  try {
    const logPath = path.join(app.getPath('userData'), 'debug.log');
    fs.appendFileSync(logPath, `[${new Date().toISOString()}] ${msg}\n`);
  } catch { /* ignore */ }
}

// Catch ALL uncaught errors and write to crash.log
process.on('uncaughtException', (error) => {
  try {
    const logPath = path.join(app.getPath('userData'), 'crash.log');
    fs.appendFileSync(logPath, `[${new Date().toISOString()}] UNCAUGHT: ${error.stack}\n`);
    debugLog(`UNCAUGHT: ${error.stack}`);
    dialog.showErrorBox('TodoAssist 오류', `${error.message}\n\n로그: ${logPath}`);
  } catch { /* ignore */ }
  app.quit();
});

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
import { FocusGuardService } from './services/focus-guard';

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
  const preloadPath = path.join(__dirname, '../../preload/preload/index.js');
  debugLog(`createWindow: __dirname=${__dirname}`);
  debugLog(`createWindow: preload=${preloadPath} exists=${fs.existsSync(preloadPath)}`);

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    show: false,
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
    },
    title: 'TodoAssist',
  });

  mainWindow.once('ready-to-show', () => {
    debugLog('createWindow: ready-to-show fired');
    mainWindow?.show();
  });

  mainWindow.webContents.on('did-finish-load', () => {
    debugLog('createWindow: did-finish-load');
  });

  mainWindow.webContents.on('did-fail-load', (_e, code, desc, url) => {
    debugLog(`createWindow: did-fail-load code=${code} desc=${desc} url=${url}`);
  });

  mainWindow.webContents.on('render-process-gone', (_e, details) => {
    debugLog(`createWindow: render-process-gone reason=${details.reason} exitCode=${details.exitCode}`);
  });

  mainWindow.webContents.on('console-message', (_e, level, message) => {
    if (level >= 2) debugLog(`renderer-console[${level}]: ${message}`);
  });

  if (!app.isPackaged) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    const indexPath = path.join(__dirname, '../../renderer/index.html');
    debugLog(`createWindow: loadFile=${indexPath} exists=${fs.existsSync(indexPath)}`);
    mainWindow.loadFile(indexPath).catch((err) => {
      debugLog(`createWindow: loadFile FAILED: ${err}`);
    });
  }

  mainWindow.on('closed', () => {
    debugLog('createWindow: window closed');
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

// Module-level AI services — can be reinitialized when API key changes
let claudeService: ClaudeApiService | null = null;
let scheduleService: AiScheduleService | null = null;
let encouragementService: EncouragementService | null = null;
let analyticsService: AnalyticsService | null = null;

function initAiServices(
  db: ReturnType<typeof getDb>,
  taskService: TaskCrudService,
  timeboxService: TimeBoxCrudService,
  apiKey: string,
): void {
  if (!apiKey) {
    claudeService = null;
    scheduleService = null;
    encouragementService = null;
    analyticsService = null;
    debugLog('[ai] services cleared (no API key)');
    return;
  }
  try {
    claudeService = new ClaudeApiService(apiKey);
    scheduleService = new AiScheduleService(taskService, timeboxService, claudeService);
    encouragementService = new EncouragementService(db, claudeService);
    analyticsService = new AnalyticsService(db, claudeService);
    debugLog('[ai] services initialized');
  } catch (error) {
    debugLog(`[ai] init failed: ${error}`);
    claudeService = null;
    scheduleService = null;
    encouragementService = null;
    analyticsService = null;
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

  // 4. AI Services
  initAiServices(db, taskService, timeboxService, apiKey);

  // 5. Register IPC Handlers — CRUD (always available)
  registerTaskHandlers(taskService);
  registerCategoryHandlers(categoryService);
  registerTemplateHandlers(templateService);
  registerTimeBoxHandlers(timeboxService);
  registerSettingsHandlers(db, () => {
    // Callback: reinitialize AI services when API key changes
    const newKey = getApiKeyFromDb(db);
    initAiServices(db, taskService, timeboxService, newKey);
  });

  registerStatsHandlers(statsService, () => analyticsService);
  registerReflectionHandlers(reflectionService);

  // 6. Register AI + Encouragement handlers (always — they check service availability)
  registerEncouragementHandlers(() => encouragementService);
  registerAiHandlers(() => claudeService, () => scheduleService);

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
  debugLog('app.whenReady fired');
  try {
    debugLog('bootstrap: start');
    bootstrap();
    debugLog('bootstrap: done');
    createWindow();
    debugLog('createWindow: called');

    // Focus Guard IPC
    const focusGuard = new FocusGuardService();
    ipcMain.handle(IPC_CHANNELS.FOCUS_GUARD.START, (_e, taskTitle: string) => {
      if (mainWindow) {
        focusGuard.start(taskTitle, mainWindow);
        debugLog(`[focusGuard] started: ${taskTitle}`);
      }
      return { ok: true };
    });
    ipcMain.handle(IPC_CHANNELS.FOCUS_GUARD.STOP, () => {
      const stats = focusGuard.stop();
      debugLog(`[focusGuard] stopped: ${JSON.stringify(stats)}`);
      return { ok: true, stats };
    });

    // 앱 종료 시 Focus Guard 정리 (mortem: stop() 미호출 → 알림 폭탄 방지)
    app.on('before-quit', () => {
      focusGuard.stop();
    });

    // Auto-updater: check for updates in packaged app
    if (app.isPackaged) {
      autoUpdater.logger = {
        info: (msg: unknown) => debugLog(`[updater] INFO: ${msg}`),
        warn: (msg: unknown) => debugLog(`[updater] WARN: ${msg}`),
        error: (msg: unknown) => debugLog(`[updater] ERROR: ${msg}`),
        debug: (msg: unknown) => debugLog(`[updater] DEBUG: ${msg}`),
      };
      autoUpdater.on('update-available', (info) => {
        debugLog(`[updater] update-available: v${info.version}`);
        dialog.showMessageBox({
          type: 'info',
          title: '업데이트 알림',
          message: `새 버전 v${info.version}이 있습니다. 백그라운드에서 다운로드합니다.`,
        });
      });
      autoUpdater.on('update-downloaded', (info) => {
        debugLog(`[updater] update-downloaded: v${info.version}`);
        dialog.showMessageBox({
          type: 'info',
          title: '업데이트 준비 완료',
          message: `v${info.version} 다운로드 완료. 확인을 누르면 앱을 재시작하여 업데이트합니다.`,
          buttons: ['지금 재시작', '나중에'],
        }).then((result) => {
          if (result.response === 0) {
            autoUpdater.quitAndInstall();
          }
        });
      });
      autoUpdater.on('error', (err) => {
        debugLog(`[updater] error: ${err.message}`);
      });
      autoUpdater.checkForUpdatesAndNotify();
      debugLog('[updater] checkForUpdatesAndNotify called');
    }
  } catch (error) {
    debugLog(`STARTUP ERROR: ${error instanceof Error ? error.stack : String(error)}`);
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
