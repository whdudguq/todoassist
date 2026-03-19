// @TASK P3-S2 - TimeGrid component
// @SPEC docs/planning/03-user-flow.md
import { cn } from '@renderer/lib/cn';
import { Button } from '@renderer/components/ui/button';
import { TaskCard } from '@renderer/components/ui/task-card';
import { useTaskStore } from '@renderer/stores/taskStore';
import { microStart, hasActiveTask } from '@renderer/hooks/useMicroStart';
import { getApi } from '@renderer/hooks/useApi';
import type { TimeBox } from '@shared/types';
import { Sparkles } from 'lucide-react';

// Work hours configuration
export const WORK_START = 14; // slot 14 = 07:00
export const WORK_END = 42;   // slot 42 = 21:00 (exclusive)
const LUNCH_SLOTS = [24, 25]; // 12:00-13:00

/**
 * Convert slot index (0-47) to time string.
 * slot 18 -> "09:00", slot 19 -> "09:30"
 */
export function slotToTime(slot: number): string {
  const totalMins = slot * 30;
  const h = Math.floor(totalMins / 60).toString().padStart(2, '0');
  const m = (totalMins % 60).toString().padStart(2, '0');
  return `${h}:${m}`;
}

interface TimeGridProps {
  timeboxes: TimeBox[];
  onSlotClick: (slot: number) => void;
  onAiSuggest?: () => void;
  hasSelectedTask?: boolean;
  className?: string;
}

export function TimeGrid({ timeboxes, onSlotClick, onAiSuggest, hasSelectedTask, className }: TimeGridProps) {
  const tasks = useTaskStore((s) => s.tasks);

  // Build a map: startSlot -> TimeBox[]
  const slotMap = new Map<number, TimeBox[]>();
  for (const tb of timeboxes) {
    const existing = slotMap.get(tb.startSlot) ?? [];
    slotMap.set(tb.startSlot, [...existing, tb]);
  }

  // Track all occupied slots (startSlot ~ endSlot range)
  const occupiedSlots = new Map<number, TimeBox>();
  for (const tb of timeboxes) {
    for (let s = tb.startSlot; s <= tb.endSlot; s++) {
      occupiedSlots.set(s, tb);
    }
  }

  const slots = Array.from({ length: WORK_END - WORK_START }, (_, i) => WORK_START + i);

  return (
    <div className={cn('flex flex-col gap-0', className)}>
      {/* AI suggest button */}
      <div className="flex justify-end pb-2">
        <Button
          variant="primary"
          size="sm"
          onClick={onAiSuggest}
          aria-label="AI 스케줄 제안"
        >
          <Sparkles size={14} />
          AI 스케줄 제안
        </Button>
      </div>

      {/* Time slots */}
      <div className="flex flex-col border border-surface-200/60 rounded-xl overflow-visible">
        {slots.map((slot) => {
          const isLunch = LUNCH_SLOTS.includes(slot);
          const timeboxesInSlot = slotMap.get(slot) ?? [];
          const isStartSlot = timeboxesInSlot.length > 0;
          const occupyingTb = occupiedSlots.get(slot);
          const isMiddleSlot = !isStartSlot && !!occupyingTb;
          const isEmpty = !isStartSlot && !isMiddleSlot;

          return (
            <div
              key={slot}
              data-testid={`time-slot-${slot}`}
              data-empty={isEmpty ? 'true' : 'false'}
              data-lunch={isLunch ? 'true' : 'false'}
              data-occupied={occupyingTb ? 'true' : 'false'}
              className={cn(
                'flex items-stretch border-b border-surface-100 last:border-b-0 relative',
                isMiddleSlot ? 'min-h-[44px]' : 'min-h-[44px]',
                isLunch
                  ? 'bg-surface-200 cursor-default'
                  : isEmpty && hasSelectedTask
                    ? 'bg-accent-50/40 hover:bg-accent-100/50 cursor-pointer group ring-1 ring-accent-200/50'
                  : isEmpty
                    ? 'bg-surface-0 hover:bg-surface-50 cursor-pointer group'
                    : 'bg-surface-0',
                // Alternating row for non-lunch even slots
                !isLunch && (slot - WORK_START) % 2 === 1 && isEmpty && 'bg-surface-50',
              )}
              onClick={() => {
                if (isEmpty && !isLunch) onSlotClick(slot);
              }}
            >
              {/* Time label */}
              <div
                className={cn(
                  'w-14 shrink-0 flex items-center justify-end pr-3',
                  'font-mono text-xs text-surface-400',
                  isLunch && 'text-surface-500',
                )}
              >
                {slotToTime(slot)}
              </div>

              {/* Slot content */}
              <div className="flex-1 flex items-center px-2 py-1 gap-2 relative">
                {isLunch && slot === LUNCH_SLOTS[0] ? (
                  <span className="text-xs text-surface-500 font-medium">점심시간</span>
                ) : isLunch ? null : isMiddleSlot ? (
                  // Middle slot of a multi-slot timebox — hidden, covered by spanning card above
                  null
                ) : isEmpty ? (
                  <span
                    className={cn(
                      'text-lg leading-none transition-opacity',
                      hasSelectedTask
                        ? 'text-accent-400 opacity-60 group-hover:opacity-100 text-xs font-medium'
                        : 'text-surface-300 opacity-0 group-hover:opacity-100',
                    )}
                    aria-hidden="true"
                  >
                    {hasSelectedTask ? '여기에 배치' : '+'}
                  </span>
                ) : (
                  timeboxesInSlot.map((tb) => {
                    const task = tasks.find((t) => t.id === tb.taskId);
                    if (!task) return null;
                    const slotSpan = tb.endSlot - tb.startSlot + 1;
                    const cardHeight = slotSpan > 1 ? slotSpan * 44 : undefined;
                    return (
                      <TaskCard
                        key={tb.id}
                        title={task.title}
                        description={task.description}
                        estimatedMinutes={task.estimatedMinutes}
                        importance={task.importance}
                        category={task.category}
                        status={task.status}
                        progress={task.progress}
                        className={cn('flex-1 !py-2 !px-3', slotSpan > 1 && 'absolute left-2 right-2 z-10')}
                        style={cardHeight ? { height: `${cardHeight}px`, top: 0 } : undefined}
                        startDisabled={hasActiveTask()}
                        onMicroStart={() => {
                          microStart(task.id);
                        }}
                        onDefer={() => {
                          useTaskStore.getState().updateTask(task.id, { status: 'deferred' });
                          const api = getApi();
                          if (api) api.tasks.update(task.id, { status: 'deferred' }).catch(console.error);
                        }}
                      />
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
