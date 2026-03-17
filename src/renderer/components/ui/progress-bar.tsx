import { cn } from '@renderer/lib/cn';

interface ProgressBarProps {
  value: number;
  size?: 'sm' | 'md';
  showLabel?: boolean;
  className?: string;
}

function getProgressColor(value: number): string {
  if (value >= 70) return 'bg-success-500';
  if (value >= 30) return 'bg-accent-500';
  return 'bg-danger-400';
}

export function ProgressBar({
  value,
  size = 'sm',
  showLabel = false,
  className,
}: ProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, value));
  const heightClass = size === 'sm' ? 'h-1.5' : 'h-2.5';

  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <div
        className={cn(
          'flex-1 rounded-full overflow-hidden',
          'bg-surface-200',
          heightClass,
        )}
      >
        <div
          className={cn(
            'h-full rounded-full',
            'transition-all duration-500 ease-out',
            getProgressColor(clamped),
          )}
          style={{ width: `${clamped}%` }}
          role="progressbar"
          aria-valuenow={clamped}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>
      {showLabel && (
        <span className="text-xs font-medium text-surface-500 tabular-nums w-10 text-right font-mono">
          {clamped}%
        </span>
      )}
    </div>
  );
}
