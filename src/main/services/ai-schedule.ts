/**
 * @TASK P3-R2 - AI Schedule Auto-Generation Service
 * @SPEC docs/planning/02-trd.md#AI-Schedule
 *
 * AiScheduleService - Generates optimal daily schedule using Claude API
 * - Collects unscheduled tasks (pending/deferred with no timebox)
 * - Calls Claude API for schedule generation
 * - Filters lunch break (slots 24-25) and work hours boundary
 * - Applies schedule with overlap detection
 */

import type { Task } from '@shared/types';
import { ClaudeApiService } from './claude-api';
import { TaskCrudService } from './task-crud';
import { TimeBoxCrudService } from './timebox-crud';

// ============================================
// Types
// ============================================

export interface ScheduleSlot {
  taskId: string;
  date: string;
  startSlot: number;
  endSlot: number;
}

// ============================================
// Constants
// ============================================

/** Lunch break slots: 24-25 (12:00-13:00) */
const LUNCH_START = 24;
const LUNCH_END = 25;

/** Default work hours: 09:00-17:30 */
const DEFAULT_WORK_START_SLOT = 18; // 09:00
const DEFAULT_WORK_END_SLOT = 35;   // 17:30

// ============================================
// Helpers
// ============================================

/**
 * Convert slot number to time string "HH:MM"
 * Slot 0 = 00:00, Slot 1 = 00:30, Slot 18 = 09:00, etc.
 */
function slotToTime(slot: number): string {
  const hours = Math.floor(slot / 2);
  const minutes = (slot % 2) * 30;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

/**
 * Check if a slot range overlaps with lunch break (24-25)
 */
function overlapsLunch(startSlot: number, endSlot: number): boolean {
  return startSlot <= LUNCH_END && endSlot >= LUNCH_START;
}

/**
 * Check if a slot range is within work hours
 */
function isWithinWorkHours(
  startSlot: number,
  endSlot: number,
  workStart: number,
  workEnd: number,
): boolean {
  return startSlot >= workStart && endSlot <= workEnd;
}

// ============================================
// AiScheduleService
// ============================================

export class AiScheduleService {
  constructor(
    private taskService: TaskCrudService,
    private timeboxService: TimeBoxCrudService,
    private claudeService: ClaudeApiService,
  ) {}

  /**
   * Get tasks that need scheduling for a given date
   * - Status IN ('pending', 'deferred')
   * - No timebox exists for the given date
   */
  collectUnscheduledTasks(date: string): Task[] {
    // Get all pending/deferred tasks
    const pendingTasks = this.taskService.filterTasks({
      status: ['pending', 'deferred'],
    });

    // Get all timeboxes for this date
    const existingBoxes = this.timeboxService.getTimeBoxesByDate(date);
    const scheduledTaskIds = new Set(existingBoxes.map((tb) => tb.taskId));

    // Filter out tasks that already have a timebox for this date
    return pendingTasks.filter((task) => !scheduledTaskIds.has(task.id));
  }

  /**
   * Generate AI schedule proposal
   * 1. Collect unscheduled tasks
   * 2. Get existing timeboxes for the date
   * 3. Call Claude API with tasks + work hours
   * 4. Filter response: remove lunch, out-of-hours, overlapping slots
   */
  async generateAiSchedule(
    date: string,
    workStartSlot: number = DEFAULT_WORK_START_SLOT,
    workEndSlot: number = DEFAULT_WORK_END_SLOT,
  ): Promise<ScheduleSlot[]> {
    // 1. Collect unscheduled tasks
    const tasks = this.collectUnscheduledTasks(date);

    if (tasks.length === 0) {
      return [];
    }

    // 2. Get existing timeboxes for overlap detection
    const existingBoxes = this.timeboxService.getTimeBoxesByDate(date);

    // 3. Call Claude API
    const workStartTime = slotToTime(workStartSlot);
    const workEndTime = slotToTime(workEndSlot);

    const rawSlots = await this.claudeService.generateSchedule(
      tasks,
      workStartTime,
      workEndTime,
    );

    // 4. Filter: remove lunch, out-of-hours, and overlapping slots
    const validSlots: ScheduleSlot[] = [];

    for (const slot of rawSlots) {
      // Check work hours boundary
      if (!isWithinWorkHours(slot.startSlot, slot.endSlot, workStartSlot, workEndSlot)) {
        continue;
      }

      // Check lunch break
      if (overlapsLunch(slot.startSlot, slot.endSlot)) {
        continue;
      }

      // Check overlap with existing timeboxes
      const hasOverlap = existingBoxes.some(
        (existing) =>
          existing.startSlot <= slot.endSlot && existing.endSlot >= slot.startSlot,
      );
      if (hasOverlap) {
        continue;
      }

      validSlots.push({
        taskId: slot.taskId,
        date: slot.date,
        startSlot: slot.startSlot,
        endSlot: slot.endSlot,
      });
    }

    return validSlots;
  }

  /**
   * Apply proposed schedule - create timeboxes from AI-proposed slots
   * - Checks overlap before each creation
   * - Skips slots that conflict with existing timeboxes
   * - Sets aiSuggested=true on created timeboxes
   */
  applySchedule(slots: ScheduleSlot[]): { created: number; skipped: number } {
    let created = 0;
    let skipped = 0;

    for (const slot of slots) {
      // Check overlap using TimeBoxCrudService
      const hasOverlap = this.timeboxService.checkOverlap(
        slot.date,
        slot.startSlot,
        slot.endSlot,
      );

      if (hasOverlap) {
        skipped++;
        continue;
      }

      try {
        this.timeboxService.createTimeBox({
          taskId: slot.taskId,
          date: slot.date,
          startSlot: slot.startSlot,
          endSlot: slot.endSlot,
          aiSuggested: true,
        });
        created++;
      } catch {
        // Overlap or validation error - skip
        skipped++;
      }
    }

    return { created, skipped };
  }
}
