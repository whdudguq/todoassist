import { useState, useEffect } from 'react';
import { Timer } from 'lucide-react';
import { cn } from '@renderer/lib/cn';

interface ElapsedTimerProps {
  startedAt: number; // Unix timestamp (ms)
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

export function ElapsedTimer({ startedAt, className }: ElapsedTimerProps) {
  const [elapsed, setElapsed] = useState(Date.now() - startedAt);

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed(Date.now() - startedAt);
    }, 1000);
    return () => clearInterval(interval);
  }, [startedAt]);

  const minutes = elapsed / 60000;
  // 2분 넘으면 격려 색상 변경
  const isOver2min = minutes >= 2;

  return (
    <div
      className={cn(
        'flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono tabular-nums',
        isOver2min
          ? 'bg-success-50 text-success-600'
          : 'bg-accent-50 text-accent-600',
        className,
      )}
    >
      <Timer size={12} className={isOver2min ? 'text-success-500' : 'text-accent-500'} />
      <span>{formatElapsed(elapsed)}</span>
      {isOver2min && (
        <span className="text-[10px] font-sans font-medium ml-1">
          대단해요!
        </span>
      )}
    </div>
  );
}
