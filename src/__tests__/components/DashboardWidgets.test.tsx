// @vitest-environment jsdom
// @TASK P4-S1 - Dashboard widget component tests
import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import '@testing-library/jest-dom';
import type { Task } from '@shared/types';

// Mock recharts
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="responsive-container">{children}</div>
  ),
  LineChart: ({ children, data }: { children: React.ReactNode; data?: unknown[] }) => (
    <div data-testid="line-chart" data-points={data?.length}>{children}</div>
  ),
  Line: () => <div data-testid="line" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
}));

import { ProgressRing } from '@renderer/components/ProgressRing';
import { TaskListToday } from '@renderer/components/TaskListToday';
import { MiniChart } from '@renderer/components/MiniChart';

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

describe('ProgressRing', () => {
  it('renders with default size 120', () => {
    render(<ProgressRing value={50} />);
    const svg = document.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });

  it('renders percentage text in center', () => {
    render(<ProgressRing value={75} />);
    expect(screen.getByText('75%')).toBeInTheDocument();
  });

  it('renders with custom size', () => {
    render(<ProgressRing value={50} size={80} />);
    const svg = document.querySelector('svg');
    expect(svg).toHaveAttribute('width', '80');
    expect(svg).toHaveAttribute('height', '80');
  });

  it('clamps value at 0', () => {
    render(<ProgressRing value={-10} />);
    expect(screen.getByText('0%')).toBeInTheDocument();
  });

  it('clamps value at 100', () => {
    render(<ProgressRing value={120} />);
    expect(screen.getByText('100%')).toBeInTheDocument();
  });

  describe('color based on value', () => {
    it('uses danger color when value < 30', () => {
      render(<ProgressRing value={20} />);
      const ring = document.querySelector('[data-ring-color]');
      expect(ring).toHaveAttribute('data-ring-color', 'danger');
    });

    it('uses warning color when 30 <= value <= 70', () => {
      render(<ProgressRing value={50} />);
      const ring = document.querySelector('[data-ring-color]');
      expect(ring).toHaveAttribute('data-ring-color', 'warning');
    });

    it('uses success color when value > 70', () => {
      render(<ProgressRing value={80} />);
      const ring = document.querySelector('[data-ring-color]');
      expect(ring).toHaveAttribute('data-ring-color', 'success');
    });

    it('boundary: value=30 uses warning', () => {
      render(<ProgressRing value={30} />);
      const ring = document.querySelector('[data-ring-color]');
      expect(ring).toHaveAttribute('data-ring-color', 'warning');
    });

    it('boundary: value=70 uses warning', () => {
      render(<ProgressRing value={70} />);
      const ring = document.querySelector('[data-ring-color]');
      expect(ring).toHaveAttribute('data-ring-color', 'warning');
    });
  });
});

describe('TaskListToday', () => {
  const tasks: Task[] = [
    makeTask({ id: 't1', title: 'Alpha', importance: 5 }),
    makeTask({ id: 't2', title: 'Beta', importance: 4 }),
    makeTask({ id: 't3', title: 'Gamma', importance: 3 }),
    makeTask({ id: 't4', title: 'Delta', importance: 2 }),
    makeTask({ id: 't5', title: 'Epsilon', importance: 1 }),
    makeTask({ id: 't6', title: 'Zeta', importance: 2 }),
  ];

  it('renders task items', () => {
    render(
      <TaskListToday
        tasks={tasks}
        onMicroStart={vi.fn()}
        onDefer={vi.fn()}
      />,
    );
    expect(screen.getByText('Alpha')).toBeInTheDocument();
  });

  it('renders max 5 tasks sorted by importance desc', () => {
    render(
      <TaskListToday
        tasks={tasks}
        onMicroStart={vi.fn()}
        onDefer={vi.fn()}
      />,
    );
    // Top 5 by importance: t1(5), t2(4), t3(3), t4(2), t6(2) — t5(1) should be cut
    const items = screen.getAllByTestId(/^task-item-/);
    expect(items).toHaveLength(5);
  });

  it('renders task items in importance descending order', () => {
    render(
      <TaskListToday
        tasks={tasks}
        onMicroStart={vi.fn()}
        onDefer={vi.fn()}
      />,
    );
    const items = screen.getAllByTestId(/^task-item-/);
    // First item should be t1 (importance 5)
    expect(items[0]).toHaveAttribute('data-testid', 'task-item-t1');
    expect(items[1]).toHaveAttribute('data-testid', 'task-item-t2');
  });

  it('each task shows "2분만 시작" button', () => {
    render(
      <TaskListToday
        tasks={tasks.slice(0, 3)}
        onMicroStart={vi.fn()}
        onDefer={vi.fn()}
      />,
    );
    const buttons = screen.getAllByRole('button', { name: /2분만 시작/i });
    expect(buttons).toHaveLength(3);
  });

  it('each task shows "지금 안 할래요" button', () => {
    render(
      <TaskListToday
        tasks={tasks.slice(0, 3)}
        onMicroStart={vi.fn()}
        onDefer={vi.fn()}
      />,
    );
    const buttons = screen.getAllByRole('button', { name: /지금 안 할래요/i });
    expect(buttons).toHaveLength(3);
  });

  it('calls onMicroStart with task id when "2분만 시작" is clicked', () => {
    const onMicroStart = vi.fn();
    render(
      <TaskListToday
        tasks={[makeTask({ id: 'task-a', title: 'Task A', importance: 3 })]}
        onMicroStart={onMicroStart}
        onDefer={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /2분만 시작/i }));
    expect(onMicroStart).toHaveBeenCalledWith('task-a');
  });

  it('calls onDefer with task id when "지금 안 할래요" is clicked', () => {
    const onDefer = vi.fn();
    render(
      <TaskListToday
        tasks={[makeTask({ id: 'task-a', title: 'Task A', importance: 3 })]}
        onMicroStart={vi.fn()}
        onDefer={onDefer}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /지금 안 할래요/i }));
    expect(onDefer).toHaveBeenCalledWith('task-a');
  });
});

describe('MiniChart', () => {
  const weeklyData = [
    { date: '월', completionRate: 80 },
    { date: '화', completionRate: 60 },
    { date: '수', completionRate: 90 },
    { date: '목', completionRate: 40 },
    { date: '금', completionRate: 70 },
    { date: '토', completionRate: 50 },
    { date: '일', completionRate: 75 },
  ];

  it('renders chart container', () => {
    render(<MiniChart data={weeklyData} />);
    expect(screen.getByTestId('mini-chart')).toBeInTheDocument();
  });

  it('renders recharts ResponsiveContainer', () => {
    render(<MiniChart data={weeklyData} />);
    expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
  });

  it('renders LineChart with 7 data points', () => {
    render(<MiniChart data={weeklyData} />);
    const lineChart = screen.getByTestId('line-chart');
    expect(lineChart).toHaveAttribute('data-points', '7');
  });

  it('renders with empty data gracefully', () => {
    render(<MiniChart data={[]} />);
    expect(screen.getByTestId('mini-chart')).toBeInTheDocument();
  });
});

// Import fireEvent at top level
import { fireEvent } from '@testing-library/react';
