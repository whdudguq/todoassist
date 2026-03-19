// MonthCalendar — 월간 캘린더: 마감일 핀 + 수행일 드래그앤드롭 배치
import { useEffect, useMemo, useState, useCallback, type DragEvent } from 'react';
import { ChevronLeft, ChevronRight, ChevronDown, ChevronUp, GripVertical, Pin, Calendar } from 'lucide-react';
import { cn } from '@renderer/lib/cn';
import { Button } from '@renderer/components/ui/button';
import { useTaskStore } from '@renderer/stores/taskStore';
import { getApi } from '@renderer/hooks/useApi';
import type { Task } from '@shared/types';

const DAY_LABELS = ['월', '화', '수', '목', '금', '토', '일'];

const STATUS_DOT: Record<string, string> = {
  pending: 'bg-surface-400',
  in_progress: 'bg-warning-500',
  completed: 'bg-success-500',
  deferred: 'bg-surface-300',
};

function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function dateToTimestamp(dateStr: string): number {
  return new Date(dateStr + 'T23:59:59').getTime();
}

function getMonthDays(year: number, month: number) {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  let startDow = firstDay.getDay() - 1;
  if (startDow < 0) startDow = 6;

  const days: Array<{ date: string; day: number; isCurrentMonth: boolean }> = [];
  for (let i = startDow - 1; i >= 0; i--) {
    const d = new Date(year, month, -i);
    days.push({ date: toDateStr(d), day: d.getDate(), isCurrentMonth: false });
  }
  for (let d = 1; d <= lastDay.getDate(); d++) {
    days.push({ date: toDateStr(new Date(year, month, d)), day: d, isCurrentMonth: true });
  }
  while (days.length < 42) {
    const d = new Date(year, month + 1, days.length - startDow - lastDay.getDate() + 1);
    days.push({ date: toDateStr(d), day: d.getDate(), isCurrentMonth: false });
  }
  return days;
}

function isLeafTask(task: Task, allTasks: Task[]): boolean {
  return !allTasks.some((t) => t.parentId === task.id);
}

function getChildren(parentId: string, allTasks: Task[]): Task[] {
  return allTasks.filter((t) => t.parentId === parentId);
}

function getParentTasks(allTasks: Task[]): Task[] {
  return allTasks.filter((t) => t.parentId === null && allTasks.some((c) => c.parentId === t.id));
}

// ── 캘린더 날짜별 항목 타입 ──
interface CalendarEntry {
  task: Task;
  type: 'deadline' | 'scheduled';
}

