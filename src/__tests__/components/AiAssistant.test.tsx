// @vitest-environment jsdom
// @TASK P4-S6 - AI 비서 채팅 사이드바 테스트
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import '@testing-library/jest-dom';
import { useChatStore } from '@renderer/stores/chatStore';
import { useUiStore } from '@renderer/stores/uiStore';

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Bot: ({ size, className }: { size?: number; className?: string }) => (
    <svg data-testid="bot-icon" width={size} className={className} />
  ),
  User: ({ size, className }: { size?: number; className?: string }) => (
    <svg data-testid="user-icon" width={size} className={className} />
  ),
  X: ({ size, className }: { size?: number; className?: string }) => (
    <svg data-testid="x-icon" width={size} className={className} />
  ),
  Send: ({ size, className }: { size?: number; className?: string }) => (
    <svg data-testid="send-icon" width={size} className={className} />
  ),
  Sparkles: ({ size, className }: { size?: number; className?: string }) => (
    <svg data-testid="sparkles-icon" width={size} className={className} />
  ),
}));

import { AiAssistant } from '@renderer/components/AiAssistant';
import { ChatMessage } from '@renderer/components/ChatMessage';
import type { ChatMessage as ChatMessageType } from '@shared/types';

// Helper: build mock ChatMessage
function makeMsg(overrides: Partial<ChatMessageType> = {}): ChatMessageType {
  return {
    id: 'msg-1',
    role: 'assistant',
    content: '안녕하세요!',
    tone: 'warm',
    timestamp: Date.now(),
    ...overrides,
  };
}

beforeEach(() => {
  useChatStore.setState({ messages: [], isTyping: false });
  useUiStore.setState({
    aiAssistantOpen: true,
    sidebarOpen: true,
    currentPage: 'dashboard',
    modalOpen: null,
    theme: 'dark',
  });
});

// ──────────────────────────────────────────────
// ChatMessage Component
// ──────────────────────────────────────────────
describe('ChatMessage', () => {
  it('renders assistant message left-aligned with AI icon', () => {
    const msg = makeMsg({ role: 'assistant', content: '도움이 필요하신가요?' });
    const { container } = render(<ChatMessage message={msg} />);
    expect(screen.getByText('도움이 필요하신가요?')).toBeInTheDocument();
    // assistant: flex without justify-end
    const wrapper = container.firstElementChild as HTMLElement;
    expect(wrapper.className).not.toMatch(/justify-end/);
    expect(screen.getByTestId('bot-icon')).toBeInTheDocument();
  });

  it('renders user message right-aligned with User icon', () => {
    const msg = makeMsg({ role: 'user', content: '오늘 할 일이 뭐가 있나요?' });
    const { container } = render(<ChatMessage message={msg} />);
    expect(screen.getByText('오늘 할 일이 뭐가 있나요?')).toBeInTheDocument();
    const wrapper = container.firstElementChild as HTMLElement;
    expect(wrapper.className).toMatch(/justify-end/);
  });

  it('renders timestamp', () => {
    const ts = new Date('2026-03-18T10:30:00').getTime();
    const msg = makeMsg({ timestamp: ts });
    render(<ChatMessage message={msg} />);
    // timestamp element should exist with time text
    const timeEl = document.querySelector('[class*="tabular-nums"]');
    expect(timeEl).toBeInTheDocument();
  });

  it('applies tone-based style for warm tone', () => {
    const msg = makeMsg({ role: 'assistant', tone: 'warm' });
    const { container } = render(<ChatMessage message={msg} />);
    // bubble should have accent color class
    const bubble = container.querySelector('[class*="accent"]');
    expect(bubble).toBeInTheDocument();
  });

  it('applies tone-based style for urgent tone', () => {
    const msg = makeMsg({ role: 'assistant', tone: 'urgent' });
    const { container } = render(<ChatMessage message={msg} />);
    const bubble = container.querySelector('[class*="danger"]');
    expect(bubble).toBeInTheDocument();
  });
});

