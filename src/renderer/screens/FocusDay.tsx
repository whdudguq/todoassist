// FocusDay - 3-column unified screen (Timeline + Focus + Stats)
// Combines Dashboard + Kanban into a single view
import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Sunrise, Sun, Moon } from 'lucide-react';
import { cn } from '@renderer/lib/cn';
import { Button } from '@renderer/components/ui/button';
import { Card, CardContent } from '@renderer/components/ui/card';
import { Badge } from '@renderer/components/ui/badge';
import { TimeGrid } from '@renderer/components/TimeGrid';
import { ElapsedTimer } from '@renderer/components/ElapsedTimer';
import { ProgressRing } from '@renderer/components/ProgressRing';
import { TodayMindCard } from '@renderer/components/TodayMindCard';
import { DayReviewCard, DeferredDetector } from '@renderer/components/DayReviewCard';
import { FocusGuardCard } from '@renderer/components/FocusGuardCard';
import type { FocusGuardStats } from '@renderer/components/FocusGuardCard';
import { useTimeboxStore } from '@renderer/stores/timeboxStore';
import { useTaskStore } from '@renderer/stores/taskStore';
import { useDashboardStore } from '@renderer/stores/dashboardStore';
import { useTimerStore } from '@renderer/stores/timerStore';
import { useReflectionStore } from '@renderer/stores/reflectionStore';
import { getApi } from '@renderer/hooks/useApi';
import { microStart, hasActiveTask } from '@renderer/hooks/useMicroStart';
import type { Task, TimeBox, DailyStats, DailyReflection } from '@shared/types';

const PAUSE_REASONS = [
  '잠깐 쉬는 중',
  '전화/회의 참석',
  '다른 일이 더 급해요',
] as const;

function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function isLeafTask(task: Task, allTasks: Task[]): boolean {
  return !allTasks.some((t) => t.parentId === task.id);
}

function todayString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function shiftDate(dateStr: string, delta: number): string {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + delta);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function TimeIcon() {
  const hour = new Date().getHours();
  if (hour >= 6 && hour < 12) return <Sunrise size={16} className="text-accent-500" />;
  if (hour >= 12 && hour < 18) return <Sun size={16} className="text-accent-500" />;
  return <Moon size={16} className="text-accent-500" />;
}

function getCompletionRate(completed: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((completed / total) * 100);
}

