// @TASK P5-S7 - NotificationSettings component
// @SPEC docs/planning — 알림 설정 (ON/OFF, AI 격려 주기)
import { useSettingStore } from '@renderer/stores/settingStore';
import { Card, CardContent, CardHeader } from '@renderer/components/ui/card';
import { cn } from '@renderer/lib/cn';

const FREQUENCY_OPTIONS = [
  { value: 1, label: '1시간' },
  { value: 2, label: '2시간' },
  { value: 4, label: '4시간' },
  { value: 0, label: '없음' },
];

export function NotificationSettings() {
  const { notificationsEnabled, encouragementInterval, updateSetting } = useSettingStore();

  return (
    <div className="flex flex-col gap-4">
      {/* 알림 ON/OFF */}
      <Card>
        <CardHeader>
          <h3 className="text-sm font-semibold text-surface-700">알림</h3>
        </CardHeader>
        <CardContent>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={notificationsEnabled}
              onChange={(e) => updateSetting('notificationsEnabled', e.target.checked)}
              className={cn(
                'h-4 w-4 rounded border-surface-300',
                'accent-accent-500',
              )}
              aria-label="알림 활성화"
            />
            <span className="text-sm text-surface-700">알림 활성화</span>
          </label>
        </CardContent>
      </Card>

      {/* AI 격려 주기 */}
      <Card>
        <CardHeader>
          <h3 className="text-sm font-semibold text-surface-700">AI 격려 메시지</h3>
        </CardHeader>
        <CardContent>
          <label className="flex flex-col gap-1">
            <span className="text-sm text-surface-600">격려 주기</span>
            <select
              value={encouragementInterval}
              onChange={(e) => updateSetting('encouragementInterval', Number(e.target.value))}
              disabled={!notificationsEnabled}
              className={cn(
                'h-9 rounded-lg border border-surface-200 px-3 text-sm',
                'focus:outline-none focus:ring-2 focus:ring-accent-400',
                'bg-surface-0 text-surface-900',
                'disabled:opacity-40 disabled:cursor-not-allowed',
              )}
              aria-label="AI 격려 메시지 주기"
            >
              {FREQUENCY_OPTIONS.map((opt) => (
                <option key={opt.value} value={String(opt.value)}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>
        </CardContent>
      </Card>
    </div>
  );
}
