// @TASK P4-S1 - Circular progress ring component
import { cn } from '@renderer/lib/cn';

interface ProgressRingProps {
  value: number;  // 0-100
  size?: number;  // default 120
  className?: string;
}

type RingColor = 'danger' | 'warning' | 'success';

function getRingColor(value: number): RingColor {
  if (value >= 71) return 'success';
  if (value >= 30) return 'warning';
  return 'danger';
}

const colorStroke: Record<RingColor, string> = {
  danger: 'var(--color-danger-400)',
  warning: 'var(--color-accent-500)',
  success: 'var(--color-success-500)',
};

const colorText: Record<RingColor, string> = {
  danger: 'text-danger-500',
  warning: 'text-accent-600',
  success: 'text-success-600',
};

export function ProgressRing({ value, size = 120, className }: ProgressRingProps) {
  const clamped = Math.min(100, Math.max(0, value));
  const color = getRingColor(clamped);
  const radius = (size - 16) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (clamped / 100) * circumference;
  const cx = size / 2;
  const cy = size / 2;

  return (
    <div
      className={cn('inline-flex items-center justify-center', className)}
      style={{ width: size, height: size }}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        aria-label={`완료율 ${clamped}%`}
        role="img"
      >
        {/* Background track */}
        <circle
          cx={cx}
          cy={cy}
          r={radius}
          fill="none"
          stroke="var(--color-surface-200)"
          strokeWidth={8}
        />
        {/* Progress arc */}
        <circle
          cx={cx}
          cy={cy}
          r={radius}
          fill="none"
          stroke={colorStroke[color]}
          strokeWidth={8}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${cx} ${cy})`}
          data-ring-color={color}
          style={{ transition: 'stroke-dashoffset 0.5s ease-out' }}
        />
        {/* Center text */}
        <text
          x={cx}
          y={cy}
          textAnchor="middle"
          dominantBaseline="central"
          className={cn('font-semibold', colorText[color])}
          style={{ fontSize: size * 0.18, fill: colorStroke[color], fontWeight: 600 }}
        >
          {clamped}%
        </text>
      </svg>
    </div>
  );
}
