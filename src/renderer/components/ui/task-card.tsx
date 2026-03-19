import { Play, Clock, CalendarDays, CornerDownRight } from 'lucide-react';
import { cn } from '@renderer/lib/cn';
import { Badge } from './badge';
import { ProgressBar } from './progress-bar';
import { Button } from './button';
import type { TaskStatus } from '@shared/types';

interface TaskCardProps {
  title: string;
  description?: string;
  estimatedMinutes: number;
  importance: number;
  category: string;
  categoryColor?: string;
  status: TaskStatus;
  progress: number;
  deadline?: string;
  hasChildren?: boolean;
  onMicroStart?: () => void;
  onDefer?: () => void;
  onClick?: () => void;
  startDisabled?: boolean;
  style?: React.CSSProperties;
  className?: string;
}

const statusStyles: Record<TaskStatus, string> = {
  pending: 'bg-surface-0',
  in_progress: 'bg-warning-50/40 border-warning-400/30',
  completed: 'bg-success-50/30 opacity-70',
  deferred: 'bg-surface-50',
};

const categoryBorderMap: Record<string, string> = {
  quality: 'border-l-cat-quality',
  report: 'border-l-cat-report',
  meeting: 'border-l-cat-meeting',
  email: 'border-l-cat-email',
  default: 'border-l-cat-other',
};

function ImportanceIndicator({ level }: { level: number }) {
  return (
    <div className="flex gap-0.5" aria-label={`중요도 ${level}/5`}>
      {Array.from({ length: 5 }, (_, i) => (
        <div
          key={i}
          className={cn(
            'w-1.5 h-1.5 rounded-full',
            i < level ? 'bg-accent-400' : 'bg-surface-200',
          )}
        />
      ))}
    </div>
  );
}

export function TaskCard({
  title,
  description,
  estimatedMinutes,
  importance,
  category,
  categoryColor,
  status,
  progress,
  deadline,
  hasChildren,
  onMicroStart,
  onDefer,
  onClick,
  startDisabled,
  style,
  className,
}: TaskCardProps) {
  const borderClass = categoryColor ? '' : (categoryBorderMap[category] ?? categoryBorderMap.default);
  const isCompleted = status === 'completed';

  return (
    <div
      onClick={onClick}
      style={{ ...style, ...(categoryColor ? { borderLeftColor: categoryColor } : {}) }}
      className={cn(
        'group relative',
        'border border-surface-200/60 border-l-[3px] rounded-xl',
        'p-4 cursor-pointer',
        'transition-all duration-200',
        'hover:shadow-md hover:border-surface-300/80',
        statusStyles[status],
        borderClass,
        className,
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-2">
        <h4
          className={cn(
            'text-sm font-semibold leading-snug',
            isCompleted
              ? 'line-through text-surface-400'
              : 'text-surface-900',
          )}
        >
          {title}
        </h4>
        <ImportanceIndicator level={importance} />
      </div>

      {/* Description */}
      {description && (
        <p className="text-xs text-surface-500 leading-relaxed line-clamp-2 mb-3">
          {description}
        </p>
      )}

      {/* Meta */}
      <div className="flex items-center gap-3 mb-3 text-xs text-surface-400">
        <span className="inline-flex items-center gap-1">
          <Clock size={12} strokeWidth={2} />
          {estimatedMinutes}분
        </span>
        {deadline && (
          <span className="inline-flex items-center gap-1">
            <CalendarDays size={12} strokeWidth={2} />
            {deadline}
          </span>
        )}
        {hasChildren && (
          <span className="inline-flex items-center gap-1">
            <CornerDownRight size={12} strokeWidth={2} />
            하위 태스크
          </span>
        )}
      </div>

      {/* Progress */}
      {progress > 0 && <ProgressBar value={progress} className="mb-3" />}

      {/* Actions — visible on hover (hide for in_progress and completed) */}
      {status === 'pending' && (
        <div className="flex gap-2">
          <Button
            variant="primary"
            size="sm"
            className="flex-1"
            disabled={startDisabled}
            onClick={(e) => {
              e.stopPropagation();
              onMicroStart?.();
            }}
          >
            <Play size={12} strokeWidth={2.5} />
            2분만 시작
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="flex-1 text-surface-400"
            onClick={(e) => {
              e.stopPropagation();
              onDefer?.();
            }}
          >
            지금 안 할래요
          </Button>
        </div>
      )}

      {/* Status badge */}
      {status === 'in_progress' && (
        <Badge variant="warning" className="absolute top-3 right-3">
          <span className="w-1.5 h-1.5 rounded-full bg-warning-500 animate-pulse" />
          진행 중
        </Badge>
      )}
    </div>
  );
}
