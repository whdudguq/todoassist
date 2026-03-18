// @TASK P2-S3 - TaskTree screen — replaces placeholder
// @SPEC docs/planning/03-user-flow.md#task-tree
// @TEST src/__tests__/screens/TaskTree.test.tsx
import { useState, useMemo, useCallback, useEffect } from 'react';
import { Search, Plus, BookmarkPlus, BookOpen } from 'lucide-react';
import { useTaskStore } from '@renderer/stores/taskStore';
import type { SortOption, TaskFilter } from '@renderer/stores/taskStore';
import type { Task, TaskStatus, Importance } from '@shared/types';
import { TreeView } from '@renderer/components/TreeView';
import { ContextMenu } from '@renderer/components/ContextMenu';
import { Button } from '@renderer/components/ui/button';
import { Card, CardContent } from '@renderer/components/ui/card';
import { cn } from '@renderer/lib/cn';
import { getApi } from '@renderer/hooks/useApi';
import { useUiStore } from '@renderer/stores/uiStore';

// ── Types ────────────────────────────────────────────────────────────────────

interface ContextMenuState {
  x: number;
  y: number;
  task: Task | null;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const STATUS_OPTIONS: { value: TaskStatus; label: string }[] = [
  { value: 'pending', label: '대기중' },
  { value: 'in_progress', label: '진행중' },
  { value: 'completed', label: '완료' },
  { value: 'deferred', label: '미룸' },
];

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'createdAt', label: '생성일' },
  { value: 'deadline', label: '마감일' },
  { value: 'importance', label: '중요도' },
  { value: 'progress', label: '진행률' },
];

const IMPORTANCE_OPTIONS: { value: Importance; label: string }[] = [
  { value: 5, label: '★★★★★' },
  { value: 4, label: '★★★★' },
  { value: 3, label: '★★★' },
  { value: 2, label: '★★' },
  { value: 1, label: '★' },
];

const CATEGORY_OPTIONS = [
  { value: '', label: '전체 카테고리' },
  { value: 'quality', label: '품질' },
  { value: 'report', label: '보고서' },
  { value: 'meeting', label: '회의' },
  { value: 'email', label: '이메일' },
  { value: 'other', label: '기타' },
];

// ── Helpers ──────────────────────────────────────────────────────────────────

function applyFilter(tasks: Task[], filter: TaskFilter, searchQuery: string): Task[] {
  let result = tasks;

  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase();
    result = result.filter((t) => t.title.toLowerCase().includes(q));
  }

  if (filter.status && filter.status.length > 0) {
    result = result.filter((t) => filter.status!.includes(t.status));
  }

  if (filter.importance && filter.importance.length > 0) {
    result = result.filter((t) => filter.importance!.includes(t.importance));
  }

  if (filter.category) {
    result = result.filter((t) => t.category === filter.category);
  }

  return result;
}

function applySort(tasks: Task[], sortBy: SortOption): Task[] {
  return [...tasks].sort((a, b) => {
    switch (sortBy) {
      case 'deadline':
        if (a.deadline === null && b.deadline === null) return 0;
        if (a.deadline === null) return 1;
        if (b.deadline === null) return -1;
        return a.deadline - b.deadline;
      case 'importance':
        return b.importance - a.importance;
      case 'progress':
        return b.progress - a.progress;
      case 'createdAt':
      default:
        return b.createdAt - a.createdAt;
    }
  });
}

// ── Component ─────────────────────────────────────────────────────────────────

