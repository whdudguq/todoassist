import { useState, useEffect } from 'react';
import { Timer, Pause, Coffee } from 'lucide-react';
import { useTimerStore } from '@renderer/stores/timerStore';
import { cn } from '@renderer/lib/cn';

interface ElapsedTimerProps {
  taskId: string;
  estimatedMinutes?: number;
  className?: string;
}

function formatElapsed(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}시간 ${m}분 ${s}초`;
  if (m > 0) return `${m}분 ${s}초`;
  return `${s}초`;
}

function formatTotalElapsed(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  if (h > 0) return `${h}시간 ${m}분`;
  return `${m}분`;
}

export function ElapsedTimer({ taskId, estimatedMinutes, className }: ElapsedTimerProps) {
  const timer = useTimerStore((s) => s.timers[taskId]);
  const getActiveTime = useTimerStore((s) => s.getActiveTime);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (timer?.isPaused) return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [timer?.isPaused]);

  if (!timer) return null;

  const activeMs = timer.isPaused ? timer.accumulatedMs : getActiveTime(taskId);
  const totalMs = now - timer.startedAt;
  const pausedMs = totalMs - activeMs;
  const activeMin = activeMs / 60000;
  const isOver2min = activeMin >= 2;
  const percent = estimatedMinutes ? Math.min(Math.round((activeMin / estimatedMinutes) * 100), 999) : null;
  const isOverEstimate = estimatedMinutes ? activeMin > estimatedMinutes : false;

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      {/* Active time row */}
      <div
        className={cn(
          'flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono tabular-nums',
          timer.isPaused
            ? 'bg-surface-100 text-surface-500'
            : isOverEstimate
              ? 'bg-danger-50 text-danger-600'
              : isOver2min
                ? 'bg-success-50 text-success-600'
                : 'bg-accent-50 text-accent-600',
        )}
      >
        {timer.isPaused ? (
          <Pause size={12} />
        ) : (
          <Timer size={12} />
        )}
        <span>{formatElapsed(activeMs)}</span>
        {percent !== null && !timer.isPaused && (
          <span className="font-sans text-[10px] font-medium ml-auto">
            {isOverEstimate ? '초과!' : `${percent}%`}
          </span>
        )}
        {timer.isPaused && (
          <span className="font-sans text-[10px] font-medium ml-auto text-surface-400">
            일시정지
          </span>
        )}
        {isOver2min && !isOverEstimate && !timer.isPaused && (
          <span className="text-[10px] font-sans font-medium">대단해요!</span>
        )}
      </div>

      {/* Progress bar vs estimated */}
      {estimatedMinutes && (
        <div className="flex items-center gap-2 px-1">
          <div className="flex-1 h-1.5 bg-surface-200 rounded-full overflow-hidden">
            <div
              className={cn(
                'h-full rounded-full transition-all duration-1000',
                timer.isPaused ? 'bg-surface-400' : isOverEstimate ? 'bg-danger-400' : 'bg-success-400',
              )}
              style={{ width: `${Math.min(percent ?? 0, 100)}%` }}
            />
          </div>
          <span className="text-[10px] text-surface-400 font-mono whitespace-nowrap">
            {Math.round(activeMin)}분 / {estimatedMinutes}분
          </span>
        </div>
      )}

      {/* Time breakdown: active vs paused */}
      {pausedMs > 1000 && (
        <div className="flex items-center gap-3 px-1 text-[10px] text-surface-400">
          <span className="flex items-center gap-1">
            <Timer size={10} /> 작업 {formatTotalElapsed(activeMs)}
          </span>
          <span className="flex items-center gap-1">
            <Coffee size={10} /> 휴식 {formatTotalElapsed(pausedMs)}
          </span>
        </div>
      )}

      {/* Pause reason */}
      {timer.isPaused && timer.pauseReason && (
        <div className="px-2 py-1 bg-surface-50 rounded text-[11px] text-surface-500 border border-surface-200/60">
          💬 {timer.pauseReason}
        </div>
      )}

      {/* Pause history */}
      {timer.pauseHistory.length > 0 && (
        <details className="px-1">
          <summary className="text-[10px] text-surface-400 cursor-pointer">
            정지 이력 ({timer.pauseHistory.length}회)
          </summary>
          <div className="mt-1 flex flex-col gap-0.5">
            {timer.pauseHistory.map((entry, i) => (
              <div key={i} className="text-[10px] text-surface-400 pl-2 border-l-2 border-surface-200">
                {entry.reason || '(사유 없음)'}
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
