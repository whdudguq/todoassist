// @TASK P5-S5 - Statistics & Report screen
// @SPEC docs/planning/03-user-flow.md#통계-리포트
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader } from '@renderer/components/ui/card';
import { Button } from '@renderer/components/ui/button';
import { Badge } from '@renderer/components/ui/badge';
import { StatsLineChart } from '@renderer/components/StatsLineChart';
import { StatsPieChart } from '@renderer/components/StatsPieChart';
import { StatsBarChart } from '@renderer/components/StatsBarChart';
import { useStatsStore, type StatsPeriod } from '@renderer/stores/statsStore';
import { getApi } from '@renderer/hooks/useApi';
import { cn } from '@renderer/lib/cn';
import type { DailyStats, DailyReflection } from '@shared/types';

/** Returns YYYY-MM-DD date string offset by `deltaDays` from today */
function dateString(deltaDays = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + deltaDays);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Map a StatsPeriod to [startDate, endDate] strings */
function periodToRange(period: StatsPeriod): [string, string] {
  const today = dateString();
  switch (period) {
    case 'thisWeek': {
      const d = new Date();
      const dow = d.getDay(); // 0=Sun
      const monday = dateString(-(dow === 0 ? 6 : dow - 1));
      return [monday, today];
    }
    case 'lastWeek': {
      const d = new Date();
      const dow = d.getDay();
      const lastMonday = dateString(-(dow === 0 ? 13 : dow + 6));
      const lastSunday = dateString(-(dow === 0 ? 7 : dow));
      return [lastMonday, lastSunday];
    }
    case 'thisMonth': {
      const d = new Date();
      const start = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
      return [start, today];
    }
    case 'lastMonth': {
      const d = new Date();
      d.setDate(1);
      d.setMonth(d.getMonth() - 1);
      const start = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
      const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0);
      const end = `${lastDay.getFullYear()}-${String(lastDay.getMonth() + 1).padStart(2, '0')}-${String(lastDay.getDate()).padStart(2, '0')}`;
      return [start, end];
    }
    case 'custom':
    default:
      return [today, today];
  }
}

/** Derive chart data from DailyStats array */
function buildCompletionData(stats: DailyStats[]): Array<{ date: string; rate: number }> {
  return stats.map((s) => ({
    date: s.date,
    rate: s.totalPlanned > 0 ? Math.round((s.completedCount / s.totalPlanned) * 100) : 0,
  }));
}

