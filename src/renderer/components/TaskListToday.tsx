import { useState } from 'react';
import type { Task } from '../../shared/types';
import { Button } from './ui/button';
import { ElapsedTimer } from './ElapsedTimer';
import { useTimerStore } from '@renderer/stores/timerStore';
import { cn } from '@renderer/lib/cn';

interface TaskListTodayProps {
  tasks: Task[];
  onMicroStart: (id: string) => void;
  onDefer: (id: string) => void;
  onPause?: (id: string) => void;
  onResume?: (id: string) => void;
  onComplete?: (id: string) => void;
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

export function TaskListToday({ tasks, onMicroStart, onDefer, onPause, onResume, onComplete, className }: TaskListTodayProps) {
  const [deferredId, setDeferredId] = useState<string | null>(null);
  const [pauseInputId, setPauseInputId] = useState<string | null>(null);
  const [pauseReason, setPauseReason] = useState('');
  const timers = useTimerStore((s) => s.timers);
  const startTimer = useTimerStore((s) => s.startTimer);
  const pauseTimer = useTimerStore((s) => s.pauseTimer);
  const resumeTimer = useTimerStore((s) => s.resumeTimer);
  const stopTimer = useTimerStore((s) => s.stopTimer);

  const sorted = [...tasks].sort((a, b) => b.importance - a.importance).slice(0, 5);

  const handleMicroStart = (id: string) => {
    startTimer(id);
    onMicroStart(id);
  };

  const handlePauseClick = (id: string) => {
    setPauseInputId(id);
    setPauseReason('');
  };

  const handlePauseConfirm = (id: string) => {
    pauseTimer(id, pauseReason || '잠깐 쉬는 중');
    onPause?.(id);
    setPauseInputId(null);
    setPauseReason('');
  };

  const handleResume = (id: string) => {
    resumeTimer(id);
    onResume?.(id);
  };

  const handleComplete = (id: string) => {
    stopTimer(id);
    onComplete?.(id);
  };

  const handleDefer = (id: string) => {
    setDeferredId(id);
    stopTimer(id);
    onDefer(id);
  };

  return (
    <div className={cn('flex flex-col gap-3', className)} data-testid="task-list-today">
      {sorted.map((task) => {
        const timer = timers[task.id];
        const isInProgress = task.status === 'in_progress';
        const isDeferred = task.status === 'deferred';
        const isCompleted = task.status === 'completed';
        const isPaused = timer?.isPaused ?? false;
        const hasTimer = !!timer;
        const showPauseInput = pauseInputId === task.id;

        return (
          <div
            key={task.id}
            data-testid={`task-item-${task.id}`}
            className={cn(
              'flex flex-col gap-2 p-3 rounded-lg',
              'border border-surface-200/60',
              isInProgress && !isPaused ? 'bg-warning-50/40 border-warning-400/30' :
              isPaused ? 'bg-surface-100 border-surface-300/50' :
              isDeferred ? 'bg-surface-50 opacity-60' :
              isCompleted ? 'bg-success-50/30 opacity-50' :
              'bg-surface-0',
            )}
          >
            {/* Title + meta */}
            <div className="flex items-start justify-between gap-2">
              <div className="flex flex-col gap-1 min-w-0">
                <span className={cn(
                  'text-sm font-medium truncate',
                  isCompleted ? 'line-through text-surface-400' : 'text-surface-800',
                )}>
                  {task.title}
                </span>
                <div className="flex items-center gap-2">
                  <ImportanceDots value={task.importance} />
                  {task.estimatedMinutes > 0 && (
                    <span className="text-xs text-surface-400">
                      {task.estimatedMinutes}분
                    </span>
                  )}
                  {isInProgress && !isPaused && (
                    <span className="text-xs font-medium text-warning-500 bg-warning-50 px-1.5 py-0.5 rounded">
                      진행 중
                    </span>
                  )}
                  {isPaused && (
                    <span className="text-xs font-medium text-surface-500 bg-surface-200 px-1.5 py-0.5 rounded">
                      일시정지
                    </span>
                  )}
                  {isDeferred && (
                    <span className="text-xs font-medium text-surface-400 bg-surface-100 px-1.5 py-0.5 rounded">
                      미룸
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Deferred message */}
            {deferredId === task.id && (
              <p className="text-xs text-success-600 bg-success-50 px-2 py-1 rounded-md">
                괜찮아요! 나중에 해도 됩니다.
              </p>
            )}

            {/* Timer (active or paused) */}
            {hasTimer && (isInProgress || isPaused) && (
              <ElapsedTimer taskId={task.id} estimatedMinutes={task.estimatedMinutes} />
            )}

            {/* Pause reason input */}
            {showPauseInput && (
              <div className="flex flex-col gap-1.5 p-2 bg-surface-50 rounded-lg border border-surface-200">
                <label className="text-[11px] text-surface-500 font-medium">정지 사유</label>
                <input
                  type="text"
                  value={pauseReason}
                  onChange={(e) => setPauseReason(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handlePauseConfirm(task.id); }}
                  placeholder="예: 전화 받는 중, 회의 참석..."
                  autoFocus
                  className={cn(
                    'w-full px-2.5 py-1.5 text-xs rounded-md',
                    'bg-surface-0 border border-surface-200',
                    'focus:outline-none focus:border-accent-400',
                    'placeholder:text-surface-300',
                  )}
                />
                <div className="flex gap-1.5">
                  <Button size="sm" variant="secondary" className="flex-1 text-xs" onClick={() => handlePauseConfirm(task.id)}>
                    확인
                  </Button>
                  <Button size="sm" variant="ghost" className="text-xs" onClick={() => setPauseInputId(null)}>
                    취소
                  </Button>
                </div>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex gap-2">
              {isInProgress && !isPaused && !showPauseInput ? (
                <>
                  <Button size="sm" variant="secondary" onClick={() => handlePauseClick(task.id)} className="flex-1 text-xs">
                    ⏸ 일시정지
                  </Button>
                  <Button size="sm" variant="primary" onClick={() => handleComplete(task.id)} className="flex-1 text-xs">
                    ✓ 완료
                  </Button>
                </>
              ) : isPaused ? (
                <>
                  <Button size="sm" variant="primary" onClick={() => handleResume(task.id)} className="flex-1 text-xs">
                    ▶ 재개
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => handleComplete(task.id)} className="flex-1 text-xs">
                    ✓ 완료
                  </Button>
                </>
              ) : task.status === 'pending' && deferredId !== task.id ? (
                <>
                  <Button size="sm" variant="primary" onClick={() => handleMicroStart(task.id)} className="flex-1 text-xs">
                    2분만 시작
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => handleDefer(task.id)} className="flex-1 text-xs">
                    지금 안 할래요
                  </Button>
                </>
              ) : isDeferred && !isCompleted ? (
                <Button size="sm" variant="secondary" onClick={() => { handleMicroStart(task.id); }} className="flex-1 text-xs">
                  ▶ 다시 시작
                </Button>
              ) : null}
            </div>
          </div>
        );
      })}

      {sorted.length === 0 && (
        <p className="text-sm text-surface-400 text-center py-6">
          오늘 할 일이 없어요. 여유롭게 쉬어도 괜찮아요!
        </p>
      )}
    </div>
  );
}
