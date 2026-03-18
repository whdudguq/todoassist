// @TASK P4-S2 - 오늘의 마음: gratitude input + date-stable motivation quote
import { Card, CardContent, CardHeader } from './ui/card';

const MOTIVATION_QUOTES: string[] = [
  '이 길은 내가 선택했고, 어려움은 나를 성장시킨다.',
  '나는 날마다 모든 면에서 점점 더 나아지고 있다.',
  '완벽하진 않지만 성장하는 과정을 기록하고 있다.',
  '뇌는 인정받은 행동을 반복하려는 경향이 있습니다.',
  '작은 보상을 인식할 때 보상 회로가 활성화됩니다.',
  '고통을 \u2018실패 신호\u2019가 아니라 \u2018성장 신호\u2019로 해석해보세요.',
  '기록하지 않으면 불안과 문제에 더 쉽게 집중합니다.',
  '나는 스스로의 약속을 지키는 사람이다.',
  '변화하려고 노력했지만 실패가 반복된다면, 다른 방법으로 해볼 때입니다.',
  '매일 한 줄이라도 꾸준히 적으신다면 분명 다른 인생이 펼쳐질 거라 확신합니다.',
];

function getDailyQuote(): string {
  const d = new Date();
  // Stable index based on day-of-year so the quote changes daily but is fixed within the day
  const start = new Date(d.getFullYear(), 0, 0);
  const diff = d.getTime() - start.getTime();
  const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24));
  return MOTIVATION_QUOTES[dayOfYear % MOTIVATION_QUOTES.length];
}

interface TodayMindCardProps {
  gratitude: string;
  onGratitudeChange: (value: string) => void;
}

export function TodayMindCard({ gratitude, onGratitudeChange }: TodayMindCardProps) {
  const quote = getDailyQuote();

  return (
    <Card data-testid="today-mind-card">
      <CardHeader>
        <h2 className="text-sm font-semibold text-surface-700">오늘의 마음</h2>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {/* Gratitude input */}
        <div className="flex flex-col gap-1">
          <label
            htmlFor="gratitude-input"
            className="text-xs font-medium text-surface-400"
          >
            감사
          </label>
          <textarea
            id="gratitude-input"
            rows={1}
            value={gratitude}
            onChange={(e) => onGratitudeChange(e.target.value)}
            placeholder="오늘 감사한 것 한 가지..."
            className={[
              'w-full resize-none rounded-lg px-3 py-2',
              'text-sm text-surface-700 placeholder:text-surface-400',
              'bg-[var(--color-surface-50)] border border-surface-200/60',
              'focus:outline-none focus:ring-2 focus:ring-accent-200 focus:border-accent-200',
              'transition-colors duration-150',
            ].join(' ')}
          />
        </div>

        {/* Daily motivation quote */}
        <div className="flex items-start gap-2 pt-1">
          <span className="text-accent-500 text-sm leading-none shrink-0" aria-hidden="true">
            💬
          </span>
          <p className="text-xs text-surface-400 leading-relaxed italic">
            "{quote}"
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