function buildCategoryData(stats: DailyStats[]): Array<{ name: string; minutes: number; color: string }> {
  const totals: Record<string, number> = {};
  for (const s of stats) {
    try {
      const breakdown = JSON.parse(s.categoryBreakdown) as Record<string, number>;
      for (const [cat, mins] of Object.entries(breakdown)) {
        totals[cat] = (totals[cat] ?? 0) + mins;
      }
    } catch {
      // ignore malformed JSON
    }
  }
  const COLORS = ['#6366f1', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#06b6d4'];
  return Object.entries(totals).map(([name, minutes], i) => ({
    name,
    minutes,
    color: COLORS[i % COLORS.length],
  }));
}

function buildDeferralData(stats: DailyStats[]): Array<{ label: string; count: number }> {
  return stats
    .filter((s) => s.deferredCount > 0)
    .map((s) => ({ label: s.date, count: s.deferredCount }));
}

const PERIOD_TABS: Array<{ key: StatsPeriod; label: string }> = [
  { key: 'thisWeek', label: '이번주' },
  { key: 'lastWeek', label: '지난주' },
  { key: 'thisMonth', label: '이번달' },
  { key: 'lastMonth', label: '지난달' },
  { key: 'custom', label: '커스텀' },
];

export function Statistics() {
  const {
    period,
    completionData,
    categoryData,
    deferralData,
    aiInsights,
    accumulatedCompleted,
    isLoading,
    setPeriod,
    customRange,
  } = useStatsStore();

  const [reflections, setReflections] = useState<DailyReflection[]>([]);

  // ── IPC: load stats + reflections when period changes ──────────────────
  useEffect(() => {
    const api = getApi();
    if (!api) return;
    if (period === 'custom' && !customRange) return;

    const [start, end] = period === 'custom' && customRange
      ? [customRange.start, customRange.end]
      : periodToRange(period);

    useStatsStore.getState().setLoading(true);

    Promise.all([
      api.stats.getRange(start, end),
      api.reflection.getRange(start, end),
    ]).then(([rawStats, rawReflections]) => {
      const stats = rawStats as DailyStats[];
      useStatsStore.getState().setCompletionData(buildCompletionData(stats));
      useStatsStore.getState().setCategoryData(buildCategoryData(stats));
      useStatsStore.getState().setDeferralData(buildDeferralData(stats));

      const totalCompleted = stats.reduce((sum, s) => sum + s.completedCount, 0);
      useStatsStore.getState().setAccumulatedCompleted(totalCompleted);

      setReflections((rawReflections as DailyReflection[]).filter(
        (r) => r.gratitude || r.feedbackStart || r.feedbackMid || r.feedbackEnd,
      ));
    }).catch(console.error).finally(() => {
      useStatsStore.getState().setLoading(false);
    });
  }, [period, customRange]);

  if (isLoading) {
    return (
      <div data-testid="page-statistics" className="h-full bg-[var(--color-surface-50)] p-6">
        <div data-testid="stats-loading" className="flex items-center justify-center h-full">
          <div className="flex flex-col items-center gap-3">
            <div className="skeleton w-12 h-12 rounded-full" />
            <p className="text-sm text-[var(--color-surface-400)]">통계를 불러오는 중...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      data-testid="page-statistics"
      className="h-full bg-[var(--color-surface-50)] p-6 overflow-y-auto"
    >
      {/* Header */}
      <header
        data-testid="stats-header"
        className="flex items-center justify-between mb-6"
      >
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold text-[var(--color-surface-900)]">
            통계 & 리포트
          </h1>
          <span data-testid="stats-accumulated-badge">
            <Badge variant="accent" className="gap-1">
              <span>누적</span>
              <span className="font-semibold">{accumulatedCompleted}</span>
              <span>완료</span>
            </Badge>
          </span>
        </div>
      </header>

      {/* Period tabs */}
      <div
        data-testid="stats-period-tabs"
        className="flex items-center gap-1 mb-6 p-1 bg-[var(--color-surface-100)] rounded-[var(--radius-lg)] w-fit"
        role="tablist"
      >
        {PERIOD_TABS.map(({ key, label }) => {
          const isActive = period === key;
          return (
            <button
              key={key}
              role="button"
              aria-label={label}
              data-active={isActive}
              onClick={() => setPeriod(key)}
              className={[
                'px-4 py-1.5 rounded-[var(--radius-md)] text-sm font-medium',
                'transition-all duration-150',
                isActive
                  ? 'bg-[var(--color-accent-500)] text-[var(--color-surface-0)] shadow-sm'
                  : 'text-[var(--color-surface-500)] hover:text-[var(--color-surface-700)] hover:bg-[var(--color-surface-0)]',
              ].join(' ')}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* Charts grid */}
      <div className="grid gap-4">
        {/* Completion rate — full width */}
        <Card data-testid="completion-chart-section">
          <CardHeader>
            <h2 className="text-sm font-semibold text-[var(--color-surface-700)]">
              완료율 추이
            </h2>
          </CardHeader>
          <CardContent>
            <StatsLineChart data={completionData} height={200} />
          </CardContent>
        </Card>

        {/* Bottom row: pie + bar */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card data-testid="category-chart-section">
            <CardHeader>
              <h2 className="text-sm font-semibold text-[var(--color-surface-700)]">
                카테고리별 시간
              </h2>
            </CardHeader>
            <CardContent>
              <StatsPieChart data={categoryData} height={220} />
            </CardContent>
          </Card>

          <Card data-testid="deferral-chart-section">
            <CardHeader>
              <h2 className="text-sm font-semibold text-[var(--color-surface-700)]">
                미루기 패턴
              </h2>
            </CardHeader>
            <CardContent>
              <StatsBarChart data={deferralData} height={220} />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* 회고 기록 */}
      {reflections.length > 0 && (
        <section className="mt-4" aria-label="회고 기록">
          <h2 className="text-sm font-semibold text-[var(--color-surface-700)] mb-3">
            회고 기록
          </h2>
          <div className="flex flex-col gap-3">
            {reflections.map((r) => (
              <Card key={r.id}>
                <CardContent className="py-3 flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-semibold text-accent-500">{r.date}</span>
                  </div>

                  {r.gratitude && (
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[11px] font-medium text-[var(--color-surface-400)]">오늘의 마음</span>
                      <p className="text-sm text-[var(--color-surface-700)] leading-relaxed pl-2 border-l-2 border-accent-300">
                        {r.gratitude}
                      </p>
                    </div>
                  )}

                  {(r.feedbackStart || r.feedbackMid || r.feedbackEnd) && (
                    <div className="flex flex-col gap-1">
                      <span className="text-[11px] font-medium text-[var(--color-surface-400)]">하루 돌아보기</span>
                      <div className="flex flex-col gap-1 pl-2 border-l-2 border-warning-300">
                        {r.feedbackStart && (
                          <div className="flex items-start gap-1.5">
                            <span className={cn('mt-1.5 h-1.5 w-1.5 rounded-full bg-accent-400 shrink-0')} />
                            <p className="text-sm text-[var(--color-surface-700)]">{r.feedbackStart}</p>
                          </div>
                        )}
                        {r.feedbackMid && (
                          <div className="flex items-start gap-1.5">
                            <span className={cn('mt-1.5 h-1.5 w-1.5 rounded-full bg-warning-400 shrink-0')} />
                            <p className="text-sm text-[var(--color-surface-700)]">{r.feedbackMid}</p>
                          </div>
                        )}
                        {r.feedbackEnd && (
                          <div className="flex items-start gap-1.5">
                            <span className={cn('mt-1.5 h-1.5 w-1.5 rounded-full bg-surface-400 shrink-0')} />
                            <p className="text-sm text-[var(--color-surface-700)]">{r.feedbackEnd}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* AI Insights */}
      <section
        data-testid="ai-insights-section"
        className="mt-4"
        aria-label="AI 인사이트"
      >
        <h2 className="text-sm font-semibold text-[var(--color-surface-700)] mb-3">
          Eros의 인사이트
        </h2>
        {aiInsights.length === 0 ? (
          <p className="text-sm text-[var(--color-surface-400)]">
            이번 기간 인사이트가 없어요. 데이터가 쌓이면 분석해드릴게요!
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {aiInsights.map((insight, i) => (
              <Card
                key={i}
                data-testid={`insight-card-${i}`}
                className="border-l-4 border-l-[var(--color-accent-400)]"
              >
                <CardContent className="py-3">
                  <p className="text-sm text-[var(--color-surface-700)] leading-relaxed">
                    {insight}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
