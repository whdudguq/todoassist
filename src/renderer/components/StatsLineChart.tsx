// @TASK P5-S5 - Completion rate line chart
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

interface StatsLineChartProps {
  data: Array<{ date: string; rate: number }>;
  height?: number;
  className?: string;
}

export function StatsLineChart({ data, height = 200, className }: StatsLineChartProps) {
  if (!data || data.length === 0) {
    return (
      <div
        data-testid="stats-line-chart"
        className={cn('w-full flex items-center justify-center text-sm text-surface-400', className)}
        style={{ height }}
      >
        데이터가 없습니다
      </div>
    );
  }

  return (
    <div
      data-testid="stats-line-chart"
      className={cn('w-full', className)}
      style={{ height, minHeight: 200 }}
    >
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, bottom: 4, left: -20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-surface-200)" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11, fill: 'var(--color-surface-400)' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            domain={[0, 100]}
            tick={{ fontSize: 11, fill: 'var(--color-surface-400)' }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => `${v}%`}
          />
          <Tooltip
            contentStyle={{
              fontSize: 12,
              border: '1px solid var(--color-surface-200)',
              borderRadius: 8,
              backgroundColor: 'var(--color-surface-0)',
            }}
            formatter={(v: unknown) => [`${v}%`, '완료율']}
          />
          <Line
            type="monotone"
            dataKey="rate"
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
