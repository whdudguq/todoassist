// @TASK P4-S1 - Dashboard screen
// @TASK P4-S2 - Daily Reflection cards integrated
// @SPEC docs/planning/03-user-flow.md#dashboard
import { useEffect, useRef } from 'react';
import { Sunrise, Sun, Moon } from 'lucide-react';
import { useDashboardStore } from '../stores/dashboardStore';
import { useTaskStore } from '../stores/taskStore';
import { useReflectionStore } from '../stores/reflectionStore';
import { Card, CardContent, CardHeader } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { ProgressRing } from '../components/ProgressRing';
import { TaskListToday } from '../components/TaskListToday';
import { MiniChart } from '../components/MiniChart';
import { TodayMindCard } from '../components/TodayMindCard';
import { DayReviewCard } from '../components/DayReviewCard';
import { getApi } from '../hooks/useApi';
import type { Task, DailyStats, DailyReflection } from '../../shared/types';

function todayString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function TimeIcon() {
  const hour = new Date().getHours();
  if (hour >= 6 && hour < 12) return <Sunrise size={24} className="text-accent-500" aria-label="morning" />;
  if (hour >= 12 && hour < 18) return <Sun size={24} className="text-accent-500" aria-label="afternoon" />;
  return <Moon size={24} className="text-accent-500" aria-label="evening" />;
}

function getCompletionRate(completed: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((completed / total) * 100);
}

