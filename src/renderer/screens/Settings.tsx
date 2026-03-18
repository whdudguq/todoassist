// @TASK P5-S7 - Settings screen (3 tabs: 기본, 카테고리, 알림)
// @SPEC docs/planning — 설정 화면
import { useState, useEffect } from 'react';
import { useSettingStore } from '@renderer/stores/settingStore';
import { BasicSettings } from '@renderer/components/BasicSettings';
import { CategoryManager } from '@renderer/components/CategoryManager';
import { NotificationSettings } from '@renderer/components/NotificationSettings';
import { Button } from '@renderer/components/ui/button';
import { cn } from '@renderer/lib/cn';
import type { Category, Setting } from '@shared/types';
import { getApi } from '@renderer/hooks/useApi';

type TabKey = '기본' | '카테고리' | '알림';

const TABS: TabKey[] = ['기본', '카테고리', '알림'];

export function Settings() {
  const [activeTab, setActiveTab] = useState<TabKey>('기본');

  // Category local state (renderer-only for now)
  const [categories, setCategories] = useState<Category[]>([
    { id: 'cat-default', name: '일반', color: '#f59e0b', icon: '📌', createdAt: Date.now() },
  ]);

  const { updateSetting } = useSettingStore();

  // ── IPC: load settings on mount ───────────────────────────
  useEffect(() => {
    const api = getApi();
    if (!api) return;

    const SETTING_KEYS = [
      'userName',
      'workHoursStart',
      'workHoursEnd',
      'apiKey',
      'notificationsEnabled',
      'encouragementInterval',
    ] as const;

    Promise.all(SETTING_KEYS.map((key) => api.settings.get(key))).then((results) => {
      const partial: Record<string, string | boolean | number> = {};
      (results as Array<Setting | null>).forEach((row, i) => {
        if (!row) return;
        const key = SETTING_KEYS[i];
        try {
          partial[key] = JSON.parse(row.value) as string | boolean | number;
        } catch {
          partial[key] = row.value;
        }
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      useSettingStore.getState().loadSettings(partial as any);
    }).catch(console.error);

    // Load categories from DB
    api.category.getAll().then((cats) => {
      setCategories(cats as Category[]);
    }).catch(console.error);
  }, []);

  // ── Tab handlers ──────────────────────────────────────────

  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  function handleSave() {
    const api = getApi();
    if (!api) {
      alert('설정이 저장되었습니다. (개발 모드: 메모리에만 저장됨)');
      return;
    }

    setSaveStatus('saving');
    const store = useSettingStore.getState();
    const entries: Array<[string, unknown]> = [
      ['userName', store.userName],
      ['workHoursStart', store.workHoursStart],
      ['workHoursEnd', store.workHoursEnd],
      ['apiKey', store.apiKey],
      ['notificationsEnabled', store.notificationsEnabled],
      ['encouragementInterval', store.encouragementInterval],
    ];

    Promise.all(
      entries.map(([key, value]) => api.settings.update(key, JSON.stringify(value)))
    ).then(() => {
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    }).catch((err) => {
      console.error('[Settings] save error:', err);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    });
  }

  // ── Category handlers ─────────────────────────────────────

  function handleAddCategory() {
    const api = getApi();
    const input = { name: '새 카테고리', color: '#a1a1aa', icon: '🏷️' };
    if (api) {
      api.category.create(input).then((cat) => {
        setCategories((prev) => [...prev, cat as Category]);
      }).catch(console.error);
    } else {
      // fallback for test / non-Electron environment
      const newCat: Category = { id: `cat-${Date.now()}`, ...input, createdAt: Date.now() };
      setCategories((prev) => [...prev, newCat]);
    }
  }

  function handleUpdateCategory(
    id: string,
    partial: Partial<Omit<Category, 'id' | 'createdAt'>>,
  ) {
    // Optimistic update
    setCategories((prev) => prev.map((c) => (c.id === id ? { ...c, ...partial } : c)));
    const api = getApi();
    if (api) {
      api.category.update(id, partial).catch(console.error);
    }
  }

  function handleDeleteCategory(id: string) {
    // Optimistic delete
    setCategories((prev) => prev.filter((c) => c.id !== id));
    const api = getApi();
    if (api) {
      api.category.delete(id).catch(console.error);
    }
  }

  // ── BasicSettings callbacks ───────────────────────────────

  function handleTestApi() {
    const api = getApi();
    if (!api) {
      // Dev mode: simulate a successful API key test
      console.info('[Settings] Dev mode: simulating API key test success.');
      useSettingStore.getState().setApiValid(true);
      return;
    }
    api.ai.chat('test').then(() => {
      useSettingStore.getState().setApiValid(true);
    }).catch(() => {
      useSettingStore.getState().setApiValid(false);
    });
  }

  function handleBackup() {
    console.log('[Settings] backup...');
  }

  function handleRestore() {
    console.log('[Settings] restore...');
  }

  // ── Render ────────────────────────────────────────────────

  return (
    <div
      data-testid="page-settings"
      className="flex h-full flex-col gap-0 bg-surface-50"
    >
      {/* Header */}
      <div className="border-b border-surface-200 bg-surface-0 px-6 py-4">
        <h1 className="text-lg font-semibold text-surface-900">설정</h1>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 border-b border-surface-200 bg-surface-0 px-6">
        {TABS.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={cn(
              'px-4 py-2.5 text-sm font-medium transition-all duration-150',
              'border-b-2 -mb-px',
              activeTab === tab
                ? 'border-accent-500 text-accent-600'
                : 'border-transparent text-surface-500 hover:text-surface-700',
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {activeTab === '기본' && (
          <BasicSettings
            onTestApi={handleTestApi}
            onBackup={handleBackup}
            onRestore={handleRestore}
          />
        )}

        {activeTab === '카테고리' && (
          <CategoryManager
            categories={categories}
            onAdd={handleAddCategory}
            onUpdate={handleUpdateCategory}
            onDelete={handleDeleteCategory}
          />
        )}

        {activeTab === '알림' && <NotificationSettings />}
      </div>

      {/* Footer: 저장 button */}
      <div className="border-t border-surface-200 bg-surface-0 px-6 py-4">
        <Button
          type="button"
          variant="primary"
          size="lg"
          onClick={handleSave}
          disabled={saveStatus === 'saving'}
          className="w-full sm:w-auto"
        >
          {saveStatus === 'saving' ? '저장 중...' : saveStatus === 'saved' ? '저장 완료!' : saveStatus === 'error' ? '저장 실패' : '저장'}
        </Button>
      </div>
    </div>
  );
}
