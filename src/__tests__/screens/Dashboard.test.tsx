// @vitest-environment jsdom
// @TASK P4-S1 - Dashboard screen tests
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom';
import type { Task } from '@shared/types';
import { useDashboardStore } from '@renderer/stores/dashboardStore';

// Mock recharts to avoid canvas issues in jsdom
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="responsive-container">{children}</div>
  ),
  LineChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="line-chart">{children}</div>
  ),
  Line: () => <div data-testid="line" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
}));

import { Dashboard } from '@renderer/screens/Dashboard';

const makeTask = (overrides: Partial<Task> = {}): Task => ({
  id: 'task-1',
  title: 'Test Task',
  description: '',
  deadline: null,
  estimatedMinutes: 30,
  importance: 3,
  category: 'other',
  relatedClass: '',
  parentId: null,
  status: 'pending',
  progress: 0,
  templateId: null,
  createdAt: Date.now(),
  updatedAt: Date.now(),
  completedAt: null,
  ...overrides,
});

const sampleTasks: Task[] = [
  makeTask({ id: 't1', title: 'Critical Task', importance: 5 }),
  makeTask({ id: 't2', title: 'High Task', importance: 4 }),
  makeTask({ id: 't3', title: 'Medium Task', importance: 3 }),
  makeTask({ id: 't4', title: 'Low Task', importance: 2 }),
  makeTask({ id: 't5', title: 'Minimal Task', importance: 1 }),
  makeTask({ id: 't6', title: 'Extra Task', importance: 3 }),
];

const weeklyData = [
  { date: '월', completionRate: 80 },
  { date: '화', completionRate: 60 },
  { date: '수', completionRate: 90 },
  { date: '목', completionRate: 40 },
  { date: '금', completionRate: 70 },
  { date: '토', completionRate: 50 },
  { date: '일', completionRate: 75 },
];

beforeEach(() => {
  useDashboardStore.setState({
    dailyStats: {
      id: 'stats-1',
      date: '2026-03-18',
      completedCount: 3,
      totalPlanned: 5,
      deferredCount: 1,
      totalMinutesUsed: 90,
      categoryBreakdown: '{}',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
    todayTasks: sampleTasks,
    aiGreeting: '오늘도 잘 하고 있어요! 한 가지씩 차근차근 해봐요.',
    accumulatedCompleted: 42,
    weeklyData,
    isLoading: false,
  });
});

describe('Dashboard screen', () => {
  describe('greeting card', () => {
    it('renders greeting card section', () => {
      render(<Dashboard />);
      expect(screen.getByTestId('greeting-card')).toBeInTheDocument();
    });

    it('renders time-based icon', () => {
      render(<Dashboard />);
      const greetingCard = screen.getByTestId('greeting-card');
      // should contain a time-of-day icon (lucide SVG with aria-label)
      const icon = greetingCard.querySelector('[aria-label="morning"], [aria-label="afternoon"], [aria-label="evening"]');
      expect(icon).not.toBeNull();
    });

    it('renders AI greeting message', () => {
      render(<Dashboard />);
      expect(
        screen.getByText('오늘도 잘 하고 있어요! 한 가지씩 차근차근 해봐요.'),
      ).toBeInTheDocument();
    });
  });

  describe('progress ring', () => {
    it('renders progress ring card', () => {
      render(<Dashboard />);
      expect(screen.getByTestId('progress-ring-card')).toBeInTheDocument();
    });

    it('shows today completion rate', () => {
      render(<Dashboard />);
      // completedCount=3, totalPlanned=5 → 60%
      expect(screen.getByTestId('progress-ring-card')).toBeInTheDocument();
      expect(screen.getByText('60%')).toBeInTheDocument();
    });
  });

  describe('today task list', () => {
    it('renders today task list section', () => {
      render(<Dashboard />);
      expect(screen.getByTestId('task-list-today')).toBeInTheDocument();
    });

    it('renders top 5 tasks by importance (not 6th)', () => {
      render(<Dashboard />);
      // top 5 by importance desc: t1(5), t2(4), t3(3), t6(3), t4(2)
      // t5 (importance=1) is 6th and should be cut
      expect(screen.getByText('Critical Task')).toBeInTheDocument();
      expect(screen.getByText('High Task')).toBeInTheDocument();
      expect(screen.getByText('Medium Task')).toBeInTheDocument();
      expect(screen.getByText('Low Task')).toBeInTheDocument();
      expect(screen.getByText('Extra Task')).toBeInTheDocument();
      // 'Minimal Task' (importance=1) should NOT be shown
      expect(screen.queryByText('Minimal Task')).not.toBeInTheDocument();
    });

    it('each task has "2분만 시작" button', () => {
      render(<Dashboard />);
      const startButtons = screen.getAllByRole('button', { name: /2분만 시작/i });
      expect(startButtons.length).toBeGreaterThanOrEqual(1);
    });

    it('each task has "지금 안 할래요" button', () => {
      render(<Dashboard />);
      const deferButtons = screen.getAllByRole('button', { name: /지금 안 할래요/i });
      expect(deferButtons.length).toBeGreaterThanOrEqual(1);
    });

    it('clicking "지금 안 할래요" shows encouraging message', () => {
      render(<Dashboard />);
      const deferButtons = screen.getAllByRole('button', { name: /지금 안 할래요/i });
      fireEvent.click(deferButtons[0]);
      expect(screen.getByText(/괜찮아요/i)).toBeInTheDocument();
    });
  });

  describe('accumulated completed badge', () => {
    it('renders accumulated completed count', () => {
      render(<Dashboard />);
      expect(screen.getByTestId('accumulated-badge')).toBeInTheDocument();
      expect(screen.getByTestId('accumulated-badge').textContent).toContain('42');
    });
  });

  describe('weekly mini chart', () => {
    it('renders weekly chart section', () => {
      render(<Dashboard />);
      expect(screen.getByTestId('weekly-chart-card')).toBeInTheDocument();
    });

    it('renders chart with weekly data', () => {
      render(<Dashboard />);
      // recharts is mocked, so just check the container is present
      expect(screen.getByTestId('weekly-chart-card')).toBeInTheDocument();
    });
  });

  describe('layout structure', () => {
    it('has data-testid page-dashboard', () => {
      render(<Dashboard />);
      expect(screen.getByTestId('page-dashboard')).toBeInTheDocument();
    });

    it('renders left column', () => {
      render(<Dashboard />);
      expect(screen.getByTestId('dashboard-left')).toBeInTheDocument();
    });

    it('renders right column', () => {
      render(<Dashboard />);
      expect(screen.getByTestId('dashboard-right')).toBeInTheDocument();
    });
  });
});
