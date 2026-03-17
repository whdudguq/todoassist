// @TASK P5-S5 - Deferral pattern bar chart
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import { cn } from '@renderer/lib/cn';

interface StatsBarChartProps {
  data: Array<{ label: string; count: number }>;
  height?: number;
  className?: string;
}

export function StatsBarChart({ data, height = 200, className }: StatsBarChartProps) {
  if (!data || data.length === 0) {
    return (
      <div
        data-testid="stats-bar-chart"
        className={cn('w-full flex items-center justify-center text-sm text-surface-400', className)}
        style={{ height }}
      >
        데이터가 없습니다
      </div>
    );
  }

  return (
    <div
      data-testid="stats-bar-chart"
      className={cn('w-full', className)}
      style={{ height, minHeight: 200 }}
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 4, left: -20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-surface-200)" />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: 'var(--color-surface-400)' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fill: 'var(--color-surface-400)' }}
            axisLine={false}
            tickLine={false}
            allowDecimals={false}
          />
          <Tooltip
            contentStyle={{
              fontSize: 12,
              border: '1px solid var(--color-surface-200)',
              borderRadius: 8,
              backgroundColor: 'var(--color-surface-0)',
            }}
            formatter={(v: unknown) => [`${v}회`, '미룬 횟수']}
          />
          <Bar
            dataKey="count"
            fill="var(--color-warning-500)"
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
