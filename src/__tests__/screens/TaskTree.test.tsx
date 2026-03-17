// @vitest-environment jsdom
// @TASK P2-S3 - TaskTree screen tests
// @SPEC docs/planning/03-user-flow.md
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom';
import type { Task } from '@shared/types';
import { useTaskStore } from '@renderer/stores/taskStore';

// Mock the TreeView to isolate TaskTree screen logic
vi.mock('@renderer/components/TreeView', () => ({
  TreeView: ({ tasks }: { tasks: Task[] }) => (
    <div data-testid="tree-view">
      {tasks.map((t) => (
        <div key={t.id} data-testid={`tree-task-${t.id}`}>
          {t.title}
        </div>
      ))}
    </div>
  ),
}));

// Mock ContextMenu
vi.mock('@renderer/components/ContextMenu', () => ({
  ContextMenu: () => null,
}));

import { TaskTree } from '@renderer/screens/TaskTree';

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
  makeTask({ id: 't1', title: 'Alpha Task', status: 'pending', importance: 5 }),
  makeTask({ id: 't2', title: 'Beta Task', status: 'completed', importance: 2 }),
  makeTask({ id: 't3', title: 'Gamma Report', status: 'pending', importance: 4 }),
  makeTask({ id: 't4', title: 'Delta Meeting', status: 'deferred', importance: 1 }),
];

beforeEach(() => {
  useTaskStore.setState({
    tasks: sampleTasks,
    selectedTaskId: null,
    filter: {},
    sortBy: 'createdAt',
    searchQuery: '',
    isLoading: false,
  });
});

describe('TaskTree screen', () => {
  describe('header', () => {
    it('renders "Task Tree" title', () => {
      render(<TaskTree />);
      expect(screen.getByText('Task Tree')).toBeInTheDocument();
    });

    it('renders "Add Task" button', () => {
      render(<TaskTree />);
      expect(
        screen.getByRole('button', { name: /add task/i }),
      ).toBeInTheDocument();
    });
  });

  describe('search bar', () => {
    it('renders search input', () => {
      render(<TaskTree />);
      expect(
        screen.getByPlaceholderText(/search/i),
      ).toBeInTheDocument();
    });

    it('typing in search input updates store searchQuery', async () => {
      render(<TaskTree />);
      const input = screen.getByPlaceholderText(/search/i);
      fireEvent.change(input, { target: { value: 'Alpha' } });
      expect(useTaskStore.getState().searchQuery).toBe('Alpha');
    });

    it('search filters tasks by title in tree view', async () => {
      render(<TaskTree />);
      const input = screen.getByPlaceholderText(/search/i);
      fireEvent.change(input, { target: { value: 'Alpha' } });
      await waitFor(() => {
        expect(screen.getByTestId('tree-task-t1')).toBeInTheDocument();
        expect(screen.queryByTestId('tree-task-t2')).not.toBeInTheDocument();
      });
    });
  });

  describe('filter bar', () => {
    it('renders filter bar section', () => {
      render(<TaskTree />);
      expect(screen.getByTestId('filter-bar')).toBeInTheDocument();
    });

    it('renders status filter controls', () => {
      render(<TaskTree />);
      // Should have status filter options
      expect(screen.getByTestId('filter-status')).toBeInTheDocument();
    });

    it('renders importance filter control', () => {
      render(<TaskTree />);
      expect(screen.getByTestId('filter-importance')).toBeInTheDocument();
    });

    it('renders category filter control', () => {
      render(<TaskTree />);
      expect(screen.getByTestId('filter-category')).toBeInTheDocument();
    });

    it('filtering by status "completed" shows only completed tasks', async () => {
      render(<TaskTree />);
      // Click the completed status filter button
      const completedBtn = screen.getByTestId('status-filter-completed');
      fireEvent.click(completedBtn);
      await waitFor(() => {
        expect(screen.getByTestId('tree-task-t2')).toBeInTheDocument();
        expect(screen.queryByTestId('tree-task-t1')).not.toBeInTheDocument();
      });
    });
  });

  describe('sort dropdown', () => {
    it('renders sort dropdown', () => {
      render(<TaskTree />);
      expect(screen.getByTestId('sort-select')).toBeInTheDocument();
    });

    it('changing sort to importance updates store sortBy', () => {
      render(<TaskTree />);
      const sortSelect = screen.getByTestId('sort-select');
      fireEvent.change(sortSelect, { target: { value: 'importance' } });
      expect(useTaskStore.getState().sortBy).toBe('importance');
    });

    it('sort by importance orders tasks from highest to lowest importance', async () => {
      render(<TaskTree />);
      const sortSelect = screen.getByTestId('sort-select');
      fireEvent.change(sortSelect, { target: { value: 'importance' } });
      await waitFor(() => {
        const treeView = screen.getByTestId('tree-view');
        const taskNodes = treeView.querySelectorAll('[data-testid^="tree-task-"]');
        const ids = Array.from(taskNodes).map((n) => n.getAttribute('data-testid'));
        // t1 (importance 5), t3 (importance 4), t2 (importance 2), t4 (importance 1)
        expect(ids[0]).toBe('tree-task-t1');
        expect(ids[1]).toBe('tree-task-t3');
      });
    });
  });

  describe('template buttons', () => {
    it('renders "Save as Template" button', () => {
      render(<TaskTree />);
      expect(
        screen.getByRole('button', { name: /save.*template/i }),
      ).toBeInTheDocument();
    });

    it('renders "Load Template" button', () => {
      render(<TaskTree />);
      expect(
        screen.getByRole('button', { name: /load.*template/i }),
      ).toBeInTheDocument();
    });
  });

  describe('tree view integration', () => {
    it('passes all tasks to TreeView when no filters', () => {
      render(<TaskTree />);
      expect(screen.getByTestId('tree-task-t1')).toBeInTheDocument();
      expect(screen.getByTestId('tree-task-t2')).toBeInTheDocument();
      expect(screen.getByTestId('tree-task-t3')).toBeInTheDocument();
      expect(screen.getByTestId('tree-task-t4')).toBeInTheDocument();
    });
  });
});
