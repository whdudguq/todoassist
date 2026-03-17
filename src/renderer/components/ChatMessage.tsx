// @TASK P4-S6 - ChatMessage: individual message bubble
import React from 'react';
import { Bot, User } from 'lucide-react';
import { cn } from '@renderer/lib/cn';
import type { ChatMessage as ChatMessageType } from '@shared/types';

interface ChatMessageProps {
  message: ChatMessageType;
  className?: string;
}

// Tone -> bubble color for assistant messages
const toneBubble: Record<string, string> = {
  warm: 'border-accent-200 bg-accent-50',
  urgent: 'border-danger-200 bg-danger-50',
  professional: 'border-surface-200 bg-surface-50',
  humorous: 'border-success-200 bg-success-50',
};

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

export function ChatMessage({ message, className }: ChatMessageProps) {
  const { role, content, tone = 'warm', timestamp } = message;

  if (role === 'user') {
    return (
      <div className={cn('flex gap-2.5 justify-end mb-3', className)}>
        <div className="max-w-[80%]">
          <div className="bg-accent-500 text-surface-0 rounded-xl rounded-br-sm px-3.5 py-2 text-sm leading-relaxed">
            {content}
          </div>
          <p className="text-[10px] text-surface-400 mt-1 text-right tabular-nums">
            {formatTime(timestamp)}
          </p>
        </div>
        <div className="flex-shrink-0 w-7 h-7 rounded-full bg-surface-200 flex items-center justify-center">
          <User size={14} className="text-surface-500" />
        </div>
      </div>
    );
  }

  return (
    <div className={cn('flex gap-2.5 mb-3', className)}>
      <div className="flex-shrink-0 w-7 h-7 rounded-full bg-accent-500 flex items-center justify-center">
        <Bot size={14} className="text-surface-0" />
      </div>
      <div className="max-w-[80%]">
        <div
          className={cn(
            'border rounded-xl rounded-bl-sm px-3.5 py-2',
            'text-sm text-surface-800 leading-relaxed',
            toneBubble[tone] ?? toneBubble.warm,
          )}
        >
          {content}
        </div>
        <p className="text-[10px] text-surface-400 mt-1 tabular-nums">
          {formatTime(timestamp)}
        </p>
      </div>
    </div>
  );
}
