// @TASK P4-S6 - AiAssistant: 채팅 사이드바 패널 (renderer-only)
import React, { useRef, useEffect, useState, useCallback, KeyboardEvent } from 'react';
import { X, Send, Sparkles } from 'lucide-react';
import { cn } from '@renderer/lib/cn';
import { useChatStore } from '@renderer/stores/chatStore';
import { useUiStore } from '@renderer/stores/uiStore';
import { ChatMessage } from './ChatMessage';
import type { ChatMessage as ChatMessageType } from '@shared/types';

const QUICK_ACTIONS = ['다음 제안', '오늘 분석'] as const;

function TypingIndicator() {
  return (
    <div data-testid="typing-indicator" className="flex gap-2.5 mb-3">
      <div className="flex-shrink-0 w-7 h-7 rounded-full bg-accent-500 flex items-center justify-center">
        <Sparkles size={14} className="text-surface-0" />
      </div>
      <div className="flex items-center gap-1 bg-accent-50 border border-accent-200 rounded-xl rounded-bl-sm px-4 py-3">
        <span className="w-1.5 h-1.5 rounded-full bg-accent-400 animate-pulse [animation-delay:0ms]" />
        <span className="w-1.5 h-1.5 rounded-full bg-accent-400 animate-pulse [animation-delay:150ms]" />
        <span className="w-1.5 h-1.5 rounded-full bg-accent-400 animate-pulse [animation-delay:300ms]" />
      </div>
    </div>
  );
}

function WelcomeMessage() {
  return (
    <div className="flex flex-col items-center justify-center flex-1 text-center px-4 py-8">
      <div className="w-12 h-12 rounded-full bg-accent-100 flex items-center justify-center mb-3">
        <Sparkles size={24} className="text-accent-600" />
      </div>
      <p className="text-surface-800 font-medium text-sm mb-1">안녕하세요!</p>
      <p className="text-surface-400 text-xs leading-relaxed">
        무엇을 도와드릴까요?
        <br />
        아래 버튼을 눌러 시작하세요.
      </p>
    </div>
  );
}

export function AiAssistant() {
  const messages = useChatStore((s) => s.messages);
  const isTyping = useChatStore((s) => s.isTyping);
  const addMessage = useChatStore((s) => s.addMessage);
  const toggleAiAssistant = useUiStore((s) => s.toggleAiAssistant);

  const [inputValue, setInputValue] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    const el = bottomRef.current;
    if (el && typeof el.scrollIntoView === 'function') {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isTyping]);

  const sendMessage = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;

      const msg: ChatMessageType = {
        id: `msg-${Date.now()}-${Math.random()}`,
        role: 'user',
        content: trimmed,
        timestamp: Date.now(),
      };
      addMessage(msg);
      setInputValue('');
    },
    [addMessage],
  );

  const handleSend = useCallback(() => {
    sendMessage(inputValue);
  }, [inputValue, sendMessage]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage(inputValue);
      }
    },
    [inputValue, sendMessage],
  );

  const handleQuickAction = useCallback(
    (action: string) => {
      sendMessage(action);
    },
    [sendMessage],
  );

  return (
    <div className="flex flex-col h-full bg-surface-0">
      {/* Header */}
      <header
        className={cn(
          'flex items-center justify-between px-4 py-3',
          'border-b border-surface-200/60 bg-surface-100',
          'flex-shrink-0',
        )}
      >
        <div className="flex items-center gap-2">
          <Sparkles size={16} className="text-accent-500" />
          <span className="font-semibold text-sm text-surface-800">AI 비서</span>
        </div>
        <button
          aria-label="닫기"
          onClick={toggleAiAssistant}
          className={cn(
            'w-7 h-7 rounded-md flex items-center justify-center',
            'text-surface-400 hover:text-surface-700 hover:bg-surface-200',
            'transition-colors duration-150',
          )}
        >
          <X size={16} />
        </button>
      </header>

      {/* Message timeline */}
      <div className="flex-1 overflow-y-auto px-3 pt-4 min-h-0">
        {messages.length === 0 && !isTyping ? (
          <WelcomeMessage />
        ) : (
          <>
            {messages.map((msg) => (
              <ChatMessage key={msg.id} message={msg} />
            ))}
            {isTyping && <TypingIndicator />}
            <div ref={bottomRef} />
          </>
        )}
      </div>

      {/* Input area */}
      <div className="flex-shrink-0 px-3 pb-3 pt-2 border-t border-surface-200/60">
        {/* Quick action pills */}
        <div className="flex gap-1.5 mb-2 flex-wrap">
          {QUICK_ACTIONS.map((action) => (
            <button
              key={action}
              onClick={() => handleQuickAction(action)}
              className={cn(
                'px-3 py-1 rounded-full text-xs font-medium',
                'bg-surface-100 text-surface-600',
                'hover:bg-accent-50 hover:text-accent-700',
                'border border-surface-200 hover:border-accent-200',
                'transition-colors duration-150',
              )}
            >
              {action}
            </button>
          ))}
        </div>

        {/* Text input + send button */}
        <div className="flex gap-2 items-center">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="메시지를 입력하세요..."
            className={cn(
              'flex-1 h-9 px-3 text-sm rounded-lg',
              'bg-surface-50 border border-surface-200',
              'text-surface-800 placeholder:text-surface-400',
              'focus:outline-none focus:border-accent-300 focus:bg-surface-0',
              'transition-colors duration-150',
            )}
          />
          <button
            aria-label="전송"
            onClick={handleSend}
            disabled={!inputValue.trim()}
            className={cn(
              'w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0',
              'bg-accent-500 text-surface-0',
              'hover:bg-accent-600 active:bg-accent-700',
              'disabled:opacity-40 disabled:pointer-events-none',
              'transition-colors duration-150',
            )}
          >
            <Send size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}
