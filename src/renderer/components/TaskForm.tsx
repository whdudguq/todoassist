// @TASK P2-S4 - 태스크 등록/수정 폼 컴포넌트
// @SPEC docs/planning/03-user-flow.md#태스크-등록수정-모달
import React, { useState, useEffect, useId } from 'react';
import { cn } from '@renderer/lib/cn';
import { Button } from '@renderer/components/ui/button';
import type { Task, Category, Importance } from '@shared/types';

// ── Types ────────────────────────────────────────────────────
export interface TaskFormData {
  title: string;
  description: string;
  deadline: number | null;
  estimatedMinutes: number;
  importance: number;
  category: string;
  parentId: string | null;
  subtasks: Array<{ title: string }>;
}

export interface TaskFormProps {
  task?: Task;
  categories: Category[];
  tasks: Task[];
  onSubmit: (data: TaskFormData) => void;
  onCancel: () => void;
  onAiEstimate?: (
    title: string,
    description?: string,
  ) => Promise<{
    estimatedMinutes: number;
    importance: number;
    category: string;
  }>;
}

// ── 날짜 유틸 ────────────────────────────────────────────────
function timestampToDateValue(ts: number | null): string {
  if (!ts) return '';
  return new Date(ts).toISOString().slice(0, 10);
}

function dateValueToTimestamp(val: string): number | null {
  if (!val) return null;
  return new Date(val).getTime();
}

// ── SubtaskItem ───────────────────────────────────────────────
interface SubtaskItemProps {
  value: string;
  onChange: (val: string) => void;
  onDelete: () => void;
}

function SubtaskItem({ value, onChange, onDelete }: SubtaskItemProps) {
  return (
    <div className="flex items-center gap-2">
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="서브태스크 제목"
        className={cn(
          'flex-1 h-8 px-3 text-sm rounded-md',
          'border border-surface-200 bg-surface-50',
          'focus:outline-none focus:ring-1 focus:ring-accent-400',
        )}
      />
      <button
        type="button"
        onClick={onDelete}
        aria-label="삭제"
        className={cn(
          'h-8 w-8 flex items-center justify-center rounded-md text-sm',
          'text-surface-500 hover:text-danger-500 hover:bg-danger-50',
          'transition-colors duration-150',
        )}
      >
        ×
      </button>
    </div>
  );
}

// ── ImportanceSelector ────────────────────────────────────────
interface ImportanceSelectorProps {
  value: number;
  onChange: (val: number) => void;
}

function ImportanceSelector({ value, onChange }: ImportanceSelectorProps) {
  return (
    <div className="flex gap-2">
      {([1, 2, 3, 4, 5] as const).map((level) => {
        const selected = value === level;
        return (
          <button
            key={level}
            type="button"
            role="button"
            aria-label={`중요도 ${level}`}
            data-selected={selected ? 'true' : 'false'}
            onClick={() => onChange(level)}
            className={cn(
              'h-8 w-8 rounded-full border-2 transition-all duration-150',
              'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-400',
              selected
                ? 'bg-accent-500 border-accent-500'
                : 'bg-surface-0 border-surface-200 hover:border-accent-300',
            )}
          />
        );
      })}
    </div>
  );
}

