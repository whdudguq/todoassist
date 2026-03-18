// @TASK P4-S1 - Dashboard screen
// @SPEC docs/planning/03-user-flow.md#dashboard
import { useEffect } from 'react';
import { Sunrise, Sun, Moon } from 'lucide-react';
import { useDashboardStore } from '../stores/dashboardStore';
import { useTaskStore } from '../stores/taskStore';
import { Card, CardContent, CardHeader } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { ProgressRing } from '../components/ProgressRing';
import { TaskListToday } from '../components/TaskListToday';
import { MiniChart } from '../components/MiniChart';
import { getApi } from '../hooks/useApi';
import type { Task, DailyStats } from '../../shared/types';

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

  // Use taskStore tasks as fallback when dashboardStore is empty (dev mode / no IPC)
  const todayTasks = dashTodayTasks.length > 0 ? dashTodayTasks : storeTasks;

  const completionRate = dailyStats
    ? getCompletionRate(dailyStats.completedCount, dailyStats.totalPlanned)
    : 0;

  // ── IPC: load data on mount ────────────────────────────────────────────────
  useEffect(() => {
    const api = getApi();
    if (!api) return;

    const today = todayString();

    // Load all tasks into task store
    api.tasks.getAll().then((tasks) => {
      useTaskStore.getState().setTasks(tasks as Task[]);
    }).catch(console.error);

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
  }, []);

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
        </div>
      </div>
    </div>
  );
}
