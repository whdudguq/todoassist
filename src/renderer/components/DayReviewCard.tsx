// @TASK P4-S2 - 하루 돌아보기: 3-phase feedback + procrastination detector
import { Card, CardContent, CardHeader } from './ui/card';
import { cn } from '@renderer/lib/cn';

const NUDGE_MESSAGES: string[] = [
  '조금씩만 시작해볼까?',
  '5분만 해볼까?',
  '작은 첫 걸음이면 충분해요.',
  '부담 없이 딱 한 단계만요.',
  '지금 바로 시작하면 내일이 편해져요.',
];

function getDayNudge(taskId: string): string {
  // Stable per task: use last char code of id for variety
  const code = taskId.charCodeAt(taskId.length - 1);
  return NUDGE_MESSAGES[code % NUDGE_MESSAGES.length];
}

type FeedbackPhase = 'start' | 'mid' | 'end';

interface FeedbackPhaseConfig {
  phase: FeedbackPhase;
  label: string;
  placeholder: string;
  activeHourMin: number;
  activeHourMax: number;
}

const PHASES: FeedbackPhaseConfig[] = [
  {
    phase: 'start',
    label: '시작',
    placeholder: '오늘 하루 화이팅!',
    activeHourMin: 0,
    activeHourMax: 11,
  },
  {
    phase: 'mid',
    label: '중간',
    placeholder: '오후도 수고했다!',
    activeHourMin: 12,
    activeHourMax: 17,
  },
  {
    phase: 'end',
    label: '마무리',
    placeholder: '오늘 하루 고생했어!',
    activeHourMin: 18,
    activeHourMax: 23,
  },
];

function getActivePhase(hour: number): FeedbackPhase {
  if (hour < 12) return 'start';
  if (hour < 18) return 'mid';
  return 'end';
}

interface DeferredTask {
  id: string;
  title: string;
  deferredDays: number;
}

interface DayReviewCardProps {
  feedbackStart: string;
  feedbackMid: string;
  feedbackEnd: string;
  onFeedbackChange: (phase: FeedbackPhase, value: string) => void;
  deferredTasks: DeferredTask[];
  onMicroStart: (id: string) => void;
}

const feedbackValueMap: Record<FeedbackPhase, keyof Pick<DayReviewCardProps, 'feedbackStart' | 'feedbackMid' | 'feedbackEnd'>> = {
  start: 'feedbackStart',
  mid: 'feedbackMid',
  end: 'feedbackEnd',
};

export function DayReviewCard({
  feedbackStart,
  feedbackMid,
  feedbackEnd,
  onFeedbackChange,
  deferredTasks,
  onMicroStart,
}: DayReviewCardProps) {
  const hour = new Date().getHours();
  const activePhase = getActivePhase(hour);

  const values: Record<FeedbackPhase, string> = {
    start: feedbackStart,
    mid: feedbackMid,
    end: feedbackEnd,
  };

  return (
    <Card data-testid="day-review-card">
      <CardHeader>
        <h2 className="text-sm font-semibold text-surface-700">하루 돌아보기</h2>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {/* 3-phase feedback inputs */}
        <div className="flex flex-col gap-2">
          {PHASES.map(({ phase, label, placeholder }) => {
            const isActive = phase === activePhase;
            return (
              <div key={phase} className="flex items-start gap-2">
                {/* Phase dot indicator */}
                <span
                  className={cn(
                    'mt-2.5 h-2 w-2 rounded-full shrink-0',
                    isActive ? 'bg-accent-500' : 'bg-surface-300',
                  )}
                  aria-hidden="true"
                />
                <div className="flex flex-col gap-0.5 flex-1">
                  <span
                    className={cn(
                      'text-xs font-medium',
                      isActive ? 'text-accent-500' : 'text-surface-400',
                    )}
                  >
                    {label}
                  </span>
                  <textarea
                    rows={1}
                    value={values[phase]}
                    onChange={(e) => onFeedbackChange(phase, e.target.value)}
                    placeholder={placeholder}
                    aria-label={`${label} 피드백`}
                    className={cn(
                      'w-full resize-none rounded-lg px-3 py-2',
                      'text-sm text-surface-700 placeholder:text-surface-400',
                      'bg-[var(--color-surface-50)]',
                      'focus:outline-none focus:ring-2 focus:ring-accent-200 focus:border-accent-200',
                      'transition-colors duration-150',
                      isActive
                        ? 'border border-accent-200'
                        : 'border border-surface-200/60',
                    )}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Deferred tasks section */}
        {deferredTasks.length > 0 && (
          <div className="flex flex-col gap-2 pt-1 border-t border-surface-200/60">
            <div className="flex items-center gap-1.5">
              <span className="text-sm" aria-hidden="true">⚠️</span>
              <span className="text-xs font-medium text-surface-400">미루기 탐지</span>
            </div>
            <div className="flex flex-col gap-2">
              {deferredTasks.map((task) => (
                <div key={task.id} className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    {/* Yellow dot */}
                    <span
                      className="h-2 w-2 rounded-full bg-[var(--color-warning-400,#facc15)] shrink-0"
                      aria-hidden="true"
                    />
                    <span className="text-xs text-surface-700 truncate">{task.title}</span>
                    <span className="text-xs text-surface-400 shrink-0 whitespace-nowrap">
                      {task.deferredDays}일째
                    </span>
                  </div>
                  <div className="flex flex-col items-end gap-0.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => onMicroStart(task.id)}
                      className={[
                        'text-xs px-2 py-1 rounded-md',
                        'bg-accent-500 text-white',
                        'hover:bg-accent-600 active:bg-accent-700',
                        'transition-colors duration-150',
                        'whitespace-nowrap',
                      ].join(' ')}
                      aria-label={`${task.title} 시작하기`}
                    >
                      시작
                    </button>
                    <span className="text-[10px] text-surface-400 leading-tight max-w-[100px] text-right">
                      {getDayNudge(task.id)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
