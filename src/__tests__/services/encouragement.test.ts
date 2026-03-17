/**
 * @TASK P4-R2 - Encouragement Service (TDD_MODE:RED_FIRST)
 * @SPEC docs/planning/02-trd.md#Encouragement
 * @TEST src/__tests__/services/encouragement.test.ts
 *
 * Tests for EncouragementService
 * - determineTone: time-of-day + completionRate + deferCount logic
 * - generateMessage: calls Claude API, stores in DB, returns Encouragement
 * - getTodayMessages / getMessagesByTask: DB queries
 * - All 5 message types: morning, start, complete, nudge, milestone
 * - Eros principles: warm tone for deferred, humorous for 100% completion
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { runMigrations } from '../../main/database/migrations';
import type { Task, Encouragement, EncouragementTone } from '@shared/types';

// ---- Mock ClaudeApiService ----
const mockGenerateEncouragement = vi.fn();

vi.mock('@main/services/claude-api', () => {
  return {
    ClaudeApiService: class MockClaudeApiService {
      generateEncouragement = mockGenerateEncouragement;
      constructor(_apiKey: string) {
        // no-op
      }
    },
  };
});

import { ClaudeApiService } from '@main/services/claude-api';
import {
  EncouragementService,
  EncouragementContext,
} from '../../main/services/encouragement';

// ---- Test Fixtures ----
function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 'task-001',
    title: '보고서 작성',
    description: '월간 품질 보고서 작성하기',
    deadline: Date.now() + 86400000,
    estimatedMinutes: 60,
    importance: 3,
    category: '업무',
    relatedClass: '',
    parentId: null,
    status: 'pending',
    progress: 0,
    templateId: null,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    completedAt: null,
    ...overrides,
  };
}

function insertTask(db: Database.Database, task: Task): void {
  db.prepare(`
    INSERT INTO Task (id, title, description, deadline, estimatedMinutes, importance,
      category, relatedClass, parentId, status, progress, templateId, createdAt, updatedAt, completedAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    task.id, task.title, task.description, task.deadline, task.estimatedMinutes,
    task.importance, task.category, task.relatedClass, task.parentId, task.status,
    task.progress, task.templateId, task.createdAt, task.updatedAt, task.completedAt,
  );
}

// ---- Tests ----
describe('EncouragementService', () => {
  let db: Database.Database;
  let claudeService: ClaudeApiService;
  let service: EncouragementService;

  beforeEach(() => {
    vi.clearAllMocks();
    db = new Database(':memory:');
    db.pragma('foreign_keys = ON');
    runMigrations(db);
    claudeService = new ClaudeApiService('fake-key');
    service = new EncouragementService(db, claudeService);
  });

  afterEach(() => {
    if (db) db.close();
  });

  // ============================================
  // determineTone
  // ============================================
  describe('determineTone', () => {
    // --- Time-of-day defaults ---
    it('should return "warm" for morning hours (06-12)', () => {
      expect(service.determineTone(6, 0, 0)).toBe('warm');
      expect(service.determineTone(8, 0, 0)).toBe('warm');
      expect(service.determineTone(11, 0, 0)).toBe('warm');
    });

    it('should return "professional" for afternoon hours (12-18)', () => {
      expect(service.determineTone(12, 0, 0)).toBe('professional');
      expect(service.determineTone(15, 0, 0)).toBe('professional');
      expect(service.determineTone(17, 0, 0)).toBe('professional');
    });

    it('should return "warm" for evening hours (18-24)', () => {
      expect(service.determineTone(18, 0, 0)).toBe('warm');
      expect(service.determineTone(21, 0, 0)).toBe('warm');
      expect(service.determineTone(23, 0, 0)).toBe('warm');
    });

    it('should return "warm" for early morning hours (0-6)', () => {
      expect(service.determineTone(0, 0, 0)).toBe('warm');
      expect(service.determineTone(3, 0, 0)).toBe('warm');
      expect(service.determineTone(5, 0, 0)).toBe('warm');
    });

    // --- Special overrides ---
    it('should return "humorous" when completionRate is 100% (celebration!)', () => {
      expect(service.determineTone(10, 100, 0)).toBe('humorous');
      expect(service.determineTone(15, 100, 0)).toBe('humorous');
      expect(service.determineTone(22, 100, 0)).toBe('humorous');
    });

    it('should return "warm" when deferCount >= 3 (Eros: gentle nudge)', () => {
      expect(service.determineTone(14, 0, 3)).toBe('warm');
      expect(service.determineTone(14, 0, 5)).toBe('warm');
      expect(service.determineTone(14, 50, 3)).toBe('warm');
    });

    it('should prioritize completionRate 100% over deferCount >= 3', () => {
      // Both conditions: 100% completion AND high defer count
      // Celebration wins! (Eros: celebrate wins always)
      expect(service.determineTone(14, 100, 5)).toBe('humorous');
    });

    it('should not override with "warm" if deferCount < 3', () => {
      expect(service.determineTone(14, 0, 2)).toBe('professional');
      expect(service.determineTone(14, 0, 0)).toBe('professional');
    });
  });

  // ============================================
  // generateMessage
  // ============================================
  describe('generateMessage', () => {
    it('should call Claude API and return Encouragement object', async () => {
      const task = makeTask();
      insertTask(db, task);
      mockGenerateEncouragement.mockResolvedValueOnce('화이팅! 보고서를 시작해볼까요?');

      const result = await service.generateMessage(task, 'start');

      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.taskId).toBe('task-001');
      expect(result.type).toBe('start');
      expect(result.message).toBe('화이팅! 보고서를 시작해볼까요?');
      expect(result.tone).toBeDefined();
      expect(result.createdAt).toBeDefined();
    });

    it('should store the message in DB', async () => {
      const task = makeTask();
      insertTask(db, task);
      mockGenerateEncouragement.mockResolvedValueOnce('잘했어요!');

      const result = await service.generateMessage(task, 'complete');

      // Verify DB has the record
      const row = db.prepare('SELECT * FROM Encouragement WHERE id = ?').get(result.id) as Record<string, unknown>;
      expect(row).toBeDefined();
      expect(row.taskId).toBe('task-001');
      expect(row.type).toBe('complete');
      expect(row.message).toBe('잘했어요!');
    });

    it('should use determineTone to set the tone', async () => {
      const task = makeTask();
      insertTask(db, task);
      mockGenerateEncouragement.mockResolvedValueOnce('좋은 아침이에요!');

      const result = await service.generateMessage(task, 'morning', { hour: 8 });

      expect(result.tone).toBe('warm'); // morning = warm
      expect(mockGenerateEncouragement).toHaveBeenCalledWith(task, 'morning', 'warm');
    });

    it('should pass context to determineTone correctly', async () => {
      const task = makeTask({ status: 'completed', progress: 100 });
      insertTask(db, task);
      mockGenerateEncouragement.mockResolvedValueOnce('축하해요! 완벽하게 해냈어요!');

      const result = await service.generateMessage(task, 'complete', {
        hour: 14,
        completionRate: 100,
      });

      expect(result.tone).toBe('humorous'); // 100% = celebration
    });

    // --- All 5 message types ---
    it('should handle "morning" type', async () => {
      const task = makeTask();
      insertTask(db, task);
      mockGenerateEncouragement.mockResolvedValueOnce('좋은 아침!');

      const result = await service.generateMessage(task, 'morning');
      expect(result.type).toBe('morning');
    });

    it('should handle "start" type', async () => {
      const task = makeTask();
      insertTask(db, task);
      mockGenerateEncouragement.mockResolvedValueOnce('시작해볼까요?');

      const result = await service.generateMessage(task, 'start');
      expect(result.type).toBe('start');
    });

    it('should handle "complete" type', async () => {
      const task = makeTask({ status: 'completed' });
      insertTask(db, task);
      mockGenerateEncouragement.mockResolvedValueOnce('완료했군요!');

      const result = await service.generateMessage(task, 'complete');
      expect(result.type).toBe('complete');
    });

    it('should handle "nudge" type', async () => {
      const task = makeTask({ status: 'deferred' });
      insertTask(db, task);
      mockGenerateEncouragement.mockResolvedValueOnce('2분만 해볼까요?');

      const result = await service.generateMessage(task, 'nudge', { deferCount: 3 });
      expect(result.type).toBe('nudge');
      expect(result.tone).toBe('warm'); // Eros: gentle for deferred
    });

    it('should handle "milestone" type', async () => {
      const task = makeTask();
      insertTask(db, task);
      mockGenerateEncouragement.mockResolvedValueOnce('마일스톤 달성!');

      const result = await service.generateMessage(task, 'milestone');
      expect(result.type).toBe('milestone');
    });

    it('should use default context values when context is not provided', async () => {
      const task = makeTask();
      insertTask(db, task);
      mockGenerateEncouragement.mockResolvedValueOnce('격려 메시지');

      const result = await service.generateMessage(task, 'start');

      // Should still work without context (uses current hour, defaults)
      expect(result).toBeDefined();
      expect(result.message).toBe('격려 메시지');
    });
  });

  // ============================================
  // getTodayMessages
  // ============================================
  describe('getTodayMessages', () => {
    it('should return messages created today', async () => {
      const task = makeTask();
      insertTask(db, task);
      mockGenerateEncouragement
        .mockResolvedValueOnce('아침 메시지')
        .mockResolvedValueOnce('시작 메시지');

      await service.generateMessage(task, 'morning');
      await service.generateMessage(task, 'start');

      const messages = service.getTodayMessages();

      expect(messages).toHaveLength(2);
      const types = messages.map((m) => m.type).sort();
      expect(types).toEqual(['morning', 'start']);
    });

    it('should not return messages from previous days', async () => {
      const task = makeTask();
      insertTask(db, task);

      // Manually insert a message with yesterday's timestamp
      const yesterday = Date.now() - 86400000 * 2;
      db.prepare(`
        INSERT INTO Encouragement (id, taskId, type, message, tone, createdAt)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run('old-msg-1', 'task-001', 'morning', '어제 메시지', 'warm', yesterday);

      const messages = service.getTodayMessages();

      expect(messages).toHaveLength(0);
    });

    it('should return empty array when no messages exist', () => {
      const messages = service.getTodayMessages();
      expect(messages).toEqual([]);
    });
  });

  // ============================================
  // getMessagesByTask
  // ============================================
  describe('getMessagesByTask', () => {
    it('should return all messages for a specific task', async () => {
      const task1 = makeTask({ id: 'task-001' });
      const task2 = makeTask({ id: 'task-002', title: '다른 태스크' });
      insertTask(db, task1);
      insertTask(db, task2);

      mockGenerateEncouragement
        .mockResolvedValueOnce('태스크1 메시지')
        .mockResolvedValueOnce('태스크2 메시지')
        .mockResolvedValueOnce('태스크1 또 메시지');

      await service.generateMessage(task1, 'start');
      await service.generateMessage(task2, 'start');
      await service.generateMessage(task1, 'complete');

      const messages = service.getMessagesByTask('task-001');

      expect(messages).toHaveLength(2);
      messages.forEach((msg) => {
        expect(msg.taskId).toBe('task-001');
      });
    });

    it('should return empty array for task with no messages', () => {
      const messages = service.getMessagesByTask('nonexistent-task');
      expect(messages).toEqual([]);
    });

    it('should return messages ordered by createdAt', async () => {
      const task = makeTask();
      insertTask(db, task);

      mockGenerateEncouragement
        .mockResolvedValueOnce('첫 번째')
        .mockResolvedValueOnce('두 번째');

      await service.generateMessage(task, 'start');
      await service.generateMessage(task, 'nudge');

      const messages = service.getMessagesByTask('task-001');

      expect(messages).toHaveLength(2);
      expect(messages[0].createdAt).toBeLessThanOrEqual(messages[1].createdAt);
    });
  });
});
