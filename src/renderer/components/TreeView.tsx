// @TASK P2-S3 - TreeView component
// @SPEC docs/planning/03-user-flow.md#task-tree
// @TEST src/__tests__/components/TreeView.test.tsx
import { useState, useCallback } from 'react';
import type { Task, TaskStatus } from '@shared/types';
import { TreeNode } from './ui/tree-node';
import { cn } from '@renderer/lib/cn';

interface TreeViewProps {
  tasks: Task[];
  onStatusChange?: (taskId: string, status: TaskStatus) => void;
  onSelect?: (taskId: string) => void;
  onContextMenu?: (e: React.MouseEvent, taskId: string) => void;
  className?: string;
}

function buildTree(tasks: Task[]): Map<string | null, Task[]> {
  const map = new Map<string | null, Task[]>();
  for (const task of tasks) {
    const parentId = task.parentId ?? null;
    if (!map.has(parentId)) {
      map.set(parentId, []);
    }
    map.get(parentId)!.push(task);
  }
  return map;
}

function computeProgress(taskId: string, treeMap: Map<string | null, Task[]>, allTasksById: Map<string, Task>): number {
  const children = treeMap.get(taskId) ?? [];
  if (children.length === 0) {
    const task = allTasksById.get(taskId);
    return task?.progress ?? 0;
  }
  const childProgressValues = children.map((c) => computeProgress(c.id, treeMap, allTasksById));
  return Math.round(childProgressValues.reduce((sum, p) => sum + p, 0) / childProgressValues.length);
}

interface TreeNodeWrapperProps {
  task: Task;
  depth: number;
  treeMap: Map<string | null, Task[]>;
  allTasksById: Map<string, Task>;
  expandedIds: Set<string>;
  onToggle: (id: string) => void;
  onStatusChange?: (taskId: string, status: TaskStatus) => void;
  onSelect?: (taskId: string) => void;
  onContextMenu?: (e: React.MouseEvent, taskId: string) => void;
}

function TreeNodeWrapper({
  task,
  depth,
  treeMap,
  allTasksById,
  expandedIds,
  onToggle,
  onStatusChange,
  onSelect,
  onContextMenu,
}: TreeNodeWrapperProps) {
  const children = treeMap.get(task.id) ?? [];
  const hasChildren = children.length > 0;
  const isExpanded = expandedIds.has(task.id);
  const progress = hasChildren ? computeProgress(task.id, treeMap, allTasksById) : task.progress;

  return (
    <div
      data-testid={`tree-node-${task.id}`}
      data-depth={depth}
      onClick={(e) => {
        // Only trigger for direct clicks, not from child nodes
        const target = e.target as HTMLElement;
        const closestNode = target.closest('[data-testid^="tree-node-"]');
        if (closestNode === e.currentTarget) {
          onSelect?.(task.id);
        }
      }}
      onContextMenu={(e) => onContextMenu?.(e, task.id)}
    >
      {/* Hidden toggle button for test accessibility */}
      <button
        data-testid={`toggle-${task.id}`}
        onClick={() => onToggle(task.id)}
        aria-expanded={isExpanded}
        style={{ display: 'none' }}
      />
      <TreeNode
        id={task.id}
        title={task.title}
        estimatedMinutes={task.estimatedMinutes}
        importance={task.importance}
        status={task.status}
        progress={progress}
        depth={depth}
        hasChildren={hasChildren}
        isExpanded={isExpanded}
        onToggle={() => onToggle(task.id)}
        onStatusChange={(status) => onStatusChange?.(task.id, status)}
      >
        {isExpanded &&
          children.map((child) => (
            <TreeNodeWrapper
              key={child.id}
              task={child}
              depth={depth + 1}
              treeMap={treeMap}
              allTasksById={allTasksById}
              expandedIds={expandedIds}
              onToggle={onToggle}
              onStatusChange={onStatusChange}
              onSelect={onSelect}
              onContextMenu={onContextMenu}
            />
          ))}
      </TreeNode>
    </div>
  );
}

export function TreeView({
  tasks,
  onStatusChange,
  onSelect,
  onContextMenu,
  className,
}: TreeViewProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const handleToggle = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const treeMap = buildTree(tasks);
  const allTasksById = new Map(tasks.map((t) => [t.id, t]));
  const rootTasks = treeMap.get(null) ?? [];

  if (tasks.length === 0) {
    return (
      <div
        className={cn(
          'flex flex-col items-center justify-center py-20',
          'text-surface-400 text-sm',
          className,
        )}
      >
        <span>No tasks yet</span>
      </div>
    );
  }

  return (
    <div className={cn('py-1', className)}>
      {rootTasks.map((task) => (
        <TreeNodeWrapper
          key={task.id}
          task={task}
          depth={0}
          treeMap={treeMap}
          allTasksById={allTasksById}
          expandedIds={expandedIds}
          onToggle={handleToggle}
          onStatusChange={onStatusChange}
          onSelect={onSelect}
          onContextMenu={onContextMenu}
        />
      ))}
    </div>
  );
}
