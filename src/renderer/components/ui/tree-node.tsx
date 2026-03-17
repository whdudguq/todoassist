import { useState } from 'react';
import { ChevronRight, Check, GripVertical } from 'lucide-react';
import { cn } from '@renderer/lib/cn';
import { ProgressBar } from './progress-bar';
import type { TaskStatus } from '@shared/types';

interface TreeNodeProps {
  id: string;
  title: string;
  estimatedMinutes: number;
  importance: number;
  status: TaskStatus;
  progress: number;
  depth: number;
  hasChildren: boolean;
  isExpanded?: boolean;
  onToggle?: () => void;
  onStatusChange?: (status: TaskStatus) => void;
  onContextMenu?: (e: React.MouseEvent) => void;
  children?: React.ReactNode;
}

export function TreeNode({
  title,
  estimatedMinutes,
  importance,
  status,
  progress,
  depth,
  hasChildren,
  isExpanded = false,
  onToggle,
  onStatusChange,
  onContextMenu,
  children,
}: TreeNodeProps) {
  const [isHovered, setIsHovered] = useState(false);
  const isCompleted = status === 'completed';
  const isLeaf = !hasChildren;

  return (
    <div>
      <div
        className={cn(
          'group flex items-center gap-2 py-1.5 px-2',
          'rounded-lg cursor-pointer',
          'transition-colors duration-100',
          'hover:bg-surface-50',
        )}
        style={{ paddingLeft: `${depth * 20 + 8}px` }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onContextMenu={onContextMenu}
      >
        {/* Drag handle */}
        <GripVertical
          size={14}
          className={cn(
            'flex-shrink-0 text-surface-300',
            'opacity-0 group-hover:opacity-100 transition-opacity',
          )}
        />

        {/* Expand/Collapse */}
        <button
          onClick={onToggle}
          className={cn(
            'flex-shrink-0 w-5 h-5 flex items-center justify-center',
            'text-surface-400 rounded',
            hasChildren ? 'hover:bg-surface-200' : 'pointer-events-none',
          )}
        >
          {hasChildren ? (
            <ChevronRight
              size={14}
              strokeWidth={2}
              className={cn(
                'transition-transform duration-150',
                isExpanded && 'rotate-90',
              )}
            />
          ) : (
            <span className="w-1 h-1 rounded-full bg-surface-300" />
          )}
        </button>

        {/* Checkbox */}
        <button
          onClick={() =>
            onStatusChange?.(isCompleted ? 'pending' : 'completed')
          }
          className={cn(
            'flex-shrink-0 w-4 h-4 rounded border',
            'flex items-center justify-center',
            'transition-all duration-150',
            isCompleted
              ? 'bg-success-500 border-success-500 text-surface-0'
              : 'border-surface-300 hover:border-accent-400',
          )}
        >
          {isCompleted && <Check size={10} strokeWidth={3} />}
        </button>

        {/* Title */}
        <span
          className={cn(
            'flex-1 text-sm truncate',
            isCompleted
              ? 'line-through text-surface-400'
              : 'text-surface-800',
          )}
        >
          {title}
        </span>

        {/* Meta — visible on hover */}
        <span
          className={cn(
            'text-[11px] text-surface-400 tabular-nums font-mono',
            'opacity-0 group-hover:opacity-100 transition-opacity',
          )}
        >
          {estimatedMinutes}m
        </span>

        {/* Importance dots */}
        <div className="flex gap-px flex-shrink-0">
          {Array.from({ length: 5 }, (_, i) => (
            <div
              key={i}
              className={cn(
                'w-1 h-1 rounded-full',
                i < importance ? 'bg-accent-400' : 'bg-surface-200',
              )}
            />
          ))}
        </div>

        {/* Progress for parent nodes */}
        {!isLeaf && (
          <div className="w-14 flex-shrink-0">
            <ProgressBar value={progress} size="sm" />
          </div>
        )}
      </div>

      {/* Children */}
      {isExpanded && hasChildren && (
        <div className="relative">
          {/* Vertical connector line */}
          <div
            className="absolute top-0 bottom-0 w-px bg-surface-200"
            style={{ left: `${depth * 20 + 23}px` }}
          />
          {children}
        </div>
      )}
    </div>
  );
}
