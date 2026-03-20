import { Card, CardContent } from '@renderer/components/ui/card';
import { Shield, Clock, AlertTriangle, Monitor } from 'lucide-react';
import { cn } from '@renderer/lib/cn';

interface DistractionRecord {
  app: string;
  title: string;
  startedAt: number;
  durationMs: number;
}

interface VisibleAppRecord {
  app: string;
  title: string;
  detectedCount: number;
}

export interface FocusGuardStats {
  focusMs: number;
  distractionMs: number;
  idleMs: number;
  distractions: DistractionRecord[];
  visibleApps: VisibleAppRecord[];
}

function formatDuration(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  if (totalSec < 60) return `${totalSec}초`;
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return sec > 0 ? `${min}분 ${sec}초` : `${min}분`;
}

function focusPercent(stats: FocusGuardStats): number {
  const total = stats.focusMs + stats.distractionMs + stats.idleMs;
  if (total === 0) return 100;
  return Math.round((stats.focusMs / total) * 100);
}

export function FocusGuardCard({ stats }: { stats: FocusGuardStats | null }) {
  if (!stats) return null;

  const pct = focusPercent(stats);
  const pctColor = pct >= 80 ? 'text-green-400' : pct >= 50 ? 'text-amber-400' : 'text-red-400';

  // 이탈 앱을 시간 기준 정렬
  const topDistractions = [...stats.distractions]
    .reduce<Record<string, number>>((acc, d) => {
      acc[d.app] = (acc[d.app] ?? 0) + d.durationMs;
      return acc;
    }, {});
  const sortedApps = Object.entries(topDistractions)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);

  return (
    <Card>
      <CardContent className="flex flex-col gap-3 py-3">
        <div className="flex items-center gap-1.5">
          <Shield size={14} className="text-accent-500" />
          <h4 className="text-xs font-semibold text-surface-500">집중 감시</h4>
        </div>

        {/* 집중률 */}
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-surface-400">집중률</span>
          <span className={cn('text-lg font-bold', pctColor)}>{pct}%</span>
        </div>

        {/* 시간 분해 */}
        <div className="grid grid-cols-3 gap-2">
          <TimeBlock icon={Clock} label="집중" value={stats.focusMs} color="text-green-400" />
          <TimeBlock icon={AlertTriangle} label="이탈" value={stats.distractionMs} color="text-amber-400" />
          <TimeBlock icon={Monitor} label="자리비움" value={stats.idleMs} color="text-surface-400" />
        </div>

        {/* 이탈 앱 목록 */}
        {sortedApps.length > 0 && (
          <div className="flex flex-col gap-1 mt-1">
            <span className="text-[10px] text-surface-400 font-medium">이탈 앱</span>
            {sortedApps.map(([app, ms]) => (
              <div key={app} className="flex items-center justify-between">
                <span className="text-[11px] text-surface-500 truncate max-w-[120px]">{app}</span>
                <span className="text-[10px] text-surface-400">{formatDuration(ms)}</span>
              </div>
            ))}
          </div>
        )}

        {/* 열려있던 앱 (듀얼 모니터) */}
        {stats.visibleApps.length > 0 && (
          <div className="flex flex-col gap-1 mt-1">
            <span className="text-[10px] text-surface-400 font-medium">배경에 열려있던 앱</span>
            {stats.visibleApps.slice(0, 3).map((v) => (
              <div key={v.app} className="flex items-center justify-between">
                <span className="text-[11px] text-surface-500 truncate max-w-[120px]">{v.app}</span>
                <span className="text-[10px] text-surface-400">{v.detectedCount}회 감지</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function TimeBlock({ icon: Icon, label, value, color }: {
  icon: typeof Clock;
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="flex flex-col items-center gap-0.5 bg-surface-50/50 rounded-lg py-1.5">
      <Icon size={12} className={color} />
      <span className="text-[10px] text-surface-400">{label}</span>
      <span className={cn('text-[11px] font-semibold', color)}>{formatDuration(value)}</span>
    </div>
  );
}
