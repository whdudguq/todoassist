import { Bot, User } from 'lucide-react';
import { cn } from '@renderer/lib/cn';

interface AiMessageProps {
  content: string;
  timestamp: string;
  isAi?: boolean;
  tone?: 'warm' | 'urgent' | 'professional' | 'humorous';
  className?: string;
}

const toneAccent: Record<string, string> = {
  warm: 'border-accent-200 bg-accent-50/60',
  urgent: 'border-danger-200 bg-danger-50/40',
  professional: 'border-surface-200 bg-surface-50',
  humorous: 'border-success-200 bg-success-50/40',
};

export function AiMessage({
  content,
  timestamp,
  isAi = true,
  tone = 'warm',
  className,
}: AiMessageProps) {
  if (!isAi) {
    return (
      <div className={cn('flex gap-2.5 justify-end mb-4', className)}>
        <div className="max-w-[280px]">
          <div className="bg-accent-500 text-surface-0 rounded-2xl rounded-br-md px-4 py-2.5 text-sm leading-relaxed">
            {content}
          </div>
          <p className="text-[10px] text-surface-400 mt-1 text-right tabular-nums">
            {timestamp}
          </p>
        </div>
        <div className="flex-shrink-0 w-7 h-7 rounded-full bg-surface-200 flex items-center justify-center">
          <User size={14} className="text-surface-500" />
        </div>
      </div>
    );
  }

  return (
    <div className={cn('flex gap-2.5 mb-4', className)}>
      <div className="flex-shrink-0 w-7 h-7 rounded-full bg-accent-500 flex items-center justify-center">
        <Bot size={14} className="text-surface-0" />
      </div>
      <div className="max-w-[280px]">
        <div
          className={cn(
            'border rounded-2xl rounded-bl-md px-4 py-2.5',
            'text-sm text-surface-800 leading-relaxed',
            toneAccent[tone],
          )}
        >
          {content}
        </div>
        <p className="text-[10px] text-surface-400 mt-1 tabular-nums">
          {timestamp}
        </p>
      </div>
    </div>
  );
}
