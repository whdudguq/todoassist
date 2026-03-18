import { useState, useEffect } from 'react';
import { Timer } from 'lucide-react';
import { cn } from '@renderer/lib/cn';

interface ElapsedTimerProps {
  startedAt: number; // Unix timestamp (ms)
  estimatedMinutes?: number; // 예상 소요 시간 (분)
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

export function ElapsedTimer({ startedAt, estimatedMinutes, className }: ElapsedTimerProps) {
  const [elapsed, setElapsed] = useState(Date.now() - startedAt);

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed(Date.now() - startedAt);
    }, 1000);
    return () => clearInterval(interval);
  }, [startedAt]);

  const elapsedMin = elapsed / 60000;
  const isOver2min = elapsedMin >= 2;
  const percent = estimatedMinutes ? Math.min(Math.round((elapsedMin / estimatedMinutes) * 100), 999) : null;
  const isOverEstimate = estimatedMinutes ? elapsedMin > estimatedMinutes : false;

  return (
    <div className={cn('flex flex-col gap-1', className)}>
      {/* Timer row */}
      <div
        className={cn(
          'flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono tabular-nums',
          isOverEstimate
            ? 'bg-danger-50 text-danger-600'
            : isOver2min
              ? 'bg-success-50 text-success-600'
              : 'bg-accent-50 text-accent-600',
        )}
      >
        <Timer size={12} />
        <span>{formatElapsed(elapsed)}</span>
        {percent !== null && (
          <span className="font-sans text-[10px] font-medium ml-auto">
            {isOverEstimate ? '초과!' : `${percent}%`}
          </span>
        )}
        {isOver2min && !isOverEstimate && (
          <span className="text-[10px] font-sans font-medium">
            대단해요!
          </span>
        )}
      </div>

      {/* Progress bar vs estimated */}
      {estimatedMinutes && (
        <div className="flex items-center gap-2 px-1">
          <div className="flex-1 h-1.5 bg-surface-200 rounded-full overflow-hidden">
            <div
              className={cn(
                'h-full rounded-full transition-all duration-1000',
                isOverEstimate ? 'bg-danger-400' : 'bg-success-400',
              )}
              style={{ width: `${Math.min(percent ?? 0, 100)}%` }}
            />
          </div>
          <span className="text-[10px] text-surface-400 font-mono whitespace-nowrap">
            {Math.round(elapsedMin)}분 / {estimatedMinutes}분
          </span>
        </div>
      )}
    </div>
  );
}
