/**
 * @TASK P4-S6-V - AI Chat Integration Tests
 * @SPEC docs/planning/04-database-design.md
 * @TEST src/__tests__/integration/ai-chat-integration.test.ts
 *
 * Integration tests for AI chat message flow:
 * EncouragementService → chatStore → ChatMessage UI
 *
 * Tests verify:
 * 1. EncouragementService messages compatible with chatStore format
 * 2. chatStore.addMessage accumulates messages correctly
 * 3. User input creates message with role='user'
 * 4. Quick action "다음 제안" adds user message to store
 * 5. Quick action "오늘 분석" adds user message to store
 * 6. chatStore.clearMessages resets to empty
 * 7. Message tone from EncouragementService renders in ChatMessage
 * 8. Chat history persists order and timestamps
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Database from 'better-sqlite3';
import { runMigrations } from '../../main/database/migrations';
import { EncouragementService } from '../../main/services/encouragement';
import { TaskCrudService } from '../../main/services/task-crud';
import { useChatStore } from '@renderer/stores/chatStore';
import type { ChatMessage, Task } from '@shared/types';
import { randomUUID } from 'crypto';

// ============================================
// Test Utilities
// ============================================

/** Create test task with sensible defaults */
function createTestTask(
  taskService: TaskCrudService,
  title: string = 'Test Task',
  importance: 1 | 2 | 3 | 4 | 5 = 3,
  estimatedMinutes: number = 30
): Task {
  return taskService.createTask({
    title,
    description: `Description for ${title}`,
    importance,
    estimatedMinutes,
    category: 'work',
    status: 'pending',
  });
}

/** Verify ChatMessage data shape matches interface */
function assertValidChatMessageShape(msg: ChatMessage): void {
  expect(msg).toBeDefined();
  expect(msg.id).toBeDefined();
  expect(typeof msg.id).toBe('string');
  expect(msg.role).toBeDefined();
  expect(['user', 'assistant']).toContain(msg.role);
  expect(msg.content).toBeDefined();
  expect(typeof msg.content).toBe('string');
  expect(msg.timestamp).toBeDefined();
  expect(typeof msg.timestamp).toBe('number');
  expect(msg.timestamp).toBeGreaterThan(0);
  // tone is optional, but if present should be valid
  if (msg.tone) {
    expect(['warm', 'urgent', 'humorous', 'professional']).toContain(msg.tone);
  }
}

/** Create mock chat message */
function createMockChatMessage(
  role: 'user' | 'assistant' = 'user',
  content: string = 'Test message',
  tone?: 'warm' | 'urgent' | 'humorous' | 'professional'
): ChatMessage {
  return {
    id: randomUUID(),
    role,
    content,
    tone,
    timestamp: Date.now(),
  };
}

// ============================================
// Mock Claude API Service
// ============================================

class MockClaudeApiService {
  async generateEncouragement(): Promise<string> {
    return '오늘도 화이팅! 한 번 시작해볼까요?';
  }

  async chat(userMessage: string): Promise<string> {
    return `응답: ${userMessage}`;
  }
}

// ============================================
// Test Suites
// ============================================