// ──────────────────────────────────────────────
// AiAssistant Component
// ──────────────────────────────────────────────
describe('AiAssistant', () => {
  it('renders panel header with "AI 비서" title', () => {
    render(<AiAssistant />);
    expect(screen.getByText('AI 비서')).toBeInTheDocument();
  });

  it('renders close button in header', () => {
    render(<AiAssistant />);
    const closeBtn = screen.getByRole('button', { name: /닫기/i });
    expect(closeBtn).toBeInTheDocument();
  });

  it('clicking close button calls toggleAiAssistant', () => {
    render(<AiAssistant />);
    expect(useUiStore.getState().aiAssistantOpen).toBe(true);
    const closeBtn = screen.getByRole('button', { name: /닫기/i });
    fireEvent.click(closeBtn);
    expect(useUiStore.getState().aiAssistantOpen).toBe(false);
  });

  it('shows welcome message when no messages', () => {
    render(<AiAssistant />);
    expect(screen.getByText(/안녕하세요/i)).toBeInTheDocument();
  });

  it('renders text input at bottom', () => {
    render(<AiAssistant />);
    const input = screen.getByPlaceholderText(/메시지/i);
    expect(input).toBeInTheDocument();
  });

  it('renders send button', () => {
    render(<AiAssistant />);
    const sendBtn = screen.getByRole('button', { name: /전송/i });
    expect(sendBtn).toBeInTheDocument();
  });

  it('renders quick action buttons "다음 제안" and "오늘 분석"', () => {
    render(<AiAssistant />);
    expect(screen.getByRole('button', { name: '다음 제안' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '오늘 분석' })).toBeInTheDocument();
  });

  it('send button adds user message to store', () => {
    render(<AiAssistant />);
    const input = screen.getByPlaceholderText(/메시지/i);
    fireEvent.change(input, { target: { value: '테스트 메시지' } });
    const sendBtn = screen.getByRole('button', { name: /전송/i });
    fireEvent.click(sendBtn);
    const { messages } = useChatStore.getState();
    expect(messages).toHaveLength(1);
    expect(messages[0].role).toBe('user');
    expect(messages[0].content).toBe('테스트 메시지');
  });

  it('Enter key sends message', () => {
    render(<AiAssistant />);
    const input = screen.getByPlaceholderText(/메시지/i);
    fireEvent.change(input, { target: { value: 'Enter 키 테스트' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });
    const { messages } = useChatStore.getState();
    expect(messages.length).toBeGreaterThan(0);
    expect(messages[0].content).toBe('Enter 키 테스트');
  });

  it('clears input after sending message', () => {
    render(<AiAssistant />);
    const input = screen.getByPlaceholderText(/메시지/i) as HTMLInputElement;
    fireEvent.change(input, { target: { value: '보낸 후 지워짐' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });
    expect(input.value).toBe('');
  });

  it('does not send empty message', () => {
    render(<AiAssistant />);
    const sendBtn = screen.getByRole('button', { name: /전송/i });
    fireEvent.click(sendBtn);
    expect(useChatStore.getState().messages).toHaveLength(0);
  });

  it('clicking "다음 제안" adds it as user message', () => {
    render(<AiAssistant />);
    const btn = screen.getByRole('button', { name: '다음 제안' });
    fireEvent.click(btn);
    const { messages } = useChatStore.getState();
    expect(messages.length).toBeGreaterThan(0);
    expect(messages[0].content).toBe('다음 제안');
    expect(messages[0].role).toBe('user');
  });

  it('clicking "오늘 분석" adds it as user message', () => {
    render(<AiAssistant />);
    const btn = screen.getByRole('button', { name: '오늘 분석' });
    fireEvent.click(btn);
    const { messages } = useChatStore.getState();
    expect(messages.length).toBeGreaterThan(0);
    expect(messages[0].content).toBe('오늘 분석');
  });

  it('renders user and assistant messages in timeline', () => {
    useChatStore.setState({
      messages: [
        makeMsg({ id: '1', role: 'user', content: '사용자 메시지', timestamp: 1000 }),
        makeMsg({ id: '2', role: 'assistant', content: 'AI 응답', timestamp: 2000 }),
      ],
      isTyping: false,
    });
    render(<AiAssistant />);
    expect(screen.getByText('사용자 메시지')).toBeInTheDocument();
    expect(screen.getByText('AI 응답')).toBeInTheDocument();
  });

  it('shows typing indicator when isTyping=true', () => {
    useChatStore.setState({ messages: [], isTyping: true });
    render(<AiAssistant />);
    const typingEl = screen.getByTestId('typing-indicator');
    expect(typingEl).toBeInTheDocument();
  });

  it('hides typing indicator when isTyping=false', () => {
    useChatStore.setState({ messages: [], isTyping: false });
    render(<AiAssistant />);
    expect(screen.queryByTestId('typing-indicator')).not.toBeInTheDocument();
  });

  it('renders within AppShell AI panel area (section[aria-label])', () => {
    render(
      <section aria-label="AI Assistant">
        <AiAssistant />
      </section>,
    );
    const region = screen.getByRole('region', { name: /ai assistant/i });
    expect(region).toBeInTheDocument();
    expect(screen.getByText('AI 비서')).toBeInTheDocument();
  });
});

// ──────────────────────────────────────────────
// chatStore
// ──────────────────────────────────────────────
describe('chatStore', () => {
  it('initial state: empty messages, isTyping false', () => {
    const state = useChatStore.getState();
    expect(state.messages).toEqual([]);
    expect(state.isTyping).toBe(false);
  });

  it('addMessage appends a message', () => {
    const msg = makeMsg();
    useChatStore.getState().addMessage(msg);
    expect(useChatStore.getState().messages).toHaveLength(1);
    expect(useChatStore.getState().messages[0]).toEqual(msg);
  });

  it('setMessages replaces all messages', () => {
    const msgs = [makeMsg({ id: 'a' }), makeMsg({ id: 'b' })];
    useChatStore.getState().setMessages(msgs);
    expect(useChatStore.getState().messages).toHaveLength(2);
  });

  it('setTyping updates isTyping', () => {
    useChatStore.getState().setTyping(true);
    expect(useChatStore.getState().isTyping).toBe(true);
    useChatStore.getState().setTyping(false);
    expect(useChatStore.getState().isTyping).toBe(false);
  });

  it('clearMessages empties the list', () => {
    useChatStore.getState().addMessage(makeMsg());
    useChatStore.getState().clearMessages();
    expect(useChatStore.getState().messages).toHaveLength(0);
  });
});
