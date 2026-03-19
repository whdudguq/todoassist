// @TASK P2-S4 - 태스크 등록/수정 모달
// @SPEC docs/planning/03-user-flow.md#태스크-등록수정-모달
import React, { useEffect } from 'react';
import { cn } from '@renderer/lib/cn';
import { useUiStore } from '@renderer/stores/uiStore';
import { useTaskStore } from '@renderer/stores/taskStore';
import { TaskForm, type TaskFormData } from '@renderer/components/TaskForm';
import type { Task, Category } from '@shared/types';

interface TaskModalProps {
  /** edit 모드일 때 전달 */
  task?: Task;
  categories: Category[];
  onSubmit: (data: TaskFormData) => void;
  onAiEstimate?: (
    title: string,
    description?: string,
  ) => Promise<{
    estimatedMinutes: number;
    importance: number;
    category: string;
  }>;
}

export function TaskModal({ task, categories, onSubmit, onAiEstimate }: TaskModalProps) {
  const modalOpen = useUiStore((s) => s.modalOpen);
  const { tasks } = useTaskStore();

  const isOpen = modalOpen === 'taskModal';

  function close() {
    useTaskStore.getState().setSelectedTask(null);
    useUiStore.getState().closeModal();
  }

  // Escape 키로 닫기
  useEffect(() => {
    if (!isOpen) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') close();
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen]);

  if (!isOpen) return null;

  function handleSubmit(data: TaskFormData) {
    onSubmit(data);
    close();
  }

  return (
    // backdrop
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="task-modal-title"
      className={cn(
        'fixed inset-0 z-50',
        'flex items-center justify-center',
        'bg-surface-950/60 backdrop-blur-sm',
        'animate-in fade-in duration-150',
      )}
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      {/* 모달 패널 */}
      <div
        className={cn(
          'w-full max-w-[480px] mx-4',
          'bg-surface-0 rounded-2xl shadow-xl',
          'border border-surface-200/60',
          'animate-in zoom-in-95 duration-150',
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-surface-100">
          <h2
            id="task-modal-title"
            className="text-base font-semibold text-surface-900"
          >
            {task ? '태스크 수정' : '새 태스크'}
          </h2>
          <button
            type="button"
            onClick={close}
            aria-label="닫기"
            className={cn(
              'h-7 w-7 flex items-center justify-center rounded-lg',
              'text-surface-400 hover:text-surface-700 hover:bg-surface-100',
              'transition-colors duration-150',
            )}
          >
            ×
          </button>
        </div>

        {/* 폼 */}
        <div className="px-5 py-4 overflow-y-auto max-h-[calc(100vh-8rem)]">
          <TaskForm
            task={task}
            categories={categories}
            tasks={tasks}
            onSubmit={handleSubmit}
            onCancel={close}
            onAiEstimate={onAiEstimate}
          />
        </div>
      </div>
    </div>
  );
}
