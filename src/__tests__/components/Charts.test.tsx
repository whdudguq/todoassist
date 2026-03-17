// @vitest-environment jsdom
// @TASK P5-S5 - Chart components tests
import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import '@testing-library/jest-dom';

// Mock recharts to avoid canvas issues in jsdom
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="responsive-container">{children}</div>
  ),
  LineChart: ({ children, data }: { children: React.ReactNode; data?: unknown[] }) => (
    <div data-testid="line-chart" data-points={data?.length}>{children}</div>
  ),
  PieChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="pie-chart">{children}</div>
  ),
  BarChart: ({ children, data }: { children: React.ReactNode; data?: unknown[] }) => (
    <div data-testid="bar-chart" data-bars={data?.length}>{children}</div>
  ),
  Line: () => <div data-testid="line" />,
  Pie: ({ data }: { data?: Array<{ name: string }> }) => (
    <div data-testid="pie">
      {data?.map((d) => (
        <div key={d.name} data-testid={`pie-segment-${d.name}`} />
      ))}
    </div>
  ),
  Bar: () => <div data-testid="bar" />,
  Cell: () => <div data-testid="cell" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
  Legend: () => <div data-testid="legend" />,
}));

import { StatsLineChart } from '@renderer/components/StatsLineChart';
import { StatsPieChart } from '@renderer/components/StatsPieChart';
import { StatsBarChart } from '@renderer/components/StatsBarChart';

const lineData = [
  { date: '03/12', rate: 80 },
  { date: '03/13', rate: 60 },
  { date: '03/14', rate: 90 },
  { date: '03/15', rate: 70 },
  { date: '03/16', rate: 85 },
];

const pieData = [
  { name: '품질', minutes: 120, color: '#e57373' },
  { name: '보고서', minutes: 90, color: '#4dd0e1' },
  { name: '회의', minutes: 60, color: '#7986cb' },
];

const barData = [
  { label: '월', count: 3 },
  { label: '화', count: 1 },
  { label: '수', count: 0 },
  { label: '목', count: 2 },
  { label: '금', count: 4 },
];

describe('StatsLineChart', () => {
  it('renders with data points', () => {
    render(<StatsLineChart data={lineData} />);
    expect(screen.getByTestId('stats-line-chart')).toBeInTheDocument();
  });

  it('renders recharts LineChart', () => {
    render(<StatsLineChart data={lineData} />);
    expect(screen.getByTestId('line-chart')).toBeInTheDocument();
  });

  it('renders responsive container', () => {
    render(<StatsLineChart data={lineData} />);
    expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
  });

  it('renders with custom height', () => {
    render(<StatsLineChart data={lineData} height={200} />);
    const chart = screen.getByTestId('stats-line-chart');
    expect(chart).toBeInTheDocument();
  });

  it('renders with empty data', () => {
    render(<StatsLineChart data={[]} />);
    expect(screen.getByTestId('stats-line-chart')).toBeInTheDocument();
  });
});

describe('StatsPieChart', () => {
  it('renders with category segments', () => {
    render(<StatsPieChart data={pieData} />);
    expect(screen.getByTestId('stats-pie-chart')).toBeInTheDocument();
  });

  it('renders recharts PieChart', () => {
    render(<StatsPieChart data={pieData} />);
    expect(screen.getByTestId('pie-chart')).toBeInTheDocument();
  });

  it('renders all category segments', () => {
    render(<StatsPieChart data={pieData} />);
    expect(screen.getByTestId('pie-segment-품질')).toBeInTheDocument();
    expect(screen.getByTestId('pie-segment-보고서')).toBeInTheDocument();
    expect(screen.getByTestId('pie-segment-회의')).toBeInTheDocument();
  });

  it('renders with empty data', () => {
    render(<StatsPieChart data={[]} />);
    expect(screen.getByTestId('stats-pie-chart')).toBeInTheDocument();
  });
});

describe('StatsBarChart', () => {
  it('renders with bar data', () => {
    render(<StatsBarChart data={barData} />);
    expect(screen.getByTestId('stats-bar-chart')).toBeInTheDocument();
  });

  it('renders recharts BarChart', () => {
    render(<StatsBarChart data={barData} />);
    expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
  });

  it('renders responsive container', () => {
    render(<StatsBarChart data={barData} />);
    expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
  });

  it('renders with empty data', () => {
    render(<StatsBarChart data={[]} />);
    expect(screen.getByTestId('stats-bar-chart')).toBeInTheDocument();
  });
});
