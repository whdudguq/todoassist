// @TASK P5-S5 - Category time distribution pie chart
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';
import { cn } from '@renderer/lib/cn';

interface StatsPieChartProps {
  data: Array<{ name: string; minutes: number; color: string }>;
  height?: number;
  className?: string;
}

function formatMinutes(minutes: number): string {
  if (minutes >= 60) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m > 0 ? `${h}시간 ${m}분` : `${h}시간`;
  }
  return `${minutes}분`;
}

export function StatsPieChart({ data, height = 200, className }: StatsPieChartProps) {
  if (!data || data.length === 0) {
    return (
      <div
        data-testid="stats-pie-chart"
        className={cn('w-full flex items-center justify-center text-sm text-surface-400', className)}
        style={{ height }}
      >
        데이터가 없습니다
      </div>
    );
  }

  return (
    <div
      data-testid="stats-pie-chart"
      className={cn('w-full', className)}
      style={{ height, minHeight: 200 }}
    >
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="minutes"
            nameKey="name"
            cx="50%"
            cy="50%"
            outerRadius={70}
            label={({ name, value }) => `${name as string} ${formatMinutes(value as number)}`}
            labelLine={false}
          >
            {data.map((entry) => (
              <Cell key={entry.name} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              fontSize: 12,
              border: '1px solid var(--color-surface-200)',
              borderRadius: 8,
              backgroundColor: 'var(--color-surface-0)',
            }}
            formatter={(v: unknown, name: unknown) => [formatMinutes(v as number), name as string]}
          />
          <Legend
            iconType="circle"
            iconSize={8}
            wrapperStyle={{ fontSize: 11, color: 'var(--color-surface-600)' }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
