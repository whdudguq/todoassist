// @vitest-environment jsdom
// @TASK P5-S5 - Statistics screen tests
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom';
import { useStatsStore } from '@renderer/stores/statsStore';

// Mock recharts
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="responsive-container">{children}</div>
  ),
  LineChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="line-chart">{children}</div>
  ),
  PieChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="pie-chart">{children}</div>
  ),
  BarChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="bar-chart">{children}</div>
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

import { Statistics } from '@renderer/screens/Statistics';

beforeEach(() => {
  useStatsStore.setState({
    period: 'thisWeek',
    completionData: [
      { date: '03/12', rate: 80 },
      { date: '03/13', rate: 60 },
      { date: '03/14', rate: 90 },
    ],
    categoryData: [
      { name: '품질', minutes: 120, color: '#e57373' },
      { name: '보고서', minutes: 90, color: '#4dd0e1' },
    ],
    deferralData: [
      { label: '월', count: 2 },
      { label: '화', count: 1 },
      { label: '수', count: 3 },
    ],
    aiInsights: [
      '이번 주 완료율이 지난 주보다 15% 향상되었어요! 정말 잘 하고 있어요.',
      '품질 카테고리 작업에 가장 많은 시간을 투자했네요.',
    ],
    accumulatedCompleted: 87,
    customRange: null,
    isLoading: false,
  });
});

describe('Statistics screen', () => {
  describe('page structure', () => {
    it('has data-testid page-statistics', () => {
      render(<Statistics />);
      expect(screen.getByTestId('page-statistics')).toBeInTheDocument();
    });

    it('renders header with title', () => {
      render(<Statistics />);
      expect(screen.getByTestId('stats-header')).toBeInTheDocument();
      expect(screen.getByText('통계 & 리포트')).toBeInTheDocument();
    });

    it('renders accumulated completed badge', () => {
      render(<Statistics />);
      expect(screen.getByTestId('stats-accumulated-badge')).toBeInTheDocument();
      expect(screen.getByTestId('stats-accumulated-badge').textContent).toContain('87');
    });
  });

  describe('period tabs', () => {
    it('renders all 5 period tabs', () => {
      render(<Statistics />);
      expect(screen.getByRole('button', { name: '이번주' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '지난주' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '이번달' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '지난달' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '커스텀' })).toBeInTheDocument();
    });

    it('active tab has accent styling', () => {
      render(<Statistics />);
      const thisWeekTab = screen.getByRole('button', { name: '이번주' });
      expect(thisWeekTab).toHaveAttribute('data-active', 'true');
    });

    it('clicking tab changes period in store', () => {
      render(<Statistics />);
      const lastWeekTab = screen.getByRole('button', { name: '지난주' });
      fireEvent.click(lastWeekTab);
      expect(useStatsStore.getState().period).toBe('lastWeek');
    });

    it('clicking 이번달 tab sets thisMonth', () => {
      render(<Statistics />);
      fireEvent.click(screen.getByRole('button', { name: '이번달' }));
      expect(useStatsStore.getState().period).toBe('thisMonth');
    });

    it('clicking 지난달 tab sets lastMonth', () => {
      render(<Statistics />);
      fireEvent.click(screen.getByRole('button', { name: '지난달' }));
      expect(useStatsStore.getState().period).toBe('lastMonth');
    });

    it('clicking 커스텀 tab sets custom', () => {
      render(<Statistics />);
      fireEvent.click(screen.getByRole('button', { name: '커스텀' }));
      expect(useStatsStore.getState().period).toBe('custom');
    });
  });

  describe('chart sections', () => {
    it('renders completion rate chart area', () => {
      render(<Statistics />);
      expect(screen.getByTestId('completion-chart-section')).toBeInTheDocument();
    });

    it('renders category pie chart area', () => {
      render(<Statistics />);
      expect(screen.getByTestId('category-chart-section')).toBeInTheDocument();
    });

    it('renders deferral pattern chart area', () => {
      render(<Statistics />);
      expect(screen.getByTestId('deferral-chart-section')).toBeInTheDocument();
    });

    it('renders line chart for completion data', () => {
      render(<Statistics />);
      expect(screen.getByTestId('line-chart')).toBeInTheDocument();
    });

    it('renders pie chart for category data', () => {
      render(<Statistics />);
      expect(screen.getByTestId('pie-chart')).toBeInTheDocument();
    });

    it('renders bar chart for deferral data', () => {
      render(<Statistics />);
      expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
    });
  });

  describe('AI insights', () => {
    it('renders AI insights section', () => {
      render(<Statistics />);
      expect(screen.getByTestId('ai-insights-section')).toBeInTheDocument();
    });

    it('renders insight cards with text', () => {
      render(<Statistics />);
      expect(
        screen.getByText('이번 주 완료율이 지난 주보다 15% 향상되었어요! 정말 잘 하고 있어요.'),
      ).toBeInTheDocument();
      expect(
        screen.getByText('품질 카테고리 작업에 가장 많은 시간을 투자했네요.'),
      ).toBeInTheDocument();
    });

    it('renders correct number of insight cards', () => {
      render(<Statistics />);
      const cards = screen.getAllByTestId(/^insight-card-/);
      expect(cards).toHaveLength(2);
    });
  });

  describe('loading state', () => {
    it('renders loading state when isLoading true', () => {
      useStatsStore.setState({ isLoading: true });
      render(<Statistics />);
      expect(screen.getByTestId('stats-loading')).toBeInTheDocument();
    });
  });
});