export function TaskTree() {
  const { tasks, filter, sortBy, searchQuery, updateTask, deleteTask, setFilter, setSortBy, setSearchQuery } =
    useTaskStore();

  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);

  // ── IPC: load tasks and categories on mount ──────────────────────────────
  useEffect(() => {
    const api = getApi();
    if (!api) return;

    api.tasks.getAll().then((tasks) => {
      useTaskStore.getState().setTasks(tasks as Task[]);
    }).catch(console.error);
  }, []);

  // Derived: filtered + sorted tasks
  const visibleTasks = useMemo(() => {
    const filtered = applyFilter(tasks, filter, searchQuery);
    return applySort(filtered, sortBy);
  }, [tasks, filter, sortBy, searchQuery]);

  // ── Handlers ────────────────────────────────────────────────────────────────

  const handleStatusChange = useCallback(
    (taskId: string, status: TaskStatus) => {
      const updates = { status, ...(status === 'completed' ? { completedAt: Date.now(), progress: 100 } : {}) };
      // Optimistic update in store
      updateTask(taskId, updates);
      // Persist via IPC
      const api = getApi();
      if (api) {
        api.tasks.update(taskId, updates).catch(console.error);
      }
    },
    [updateTask],
  );

  const handleSelect = useCallback(
    (taskId: string) => {
      useTaskStore.getState().setSelectedTask(taskId);
    },
    [],
  );

  const handleContextMenu = useCallback(
    (e: React.MouseEvent, taskId: string) => {
      e.preventDefault();
      const task = tasks.find((t) => t.id === taskId) ?? null;
      setContextMenu({ x: e.clientX, y: e.clientY, task });
    },
    [tasks],
  );

  const handleCloseContextMenu = useCallback(() => setContextMenu(null), []);

  const handleDelete = useCallback(
    (task: Task) => {
      // Optimistic delete in store
      deleteTask(task.id);
      // Persist via IPC
      const api = getApi();
      if (api) {
        api.tasks.delete(task.id).catch(console.error);
      }
    },
    [deleteTask],
  );

  const handleStatusFilterToggle = useCallback(
    (status: TaskStatus) => {
      const current = filter.status ?? [];
      const next = current.includes(status)
        ? current.filter((s) => s !== status)
        : [...current, status];
      setFilter({ status: next.length > 0 ? next : undefined });
    },
    [filter.status, setFilter],
  );

  const handleImportanceChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const val = e.target.value;
      setFilter({ importance: val ? [Number(val) as Importance] : undefined });
    },
    [setFilter],
  );

  const handleCategoryChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      setFilter({ category: e.target.value || undefined });
    },
    [setFilter],
  );

  const handleSortChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      setSortBy(e.target.value as SortOption);
    },
    [setSortBy],
  );

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setSearchQuery(e.target.value);
    },
    [setSearchQuery],
  );

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full bg-surface-50">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 bg-surface-0 border-b border-surface-200">
        <h1 className="text-lg font-semibold text-surface-900">Task Tree</h1>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={() => alert('템플릿 저장은 Electron 앱에서 사용 가능합니다.')}>
            <BookmarkPlus size={14} />
            Save as Template
          </Button>
          <Button variant="secondary" size="sm" onClick={() => alert('템플릿 불러오기는 Electron 앱에서 사용 가능합니다.')}>
            <BookOpen size={14} />
            Load Template
          </Button>
          <Button variant="primary" size="sm" onClick={() => useUiStore.getState().openModal('taskModal')}>
            <Plus size={14} />
            Add Task
          </Button>
        </div>
      </div>

      {/* Filter bar */}
      <div className="px-4 pt-3 pb-0" data-testid="filter-bar">
        <Card>
          <CardContent className="py-3">
            <div className="flex flex-wrap items-center gap-3">
              {/* Search */}
              <div className="relative flex-1 min-w-[180px]">
                <Search
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400 pointer-events-none"
                />
                <input
                  type="text"
                  placeholder="Search tasks..."
                  value={searchQuery}
                  onChange={handleSearchChange}
                  className={cn(
                    'w-full pl-9 pr-3 h-8 text-sm',
                    'bg-surface-50 border border-surface-200 rounded-lg',
                    'text-surface-800 placeholder:text-surface-400',
                    'focus:outline-none focus:border-accent-400 focus:bg-surface-0',
                    'transition-colors duration-150',
                  )}
                />
              </div>

              {/* Category filter */}
              <select
                data-testid="filter-category"
                value={filter.category ?? ''}
                onChange={handleCategoryChange}
                className={cn(
                  'h-8 px-2 text-sm rounded-lg',
                  'bg-surface-50 border border-surface-200',
                  'text-surface-700',
                  'focus:outline-none focus:border-accent-400',
                )}
              >
                {CATEGORY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>

              {/* Importance filter */}
              <select
                data-testid="filter-importance"
                onChange={handleImportanceChange}
                className={cn(
                  'h-8 px-2 text-sm rounded-lg',
                  'bg-surface-50 border border-surface-200',
                  'text-surface-700',
                  'focus:outline-none focus:border-accent-400',
                )}
              >
                <option value="">모든 중요도</option>
                {IMPORTANCE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>

              {/* Sort */}
              <select
                data-testid="sort-select"
                value={sortBy}
                onChange={handleSortChange}
                className={cn(
                  'h-8 px-2 text-sm rounded-lg',
                  'bg-surface-50 border border-surface-200',
                  'text-surface-700',
                  'focus:outline-none focus:border-accent-400',
                )}
              >
                {SORT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Status filter chips */}
            <div className="flex items-center gap-2 mt-2" data-testid="filter-status">
              <span className="text-xs text-surface-500 mr-1">상태:</span>
              {STATUS_OPTIONS.map((s) => {
                const isActive = (filter.status ?? []).includes(s.value);
                return (
                  <button
                    key={s.value}
                    data-testid={`status-filter-${s.value}`}
                    onClick={() => handleStatusFilterToggle(s.value)}
                    className={cn(
                      'px-2.5 py-0.5 rounded-full text-xs font-medium',
                      'border transition-all duration-150',
                      isActive
                        ? 'bg-accent-500 border-accent-500 text-surface-0'
                        : 'bg-surface-50 border-surface-200 text-surface-600 hover:border-accent-300',
                    )}
                  >
                    {s.label}
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tree view */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        <TreeView
          tasks={visibleTasks}
          onStatusChange={handleStatusChange}
          onSelect={handleSelect}
          onContextMenu={handleContextMenu}
        />
      </div>

      {/* Context menu */}
      {contextMenu && contextMenu.task && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          task={contextMenu.task}
          onClose={handleCloseContextMenu}
          onDelete={handleDelete}
          onQuickStart={(task) => {
            updateTask(task.id, { status: 'in_progress' });
            const api = getApi();
            if (api) api.tasks.update(task.id, { status: 'in_progress' }).catch(console.error);
          }}
          onEdit={() => {
            useUiStore.getState().openModal('taskModal');
          }}
          onAddSubtask={() => {
            useUiStore.getState().openModal('taskModal');
          }}
        />
      )}
    </div>
  );
}