export function MonthCalendar() {
  const tasks = useTaskStore((s) => s.tasks);
  const [currentYear, setCurrentYear] = useState(() => new Date().getFullYear());
  const [currentMonth, setCurrentMonth] = useState(() => new Date().getMonth());
  const [dropTarget, setDropTarget] = useState<string | null>(null);
  const [expandedParents, setExpandedParents] = useState<Set<string>>(new Set());

  const todayStr = toDateStr(new Date());

  // date -> CalendarEntry[] 맵 (마감일 핀 + 수행일)
  const dateEntryMap = useMemo(() => {
    const map = new Map<string, CalendarEntry[]>();

    function addEntry(dateStr: string, entry: CalendarEntry) {
      const existing = map.get(dateStr) ?? [];
      // 같은 태스크+타입 중복 방지
      if (!existing.some((e) => e.task.id === entry.task.id && e.type === entry.type)) {
        map.set(dateStr, [...existing, entry]);
      }
    }

    for (const task of tasks) {
      if (!isLeafTask(task, tasks)) continue;

      // 마감일 → 핀
      if (task.deadline) {
        addEntry(toDateStr(new Date(task.deadline)), { task, type: 'deadline' });
      }
      // 수행 예정일 → 배치
      if (task.scheduledDate) {
        addEntry(toDateStr(new Date(task.scheduledDate)), { task, type: 'scheduled' });
      }
    }

    return map;
  }, [tasks]);

  // 미배치: 수행일 없는 리프 태스크 (완료 제외)
  const unscheduledLeaves = useMemo(
    () => tasks.filter((t) => isLeafTask(t, tasks) && !t.scheduledDate && t.status !== 'completed'),
    [tasks],
  );
  const parentTasks = useMemo(() => getParentTasks(tasks), [tasks]);

  const days = useMemo(() => getMonthDays(currentYear, currentMonth), [currentYear, currentMonth]);

  // ── Navigation ──
  function handlePrev() {
    if (currentMonth === 0) { setCurrentYear((y) => y - 1); setCurrentMonth(11); }
    else setCurrentMonth((m) => m - 1);
  }
  function handleNext() {
    if (currentMonth === 11) { setCurrentYear((y) => y + 1); setCurrentMonth(0); }
    else setCurrentMonth((m) => m + 1);
  }
  function handleToday() {
    const now = new Date();
    setCurrentYear(now.getFullYear());
    setCurrentMonth(now.getMonth());
  }

  // ── Drag & Drop → scheduledDate 설정 ──
  const handleDragStart = useCallback((e: DragEvent, taskId: string) => {
    e.dataTransfer.setData('text/plain', taskId);
    e.dataTransfer.effectAllowed = 'move';
  }, []);

  const handleDragOver = useCallback((e: DragEvent, date: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDropTarget(date);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDropTarget(null);
  }, []);

  const handleDrop = useCallback((e: DragEvent, date: string) => {
    e.preventDefault();
    setDropTarget(null);
    const taskId = e.dataTransfer.getData('text/plain');
    if (!taskId) return;

    const task = useTaskStore.getState().tasks.find((t) => t.id === taskId);
    if (!task) return;

    const newDate = dateToTimestamp(date);

    // 마감일이 있으면 마감일 이후로 배치 차단
    if (task.deadline && date > toDateStr(new Date(task.deadline))) {
      alert('마감일보다 늦은 날짜에 배치할 수 없어요.');
      return;
    }

    useTaskStore.getState().updateTask(taskId, { scheduledDate: newDate });
    const api = getApi();
    if (api) api.tasks.update(taskId, { scheduledDate: newDate }).catch(console.error);
  }, []);

  const toggleParent = useCallback((parentId: string) => {
    setExpandedParents((prev) => {
      const next = new Set(prev);
      if (next.has(parentId)) next.delete(parentId);
      else next.add(parentId);
      return next;
    });
  }, []);

  // 수행일 제거 (우클릭)
  const handleRemoveScheduled = useCallback((taskId: string) => {
    useTaskStore.getState().updateTask(taskId, { scheduledDate: null });
    const api = getApi();
    if (api) api.tasks.update(taskId, { scheduledDate: null }).catch(console.error);
  }, []);

  return (
    <div data-testid="page-calendar" className="flex flex-col h-full bg-surface-50">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-3 bg-surface-0 border-b border-surface-200/60 shrink-0">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={handlePrev}>
            <ChevronLeft size={16} />
          </Button>
          <h1 className="text-base font-semibold text-surface-800 min-w-[8rem] text-center">
            {currentYear}년 {currentMonth + 1}월
          </h1>
          <Button variant="ghost" size="sm" onClick={handleNext}>
            <ChevronRight size={16} />
          </Button>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <Pin size={10} className="text-danger-500" />
              <span className="text-[10px] text-surface-500">마감일</span>
            </div>
            <div className="flex items-center gap-1">
              <Calendar size={10} className="text-accent-500" />
              <span className="text-[10px] text-surface-500">수행일</span>
            </div>
            <span className="text-surface-200">|</span>
            {[
              ['bg-surface-400', '대기'],
              ['bg-warning-500', '진행'],
              ['bg-success-500', '완료'],
            ].map(([dot, label]) => (
              <div key={label} className="flex items-center gap-1">
                <span className={cn('w-2 h-2 rounded-full', dot)} />
                <span className="text-[10px] text-surface-500">{label}</span>
              </div>
            ))}
          </div>
          <Button variant="secondary" size="sm" onClick={handleToday}>오늘</Button>
        </div>
      </header>

      {/* Calendar grid */}
      <div className="flex-[65] min-h-0 overflow-y-auto p-4 pb-2">
        <div className="grid grid-cols-7 mb-1">
          {DAY_LABELS.map((label, i) => (
            <div key={label} className={cn('text-center text-xs font-semibold py-1', i >= 5 ? 'text-danger-400' : 'text-surface-500')}>
              {label}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 border-t border-l border-surface-200/60">
          {days.map(({ date, day, isCurrentMonth }) => {
            const entries = dateEntryMap.get(date) ?? [];
            const deadlines = entries.filter((e) => e.type === 'deadline');
            const scheduled = entries.filter((e) => e.type === 'scheduled');
            const isToday = date === todayStr;
            const isDrop = dropTarget === date;
            const isWeekend = (() => {
              const d = new Date(date + 'T00:00:00');
              return d.getDay() === 0 || d.getDay() === 6;
            })();

            return (
              <div
                key={date}
                onDragOver={(e) => handleDragOver(e, date)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, date)}
                className={cn(
                  'border-r border-b border-surface-200/60 min-h-[90px] p-1.5',
                  'flex flex-col transition-colors duration-100',
                  !isCurrentMonth && 'bg-surface-100/50',
                  isCurrentMonth && 'bg-surface-0',
                  isToday && 'bg-accent-50/40',
                  isDrop && 'bg-accent-100/60 ring-2 ring-inset ring-accent-400',
                )}
              >
                {/* 날짜 번호 + 핀 개수 */}
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-0.5">
                    {deadlines.length > 0 && <Pin size={10} className="text-danger-500" />}
                    {scheduled.length > 0 && <Calendar size={10} className="text-accent-500" />}
                  </div>
                  <span className={cn(
                    'text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full',
                    !isCurrentMonth && 'text-surface-300',
                    isCurrentMonth && !isToday && (isWeekend ? 'text-danger-400' : 'text-surface-600'),
                    isToday && 'bg-accent-500 text-surface-0 font-bold',
                  )}>
                    {day}
                  </span>
                </div>

                {/* 태스크 목록 */}
                <div className="flex flex-col gap-0.5 overflow-y-auto flex-1">
                  {/* 마감일 (핀) — 빨간 계열 */}
                  {deadlines.slice(0, 2).map(({ task }) => (
                    <div
                      key={`dl-${task.id}`}
                      className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-danger-50 text-danger-600 text-[10px] leading-tight"
                      title={`마감: ${task.title}`}
                    >
                      <Pin size={8} className="shrink-0" />
                      <span className="truncate">{task.title}</span>
                    </div>
                  ))}
                  {deadlines.length > 2 && (
                    <span className="text-[10px] text-danger-400 pl-1">+{deadlines.length - 2} 마감</span>
                  )}

                  {/* 수행일 (배치) — 파란 계열 */}
                  {scheduled.slice(0, 2).map(({ task }) => (
                    <div
                      key={`sc-${task.id}`}
                      draggable
                      onDragStart={(e) => handleDragStart(e, task.id)}
                      onContextMenu={(e) => { e.preventDefault(); handleRemoveScheduled(task.id); }}
                      className={cn(
                        'flex items-center gap-1 px-1.5 py-0.5 rounded cursor-grab active:cursor-grabbing',
                        'text-[10px] leading-tight bg-accent-50 text-accent-700',
                      )}
                      title={`수행: ${task.title} — 우클릭으로 해제`}
                    >
                      <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', STATUS_DOT[task.status])} />
                      <span className="truncate">{task.title}</span>
                    </div>
                  ))}
                  {scheduled.length > 2 && (
                    <span className="text-[10px] text-accent-400 pl-1">+{scheduled.length - 2} 수행</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ═══ Bottom: 미배치 태스크 박스 ═══ */}
      <div className="flex-[35] min-h-0 border-t border-surface-200/60 bg-surface-0 flex flex-col">
        <div className="px-4 py-2 flex-1 min-h-0 overflow-y-auto">
          <h3 className="text-xs font-semibold text-surface-500 uppercase tracking-wider mb-2">
            미배치 태스크 — 캘린더로 드래그하여 수행일 배치
          </h3>

          {unscheduledLeaves.length === 0 && parentTasks.length === 0 ? (
            <p className="text-xs text-surface-400 py-2">모든 태스크가 배치되었습니다</p>
          ) : (
            <div className="flex flex-col gap-1.5">
              {/* 독립 리프 */}
              {unscheduledLeaves
                .filter((t) => t.parentId === null)
                .map((task) => (
                  <DraggableTaskChip key={task.id} task={task} onDragStart={handleDragStart} />
                ))}

              {/* 부모 그룹 */}
              {parentTasks.map((parent) => {
                const children = getChildren(parent.id, tasks);
                const unscheduledChildren = children.filter((c) => !c.scheduledDate && c.status !== 'completed');
                if (unscheduledChildren.length === 0) return null;

                const isExpanded = expandedParents.has(parent.id);
                const totalChildren = children.length;
                const completedChildren = children.filter((c) => c.status === 'completed').length;

                return (
                  <div key={parent.id} className="flex flex-col">
                    <button
                      type="button"
                      onClick={() => toggleParent(parent.id)}
                      className="flex items-center gap-2 px-2 py-1.5 rounded-md text-left bg-surface-50 hover:bg-surface-100 transition-colors"
                    >
                      {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                      <span className="text-xs font-medium text-surface-700 flex-1 truncate">{parent.title}</span>
                      <span className="text-[10px] text-surface-400">{completedChildren}/{totalChildren}</span>
                      <span className="text-[10px] text-accent-500">미배치 {unscheduledChildren.length}</span>
                    </button>
                    {isExpanded && (
                      <div className="flex flex-col gap-1 pl-5 pt-1">
                        {unscheduledChildren.map((child) => (
                          <DraggableTaskChip key={child.id} task={child} onDragStart={handleDragStart} />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* 부모가 있지만 최상위 그룹에 안 속하는 리프 */}
              {unscheduledLeaves
                .filter((t) => t.parentId !== null && !parentTasks.some((p) => p.id === t.parentId))
                .map((task) => (
                  <DraggableTaskChip key={task.id} task={task} onDragStart={handleDragStart} />
                ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function DraggableTaskChip({
  task,
  onDragStart,
}: {
  task: Task;
  onDragStart: (e: DragEvent, taskId: string) => void;
}) {
  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, task.id)}
      className={cn(
        'flex items-center gap-2 px-2.5 py-1.5 rounded-lg',
        'border border-surface-200/60 bg-surface-0',
        'cursor-grab active:cursor-grabbing',
        'hover:border-accent-300 hover:bg-accent-50/30 transition-colors',
      )}
    >
      <GripVertical size={12} className="text-surface-300 shrink-0" />
      <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', STATUS_DOT[task.status])} />
      <span className="text-xs text-surface-700 truncate flex-1">{task.title}</span>
      {task.deadline && (
        <span className="text-[10px] text-danger-400 shrink-0">
          D-{Math.max(0, Math.ceil((task.deadline - Date.now()) / (1000 * 60 * 60 * 24)))}
        </span>
      )}
      <span className="text-[10px] text-surface-400 shrink-0">{task.estimatedMinutes}분</span>
    </div>
  );
}
