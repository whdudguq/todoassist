// @TASK P4-S1 - Today's task list with Eros micro-start and defer actions
import { useState } from 'react';
import type { Task } from '../../shared/types';
import { Button } from './ui/button';
import { cn } from '@renderer/lib/cn';

interface TaskListTodayProps {
  tasks: Task[];
  onMicroStart: (id: string) => void;
  onDefer: (id: string) => void;
  className?: string;
}

function ImportanceDots({ value }: { value: number }) {
  return (
    <span className="flex gap-0.5" aria-label={`중요도 ${value}`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <span
          key={i}
          className={cn(
            'inline-block w-1.5 h-1.5 rounded-full',
            i < value ? 'bg-accent-500' : 'bg-surface-200',
          )}
        />
      ))}
    </span>
  );
}

export function TaskListToday({ tasks, onMicroStart, onDefer, className }: TaskListTodayProps) {
  const [deferredId, setDeferredId] = useState<string | null>(null);

  // Sort by importance desc, take top 5
  const sorted = [...tasks].sort((a, b) => b.importance - a.importance).slice(0, 5);

  const handleDefer = (id: string) => {
    setDeferredId(id);
    onDefer(id);
  };

  return (
    <div className={cn('flex flex-col gap-3', className)} data-testid="task-list-today">
      {sorted.map((task) => (
        <div
          key={task.id}
          data-testid={`task-item-${task.id}`}
          className={cn(
            'flex flex-col gap-2 p-3 rounded-lg',
            'border border-surface-200/60 bg-surface-0',
          )}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex flex-col gap-1 min-w-0">
              <span className="text-sm font-medium text-surface-800 truncate">
                {task.title}
              </span>
              <div className="flex items-center gap-2">
                <ImportanceDots value={task.importance} />
                {task.estimatedMinutes > 0 && (
                  <span className="text-xs text-surface-400">
                    {task.estimatedMinutes}분
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Eros: deferred message */}
          {deferredId === task.id && (
            <p className="text-xs text-success-600 bg-success-50 px-2 py-1 rounded-md">
              괜찮아요! 나중에 해도 됩니다.
            </p>
          )}

          <div className="flex gap-2">
            <Button
              size="sm"
              variant="primary"
              onClick={() => onMicroStart(task.id)}
              className="flex-1 text-xs"
            >
              2분만 시작
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => handleDefer(task.id)}
              className="flex-1 text-xs"
            >
              지금 안 할래요
            </Button>
          </div>
        </div>
      ))}

      {sorted.length === 0 && (
        <p className="text-sm text-surface-400 text-center py-6">
          오늘 할 일이 없어요. 여유롭게 쉬어도 괜찮아요!
        </p>
      )}
    </div>
  );
}
