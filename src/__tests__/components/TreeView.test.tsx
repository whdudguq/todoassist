// @vitest-environment jsdom
// @TASK P2-S3 - TreeView component tests
// @SPEC docs/planning/03-user-flow.md
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom';
import type { Task } from '@shared/types';

// Mock TreeView from renderer components
import { TreeView } from '@renderer/components/TreeView';

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

const flatTasks: Task[] = [
  makeTask({ id: 'task-1', title: 'Task One', parentId: null }),
  makeTask({ id: 'task-2', title: 'Task Two', parentId: null }),
  makeTask({ id: 'task-3', title: 'Task Three', parentId: null }),
];

const nestedTasks: Task[] = [
  makeTask({ id: 'parent-1', title: 'Parent Task', parentId: null }),
  makeTask({ id: 'child-1', title: 'Child Task A', parentId: 'parent-1' }),
  makeTask({ id: 'child-2', title: 'Child Task B', parentId: 'parent-1' }),
  makeTask({ id: 'grandchild-1', title: 'Grandchild Task', parentId: 'child-1' }),
];

describe('TreeView', () => {
  describe('flat list rendering', () => {
    it('renders a flat list of tasks as tree nodes', () => {
      render(<TreeView tasks={flatTasks} />);
      expect(screen.getByText('Task One')).toBeInTheDocument();
      expect(screen.getByText('Task Two')).toBeInTheDocument();
      expect(screen.getByText('Task Three')).toBeInTheDocument();
    });

    it('shows empty state when no tasks', () => {
      render(<TreeView tasks={[]} />);
      expect(screen.getByText(/no tasks yet/i)).toBeInTheDocument();
    });
  });

  describe('tree structure', () => {
    it('renders root tasks at depth 0', () => {
      render(<TreeView tasks={nestedTasks} />);
      expect(screen.getByText('Parent Task')).toBeInTheDocument();
    });

    it('hides children by default (collapsed)', () => {
      render(<TreeView tasks={nestedTasks} />);
      // Children should not be visible before expanding
      expect(screen.queryByText('Child Task A')).not.toBeInTheDocument();
      expect(screen.queryByText('Child Task B')).not.toBeInTheDocument();
    });

    it('expands children when toggle button clicked', () => {
      render(<TreeView tasks={nestedTasks} />);
      // Find the expand/toggle button for Parent Task
      const expandButton = screen.getByTestId('toggle-parent-1');
      fireEvent.click(expandButton);
      expect(screen.getByText('Child Task A')).toBeInTheDocument();
      expect(screen.getByText('Child Task B')).toBeInTheDocument();
    });

    it('collapses children when toggle clicked again', () => {
      render(<TreeView tasks={nestedTasks} />);
      const expandButton = screen.getByTestId('toggle-parent-1');
      fireEvent.click(expandButton);
      expect(screen.getByText('Child Task A')).toBeInTheDocument();
      fireEvent.click(expandButton);
      expect(screen.queryByText('Child Task A')).not.toBeInTheDocument();
    });

    it('applies correct indentation for depth 1 nodes', () => {
      render(<TreeView tasks={nestedTasks} />);
      const expandButton = screen.getByTestId('toggle-parent-1');
      fireEvent.click(expandButton);
      // Child node wrapper should have depth-1 data attribute
      const childNode = screen.getByTestId('tree-node-child-1');
      expect(childNode).toHaveAttribute('data-depth', '1');
    });
  });

  describe('checkbox / status toggle', () => {
    it('clicking checkbox toggles task status from pending to completed', () => {
      const onStatusChange = vi.fn();
      render(
        <TreeView
          tasks={flatTasks}
          onStatusChange={onStatusChange}
        />,
      );
      // TreeNode renders checkbox buttons — find by testid wrapper then query inside
      const node = screen.getByTestId('tree-node-task-1');
      // Buttons: [0]=hidden toggle testid, [1]=expand/collapse, [2]=checkbox
      const buttons = node.querySelectorAll('button');
      const checkbox = buttons[2];
      fireEvent.click(checkbox);
      expect(onStatusChange).toHaveBeenCalledWith('task-1', 'completed');
    });

    it('clicking checkbox on completed task toggles to pending', () => {
      const completedTasks = [
        makeTask({ id: 'task-1', title: 'Done Task', status: 'completed' }),
      ];
      const onStatusChange = vi.fn();
      render(
        <TreeView tasks={completedTasks} onStatusChange={onStatusChange} />,
      );
      const node = screen.getByTestId('tree-node-task-1');
      const buttons = node.querySelectorAll('button');
      const checkbox = buttons[2];
      fireEvent.click(checkbox);
      expect(onStatusChange).toHaveBeenCalledWith('task-1', 'pending');
    });
  });

  describe('context menu', () => {
    it('right-clicking a task triggers onContextMenu', () => {
      const onContextMenu = vi.fn();
      render(<TreeView tasks={flatTasks} onContextMenu={onContextMenu} />);
      const taskNode = screen.getByTestId('tree-node-task-1');
      fireEvent.contextMenu(taskNode);
      expect(onContextMenu).toHaveBeenCalledWith(
        expect.any(Object), // MouseEvent
        'task-1',
      );
    });
  });

  describe('progress bar', () => {
    it('shows progress bar on parent nodes', () => {
      render(<TreeView tasks={nestedTasks} />);
      // Parent node (has children) should show progress
      const parentNode = screen.getByTestId('tree-node-parent-1');
      expect(parentNode.querySelector('[role="progressbar"]')).toBeInTheDocument();
    });

    it('does not show progress bar on leaf nodes', () => {
      render(<TreeView tasks={flatTasks} />);
      // Flat tasks have no children, they are leaves
      const node = screen.getByTestId('tree-node-task-1');
      expect(node.querySelector('[role="progressbar"]')).not.toBeInTheDocument();
    });
  });

  describe('task selection', () => {
    it('clicking a task calls onSelect with task id', () => {
      const onSelect = vi.fn();
      render(<TreeView tasks={flatTasks} onSelect={onSelect} />);
      const taskNode = screen.getByTestId('tree-node-task-1');
      fireEvent.click(taskNode);
      expect(onSelect).toHaveBeenCalledWith('task-1');
    });
  });
});