export function FocusDay() {
  const { timeboxes, selectedDate, setSelectedDate, addTimebox } = useTimeboxStore();
  const tasks = useTaskStore((s) => s.tasks);
  const timers = useTimerStore((s) => s.timers);
  const startTimer = useTimerStore((s) => s.startTimer);
  const pauseTimer = useTimerStore((s) => s.pauseTimer);
  const resumeTimer = useTimerStore((s) => s.resumeTimer);
  const stopTimer = useTimerStore((s) => s.stopTimer);

  const { dailyStats, aiGreeting, accumulatedCompleted } = useDashboardStore();
  const reflection = useReflectionStore((s) => s.reflection);

  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [pauseInputId, setPauseInputId] = useState<string | null>(null);
  const [pauseReason, setPauseReason] = useState('');
  const [switchedTaskIds, setSwitchedTaskIds] = useState<string[]>([]);
  const gratitudeTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const feedbackTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  // ── Split pane resize ──
  const containerRef = useRef<HTMLDivElement>(null);
  const [splitLeft, setSplitLeft] = useState(45); // Column 1 width %
  const [splitRight, setSplitRight] = useState(75); // Column 1+2 boundary %
  const [focusGuardStats, setFocusGuardStats] = useState<FocusGuardStats | null>(null);

  const dragging = useRef<'left' | 'right' | null>(null);

  const handlePointerDown = useCallback((which: 'left' | 'right') => {
    dragging.current = which;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, []);

  useEffect(() => {
    function onPointerMove(e: PointerEvent) {
      if (!dragging.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const pct = ((e.clientX - rect.left) / rect.width) * 100;

      if (dragging.current === 'left') {
        // Column 1: min 25%, max (splitRight - 15%)
        setSplitLeft(Math.max(25, Math.min(pct, splitRight - 15)));
      } else {
        // Column 1+2 boundary: min (splitLeft + 15%), max 90%
        setSplitRight(Math.max(splitLeft + 15, Math.min(pct, 90)));
      }
    }
    function onPointerUp() {
      if (dragging.current) {
        dragging.current = null;
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      }
    }
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };
  }, [splitLeft, splitRight]);

  const col1Width = `${splitLeft}%`;
  const col2Width = `${splitRight - splitLeft}%`;
  const col3Width = `${100 - splitRight}%`;

  // ── IPC: load data on mount (태스크는 AppShell에서 전역 로드) ──
  useEffect(() => {
    const api = getApi();
    if (!api) return;

    const today = todayString();
    api.stats.getDaily(today).then((stats) => {
      useDashboardStore.getState().setDailyStats(stats as DailyStats);
    }).catch(console.error);

    api.encouragement.getToday().then((msgs) => {
      const list = msgs as Array<{ message: string }>;
      if (list && list.length > 0) {
        useDashboardStore.getState().setAiGreeting(list[0].message);
      }
    }).catch(console.error);

    api.reflection.getByDate(today).then((ref) => {
      useReflectionStore.getState().setReflection(ref as DailyReflection | null);
    }).catch(console.error);
  }, []);

  useEffect(() => {
    const api = getApi();
    if (!api) return;
    api.timebox.getByDate(selectedDate).then((boxes) => {
      useTimeboxStore.getState().setTimeboxes(boxes as TimeBox[]);
    }).catch(console.error);
  }, [selectedDate]);

  // ── Derived data ──
  const todayBoxes = timeboxes.filter((tb) => tb.date === selectedDate);
  const scheduledIds = new Set(todayBoxes.map((tb) => tb.taskId));
  const completionRate = dailyStats ? getCompletionRate(dailyStats.completedCount, dailyStats.totalPlanned) : 0;

  // Active (in_progress) task — the one currently being worked on
  const activeTask = tasks.find((t) => t.status === 'in_progress' && timers[t.id]);
  const activeTimer = activeTask ? timers[activeTask.id] : null;

  // Switched tasks — "다른 일이 더 급해요"로 pending된 태스크 (음영 카드)
  const switchedTasks = switchedTaskIds
    .map((id) => tasks.find((t) => t.id === id))
    .filter((t): t is Task => !!t && t.status === 'pending');

  // Unscheduled tasks: scheduledDate가 selectedDate와 일치하는 리프 태스크만
  const unscheduledTasks = tasks.filter(
    (t) =>
      t.status !== 'completed' &&
      t.status !== 'deferred' &&
      !scheduledIds.has(t.id) &&
      t.scheduledDate &&
      toDateStr(new Date(t.scheduledDate)) === selectedDate &&
      isLeafTask(t, tasks),
  );

  // Next up: scheduled tasks that are pending (not yet started)
  const upcomingTasks = todayBoxes
    .filter((tb) => {
      const t = tasks.find((task) => task.id === tb.taskId);
      return t && t.status === 'pending';
    })
    .sort((a, b) => a.startSlot - b.startSlot)
    .slice(0, 3)
    .map((tb) => ({ timebox: tb, task: tasks.find((t) => t.id === tb.taskId)! }));

  // ── Handlers ──
  function handleSlotClick(slot: number) {
    if (!selectedTaskId) return;
    const task = tasks.find((t) => t.id === selectedTaskId);
    if (!task) return;

    const slotsNeeded = Math.max(1, Math.ceil(task.estimatedMinutes / 30));
    const endSlot = Math.min(slot + slotsNeeded - 1, 47);

    for (let s = slot; s <= endSlot; s++) {
      if (todayBoxes.some((tb) => s >= tb.startSlot && s <= tb.endSlot)) return;
    }

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

    addTimebox(newTimebox);
    setSelectedTaskId(null);

    const api = getApi();
    if (api) {
      api.timebox.create({ taskId: selectedTaskId, date: selectedDate, startSlot: slot, endSlot }).catch(console.error);
    }
  }

  function handleAiSuggest() {
    const api = getApi();
    if (!api) {
      alert('AI 스케줄 제안은 Electron 앱에서만 사용 가능합니다.');
      return;
    }
    api.timebox.aiGenerate(selectedDate).then((boxes) => {
      useTimeboxStore.getState().setTimeboxes(boxes as TimeBox[]);
    }).catch(console.error);
  }

  function handleMicroStart(id: string) {
    const started = microStart(id);
    if (started) {
      // 시작된 태스크가 switched 목록에 있었으면 제거
      setSwitchedTaskIds((prev) => prev.filter((tid) => tid !== id));
    }
  }

  function handlePauseClick(id: string) {
    setPauseInputId(id);
    setPauseReason('');
  }

  function handlePauseConfirm(id: string) {
    const reason = pauseReason || '잠깐 쉬는 중';
    if (reason === '다른 일이 더 급해요') {
      // 이미 대기 중인 태스크가 있으면 차단
      if (switchedTaskIds.length > 0) {
        alert('이미 대기 중인 태스크가 있어요. 먼저 대기 중인 태스크를 완료하거나 닫아주세요.');
        setPauseInputId(null);
        setPauseReason('');
        return;
      }
      // 정지 → pending 복귀 (다른 태스크 시작 가능) + 음영 카드 유지
      pauseTimer(id, reason);
      stopTimer(id);
      useTaskStore.getState().updateTask(id, { status: 'pending' });
      const api = getApi();
      if (api) {
        api.tasks.update(id, { status: 'pending' }).catch(console.error);
        api.focusGuard.stop().then((r: { stats?: FocusGuardStats }) => {
          if (r?.stats) setFocusGuardStats(r.stats);
        }).catch(console.error);
      }
      setSwitchedTaskIds((prev) => [...prev, id]);
    } else {
      // 일시정지 (여전히 in_progress, 다른 태스크 차단 유지)
      pauseTimer(id, reason);
    }
    setPauseInputId(null);
    setPauseReason('');
  }

  function handleResume(id: string) {
    resumeTimer(id);
  }

  function handleComplete(id: string) {
    stopTimer(id);
    useTaskStore.getState().updateTask(id, { status: 'completed', progress: 100, completedAt: Date.now() });
    const api = getApi();
    if (api) {
      api.tasks.update(id, { status: 'completed', progress: 100 }).catch(console.error);
      api.focusGuard.stop().then((r: { stats?: FocusGuardStats }) => {
        if (r?.stats) setFocusGuardStats(r.stats);
      }).catch(console.error);
    }
  }

  function handleDefer(id: string) {
    stopTimer(id);
    useTaskStore.getState().updateTask(id, { status: 'deferred' });
    const api = getApi();
    if (api) {
      api.tasks.update(id, { status: 'deferred' }).catch(console.error);
      api.focusGuard.stop().then((r: { stats?: FocusGuardStats }) => {
        if (r?.stats) setFocusGuardStats(r.stats);
      }).catch(console.error);
    }
  }

  const slotToTime = (slot: number) => {
    const totalMins = slot * 30;
    const h = Math.floor(totalMins / 60).toString().padStart(2, '0');
    const m = (totalMins % 60).toString().padStart(2, '0');
    return `${h}:${m}`;
  };

  // ── Reflection handlers (debounced 300ms) ──
  const handleGratitudeChange = (value: string) => {
    useReflectionStore.getState().setReflection({
      ...(reflection ?? { id: '', date: todayString(), gratitude: null, feedbackStart: null, feedbackMid: null, feedbackEnd: null, createdAt: Date.now(), updatedAt: Date.now() }),
      gratitude: value,
    });
    clearTimeout(gratitudeTimer.current);
    gratitudeTimer.current = setTimeout(() => {
      const api = getApi();
      if (api) api.reflection.upsert(todayString(), { gratitude: value }).catch(console.error);
    }, 300);
  };

  const handleFeedbackChange = (phase: 'start' | 'mid' | 'end', value: string) => {
    const key = phase === 'start' ? 'feedbackStart' : phase === 'mid' ? 'feedbackMid' : 'feedbackEnd';
    useReflectionStore.getState().setReflection({
      ...(reflection ?? { id: '', date: todayString(), gratitude: null, feedbackStart: null, feedbackMid: null, feedbackEnd: null, createdAt: Date.now(), updatedAt: Date.now() }),
      [key]: value,
    });
    clearTimeout(feedbackTimer.current);
    feedbackTimer.current = setTimeout(() => {
      const api = getApi();
      if (api) api.reflection.upsert(todayString(), { [key]: value }).catch(console.error);
    }, 300);
  };

  // ── Deferred tasks for procrastination detector ──
  const now = Date.now();
  const deferredTasksList = tasks
    .filter((t) => t.status === 'deferred')
    .map((t) => ({
      id: t.id,
      title: t.title,
      deferredDays: Math.max(1, Math.floor((now - t.updatedAt) / (1000 * 60 * 60 * 24))),
    }))
    .sort((a, b) => b.deferredDays - a.deferredDays)
    .slice(0, 3);

  return (
    <div ref={containerRef} data-testid="page-focusday" className="flex h-full overflow-hidden bg-surface-50">
      {/* ═══ Column 1: Timeline ═══ */}
      <div style={{ width: col1Width }} className="flex flex-col min-h-0 overflow-hidden shrink-0">
        {/* Date navigator */}
        <header className="flex items-center justify-between px-4 py-2.5 bg-surface-0 border-b border-surface-200/60 shrink-0">
          <div className="flex items-center gap-2" data-testid="date-navigator">
            <Button variant="ghost" size="sm" aria-label="prev" onClick={() => setSelectedDate(shiftDate(selectedDate, -1))}>
              <ChevronLeft size={16} />
            </Button>
            <span className="text-sm font-semibold text-surface-800 tabular-nums min-w-[7rem] text-center">
              {selectedDate}
            </span>
            <Button variant="ghost" size="sm" aria-label="next" onClick={() => setSelectedDate(shiftDate(selectedDate, +1))}>
              <ChevronRight size={16} />
            </Button>
          </div>
        </header>

        {/* TimeGrid */}
        <div className="flex-1 min-h-0 overflow-y-auto px-4 py-3 pb-16">
          <TimeGrid
            timeboxes={todayBoxes}
            onSlotClick={handleSlotClick}
            onAiSuggest={handleAiSuggest}
            hasSelectedTask={!!selectedTaskId}
          />
        </div>
      </div>

      {/* ── Drag handle 1 ── */}
      <div
        className="w-1 shrink-0 cursor-col-resize bg-surface-200/60 hover:bg-accent-400 active:bg-accent-500 transition-colors"
        onPointerDown={() => handlePointerDown('left')}
      />

      {/* ═══ Column 2: Focus ═══ */}
      <div style={{ width: col2Width }} className="flex flex-col min-h-0 overflow-y-auto shrink-0">
        <div className="flex flex-col gap-3 p-4">
          {/* AI Greeting */}
          <div className="flex items-center gap-2 px-3 py-2.5 bg-surface-0 rounded-xl border border-surface-200/60">
            <TimeIcon />
            <p className="text-xs font-medium text-surface-600 line-clamp-2">{aiGreeting}</p>
          </div>

          {/* Active task — focus card */}
          {activeTask && activeTimer ? (
            <Card className="border-warning-400/30 bg-warning-50/30">
              <CardContent className="flex flex-col gap-2.5 py-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-warning-600">지금 집중</span>
                  <Badge variant="warning" className="text-[10px]">
                    <span className="w-1.5 h-1.5 rounded-full bg-warning-500 animate-pulse" />
                    진행 중
                  </Badge>
                </div>
                <h3 className="text-sm font-semibold text-surface-800">{activeTask.title}</h3>
                {activeTask.description && (
                  <p className="text-xs text-surface-500 line-clamp-2">{activeTask.description}</p>
                )}

                <ElapsedTimer taskId={activeTask.id} estimatedMinutes={activeTask.estimatedMinutes} />

                {/* Pause reason dropdown */}
                {pauseInputId === activeTask.id && (
                  <div className="flex flex-col gap-1.5 p-2 bg-surface-50 rounded-lg border border-surface-200">
                    <label className="text-[11px] text-surface-500 font-medium">정지 사유</label>
                    <select
                      value={pauseReason}
                      onChange={(e) => setPauseReason(e.target.value)}
                      autoFocus
                      className={cn(
                        'w-full px-2.5 py-1.5 text-xs rounded-md',
                        'bg-surface-0 border border-surface-200',
                        'focus:outline-none focus:border-accent-400',
                      )}
                    >
                      <option value="">사유를 선택하세요</option>
                      {PAUSE_REASONS.map((reason) => (
                        <option key={reason} value={reason}>{reason}</option>
                      ))}
                    </select>
                    <div className="flex gap-1.5">
                      <Button size="sm" variant="secondary" className="flex-1 text-xs" disabled={!pauseReason} onClick={() => handlePauseConfirm(activeTask.id)}>
                        확인
                      </Button>
                      <Button size="sm" variant="ghost" className="text-xs" onClick={() => setPauseInputId(null)}>
                        취소
                      </Button>
                    </div>
                  </div>
                )}

                {/* Action buttons */}
                {pauseInputId !== activeTask.id && (
                  <div className="flex gap-2">
                    {activeTimer.isPaused ? (
                      <>
                        <Button size="sm" variant="primary" onClick={() => handleResume(activeTask.id)} className="flex-1 text-xs">
                          ▶ 재개
                        </Button>
                        <Button size="sm" variant="secondary" onClick={() => handleComplete(activeTask.id)} className="flex-1 text-xs">
                          ✓ 완료
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button size="sm" variant="secondary" onClick={() => handlePauseClick(activeTask.id)} className="flex-1 text-xs">
                          ⏸ 잠깐 쉴게요
                        </Button>
                        <Button size="sm" variant="primary" onClick={() => handleComplete(activeTask.id)} className="flex-1 text-xs">
                          ✓ 다 했어요!
                        </Button>
                      </>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ) : switchedTasks.length === 0 ? (
            <Card className="border-surface-200/60">
              <CardContent className="py-4 text-center">
                <p className="text-xs text-surface-400">진행 중인 태스크가 없어요</p>
                <p className="text-[11px] text-surface-300 mt-1">아래에서 "2분만 시작"을 눌러보세요</p>
              </CardContent>
            </Card>
          ) : null}

          {/* Switched (대기 중) task cards — 음영 처리 */}
          {switchedTasks.map((task) => (
            <Card key={task.id} className="border-surface-300/60 bg-surface-100/60 opacity-60">
              <CardContent className="flex flex-col gap-2 py-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-surface-400">대기 중</span>
                  <Badge variant="outline" className="text-[10px]">
                    다른 일 진행 중
                  </Badge>
                </div>
                <h3 className="text-sm font-medium text-surface-500">{task.title}</h3>
                {task.description && (
                  <p className="text-xs text-surface-400 line-clamp-1">{task.description}</p>
                )}
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    className="flex-1 text-xs"
                    disabled={!!activeTask}
                    onClick={() => handleMicroStart(task.id)}
                  >
                    이어서 하기
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="flex-1 text-xs text-surface-400"
                    onClick={() => setSwitchedTaskIds((prev) => prev.filter((id) => id !== task.id))}
                  >
                    카드 닫기
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}

          {/* Upcoming scheduled tasks */}
          {upcomingTasks.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <h4 className="text-xs font-semibold text-surface-500 uppercase tracking-wider px-1">다음 예정</h4>
              {upcomingTasks.map(({ timebox, task }) => (
                <div
                  key={timebox.id}
                  className="flex items-center gap-2 px-3 py-2 bg-surface-0 rounded-lg border border-surface-200/60"
                >
                  <span className="text-xs font-mono text-surface-400 w-10">{slotToTime(timebox.startSlot)}</span>
                  <span className="text-xs font-medium text-surface-700 flex-1 truncate">{task.title}</span>
                  <span className="text-[10px] text-surface-400">{task.estimatedMinutes}분</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-[10px] text-accent-500 px-1.5 py-0.5 h-auto"
                    disabled={!!activeTask}
                    onClick={() => handleMicroStart(task.id)}
                  >
                    시작
                  </Button>
                </div>
              ))}
            </div>
          )}

          {/* Unscheduled tasks */}
          <div className="flex flex-col gap-1.5">
            <h4 className="text-xs font-semibold text-surface-500 uppercase tracking-wider px-1">
              {selectedDate} 배정 태스크 ({unscheduledTasks.length})
            </h4>
            {unscheduledTasks.length === 0 ? (
              <p className="text-xs text-surface-400 text-center py-3">모든 태스크가 배치되었습니다</p>
            ) : (
              unscheduledTasks.map((task) => {
                const isSelected = selectedTaskId === task.id;
                return (
                  <div key={task.id} className="flex flex-col gap-1">
                    <div
                      onClick={() => setSelectedTaskId(isSelected ? null : task.id)}
                      className={cn(
                        'flex items-center gap-2 px-3 py-2.5 rounded-lg cursor-pointer transition-all duration-150',
                        'bg-surface-0 border',
                        isSelected
                          ? 'border-accent-400 ring-1 ring-accent-300 bg-accent-50/30'
                          : 'border-surface-200/60 hover:border-surface-300',
                      )}
                    >
                      <div className="flex-1 min-w-0">
                        <span className="text-xs font-medium text-surface-700 truncate block">{task.title}</span>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] text-surface-400">{task.estimatedMinutes}분</span>
                          <div className="flex gap-0.5">
                            {Array.from({ length: 5 }, (_, i) => (
                              <span key={i} className={cn('w-1 h-1 rounded-full', i < task.importance ? 'bg-accent-400' : 'bg-surface-200')} />
                            ))}
                          </div>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="primary"
                        className="text-[10px] px-2 py-1 h-auto shrink-0"
                        disabled={!!activeTask}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMicroStart(task.id);
                        }}
                      >
                        2분만
                      </Button>
                    </div>
                    {isSelected && (
                      <p className="text-[10px] text-accent-500 text-center py-0.5">
                        왼쪽 시간표에서 원하는 시간을 클릭하세요
                      </p>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Deferred detector — 미루기 탐지 */}
          <DeferredDetector
            deferredTasks={deferredTasksList}
            onMicroStart={handleMicroStart}
            startDisabled={!!activeTask}
          />
        </div>
      </div>

      {/* ── Drag handle 2 ── */}
      <div
        className="w-1 shrink-0 cursor-col-resize bg-surface-200/60 hover:bg-accent-400 active:bg-accent-500 transition-colors"
        onPointerDown={() => handlePointerDown('right')}
      />

      {/* ═══ Column 3: Stats ═══ */}
      <div style={{ width: col3Width }} className="flex flex-col min-h-0 overflow-y-auto shrink-0">
        <div className="flex flex-col gap-4 p-4">
          {/* Completion rate */}
          <Card>
            <CardContent className="flex flex-col items-center py-4 gap-2">
              <h4 className="text-xs font-semibold text-surface-500 self-start">오늘 달성률</h4>
              <ProgressRing value={completionRate} size={90} />
              {dailyStats && (
                <p className="text-[10px] text-surface-400">
                  {dailyStats.completedCount} / {dailyStats.totalPlanned} 완료
                </p>
              )}
            </CardContent>
          </Card>

          {/* Accumulated completed */}
          <Card>
            <CardContent className="flex flex-col gap-1.5 py-3">
              <h4 className="text-xs font-semibold text-surface-500">누적 완료</h4>
              <Badge variant="accent" className="text-xs px-2.5 py-0.5 self-start">
                {accumulatedCompleted}개 완료
              </Badge>
              <p className="text-[10px] text-surface-400">지금까지 해낸 모든 것이에요!</p>
            </CardContent>
          </Card>

          {/* 집중 감시 통계 */}
          <FocusGuardCard stats={focusGuardStats} />

          {/* 오늘의 마음 (Cogito: 감사 + 내적동기) */}
          <TodayMindCard
            gratitude={reflection?.gratitude ?? ''}
            onGratitudeChange={handleGratitudeChange}
          />

          {/* 하루 돌아보기 (Cogito: 피드백 + 미루기 탐지) */}
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