export function Dashboard() {
  const {
    dailyStats,
    todayTasks: dashTodayTasks,
    aiGreeting,
    accumulatedCompleted,
    weeklyData,
    isLoading,
  } = useDashboardStore();

  const storeTasks = useTaskStore((s) => s.tasks);
  const { reflection } = useReflectionStore();

  // Debounce timers for reflection saves
  const gratitudeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const feedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Use taskStore tasks as fallback when dashboardStore is empty (dev mode / no IPC)
  const todayTasks = dashTodayTasks.length > 0 ? dashTodayTasks : storeTasks;

  const completionRate = dailyStats
    ? getCompletionRate(dailyStats.completedCount, dailyStats.totalPlanned)
    : 0;

  // Deferred tasks with days deferred computed from updatedAt
  const today = todayString();
  const nowMs = Date.now();
  const deferredTasksList = todayTasks
    .filter((t) => t.status === 'deferred')
    .map((t) => {
      const diffMs = nowMs - (t.updatedAt ?? t.createdAt);
      const deferredDays = Math.max(1, Math.round(diffMs / (1000 * 60 * 60 * 24)));
      return { id: t.id, title: t.title, deferredDays };
    });

  // ── IPC: load data on mount (태스크는 AppShell에서 전역 로드) ──
  useEffect(() => {
    const api = getApi();
    if (!api) return;

    // Load today's daily stats
    api.stats.getDaily(today).then((stats) => {
      useDashboardStore.getState().setDailyStats(stats as DailyStats);
    }).catch(console.error);

    // Load encouragement greeting
    api.encouragement.getToday().then((msgs) => {
      const list = msgs as Array<{ message: string }>;
      if (list && list.length > 0) {
        useDashboardStore.getState().setAiGreeting(list[0].message);
      }
    }).catch(console.error);

    // Load today's reflection
    api.reflection.getByDate(today).then((ref) => {
      useReflectionStore.getState().setReflection(ref as DailyReflection | null);
    }).catch(console.error);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Reflection handlers with debounced IPC save (300ms) ─────────────────
  const handleGratitudeChange = (value: string) => {
    // Optimistic local update
    const current = useReflectionStore.getState().reflection;
    useReflectionStore.getState().setReflection(
      current ? { ...current, gratitude: value } : null,
    );
    // Debounced persist
    if (gratitudeTimerRef.current) clearTimeout(gratitudeTimerRef.current);
    gratitudeTimerRef.current = setTimeout(() => {
      const api = getApi();
      if (api) {
        api.reflection.upsert(today, { gratitude: value }).catch(console.error);
      }
    }, 300);
  };

  const handleFeedbackChange = (phase: 'start' | 'mid' | 'end', value: string) => {
    const current = useReflectionStore.getState().reflection;
    const fieldMap = {
      start: 'feedbackStart',
      mid: 'feedbackMid',
      end: 'feedbackEnd',
    } as const;
    useReflectionStore.getState().setReflection(
      current ? { ...current, [fieldMap[phase]]: value } : null,
    );
    if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
    feedbackTimerRef.current = setTimeout(() => {
      const api = getApi();
      if (api) {
        api.reflection.upsert(today, { [fieldMap[phase]]: value }).catch(console.error);
      }
    }, 300);
  };

  const handleMicroStart = (id: string) => {
    // Optimistic store update first
    useTaskStore.getState().updateTask(id, { status: 'in_progress' });
    // Persist via IPC if available
    const api = getApi();
    if (api) {
      api.tasks.update(id, { status: 'in_progress' }).catch(console.error);
    }
  };

  const handleDefer = (id: string) => {
    // Optimistic store update first
    useTaskStore.getState().updateTask(id, { status: 'deferred' });
    // Persist via IPC if available
    const api = getApi();
    if (api) {
      api.tasks.update(id, { status: 'deferred' }).catch(console.error);
    }
  };

  if (isLoading) {
    return (
      <div data-testid="page-dashboard" className="flex items-center justify-center h-full">
        <p className="text-surface-400 text-sm">불러오는 중...</p>
      </div>
    );
  }

  return (
    <div
      data-testid="page-dashboard"
      className="h-full overflow-auto bg-[var(--color-surface-50)] p-6"
    >
      <div className="max-w-5xl mx-auto grid grid-cols-5 gap-5">
        {/* ── Left column (60%) ── */}
        <div
          data-testid="dashboard-left"
          className="col-span-3 flex flex-col gap-5"
        >
          {/* AI Greeting card */}
          <Card data-testid="greeting-card">
            <CardContent className="flex items-start gap-3 py-5">
              <span
                className="shrink-0 leading-none"
                aria-hidden="true"
              >
                <TimeIcon />
              </span>
              <div className="flex flex-col gap-1">
                <p className="text-sm font-medium text-surface-700">
                  {aiGreeting}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Today task list */}
          <Card>
            <CardHeader>
              <h2 className="text-sm font-semibold text-surface-700">
                오늘 할 일
              </h2>
            </CardHeader>
            <CardContent>
              <TaskListToday
                tasks={todayTasks}
                onMicroStart={handleMicroStart}
                onDefer={handleDefer}
                onPause={() => {
                  // Task stays 'in_progress' during pause — pause state is tracked by timerStore.isPaused
                }}
                onResume={(id) => {
                  useTaskStore.getState().updateTask(id, { status: 'in_progress', updatedAt: Date.now() });
                  const api = getApi();
                  if (api) api.tasks.update(id, { status: 'in_progress' }).catch(console.error);
                }}
                onComplete={(id) => {
                  useTaskStore.getState().updateTask(id, { status: 'completed', progress: 100, completedAt: Date.now() });
                  const api = getApi();
                  if (api) api.tasks.update(id, { status: 'completed', progress: 100 }).catch(console.error);
                }}
              />
            </CardContent>
          </Card>
        </div>

        {/* ── Right column (40%) ── */}
        <div
          data-testid="dashboard-right"
          className="col-span-2 flex flex-col gap-5"
        >
          {/* Progress ring card */}
          <Card data-testid="progress-ring-card">
            <CardContent className="flex flex-col items-center py-5 gap-3">
              <h2 className="text-sm font-semibold text-surface-700 self-start">
                오늘 달성률
              </h2>
              <ProgressRing value={completionRate} size={120} />
              {dailyStats && (
                <p className="text-xs text-surface-400">
                  {dailyStats.completedCount} / {dailyStats.totalPlanned} 완료
                </p>
              )}
            </CardContent>
          </Card>

          {/* Accumulated completed badge (Eros: never decreases) */}
          <Card>
            <CardContent className="flex flex-col gap-2 py-5">
              <h2 className="text-sm font-semibold text-surface-700">
                누적 완료
              </h2>
              <div data-testid="accumulated-badge" className="inline-flex">
                <Badge
                  variant="accent"
                  className="text-sm px-3 py-1"
                >
                  {accumulatedCompleted}개 완료
                </Badge>
              </div>
              <p className="text-xs text-surface-400">
                지금까지 해낸 모든 것이에요!
              </p>
            </CardContent>
          </Card>

          {/* Weekly mini chart */}
          <Card data-testid="weekly-chart-card">
            <CardHeader>
              <h2 className="text-sm font-semibold text-surface-700">
                이번 주 달성률
              </h2>
            </CardHeader>
            <CardContent className="pb-5">
              <MiniChart data={weeklyData} />
            </CardContent>
          </Card>

          {/* Daily Reflection: 오늘의 마음 */}
          <TodayMindCard
            gratitude={reflection?.gratitude ?? ''}
            onGratitudeChange={handleGratitudeChange}
          />

          {/* Daily Reflection: 하루 돌아보기 */}
          <DayReviewCard
            feedbackStart={reflection?.feedbackStart ?? ''}
            feedbackMid={reflection?.feedbackMid ?? ''}
            feedbackEnd={reflection?.feedbackEnd ?? ''}
            onFeedbackChange={handleFeedbackChange}
          />
        </div>
      </div>
    </div>
  );
}
