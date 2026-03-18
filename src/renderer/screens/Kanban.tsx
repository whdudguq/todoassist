// @TASK P3-S2 - Kanban board screen
// @SPEC docs/planning/03-user-flow.md
import { useEffect, useState } from 'react';
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
  const { timeboxes, selectedDate, setSelectedDate, addTimebox } = useTimeboxStore();
  const tasks = useTaskStore((s) => s.tasks);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

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
    if (!api) {
      // Dev mode: no IPC available — show informational alert
      alert('AI 스케줄 제안은 Electron 앱에서만 사용 가능합니다.');
      return;
    }
    api.timebox.aiGenerate(selectedDate).then((boxes) => {
      useTimeboxStore.getState().setTimeboxes(boxes as TimeBox[]);
    }).catch(console.error);
  }

  function handleSave() {
    // Timeboxes are created individually via IPC when dropped onto slots.
    // This button is a no-op placeholder — bulk save not needed.
  }

  function handleSlotClick(slot: number) {
    if (!selectedTaskId) return;
    const task = tasks.find((t) => t.id === selectedTaskId);
    if (!task) return;

    // Calculate how many slots this task needs (estimatedMinutes / 30, min 1)
    const slotsNeeded = Math.max(1, Math.ceil(task.estimatedMinutes / 30));
    const endSlot = Math.min(slot + slotsNeeded - 1, 47);

    const newTimebox: TimeBox = {
      id: crypto.randomUUID(),
      taskId: selectedTaskId,
      date: selectedDate,
      startSlot: slot,
      endSlot,
      status: 'scheduled',
      aiSuggested: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    // Add to store
    addTimebox(newTimebox);
    setSelectedTaskId(null);

    // Persist via IPC if available
    const api = getApi();
    if (api) {
      api.timebox.create({ taskId: selectedTaskId, date: selectedDate, startSlot: slot, endSlot }).catch(console.error);
    }
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
            hasSelectedTask={!!selectedTaskId}
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
              unscheduledTasks.map((task) => {
                const isSelected = selectedTaskId === task.id;
                return (
                  <div key={task.id} className="flex flex-col gap-1">
                    <div
                      onClick={() => setSelectedTaskId(isSelected ? null : task.id)}
                      className={cn(
                        'cursor-pointer rounded-xl transition-all duration-150',
                        isSelected
                          ? 'ring-2 ring-accent-500 ring-offset-2 scale-[1.02]'
                          : 'hover:ring-1 hover:ring-surface-300',
                      )}
                    >
                      <TaskCard
                        title={task.title}
                        description={task.description}
                        estimatedMinutes={task.estimatedMinutes}
                        importance={task.importance}
                        category={task.category}
                        status={task.status}
                        progress={task.progress}
                        onMicroStart={() => {
                          useTaskStore.getState().updateTask(task.id, { status: 'in_progress' });
                          const api = getApi();
                          if (api) api.tasks.update(task.id, { status: 'in_progress' }).catch(console.error);
                        }}
                        onDefer={() => {
                          useTaskStore.getState().updateTask(task.id, { status: 'deferred' });
                          const api = getApi();
                          if (api) api.tasks.update(task.id, { status: 'deferred' }).catch(console.error);
                        }}
                      />
                    </div>
                    {isSelected && (
                      <p className="text-xs text-accent-600 text-center py-1">
                        왼쪽 시간표에서 원하는 시간을 클릭하세요
                      </p>
                    )}
                    {/* Eros: micro-start button */}
                    <Button
                      variant="secondary"
                      size="sm"
                      className="w-full text-accent-600"
                      aria-label={`2분만 시작: ${task.title}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        useTaskStore.getState().updateTask(task.id, { status: 'in_progress' });
                        const api = getApi();
                        if (api) api.tasks.update(task.id, { status: 'in_progress' }).catch(console.error);
                      }}
                    >
                      2분만 시작
                    </Button>
                  </div>
                );
              })
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
