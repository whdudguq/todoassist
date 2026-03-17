// @TASK P1-R2 - Claude API Service Tests
// @SPEC docs/planning/02-trd.md#AI-API

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Task, DailyStats } from '@shared/types';

// ---- Mock Anthropic SDK ----
const mockCreate = vi.fn();

vi.mock('@anthropic-ai/sdk', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      messages: { create: mockCreate },
    })),
  };
});

// Import after mock
import { ClaudeApiService } from '@main/services/claude-api';

// ---- Test Fixtures ----
function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 'task-1',
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

function makeDailyStats(overrides: Partial<DailyStats> = {}): DailyStats {
  return {
    id: 'stat-1',
    date: '2026-03-17',
    completedCount: 5,
    totalPlanned: 8,
    deferredCount: 1,
    totalMinutesUsed: 180,
    categoryBreakdown: JSON.stringify({ '업무': 120, '개인': 60 }),
    createdAt: Date.now(),
    updatedAt: Date.now(),
    ...overrides,
  };
}

function mockApiResponse(text: string, inputTokens = 100, outputTokens = 50) {
  return {
    content: [{ type: 'text', text }],
    usage: { input_tokens: inputTokens, output_tokens: outputTokens },
  };
}

// ---- Tests ----
describe('ClaudeApiService', () => {
  let service: ClaudeApiService;
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new ClaudeApiService('test-api-key-123');
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  // ---- Initialization ----
  describe('constructor', () => {
    it('should initialize with API key', () => {
      expect(service).toBeDefined();
      expect(service).toBeInstanceOf(ClaudeApiService);
    });

    it('should throw if API key is empty', () => {
      expect(() => new ClaudeApiService('')).toThrow();
    });
  });

  // ---- testConnection ----
  describe('testConnection', () => {
    it('should return true when API responds successfully', async () => {
      mockCreate.mockResolvedValueOnce(mockApiResponse('Hello'));
      const result = await service.testConnection();
      expect(result).toBe(true);
    });

    it('should return false when API throws', async () => {
      mockCreate.mockRejectedValueOnce(new Error('Invalid API key'));
      const result = await service.testConnection();
      expect(result).toBe(false);
    });
  });

  // ---- generateEncouragement ----
  describe('generateEncouragement', () => {
    it('should return encouragement message string', async () => {
      const message = '힘내세요! 보고서 작성을 시작해볼까요?';
      mockCreate.mockResolvedValueOnce(mockApiResponse(message));

      const result = await service.generateEncouragement(makeTask(), 'start', 'warm');

      expect(result).toBe(message);
      expect(mockCreate).toHaveBeenCalledOnce();

      // Check system prompt includes Korean
      const callArgs = mockCreate.mock.calls[0][0];
      expect(callArgs.system).toContain('따뜻한');
      expect(callArgs.model).toBe('claude-sonnet-4-20250514');
    });

    it('should include task info and tone in the prompt', async () => {
      mockCreate.mockResolvedValueOnce(mockApiResponse('좋아요!'));

      await service.generateEncouragement(makeTask(), 'complete', 'humorous');

      const callArgs = mockCreate.mock.calls[0][0];
      const userMsg = callArgs.messages[0].content;
      expect(userMsg).toContain('보고서 작성');
      expect(userMsg).toContain('humorous');
    });
  });

  // ---- estimateTaskMetadata ----
  describe('estimateTaskMetadata', () => {
    it('should return parsed metadata from JSON response', async () => {
      const jsonResp = JSON.stringify({
        estimatedMinutes: 30,
        importance: 4,
        category: '업무',
      });
      mockCreate.mockResolvedValueOnce(mockApiResponse(jsonResp));

      const result = await service.estimateTaskMetadata('보고서 작성', '월간 품질 보고서');

      expect(result).toEqual({
        estimatedMinutes: 30,
        importance: 4,
        category: '업무',
      });
    });

    it('should work without description', async () => {
      const jsonResp = JSON.stringify({
        estimatedMinutes: 15,
        importance: 2,
        category: '기타',
      });
      mockCreate.mockResolvedValueOnce(mockApiResponse(jsonResp));

      const result = await service.estimateTaskMetadata('물 마시기');

      expect(result.estimatedMinutes).toBe(15);
      expect(result.importance).toBe(2);
    });

    it('should handle JSON wrapped in markdown code block', async () => {
      const resp = '```json\n{"estimatedMinutes": 20, "importance": 3, "category": "개인"}\n```';
      mockCreate.mockResolvedValueOnce(mockApiResponse(resp));

      const result = await service.estimateTaskMetadata('산책하기');

      expect(result.estimatedMinutes).toBe(20);
      expect(result.category).toBe('개인');
    });
  });

  // ---- generateSchedule ----
  describe('generateSchedule', () => {
    it('should return array of time slot suggestions', async () => {
      const schedule = [
        { taskId: 'task-1', date: '2026-03-18', startSlot: 18, endSlot: 20 },
        { taskId: 'task-2', date: '2026-03-18', startSlot: 20, endSlot: 22 },
      ];
      mockCreate.mockResolvedValueOnce(mockApiResponse(JSON.stringify(schedule)));

      const tasks = [makeTask(), makeTask({ id: 'task-2', title: '이메일 확인' })];
      const result = await service.generateSchedule(tasks, '09:00', '18:00');

      expect(result).toHaveLength(2);
      expect(result[0]).toHaveProperty('taskId', 'task-1');
      expect(result[0]).toHaveProperty('startSlot', 18);
      expect(result[0]).toHaveProperty('endSlot', 20);
    });
  });

  // ---- generateInsight ----
  describe('generateInsight', () => {
    it('should return analysis string for weekly period', async () => {
      const insight = '이번 주 완료율이 62%로 지난 주보다 향상되었어요!';
      mockCreate.mockResolvedValueOnce(mockApiResponse(insight));

      const stats = [makeDailyStats(), makeDailyStats({ date: '2026-03-16', completedCount: 3 })];
      const result = await service.generateInsight(stats, 'weekly');

      expect(result).toBe(insight);
      expect(typeof result).toBe('string');
    });

    it('should pass period info in the prompt', async () => {
      mockCreate.mockResolvedValueOnce(mockApiResponse('좋은 한 달이었어요'));

      await service.generateInsight([makeDailyStats()], 'monthly');

      const callArgs = mockCreate.mock.calls[0][0];
      const userMsg = callArgs.messages[0].content;
      expect(userMsg).toContain('monthly');
    });
  });

  // ---- splitTask ----
  describe('splitTask', () => {
    it('should return array of micro-tasks with 2-minute estimates', async () => {
      const microTasks = [
        { title: '보고서 템플릿 열기', estimatedMinutes: 2 },
        { title: '지난달 데이터 복사', estimatedMinutes: 2 },
        { title: '차트 업데이트', estimatedMinutes: 2 },
      ];
      mockCreate.mockResolvedValueOnce(mockApiResponse(JSON.stringify(microTasks)));

      const result = await service.splitTask(makeTask());

      expect(result).toHaveLength(3);
      expect(result[0]).toHaveProperty('title');
      expect(result[0]).toHaveProperty('estimatedMinutes');
      // Eros principle: small tasks
      result.forEach((t) => {
        expect(t.estimatedMinutes).toBeLessThanOrEqual(5);
      });
    });
  });

  // ---- chat ----
  describe('chat', () => {
    it('should return assistant response', async () => {
      mockCreate.mockResolvedValueOnce(mockApiResponse('네, 도와드릴게요!'));

      const result = await service.chat('오늘 할 일을 정리해줘');

      expect(result).toBe('네, 도와드릴게요!');
    });

    it('should pass optional context', async () => {
      mockCreate.mockResolvedValueOnce(mockApiResponse('알겠습니다'));

      await service.chat('다음 할 일은?', '현재 태스크 3개 진행 중');

      const callArgs = mockCreate.mock.calls[0][0];
      const userMsg = callArgs.messages[0].content;
      expect(userMsg).toContain('현재 태스크 3개 진행 중');
    });
  });

  // ---- Retry Logic ----
  describe('retry logic', () => {
    it('should retry on API error and succeed', async () => {
      mockCreate
        .mockRejectedValueOnce(new Error('API rate limit'))
        .mockRejectedValueOnce(new Error('API rate limit'))
        .mockResolvedValueOnce(mockApiResponse('성공!'));

      const result = await service.chat('테스트');

      expect(result).toBe('성공!');
      expect(mockCreate).toHaveBeenCalledTimes(3);
    });

    it('should throw after max retries exhausted', async () => {
      mockCreate
        .mockRejectedValueOnce(new Error('API error'))
        .mockRejectedValueOnce(new Error('API error'))
        .mockRejectedValueOnce(new Error('API error'));

      await expect(service.chat('테스트')).rejects.toThrow('API error');
      expect(mockCreate).toHaveBeenCalledTimes(3);
    });
  });

  // ---- Token Usage Logging ----
  describe('token usage logging', () => {
    it('should log token usage after successful call', async () => {
      mockCreate.mockResolvedValueOnce(mockApiResponse('응답', 150, 75));

      await service.chat('안녕');

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('token'),
      );
    });
  });
});