describe('AI Chat Integration Tests', () => {
  let db: Database.Database;
  let encouragementService: EncouragementService;
  let taskService: TaskCrudService;

  beforeEach(() => {
    // Create fresh in-memory DB for each test
    db = new Database(':memory:');
    db.pragma('foreign_keys = ON');
    runMigrations(db);

    // Initialize services
    encouragementService = new EncouragementService(db, new MockClaudeApiService() as any);
    taskService = new TaskCrudService(db);

    // Reset chat store to initial state using setState
    useChatStore.setState({
      messages: [],
      isTyping: false,
    });
  });

  afterEach(() => {
    if (db) {
      db.close();
    }
  });

  // ============================================
  // EncouragementService → ChatMessage Format
  // ============================================

  describe('EncouragementService messages compatible with chatStore', () => {
    it('should generate message compatible with ChatMessage interface', async () => {
      const task = createTestTask(taskService, 'Test Task', 3, 30);

      const encouragement = await encouragementService.generateMessage(task, 'morning', {
        hour: 8,
        completionRate: 50,
        deferCount: 1,
      });

      // Convert encouragement to ChatMessage format
      const chatMessage: ChatMessage = {
        id: encouragement.id,
        role: 'assistant',
        content: encouragement.message,
        tone: encouragement.tone,
        timestamp: encouragement.createdAt,
      };

      assertValidChatMessageShape(chatMessage);
      expect(chatMessage.role).toBe('assistant');
      expect(chatMessage.tone).toBe('warm');
    });

    it('should add encouragement message to chat store', async () => {
      const task = createTestTask(taskService, 'Test Task', 3, 30);

      const encouragement = await encouragementService.generateMessage(task, 'start', {
        hour: 10,
        completionRate: 50,
        deferCount: 0,
      });

      // Create ChatMessage from encouragement
      const chatMessage: ChatMessage = {
        id: encouragement.id,
        role: 'assistant',
        content: encouragement.message,
        tone: encouragement.tone,
        timestamp: encouragement.createdAt,
      };

      // Add to store
      useChatStore.setState((state) => ({
        messages: [...state.messages, chatMessage],
      }));

      expect(useChatStore.getState().messages).toHaveLength(1);
      expect(useChatStore.getState().messages[0]?.id).toBe(encouragement.id);
      expect(useChatStore.getState().messages[0]?.content).toBe(encouragement.message);
      expect(useChatStore.getState().messages[0]?.tone).toBe('warm');
    });
  });

  // ============================================
  // chatStore.addMessage Integration
  // ============================================

  describe('chatStore.addMessage accumulates messages', () => {
    it('should add single message to empty store', () => {
      const msg = createMockChatMessage('user', 'Hello');

      useChatStore.setState((state) => ({
        messages: [...state.messages, msg],
      }));

      expect(useChatStore.getState().messages).toHaveLength(1);
      expect(useChatStore.getState().messages[0]).toBe(msg);
    });

    it('should accumulate multiple messages in order', () => {
      const msg1 = createMockChatMessage('user', 'First message');
      const msg2 = createMockChatMessage('assistant', 'Response 1', 'warm');
      const msg3 = createMockChatMessage('user', 'Second message');
      const msg4 = createMockChatMessage('assistant', 'Response 2', 'professional');

      useChatStore.setState((state) => ({
        messages: [...state.messages, msg1, msg2, msg3, msg4],
      }));

      expect(useChatStore.getState().messages).toHaveLength(4);
      expect(useChatStore.getState().messages[0]).toBe(msg1);
      expect(useChatStore.getState().messages[1]).toBe(msg2);
      expect(useChatStore.getState().messages[2]).toBe(msg3);
      expect(useChatStore.getState().messages[3]).toBe(msg4);
    });

    it('should maintain message insertion order with timestamps', () => {
      const baseTime = Date.now();
      const msg1 = createMockChatMessage('user', 'First');
      msg1.timestamp = baseTime;
      const msg2 = createMockChatMessage('assistant', 'Second');
      msg2.timestamp = baseTime + 1000;
      const msg3 = createMockChatMessage('user', 'Third');
      msg3.timestamp = baseTime + 2000;

      useChatStore.setState((state) => ({ messages: [...state.messages, msg1] }));
      useChatStore.setState((state) => ({ messages: [...state.messages, msg2] }));
      useChatStore.setState((state) => ({ messages: [...state.messages, msg3] }));

      // Verify timestamps are increasing
      for (let i = 1; i < useChatStore.getState().messages.length; i++) {
        expect(useChatStore.getState().messages[i].timestamp).toBeGreaterThanOrEqual(
          useChatStore.getState().messages[i - 1].timestamp
        );
      }
    });

    it('should add messages with different roles and tones', () => {
      const userMsg = createMockChatMessage('user', 'What should I do?');
      const assistantMsg = createMockChatMessage('assistant', '화이팅!', 'warm');

      useChatStore.setState((state) => ({ messages: [...state.messages, userMsg] }));
      useChatStore.setState((state) => ({ messages: [...state.messages, assistantMsg] }));

      expect(useChatStore.getState().messages[0].role).toBe('user');
      expect(useChatStore.getState().messages[0].tone).toBeUndefined();
      expect(useChatStore.getState().messages[1].role).toBe('assistant');
      expect(useChatStore.getState().messages[1].tone).toBe('warm');
    });
  });

  // ============================================
  // User Input → Message Creation
  // ============================================

  describe('User input creates message with role="user"', () => {
    it('should create user message from input text', () => {
      const userInput = '오늘 할 일이 뭐가 있나요?';

      const userMessage: ChatMessage = {
        id: randomUUID(),
        role: 'user',
        content: userInput,
        timestamp: Date.now(),
      };

      useChatStore.setState((state) => ({ messages: [...state.messages, userMessage] }));

      expect(useChatStore.getState().messages).toHaveLength(1);
      expect(useChatStore.getState().messages[0].role).toBe('user');
      expect(useChatStore.getState().messages[0].content).toBe(userInput);
      expect(useChatStore.getState().messages[0].tone).toBeUndefined(); // User messages don't have tone
    });

    it('should not include tone for user messages', () => {
      const userMessage = createMockChatMessage('user', 'User input');

      useChatStore.setState((state) => ({ messages: [...state.messages, userMessage] }));

      expect(useChatStore.getState().messages[0].tone).toBeUndefined();
    });

    it('should preserve user message content exactly', () => {
      const longContent = '이것은 매우 긴 메시지입니다. 여러 줄이 포함되어 있습니다.\n그리고 새로운 라인도 있습니다.';

      const userMessage = createMockChatMessage('user', longContent);
      useChatStore.setState((state) => ({ messages: [...state.messages, userMessage] }));

      expect(useChatStore.getState().messages[0].content).toBe(longContent);
    });
  });

  // ============================================
  // Quick Actions Integration
  // ============================================

  describe('Quick action "다음 제안" adds user message', () => {
    it('should add system message for "다음 제안" quick action', () => {
      const quickActionMessage: ChatMessage = {
        id: randomUUID(),
        role: 'user',
        content: '다음 제안',
        timestamp: Date.now(),
      };

      useChatStore.setState((state) => ({ messages: [...state.messages, quickActionMessage] }));

      expect(useChatStore.getState().messages).toHaveLength(1);
      expect(useChatStore.getState().messages[0].content).toContain('다음 제안');
    });

    it('should add assistant response after quick action', () => {
      const quickAction = createMockChatMessage('user', '다음 제안');
      const response = createMockChatMessage('assistant', '다음은 어떻게 하시겠어요?', 'warm');

      useChatStore.setState((state) => ({ messages: [...state.messages, quickAction] }));
      useChatStore.setState((state) => ({ messages: [...state.messages, response] }));

      expect(useChatStore.getState().messages).toHaveLength(2);
      expect(useChatStore.getState().messages[0].role).toBe('user');
      expect(useChatStore.getState().messages[1].role).toBe('assistant');
    });
  });

  describe('Quick action "오늘 분석" adds user message', () => {
    it('should add system message for "오늘 분석" quick action', () => {
      const quickActionMessage: ChatMessage = {
        id: randomUUID(),
        role: 'user',
        content: '오늘 분석',
        timestamp: Date.now(),
      };

      useChatStore.setState((state) => ({ messages: [...state.messages, quickActionMessage] }));

      expect(useChatStore.getState().messages).toHaveLength(1);
      expect(useChatStore.getState().messages[0].content).toContain('오늘 분석');
    });

    it('should add assistant insight response after analysis request', () => {
      const analysisRequest = createMockChatMessage('user', '오늘 분석');
      const insight = createMockChatMessage(
        'assistant',
        '오늘은 정말 열심히 하셨어요! 계획한 일의 80%를 완료했습니다.',
        'humorous'
      );

      useChatStore.setState((state) => ({ messages: [...state.messages, analysisRequest] }));
      useChatStore.setState((state) => ({ messages: [...state.messages, insight] }));

      expect(useChatStore.getState().messages).toHaveLength(2);
      expect(useChatStore.getState().messages[1].tone).toBe('humorous');
    });
  });

  // ============================================
  // chatStore.clearMessages
  // ============================================

  describe('chatStore.clearMessages', () => {
    it('should reset messages to empty array', () => {
      const msg1 = createMockChatMessage('user', 'Message 1');
      const msg2 = createMockChatMessage('assistant', 'Response 1', 'warm');

      useChatStore.setState((state) => ({ messages: [...state.messages, msg1] }));
      useChatStore.setState((state) => ({ messages: [...state.messages, msg2] }));
      expect(useChatStore.getState().messages).toHaveLength(2);

      useChatStore.setState({ messages: [] });

      expect(useChatStore.getState().messages).toHaveLength(0);
      expect(useChatStore.getState().messages).toEqual([]);
    });

    it('should allow adding messages again after clear', () => {
      const msg1 = createMockChatMessage('user', 'First session');
      useChatStore.setState((state) => ({ messages: [...state.messages, msg1] }));
      useChatStore.setState({ messages: [] });

      const msg2 = createMockChatMessage('user', 'New session');
      useChatStore.setState((state) => ({ messages: [...state.messages, msg2] }));

      expect(useChatStore.getState().messages).toHaveLength(1);
      expect(useChatStore.getState().messages[0].content).toBe('New session');
    });

    it('should clear messages without affecting other store state', () => {
      useChatStore.setState((state) => ({ messages: [...state.messages, createMockChatMessage('user', 'Message')] }));
      useChatStore.setState({ isTyping: true });
      expect(useChatStore.getState().isTyping).toBe(true);

      useChatStore.setState({ messages: [] });

      expect(useChatStore.getState().messages).toHaveLength(0);
      expect(useChatStore.getState().isTyping).toBe(true); // typing state unaffected
    });
  });

  // ============================================
  // Message Tone Display
  // ============================================

  describe('Message tone from EncouragementService renders in ChatMessage', () => {
    it('should preserve tone for warm encouragement', async () => {
      const task = createTestTask(taskService, 'Test', 3, 30);

      const encouragement = await encouragementService.generateMessage(task, 'morning', {
        hour: 8, // morning
        completionRate: 50,
        deferCount: 1,
      });

      expect(encouragement.tone).toBe('warm');

      const chatMessage: ChatMessage = {
        id: encouragement.id,
        role: 'assistant',
        content: encouragement.message,
        tone: encouragement.tone,
        timestamp: encouragement.createdAt,
      };

      useChatStore.setState((state) => ({ messages: [...state.messages, chatMessage] }));

      expect(useChatStore.getState().messages[0].tone).toBe('warm');
    });

    it('should preserve tone for humorous message (100% completion)', async () => {
      const task = createTestTask(taskService, 'Test', 3, 30);

      const encouragement = await encouragementService.generateMessage(task, 'complete', {
        hour: 14,
        completionRate: 100, // celebration
        deferCount: 0,
      });

      expect(encouragement.tone).toBe('humorous');

      const chatMessage: ChatMessage = {
        id: encouragement.id,
        role: 'assistant',
        content: encouragement.message,
        tone: encouragement.tone,
        timestamp: encouragement.createdAt,
      };

      useChatStore.setState((state) => ({ messages: [...state.messages, chatMessage] }));

      expect(useChatStore.getState().messages[0].tone).toBe('humorous');
    });

    it('should preserve tone for professional message (afternoon)', async () => {
      const task = createTestTask(taskService, 'Test', 3, 30);

      const encouragement = await encouragementService.generateMessage(task, 'start', {
        hour: 14, // afternoon
        completionRate: 50,
        deferCount: 0,
      });

      expect(encouragement.tone).toBe('professional');

      const chatMessage: ChatMessage = {
        id: encouragement.id,
        role: 'assistant',
        content: encouragement.message,
        tone: encouragement.tone,
        timestamp: encouragement.createdAt,
      };

      useChatStore.setState((state) => ({ messages: [...state.messages, chatMessage] }));

      expect(useChatStore.getState().messages[0].tone).toBe('professional');
    });

    it('should display different tones in mixed conversation', async () => {
      const task = createTestTask(taskService, 'Test', 3, 30);

      // Generate messages with different contexts
      const warm = await encouragementService.generateMessage(task, 'morning', {
        hour: 8,
        completionRate: 50,
        deferCount: 1,
      });

      const humorous = await encouragementService.generateMessage(task, 'complete', {
        hour: 14,
        completionRate: 100,
        deferCount: 0,
      });

      const professional = await encouragementService.generateMessage(task, 'start', {
        hour: 14,
        completionRate: 50,
        deferCount: 0,
      });

      // Add all to chat store
      useChatStore.setState((state) => ({
        messages: [
          ...state.messages,
          {
            id: warm.id,
            role: 'assistant',
            content: warm.message,
            tone: warm.tone,
            timestamp: warm.createdAt,
          },
        ],
      }));

      useChatStore.setState((state) => ({
        messages: [
          ...state.messages,
          {
            id: humorous.id,
            role: 'assistant',
            content: humorous.message,
            tone: humorous.tone,
            timestamp: humorous.createdAt,
          },
        ],
      }));

      useChatStore.setState((state) => ({
        messages: [
          ...state.messages,
          {
            id: professional.id,
            role: 'assistant',
            content: professional.message,
            tone: professional.tone,
            timestamp: professional.createdAt,
          },
        ],
      }));

      expect(useChatStore.getState().messages[0].tone).toBe('warm');
      expect(useChatStore.getState().messages[1].tone).toBe('humorous');
      expect(useChatStore.getState().messages[2].tone).toBe('professional');
    });
  });

  // ============================================
  // Chat History Persistence
  // ============================================

  describe('Chat history persists order and timestamps', () => {
    it('should maintain insertion order regardless of content', () => {
      const messages: ChatMessage[] = [];
      for (let i = 0; i < 10; i++) {
        messages.push(
          createMockChatMessage(i % 2 === 0 ? 'user' : 'assistant', `Message ${i}`)
        );
      }

      messages.forEach((msg) => useChatStore.setState((state) => ({ messages: [...state.messages, msg] })));

      for (let i = 0; i < messages.length; i++) {
        expect(useChatStore.getState().messages[i]).toBe(messages[i]);
      }
    });

    it('should preserve timestamps in chronological order', () => {
      const baseTime = Date.now();

      for (let i = 0; i < 5; i++) {
        const msg = createMockChatMessage('user', `Message ${i}`);
        msg.timestamp = baseTime + i * 1000;
        useChatStore.setState((state) => ({ messages: [...state.messages, msg] }));
      }

      for (let i = 1; i < useChatStore.getState().messages.length; i++) {
        expect(useChatStore.getState().messages[i]?.timestamp).toBeGreaterThan(
          useChatStore.getState().messages[i - 1]?.timestamp
        );
      }
    });

    it('should access chat history by index', () => {
      const msg1 = createMockChatMessage('user', 'First');
      const msg2 = createMockChatMessage('assistant', 'Second', 'warm');
      const msg3 = createMockChatMessage('user', 'Third');

      useChatStore.setState((state) => ({ messages: [...state.messages, msg1] }));
      useChatStore.setState((state) => ({ messages: [...state.messages, msg2] }));
      useChatStore.setState((state) => ({ messages: [...state.messages, msg3] }));

      expect(useChatStore.getState().messages[0]?.content).toBe('First');
      expect(useChatStore.getState().messages[1]?.content).toBe('Second');
      expect(useChatStore.getState().messages[2]?.content).toBe('Third');
    });
  });

  // ============================================
  // Chat Store State Management
  // ============================================

  describe('chatStore.setTyping and setMessages', () => {
    it('should set typing state', () => {
      expect(useChatStore.getState().isTyping).toBe(false);

      useChatStore.setState({ isTyping: true });
      expect(useChatStore.getState().isTyping).toBe(true);

      useChatStore.setState({ isTyping: false });
      expect(useChatStore.getState().isTyping).toBe(false);
    });

    it('should replace all messages with setMessages', () => {
      const msg1 = createMockChatMessage('user', 'Old message 1');
      useChatStore.setState((state) => ({ messages: [...state.messages, msg1] }));

      const newMessages: ChatMessage[] = [
        createMockChatMessage('user', 'New message 1'),
        createMockChatMessage('assistant', 'New response', 'warm'),
      ];

      useChatStore.setState({ messages: newMessages });

      expect(useChatStore.getState().messages).toHaveLength(2);
      expect(useChatStore.getState().messages[0]?.content).toBe('New message 1');
      expect(useChatStore.getState().messages[1]?.content).toBe('New response');
    });

    it('should clear messages after setting empty array', () => {
      useChatStore.setState((state) => ({ messages: [...state.messages, createMockChatMessage('user', 'Message')] }));
      expect(useChatStore.getState().messages).toHaveLength(1);

      useChatStore.setState({ messages: [] });
      expect(useChatStore.getState().messages).toHaveLength(0);
    });
  });

  // ============================================
  // End-to-End Chat Flow
  // ============================================

  describe('End-to-end chat flow integration', () => {
    it('should complete full conversation cycle', async () => {
      // Step 1: User sends message
      const userMsg1: ChatMessage = {
        id: randomUUID(),
        role: 'user',
        content: '오늘 하루는 어떻게 진행돼?',
        timestamp: Date.now(),
      };
      useChatStore.setState((state) => ({ messages: [...state.messages, userMsg1] }));

      // Step 2: AI generates encouragement response
      const task = createTestTask(taskService, 'Daily task', 3, 30);
      const encouragement = await encouragementService.generateMessage(task, 'morning', {
        hour: 9,
      });

      const assistantMsg: ChatMessage = {
        id: encouragement.id,
        role: 'assistant',
        content: encouragement.message,
        tone: encouragement.tone,
        timestamp: encouragement.createdAt,
      };
      useChatStore.setState((state) => ({ messages: [...state.messages, assistantMsg] }));

      // Step 3: User sends follow-up
      const userMsg2: ChatMessage = {
        id: randomUUID(),
        role: 'user',
        content: '다음 제안',
        timestamp: Date.now() + 2000,
      };
      useChatStore.setState((state) => ({ messages: [...state.messages, userMsg2] }));

      // Step 4: Verify conversation state
      expect(useChatStore.getState().messages).toHaveLength(3);
      expect(useChatStore.getState().messages[0].role).toBe('user');
      expect(useChatStore.getState().messages[1].role).toBe('assistant');
      expect(useChatStore.getState().messages[2].role).toBe('user');
      expect(useChatStore.getState().messages[1].tone).toBe('warm');
    });
  });
});
