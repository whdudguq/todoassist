// @TASK P3-S2 - TimeGrid component
// @SPEC docs/planning/03-user-flow.md
import { cn } from '@renderer/lib/cn';
import { Button } from '@renderer/components/ui/button';
import { TaskCard } from '@renderer/components/ui/task-card';
import { useTaskStore } from '@renderer/stores/taskStore';
import type { TimeBox } from '@shared/types';
import { Sparkles } from 'lucide-react';

// Work hours configuration
export const WORK_START = 18; // slot 18 = 09:00
export const WORK_END = 38;   // slot 38 = 19:00 (exclusive)
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
  className?: string;
}

export function TimeGrid({ timeboxes, onSlotClick, onAiSuggest, className }: TimeGridProps) {
  const tasks = useTaskStore((s) => s.tasks);

  // Build a map: startSlot -> TimeBox[]
  const slotMap = new Map<number, TimeBox[]>();
  for (const tb of timeboxes) {
    const existing = slotMap.get(tb.startSlot) ?? [];
    slotMap.set(tb.startSlot, [...existing, tb]);
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
      <div className="flex flex-col border border-surface-200/60 rounded-xl overflow-hidden">
        {slots.map((slot) => {
          const isLunch = LUNCH_SLOTS.includes(slot);
          const timeboxesInSlot = slotMap.get(slot) ?? [];
          const isEmpty = timeboxesInSlot.length === 0;

          return (
            <div
              key={slot}
              data-testid={`time-slot-${slot}`}
              data-empty={isEmpty ? 'true' : 'false'}
              data-lunch={isLunch ? 'true' : 'false'}
              onClick={() => isEmpty && onSlotClick(slot)}
              className={cn(
                'flex items-stretch min-h-[44px] border-b border-surface-100 last:border-b-0',
                isLunch
                  ? 'bg-surface-200 cursor-default'
                  : isEmpty
                    ? 'bg-surface-0 hover:bg-surface-50 cursor-pointer group'
                    : 'bg-surface-0',
                // Alternating row for non-lunch even slots
                !isLunch && (slot - WORK_START) % 2 === 1 && 'bg-surface-50',
              )}
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
              <div className="flex-1 flex items-center px-2 py-1 gap-2">
                {isLunch && slot === LUNCH_SLOTS[0] ? (
                  <span className="text-xs text-surface-500 font-medium">점심시간</span>
                ) : isLunch ? null : isEmpty ? (
                  <span
                    className="text-surface-300 text-lg leading-none opacity-0 group-hover:opacity-100 transition-opacity"
                    aria-hidden="true"
                  >
                    +
                  </span>
                ) : (
                  timeboxesInSlot.map((tb) => {
                    const task = tasks.find((t) => t.id === tb.taskId);
                    if (!task) return null;
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
                        className="flex-1 !py-2 !px-3"
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
