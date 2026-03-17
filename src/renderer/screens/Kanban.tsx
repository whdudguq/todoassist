// @TASK P3-S2 - Kanban board screen
// @SPEC docs/planning/03-user-flow.md
import { useEffect } from 'react';
import { cn } from '@renderer/lib/cn';
import { Button } from '@renderer/components/ui/button';
import { TaskCard } from '@renderer/components/ui/task-card';
import { TimeGrid } from '@renderer/components/TimeGrid';
import { useTimeboxStore } from '@renderer/stores/timeboxStore';
import { useTaskStore } from '@renderer/stores/taskStore';
import { ChevronLeft, ChevronRight, Save, Sparkles } from 'lucide-react';
import { getApi } from '@renderer/hooks/useApi';
import type { Task, TimeBox } from '@shared/types';

/** Shift a YYYY-MM-DD string by +/- days */
function shiftDate(dateStr: string, delta: number): string {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + delta);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function Kanban() {
  const { timeboxes, selectedDate, setSelectedDate } = useTimeboxStore();
  const tasks = useTaskStore((s) => s.tasks);

  // ── IPC: load timeboxes when date changes, load tasks on mount ────────────
  useEffect(() => {
    const api = getApi();
    if (!api) return;

    api.tasks.getAll().then((ts) => {
      useTaskStore.getState().setTasks(ts as Task[]);
    }).catch(console.error);
  }, []);

  useEffect(() => {
    const api = getApi();
    if (!api) return;

    api.timebox.getByDate(selectedDate).then((boxes) => {
      useTimeboxStore.getState().setTimeboxes(boxes as TimeBox[]);
    }).catch(console.error);
  }, [selectedDate]);

  // Timeboxes for the selected date only
  const todayBoxes = timeboxes.filter((tb) => tb.date === selectedDate);

  // Task IDs that have a timebox on the selected date
  const scheduledIds = new Set(todayBoxes.map((tb) => tb.taskId));

  // Unscheduled: active tasks not yet scheduled for selected date
  const unscheduledTasks = tasks.filter(
    (t) => t.status !== 'completed' && t.status !== 'deferred' && !scheduledIds.has(t.id),
  );

  function handlePrev() {
    setSelectedDate(shiftDate(selectedDate, -1));
  }

  function handleNext() {
    setSelectedDate(shiftDate(selectedDate, +1));
  }

  function handleAiSuggest() {
    const api = getApi();
    if (!api) return;
    api.timebox.aiGenerate(selectedDate).then((boxes) => {
      useTimeboxStore.getState().setTimeboxes(boxes as TimeBox[]);
    }).catch(console.error);
  }

  function handleSave() {
    // Timeboxes are created individually via IPC when dropped onto slots.
    // This button is a no-op placeholder — bulk save not needed.
  }

  function handleSlotClick(_slot: number) {
    // Placeholder — add timebox modal in P3-S2-V
  }

  return (
    <div className="flex flex-col h-full bg-surface-50">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-3 bg-surface-0 border-b border-surface-200/60 shrink-0">
        {/* Date navigator */}
        <div className="flex items-center gap-2" data-testid="date-navigator">
          <Button
            variant="ghost"
            size="sm"
            aria-label="prev"
            onClick={handlePrev}
          >
            <ChevronLeft size={16} />
          </Button>

          <span className="text-sm font-semibold text-surface-800 tabular-nums min-w-[7rem] text-center">
            {selectedDate}
          </span>

          <Button
            variant="ghost"
            size="sm"
            aria-label="next"
            onClick={handleNext}
          >
            <ChevronRight size={16} />
          </Button>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <Button
            variant="primary"
            size="sm"
            onClick={handleAiSuggest}
            aria-label="AI 스케줄 제안"
          >
            <Sparkles size={14} />
            AI 스케줄 제안
          </Button>
        </div>
      </header>

      {/* Body: TimeGrid (70%) + Unscheduled panel (30%) */}
      <div className="flex flex-1 overflow-hidden">
        {/* TimeGrid panel — 70% */}
        <main className="flex-[7] overflow-y-auto px-4 py-4">
          <TimeGrid
            timeboxes={todayBoxes}
            onSlotClick={handleSlotClick}
            onAiSuggest={handleAiSuggest}
          />
        </main>

        {/* Unscheduled tasks sidebar — 30% */}
        <aside
          data-testid="unscheduled-panel"
          className={cn(
            'flex-[3] overflow-y-auto',
            'bg-surface-50 border-l border-surface-200/60',
            'px-4 py-4',
          )}
        >
          <h3 className="text-xs font-semibold text-surface-500 uppercase tracking-wider mb-3">
            미배치 태스크
          </h3>

          <div className="flex flex-col gap-2">
            {unscheduledTasks.length === 0 ? (
              <p className="text-sm text-surface-400 text-center py-6">
                모든 태스크가 배치되었습니다.
              </p>
            ) : (
              unscheduledTasks.map((task) => (
                <div key={task.id} className="flex flex-col gap-1">
                  <TaskCard
                    title={task.title}
                    description={task.description}
                    estimatedMinutes={task.estimatedMinutes}
                    importance={task.importance}
                    category={task.category}
                    status={task.status}
                    progress={task.progress}
                  />
                  {/* Eros: micro-start button */}
                  <Button
                    variant="secondary"
                    size="sm"
                    className="w-full text-accent-600"
                    aria-label={`2분만 시작: ${task.title}`}
                  >
                    2분만 시작
                  </Button>
                </div>
              ))
            )}
          </div>
        </aside>
      </div>

      {/* Footer: Save button */}
      <footer className="flex justify-end px-6 py-3 bg-surface-0 border-t border-surface-200/60 shrink-0">
        <Button
          variant="primary"
          size="md"
          onClick={handleSave}
          aria-label="Save schedule"
        >
          <Save size={15} />
          Save Schedule
        </Button>
      </footer>
    </div>
  );
}
