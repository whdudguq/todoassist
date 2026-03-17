// @vitest-environment jsdom
// @TASK P3-S2 - TimeGrid component tests
// @SPEC docs/planning/03-user-flow.md
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom';
import type { Task, TimeBox } from '@shared/types';
import { useTimeboxStore } from '@renderer/stores/timeboxStore';
import { useTaskStore } from '@renderer/stores/taskStore';

// Work hours: slots 18 (09:00) to 38 (19:00), lunch 24-25 (12:00-13:00)
const WORK_START = 18; // 09:00
const WORK_END = 38;   // 19:00

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

beforeEach(() => {
  useTimeboxStore.setState({
    timeboxes: [],
    selectedDate: '2026-03-18',
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

import { TimeGrid } from '@renderer/components/TimeGrid';

describe('TimeGrid component', () => {
  describe('time slot rendering', () => {
    it('renders 30-min time slots from work start to work end', () => {
      render(<TimeGrid timeboxes={[]} onSlotClick={vi.fn()} />);
      // 18 slots: 09:00 to 18:30 (slots 18..37 = 20 rows)
      const slots = screen.getAllByTestId(/^time-slot-/);
      expect(slots.length).toBe(WORK_END - WORK_START);
    });

    it('shows slot label 09:00 for slot 18', () => {
      render(<TimeGrid timeboxes={[]} onSlotClick={vi.fn()} />);
      expect(screen.getByText('09:00')).toBeInTheDocument();
    });

    it('shows slot label 09:30 for slot 19', () => {
      render(<TimeGrid timeboxes={[]} onSlotClick={vi.fn()} />);
      expect(screen.getByText('09:30')).toBeInTheDocument();
    });

    it('shows slot label 10:00 for slot 20', () => {
      render(<TimeGrid timeboxes={[]} onSlotClick={vi.fn()} />);
      expect(screen.getByText('10:00')).toBeInTheDocument();
    });

    it('shows slot label 18:30 for slot 37', () => {
      render(<TimeGrid timeboxes={[]} onSlotClick={vi.fn()} />);
      expect(screen.getByText('18:30')).toBeInTheDocument();
    });
  });

  describe('task card rendering', () => {
    it('renders task card in the correct time slot', () => {
      const tasks = [makeTask({ id: 'task-1', title: 'My Meeting' })];
      const timeboxes = [makeTimebox({ taskId: 'task-1', startSlot: 18, endSlot: 19 })];
      useTaskStore.setState({ tasks, selectedTaskId: null, filter: {}, sortBy: 'createdAt', searchQuery: '', isLoading: false });
      render(<TimeGrid timeboxes={timeboxes} onSlotClick={vi.fn()} />);
      expect(screen.getByText('My Meeting')).toBeInTheDocument();
    });

    it('renders multiple task cards in different slots', () => {
      const tasks = [
        makeTask({ id: 'task-1', title: 'Task Alpha' }),
        makeTask({ id: 'task-2', title: 'Task Beta' }),
      ];
      const timeboxes = [
        makeTimebox({ id: 'tb-1', taskId: 'task-1', startSlot: 18, endSlot: 19 }),
        makeTimebox({ id: 'tb-2', taskId: 'task-2', startSlot: 22, endSlot: 23 }),
      ];
      useTaskStore.setState({ tasks, selectedTaskId: null, filter: {}, sortBy: 'createdAt', searchQuery: '', isLoading: false });
      render(<TimeGrid timeboxes={timeboxes} onSlotClick={vi.fn()} />);
      expect(screen.getByText('Task Alpha')).toBeInTheDocument();
      expect(screen.getByText('Task Beta')).toBeInTheDocument();
    });
  });

  describe('empty slot interaction', () => {
    it('calls onSlotClick with slot number when empty slot is clicked', () => {
      const onSlotClick = vi.fn();
      render(<TimeGrid timeboxes={[]} onSlotClick={onSlotClick} />);
      const slot = screen.getByTestId('time-slot-18');
      fireEvent.click(slot);
      expect(onSlotClick).toHaveBeenCalledWith(18);
    });

    it('empty slots have cursor-pointer styling (data-empty attribute)', () => {
      render(<TimeGrid timeboxes={[]} onSlotClick={vi.fn()} />);
      const slot = screen.getByTestId('time-slot-18');
      expect(slot).toHaveAttribute('data-empty', 'true');
    });
  });

  describe('lunch break slot', () => {
    it('marks lunch slots (24-25) as lunch break', () => {
      render(<TimeGrid timeboxes={[]} onSlotClick={vi.fn()} />);
      const lunchSlot = screen.getByTestId('time-slot-24');
      expect(lunchSlot).toHaveAttribute('data-lunch', 'true');
    });

    it('shows 점심시간 label in lunch slot', () => {
      render(<TimeGrid timeboxes={[]} onSlotClick={vi.fn()} />);
      expect(screen.getByText('점심시간')).toBeInTheDocument();
    });
  });

  describe('AI 스케줄 제안 button', () => {
    it('renders AI 스케줄 제안 button', () => {
      render(<TimeGrid timeboxes={[]} onSlotClick={vi.fn()} />);
      expect(screen.getByRole('button', { name: /AI 스케줄 제안/i })).toBeInTheDocument();
    });
  });

  describe('slotToTime helper', () => {
    it('exports slotToTime that converts slot 18 to 09:00', async () => {
      const { slotToTime } = await import('@renderer/components/TimeGrid');
      expect(slotToTime(18)).toBe('09:00');
    });

    it('slotToTime converts slot 19 to 09:30', async () => {
      const { slotToTime } = await import('@renderer/components/TimeGrid');
      expect(slotToTime(19)).toBe('09:30');
    });

    it('slotToTime converts slot 0 to 00:00', async () => {
      const { slotToTime } = await import('@renderer/components/TimeGrid');
      expect(slotToTime(0)).toBe('00:00');
    });

    it('slotToTime converts slot 37 to 18:30', async () => {
      const { slotToTime } = await import('@renderer/components/TimeGrid');
      expect(slotToTime(37)).toBe('18:30');
    });
  });
});