// ── TaskForm ──────────────────────────────────────────────────
export function TaskForm({
  task,
  categories,
  tasks,
  onSubmit,
  onCancel,
  onAiEstimate,
}: TaskFormProps) {
  const uid = useId();

  // ── 폼 상태 ────────────────────────────────────────────────
  const [title, setTitle] = useState(task?.title ?? '');
  const [description, setDescription] = useState(task?.description ?? '');
  const [deadlineValue, setDeadlineValue] = useState(
    timestampToDateValue(task?.deadline ?? null),
  );
  const [estimatedMinutes, setEstimatedMinutes] = useState(
    task?.estimatedMinutes ?? 60,
  );
  const [importance, setImportance] = useState<number>(task?.importance ?? 3);
  const [category, setCategory] = useState(task?.category ?? '');
  const [parentId, setParentId] = useState<string | null>(task?.parentId ?? null);
  const [subtasks, setSubtasks] = useState<Array<{ title: string }>>([]);

  // ── AI 상태 ────────────────────────────────────────────────
  const [aiLoading, setAiLoading] = useState(false);

  // ── 에러 상태 ──────────────────────────────────────────────
  const [errors, setErrors] = useState<Partial<Record<string, string>>>({});

  // edit 모드 초기화
  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description);
      setDeadlineValue(timestampToDateValue(task.deadline));
      setEstimatedMinutes(task.estimatedMinutes);
      setImportance(task.importance);
      setCategory(task.category);
      setParentId(task.parentId);
    }
  }, [task]);

  // ── AI 추정 ────────────────────────────────────────────────
  const showAiButton = !!onAiEstimate && title.length >= 5;

  async function handleAiEstimate() {
    if (!onAiEstimate) return;
    setAiLoading(true);
    try {
      const result = await onAiEstimate(title, description || undefined);
      setEstimatedMinutes(result.estimatedMinutes);
      setImportance(result.importance);
      setCategory(result.category);
    } finally {
      setAiLoading(false);
    }
  }

  // ── 서브태스크 ─────────────────────────────────────────────
  function addSubtask() {
    setSubtasks((prev) => [...prev, { title: '' }]);
  }

  function updateSubtask(index: number, value: string) {
    setSubtasks((prev) =>
      prev.map((s, i) => (i === index ? { title: value } : s)),
    );
  }

  function deleteSubtask(index: number) {
    setSubtasks((prev) => prev.filter((_, i) => i !== index));
  }

  // ── 유효성 검사 ────────────────────────────────────────────
  function validate(): boolean {
    const next: Partial<Record<string, string>> = {};

    if (!title.trim()) {
      next.title = '제목은 필수 입력입니다.';
    }

    if (deadlineValue) {
      const ts = dateValueToTimestamp(deadlineValue);
      if (ts !== null && ts < Date.now()) {
        next.deadline = '마감일은 미래 날짜여야 합니다.';
      }
    }

    if (estimatedMinutes < 15) {
      next.estimatedMinutes = '예상 소요 시간은 최소 15분이어야 합니다.';
    }

    if (estimatedMinutes > 240) {
      next.estimatedMinutes = '예상 소요 시간은 최대 240분이어야 합니다.';
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  }

  // ── Submit ─────────────────────────────────────────────────
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    onSubmit({
      title: title.trim(),
      description,
      deadline: dateValueToTimestamp(deadlineValue),
      estimatedMinutes,
      importance,
      category,
      parentId,
      subtasks,
    });
  }

  // ── parent 목록: 자기 자신 제외 ────────────────────────────
  const parentOptions = task ? tasks.filter((t) => t.id !== task.id) : tasks;

  // ── Render ─────────────────────────────────────────────────
  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
      {/* 제목 */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <label htmlFor={`${uid}-title`} className="text-sm font-medium text-surface-700">
            제목 <span className="text-danger-500">*</span>
          </label>
          {showAiButton && (
            <button
              type="button"
              onClick={handleAiEstimate}
              disabled={aiLoading}
              aria-label="AI 추정"
              className={cn(
                'inline-flex items-center gap-1 px-2 py-0.5 rounded-md',
                'text-xs font-medium',
                'bg-accent-100 text-accent-800',
                'hover:bg-accent-200 transition-colors duration-150',
                'disabled:opacity-50 disabled:pointer-events-none',
              )}
            >
              {aiLoading ? '추정 중...' : 'AI 추정'}
            </button>
          )}
        </div>
        <input
          id={`${uid}-title`}
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="태스크 제목을 입력하세요"
          className={cn(
            'h-9 px-3 text-sm rounded-lg',
            'border border-surface-200 bg-surface-0',
            'focus:outline-none focus:ring-1 focus:ring-accent-400',
            errors.title && 'border-danger-500',
          )}
        />
        {errors.title && (
          <span className="text-xs text-danger-500">{errors.title}</span>
        )}
      </div>

      {/* 설명 */}
      <div className="flex flex-col gap-1">
        <label htmlFor={`${uid}-description`} className="text-sm font-medium text-surface-700">
          설명
        </label>
        <textarea
          id={`${uid}-description`}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          placeholder="태스크에 대한 설명을 입력하세요"
          className={cn(
            'px-3 py-2 text-sm rounded-lg resize-none',
            'border border-surface-200 bg-surface-0',
            'focus:outline-none focus:ring-1 focus:ring-accent-400',
          )}
        />
      </div>

      {/* 마감일 + 예상 소요 */}
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <label htmlFor={`${uid}-deadline`} className="text-sm font-medium text-surface-700">
            마감일
          </label>
          <input
            id={`${uid}-deadline`}
            type="date"
            value={deadlineValue}
            onChange={(e) => setDeadlineValue(e.target.value)}
            className={cn(
              'h-9 px-3 text-sm rounded-lg',
              'border border-surface-200 bg-surface-0',
              'focus:outline-none focus:ring-1 focus:ring-accent-400',
              errors.deadline && 'border-danger-500',
            )}
          />
          {errors.deadline && (
            <span className="text-xs text-danger-500">{errors.deadline}</span>
          )}
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor={`${uid}-estimatedMinutes`} className="text-sm font-medium text-surface-700">
            예상 소요 (분)
          </label>
          <input
            id={`${uid}-estimatedMinutes`}
            type="number"
            min={15}
            max={240}
            value={estimatedMinutes}
            onChange={(e) => setEstimatedMinutes(Number(e.target.value))}
            className={cn(
              'h-9 px-3 text-sm rounded-lg',
              'border border-surface-200 bg-surface-0',
              'focus:outline-none focus:ring-1 focus:ring-accent-400',
              errors.estimatedMinutes && 'border-danger-500',
            )}
          />
          {errors.estimatedMinutes && (
            <span className="text-xs text-danger-500">{errors.estimatedMinutes}</span>
          )}
        </div>
      </div>

      {/* 중요도 */}
      <div className="flex flex-col gap-1">
        <span className="text-sm font-medium text-surface-700">중요도</span>
        <ImportanceSelector value={importance} onChange={setImportance} />
      </div>

      {/* 카테고리 */}
      <div className="flex flex-col gap-1">
        <label htmlFor={`${uid}-category`} className="text-sm font-medium text-surface-700">
          카테고리
        </label>
        <select
          id={`${uid}-category`}
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className={cn(
            'h-9 px-3 text-sm rounded-lg',
            'border border-surface-200 bg-surface-0',
            'focus:outline-none focus:ring-1 focus:ring-accent-400',
          )}
        >
          <option value="">카테고리 선택</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.name}>
              {cat.name}
            </option>
          ))}
        </select>
      </div>

      {/* 상위 태스크 */}
      <div className="flex flex-col gap-1">
        <label htmlFor={`${uid}-parentId`} className="text-sm font-medium text-surface-700">
          상위 태스크
        </label>
        <select
          id={`${uid}-parentId`}
          value={parentId ?? ''}
          onChange={(e) => setParentId(e.target.value || null)}
          className={cn(
            'h-9 px-3 text-sm rounded-lg',
            'border border-surface-200 bg-surface-0',
            'focus:outline-none focus:ring-1 focus:ring-accent-400',
          )}
        >
          <option value="">없음 (최상위)</option>
          {parentOptions.map((t) => (
            <option key={t.id} value={t.id}>
              {t.title}
            </option>
          ))}
        </select>
      </div>

      {/* 서브태스크 */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-surface-700">서브태스크</span>
          <button
            type="button"
            onClick={addSubtask}
            aria-label="서브태스크 추가"
            className={cn(
              'inline-flex items-center gap-1 h-7 px-2 rounded-md',
              'text-xs font-medium',
              'text-surface-600 hover:text-accent-700 hover:bg-accent-50',
              'border border-surface-200 hover:border-accent-300',
              'transition-colors duration-150',
            )}
          >
            + 서브태스크 추가
          </button>
        </div>
        {subtasks.length > 0 && (
          <div className="flex flex-col gap-2">
            {subtasks.map((sub, idx) => (
              <SubtaskItem
                key={idx}
                value={sub.title}
                onChange={(val) => updateSubtask(idx, val)}
                onDelete={() => deleteSubtask(idx)}
              />
            ))}
          </div>
        )}
      </div>

      {/* 버튼 영역 */}
      <div className="flex justify-end gap-2 pt-2 border-t border-surface-100">
        <Button type="button" variant="secondary" size="sm" onClick={onCancel}>
          취소
        </Button>
        <Button type="submit" variant="primary" size="sm">
          {task ? '저장' : '등록'}
        </Button>
      </div>
    </form>
  );
}
