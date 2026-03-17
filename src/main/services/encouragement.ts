// @TASK P4-R2 - Encouragement Service
// @SPEC docs/planning/02-trd.md#Encouragement
// @TEST src/__tests__/services/encouragement.test.ts

import Database from 'better-sqlite3';
import { randomUUID } from 'crypto';
import type {
  Encouragement,
  EncouragementType,
  EncouragementTone,
  Task,
} from '@shared/types';
import { ClaudeApiService } from './claude-api';

/**
 * Context for tone determination and message generation
 */
export interface EncouragementContext {
  hour?: number;
  completionRate?: number;
  deferCount?: number;
}

/**
 * EncouragementService
 * Generates, stores, and retrieves AI encouragement messages.
 *
 * Eros principles:
 * - Never guilt-trip: deferred tasks get 'warm' not 'urgent'
 * - Celebrate wins: 100% completion gets 'humorous' (fun celebration)
 * - Morning = fresh start energy: 'warm'
 */
export class EncouragementService {
  constructor(
    private db: Database.Database,
    private claudeService: ClaudeApiService,
  ) {}

  /**
   * Determine the appropriate tone based on time, completion, and defer count.
   *
   * Priority order:
   * 1. completionRate === 100 -> 'humorous' (celebration!)
   * 2. deferCount >= 3 -> 'warm' (Eros: gentle nudge, never guilt-trip)
   * 3. Time-of-day default:
   *    - 06-12: 'warm' (morning fresh start)
   *    - 12-18: 'professional' (afternoon focus)
   *    - 18-24, 0-6: 'warm' (evening/night)
   */
  determineTone(
    hour: number,
    completionRate: number,
    deferCount: number,
  ): EncouragementTone {
    // Priority 1: Celebrate 100% completion
    if (completionRate === 100) {
      return 'humorous';
    }

    // Priority 2: Gentle nudge for frequently deferred tasks (Eros)
    if (deferCount >= 3) {
      return 'warm';
    }

    // Priority 3: Time-of-day default
    if (hour >= 12 && hour < 18) {
      return 'professional';
    }

    // Morning (06-12), Evening (18-24), Night (0-6) all get 'warm'
    return 'warm';
  }

  /**
   * Generate an encouragement message via Claude API and store in DB.
   *
   * @param task - The task to encourage about
   * @param type - Message type (morning, start, complete, nudge, milestone)
   * @param context - Optional context for tone determination
   * @returns The created Encouragement record
   */
  async generateMessage(
    task: Task,
    type: EncouragementType,
    context?: EncouragementContext,
  ): Promise<Encouragement> {
    const hour = context?.hour ?? new Date().getHours();
    const completionRate = context?.completionRate ?? 0;
    const deferCount = context?.deferCount ?? 0;

    const tone = this.determineTone(hour, completionRate, deferCount);

    // Call Claude API
    const message = await this.claudeService.generateEncouragement(task, type, tone);

    // Build Encouragement record
    const encouragement: Encouragement = {
      id: randomUUID(),
      taskId: task.id,
      type,
      message,
      tone,
      createdAt: Date.now(),
    };

    // Store in DB
    this.db
      .prepare(
        `INSERT INTO Encouragement (id, taskId, type, message, tone, createdAt)
         VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .run(
        encouragement.id,
        encouragement.taskId,
        encouragement.type,
        encouragement.message,
        encouragement.tone,
        encouragement.createdAt,
      );

    return encouragement;
  }

  /**
   * Get all encouragement messages created today.
   * Uses start-of-day timestamp for filtering.
   */
  getTodayMessages(): Encouragement[] {
    const now = new Date();
    const startOfDay = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    ).getTime();

    const rows = this.db
      .prepare(
        `SELECT id, taskId, type, message, tone, createdAt
         FROM Encouragement
         WHERE createdAt >= ?
         ORDER BY createdAt ASC`,
      )
      .all(startOfDay) as Encouragement[];

    return rows;
  }

  /**
   * Get all encouragement messages for a specific task.
   */
  getMessagesByTask(taskId: string): Encouragement[] {
    const rows = this.db
      .prepare(
        `SELECT id, taskId, type, message, tone, createdAt
         FROM Encouragement
         WHERE taskId = ?
         ORDER BY createdAt ASC`,
      )
      .all(taskId) as Encouragement[];

    return rows;
  }
}
