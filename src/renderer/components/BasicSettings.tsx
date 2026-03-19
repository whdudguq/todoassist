// @TASK P5-S7 - BasicSettings form component
// @SPEC docs/planning — 기본 설정 (이름, 근무시간, API 키, 백업)
import { useState } from 'react';
import { useSettingStore } from '@renderer/stores/settingStore';
import { Button } from '@renderer/components/ui/button';
import { Card, CardContent, CardHeader } from '@renderer/components/ui/card';
import { cn } from '@renderer/lib/cn';

interface BasicSettingsProps {
  onTestApi: () => void;
  onBackup: () => void;
  onRestore: () => void;
  apiTestStatus?: 'idle' | 'testing' | 'success' | 'fail';
}

export function BasicSettings({ onTestApi, onBackup, onRestore, apiTestStatus = 'idle' }: BasicSettingsProps) {
  const {
    userName,
    workHoursStart,
    workHoursEnd,
    apiKey,
    isApiValid,
    updateSetting,
    setApiKey,
  } = useSettingStore();

  const [showApiKey, setShowApiKey] = useState(false);

  return (
    <div className="flex flex-col gap-4">
      {/* 사용자 정보 */}
      <Card>
        <CardHeader>
          <h3 className="text-sm font-semibold text-surface-700">사용자 정보</h3>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-sm text-surface-600">사용자 이름</span>
            <input
              type="text"
              value={userName}
              onChange={(e) => updateSetting('userName', e.target.value)}
              placeholder="이름을 입력하세요"
              className={cn(
                'h-9 rounded-lg border border-surface-200 px-3 text-sm',
                'focus:outline-none focus:ring-2 focus:ring-accent-400',
                'bg-surface-0 text-surface-900',
              )}
              aria-label="사용자 이름"
            />
          </label>
        </CardContent>
      </Card>

      {/* 근무 시간 */}
      <Card>
        <CardHeader>
          <h3 className="text-sm font-semibold text-surface-700">근무 시간</h3>
        </CardHeader>
        <CardContent className="flex gap-4">
          <label className="flex flex-col gap-1 flex-1">
            <span className="text-sm text-surface-600">시작</span>
            <input
              type="time"
              value={workHoursStart}
              onChange={(e) => updateSetting('workHoursStart', e.target.value)}
              className={cn(
                'h-9 rounded-lg border border-surface-200 px-3 text-sm',
                'focus:outline-none focus:ring-2 focus:ring-accent-400',
                'bg-surface-0 text-surface-900',
              )}
              aria-label="시작"
            />
          </label>
          <label className="flex flex-col gap-1 flex-1">
            <span className="text-sm text-surface-600">종료</span>
            <input
              type="time"
              value={workHoursEnd}
              onChange={(e) => updateSetting('workHoursEnd', e.target.value)}
              className={cn(
                'h-9 rounded-lg border border-surface-200 px-3 text-sm',
                'focus:outline-none focus:ring-2 focus:ring-accent-400',
                'bg-surface-0 text-surface-900',
              )}
              aria-label="종료"
            />
          </label>
        </CardContent>
      </Card>

      {/* API 키 */}
      <Card>
        <CardHeader>
          <h3 className="text-sm font-semibold text-surface-700">Claude API</h3>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <label htmlFor="api-key-input" className="text-sm text-surface-600">API 키</label>
            <div className="flex gap-2">
              <input
                id="api-key-input"
                type={showApiKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="sk-ant-..."
                className={cn(
                  'h-9 flex-1 rounded-lg border border-surface-200 px-3 text-sm font-mono',
                  'focus:outline-none focus:ring-2 focus:ring-accent-400',
                  'bg-surface-0 text-surface-900',
                )}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowApiKey((prev) => !prev)}
                aria-label={showApiKey ? '숨기기' : '표시'}
              >
                {showApiKey ? '숨기기' : '표시'}
              </Button>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={onTestApi}
              disabled={apiTestStatus === 'testing'}
            >
              {apiTestStatus === 'testing' ? '테스트 중...' : '연결 테스트'}
            </Button>
            {apiTestStatus === 'success' && (
              <span className="text-xs text-success-600">연결 성공!</span>
            )}
            {apiTestStatus === 'fail' && (
              <span className="text-xs text-red-500">연결 실패 — API 키를 확인하세요</span>
            )}
            {apiTestStatus === 'idle' && isApiValid && (
              <span className="text-xs text-success-600">연결됨</span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 데이터 백업 */}
      <Card>
        <CardHeader>
          <h3 className="text-sm font-semibold text-surface-700">데이터 관리</h3>
        </CardHeader>
        <CardContent className="flex gap-2">
          <Button type="button" variant="secondary" size="sm" onClick={onBackup}>
            백업
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={onRestore}>
            복원
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
