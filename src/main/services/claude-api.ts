// @TASK P1-R2 - Claude API Service
// @SPEC docs/planning/02-trd.md#AI-API

import Anthropic from '@anthropic-ai/sdk';
import type { Task, DailyStats, EncouragementType, EncouragementTone } from '@shared/types';

const MODEL = 'claude-sonnet-4-20250514';
const MAX_RETRIES = 3;
const BASE_DELAY_MS = 500;

/**
 * Claude API Service for TodoAssist
 * Handles all AI interactions: encouragement, estimation, scheduling, insights, task splitting, chat.
 */
export class ClaudeApiService {
  private client: Anthropic;

  constructor(apiKey: string) {
    if (!apiKey) {
      throw new Error('API key is required');
    }
    this.client = new Anthropic({ apiKey });
  }

  /** Test API key validity */
  async testConnection(): Promise<boolean> {
    try {
      await this.client.messages.create({
        model: MODEL,
        max_tokens: 10,
        messages: [{ role: 'user', content: 'ping' }],
      });
      return true;
    } catch {
      return false;
    }
  }

  /** Generate encouragement message (Eros: emotion-aware) */
  async generateEncouragement(
    task: Task,
    type: EncouragementType,
    tone: EncouragementTone,
  ): Promise<string> {
    const system =
      '당신은 따뜻한 AI 비서입니다. 사용자의 감정 상태를 고려해 격려 메시지를 생성하세요. 간결하고 진심 어린 한두 문장으로 답하세요.';
    const user = `태스크: "${task.title}" (${task.description})
상태: ${task.status}, 진행률: ${task.progress}%
메시지 유형: ${type}
톤: ${tone}
격려 메시지를 생성해주세요.`;

    return this.callApi(system, user);
  }

  /** Estimate task metadata from title/description */
  async estimateTaskMetadata(
    title: string,
    description?: string,
  ): Promise<{
    estimatedMinutes: number;
    importance: number;
    category: string;
  }> {
    const system =
      '태스크 정보를 분석해 메타데이터를 추정하세요. 반드시 JSON만 응답하세요. 형식: {"estimatedMinutes": number, "importance": number(1-5), "category": string}';
    const user = `태스크 제목: "${title}"${description ? `\n설명: "${description}"` : ''}`;

    const raw = await this.callApi(system, user);
    return this.parseJson(raw);
  }

  /** Generate optimal schedule */
  async generateSchedule(
    tasks: Task[],
    workHoursStart: string,
    workHoursEnd: string,
  ): Promise<
    Array<{
      taskId: string;
      date: string;
      startSlot: number;
      endSlot: number;
    }>
  > {
    const system =
      '태스크 목록과 근무시간을 분석해 최적 스케줄을 생성하세요. 30분 단위 슬롯(0-47)으로 배치하세요. JSON 배열로만 응답하세요. 형식: [{"taskId": string, "date": "YYYY-MM-DD", "startSlot": number, "endSlot": number}]';
    const taskList = tasks
      .map(
        (t) =>
          `- [${t.id}] "${t.title}" (${t.estimatedMinutes}분, 중요도: ${t.importance})`,
      )
      .join('\n');
    const user = `근무시간: ${workHoursStart} ~ ${workHoursEnd}\n태스크 목록:\n${taskList}`;

    const raw = await this.callApi(system, user);
    return this.parseJson(raw);
  }

  /** Generate AI insights (weekly/monthly) */
  async generateInsight(
    stats: DailyStats[],
    period: 'weekly' | 'monthly',
  ): Promise<string> {
    const system =
      '통계 데이터를 분석해 격려적인 인사이트를 생성하세요. 사용자가 동기부여를 받을 수 있도록 따뜻한 톤으로 답하세요.';
    const statsSummary = stats
      .map(
        (s) =>
          `${s.date}: 완료 ${s.completedCount}/${s.totalPlanned}, 미룸 ${s.deferredCount}, ${s.totalMinutesUsed}분 사용`,
      )
      .join('\n');
    const user = `기간: ${period}\n통계:\n${statsSummary}\n인사이트를 생성해주세요.`;

    return this.callApi(system, user);
  }

  /** Split large task into 2-min micro-tasks (Eros principle) */
  async splitTask(
    task: Task,
  ): Promise<Array<{ title: string; estimatedMinutes: number }>> {
    const system =
      '큰 태스크를 2분짜리 마이크로 태스크로 쪼개세요. 시작이 쉬운 작은 단위로 나누세요. JSON 배열로만 응답하세요. 형식: [{"title": string, "estimatedMinutes": number}]';
    const user = `태스크: "${task.title}"\n설명: "${task.description}"\n예상 시간: ${task.estimatedMinutes}분`;

    const raw = await this.callApi(system, user);
    return this.parseJson(raw);
  }

  /** Free-form chat */
  async chat(userMessage: string, context?: string): Promise<string> {
    const system =
      '당신은 TodoAssist의 AI 비서입니다. 사용자의 할 일 관리를 도와주세요. 따뜻하고 간결하게 답하세요.';
    const user = context
      ? `[컨텍스트]\n${context}\n\n[사용자 메시지]\n${userMessage}`
      : userMessage;

    return this.callApi(system, user);
  }

  // ---- Private helpers ----

  /** Call Claude API with retry logic */
  private async callApi(system: string, userContent: string): Promise<string> {
    let lastError: Error | undefined;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        const response = await this.client.messages.create({
          model: MODEL,
          max_tokens: 1024,
          system,
          messages: [{ role: 'user', content: userContent }],
        });

        // Log token usage
        if (response.usage) {
          console.log(
            `[claude-api] token usage — input: ${response.usage.input_tokens}, output: ${response.usage.output_tokens}`,
          );
        }

        const textBlock = response.content.find(
          (block: { type: string }) => block.type === 'text',
        );
        return (textBlock as { type: 'text'; text: string })?.text ?? '';
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        if (attempt < MAX_RETRIES - 1) {
          const delay = BASE_DELAY_MS * Math.pow(2, attempt);
          await this.sleep(delay);
        }
      }
    }

    throw lastError!;
  }

  /** Parse JSON from API response, handling markdown code blocks */
  private parseJson<T>(raw: string): T {
    let cleaned = raw.trim();
    // Strip markdown code block if present
    const codeBlockMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeBlockMatch) {
      cleaned = codeBlockMatch[1].trim();
    }
    return JSON.parse(cleaned) as T;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
