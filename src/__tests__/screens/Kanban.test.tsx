// @vitest-environment jsdom
// @TASK P3-S2 - Kanban screen tests
// @SPEC docs/planning/03-user-flow.md
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom';
import type { Task, TimeBox } from '@shared/types';
import { useTimeboxStore } from '@renderer/stores/timeboxStore';
import { useTaskStore } from '@renderer/stores/taskStore';

// Mock TimeGrid to isolate Kanban screen logic
vi.mock('@renderer/components/TimeGrid', () => ({
  TimeGrid: ({ timeboxes, onSlotClick }: { timeboxes: TimeBox[]; onSlotClick: (slot: number) => void }) => (
    <div data-testid="time-grid" data-timebox-count={timeboxes.length}>
      <button onClick={() => onSlotClick(18)}>slot-click</button>
    </div>
  ),
  slotToTime: (slot: number) => {
    const totalMins = slot * 30;
    const h = Math.floor(totalMins / 60).toString().padStart(2, '0');
    const m = (totalMins % 60).toString().padStart(2, '0');
    return `${h}:${m}`;
  },
}));

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

const makeTimebox = (overrides: Partial<TimeBox> = {}): TimeBox => ({
  id: 'tb-1',
  taskId: 'task-1',
  date: '2026-03-18',
  startSlot: 18,
  endSlot: 19,
  status: 'scheduled',
  aiSuggested: false,
  createdAt: Date.now(),
  updatedAt: Date.now(),
  ...overrides,
});

const TODAY = '2026-03-18';

beforeEach(() => {
  useTimeboxStore.setState({
    timeboxes: [],
    selectedDate: TODAY,
    isLoading: false,
  });
  useTaskStore.setState({
    tasks: [],
    selectedTaskId: null,
    filter: {},
    sortBy: 'createdAt',
    searchQuery: '',
    isLoading: false,
  });
});

import { Kanban } from '@renderer/screens/Kanban';

describe('Kanban screen', () => {
  describe('header', () => {
    it('renders date navigator with today label', () => {
      render(<Kanban />);
      expect(screen.getByTestId('date-navigator')).toBeInTheDocument();
    });

    it('shows selectedDate in header', () => {
      render(<Kanban />);
      expect(screen.getByText(TODAY)).toBeInTheDocument();
    });

    it('renders previous date button', () => {
      render(<Kanban />);
      expect(screen.getByRole('button', { name: /prev/i })).toBeInTheDocument();
    });

    it('renders next date button', () => {
      render(<Kanban />);
      expect(screen.getByRole('button', { name: /next/i })).toBeInTheDocument();
    });

    it('renders "AI 스케줄 제안" button in header', () => {
      render(<Kanban />);
      expect(screen.getByRole('button', { name: /AI 스케줄 제안/i })).toBeInTheDocument();
    });
  });

  describe('date navigation', () => {
    it('clicking prev button moves selectedDate one day back', () => {
      render(<Kanban />);
      const prevBtn = screen.getByRole('button', { name: /prev/i });
      fireEvent.click(prevBtn);
      expect(useTimeboxStore.getState().selectedDate).toBe('2026-03-17');
    });

    it('clicking next button moves selectedDate one day forward', () => {
      render(<Kanban />);
      const nextBtn = screen.getByRole('button', { name: /next/i });
      fireEvent.click(nextBtn);
      expect(useTimeboxStore.getState().selectedDate).toBe('2026-03-19');
    });
  });

  describe('TimeGrid panel', () => {
    it('renders TimeGrid component', () => {
      render(<Kanban />);
      expect(screen.getByTestId('time-grid')).toBeInTheDocument();
    });

    it('passes timeboxes for selectedDate to TimeGrid', () => {
      const timeboxes = [
        makeTimebox({ id: 'tb-1', date: TODAY }),
        makeTimebox({ id: 'tb-2', date: '2026-03-17' }),  // different date
      ];
      useTimeboxStore.setState({ timeboxes, selectedDate: TODAY, isLoading: false });
      render(<Kanban />);
      const grid = screen.getByTestId('time-grid');
      expect(grid).toHaveAttribute('data-timebox-count', '1');
    });
  });

  describe('unscheduled tasks sidebar', () => {
    it('renders unscheduled tasks panel', () => {
      render(<Kanban />);
      expect(screen.getByTestId('unscheduled-panel')).toBeInTheDocument();
    });

    it('shows tasks that have no timebox for selected date', () => {
      const tasks = [
        makeTask({ id: 'task-1', title: 'Unscheduled Task' }),
        makeTask({ id: 'task-2', title: 'Scheduled Task' }),
      ];
      const timeboxes = [makeTimebox({ taskId: 'task-2', date: TODAY })];
      useTaskStore.setState({ tasks, selectedTaskId: null, filter: {}, sortBy: 'createdAt', searchQuery: '', isLoading: false });
      useTimeboxStore.setState({ timeboxes, selectedDate: TODAY, isLoading: false });
      render(<Kanban />);
      expect(screen.getByText('Unscheduled Task')).toBeInTheDocument();
      expect(screen.queryByText('Scheduled Task')).not.toBeInTheDocument();
    });

    it('does not show completed tasks in unscheduled panel', () => {
      const tasks = [
        makeTask({ id: 'task-done', title: 'Done Task', status: 'completed' }),
      ];
      useTaskStore.setState({ tasks, selectedTaskId: null, filter: {}, sortBy: 'createdAt', searchQuery: '', isLoading: false });
      render(<Kanban />);
      expect(screen.queryByText('Done Task')).not.toBeInTheDocument();
    });

    it('shows "2분만 시작" button on unscheduled task cards (Eros)', () => {
      const tasks = [makeTask({ id: 'task-1', title: 'Pending Task' })];
      useTaskStore.setState({ tasks, selectedTaskId: null, filter: {}, sortBy: 'createdAt', searchQuery: '', isLoading: false });
      render(<Kanban />);
      expect(screen.getByRole('button', { name: /2분만 시작/i })).toBeInTheDocument();
    });
  });

  describe('save button', () => {
    it('renders Save Schedule button', () => {
      render(<Kanban />);
      expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
    });
  });
});
