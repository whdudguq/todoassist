// @TASK P2-S3 - Context menu component
// @SPEC docs/planning/03-user-flow.md#task-tree
import { useEffect, useRef } from 'react';
import { cn } from '@renderer/lib/cn';
import type { Task } from '@shared/types';

export interface ContextMenuItem {
  label: string;
  onClick: () => void;
  variant?: 'default' | 'danger';
  icon?: React.ReactNode;
}

interface ContextMenuProps {
  x: number;
  y: number;
  task: Task | null;
  onClose: () => void;
  onEdit?: (task: Task) => void;
  onDelete?: (task: Task) => void;
  onAddSubtask?: (task: Task) => void;
  onQuickStart?: (task: Task) => void;
  onAiSplit?: (task: Task) => void;
}

export function ContextMenu({
  x,
  y,
  task,
  onClose,
  onEdit,
  onDelete,
  onAddSubtask,
  onQuickStart,
  onAiSplit,
}: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  if (!task) return null;

  const isDeferred = task.status === 'deferred';

  const items: ContextMenuItem[] = [
    {
      label: '수정',
      onClick: () => { onEdit?.(task); onClose(); },
    },
    {
      label: '하위 태스크 추가',
      onClick: () => { onAddSubtask?.(task); onClose(); },
    },
    {
      label: '2분만 시작',
      onClick: () => { onQuickStart?.(task); onClose(); },
    },
    ...(isDeferred
      ? [{
          label: 'AI로 쪼개기',
          onClick: () => { onAiSplit?.(task); onClose(); },
        }]
      : []),
    {
      label: '삭제',
      variant: 'danger' as const,
      onClick: () => { onDelete?.(task); onClose(); },
    },
  ];

  return (
    <div
      ref={menuRef}
      role="menu"
      className={cn(
        'fixed z-50',
        'bg-surface-0 rounded-lg',
        'border border-surface-200',
        'shadow-md',
        'py-1 min-w-[160px]',
        'animate-[scale-in_150ms_ease-out]',
      )}
      style={{ top: y, left: x }}
    >
      {items.map((item) => (
        <button
          key={item.label}
          role="menuitem"
          onClick={item.onClick}
          className={cn(
            'w-full text-left px-3 py-2',
            'text-sm transition-colors duration-100',
            'hover:bg-surface-50',
            item.variant === 'danger'
              ? 'text-danger-500 hover:bg-danger-50'
              : 'text-surface-700',
          )}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
