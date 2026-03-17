// @TASK P4-S1 - Weekly completion rate mini chart
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import { cn } from '@renderer/lib/cn';

interface MiniChartProps {
  data: Array<{ date: string; completionRate: number }>;
  className?: string;
}

export function MiniChart({ data, className }: MiniChartProps) {
  if (!data || data.length === 0) {
    return (
      <div
        data-testid="mini-chart"
        className={cn('w-full flex items-center justify-center text-sm text-surface-400', className)}
        style={{ height: 120 }}
      >
        데이터가 없습니다
      </div>
    );
  }

  return (
    <div
      data-testid="mini-chart"
      className={cn('w-full', className)}
      style={{ height: 120, minHeight: 120 }}
    >
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 4, right: 4, bottom: 4, left: -20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-surface-200)" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 10, fill: 'var(--color-surface-400)' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            domain={[0, 100]}
            tick={{ fontSize: 10, fill: 'var(--color-surface-400)' }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            contentStyle={{
              fontSize: 11,
              border: '1px solid var(--color-surface-200)',
              borderRadius: 8,
              backgroundColor: 'var(--color-surface-0)',
            }}
            formatter={(v: unknown) => [`${v}%`, '완료율']}
          />
          <Line
            type="monotone"
            dataKey="completionRate"
            stroke="var(--color-accent-500)"
            strokeWidth={2}
            dot={{ r: 3, fill: 'var(--color-accent-500)' }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
