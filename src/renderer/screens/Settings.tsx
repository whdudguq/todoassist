// @TASK P5-S7 - Settings screen (3 tabs: 기본, 카테고리, 알림)
// @SPEC docs/planning — 설정 화면
import { useState } from 'react';
import { useSettingStore } from '@renderer/stores/settingStore';
import { BasicSettings } from '@renderer/components/BasicSettings';
import { CategoryManager } from '@renderer/components/CategoryManager';
import { NotificationSettings } from '@renderer/components/NotificationSettings';
import { Button } from '@renderer/components/ui/button';
import { cn } from '@renderer/lib/cn';
import type { Category } from '@shared/types';

type TabKey = '기본' | '카테고리' | '알림';

const TABS: TabKey[] = ['기본', '카테고리', '알림'];

export function Settings() {
  const [activeTab, setActiveTab] = useState<TabKey>('기본');

  // Category local state (renderer-only for now)
  const [categories, setCategories] = useState<Category[]>([
    { id: 'cat-default', name: '일반', color: '#f59e0b', icon: '📌', createdAt: Date.now() },
  ]);

  const { updateSetting } = useSettingStore();

  // ── Tab handlers ──────────────────────────────────────────

  function handleSave() {
    // Persist via IPC if needed; for now just a no-op stub
    console.log('[Settings] saved');
  }

  // ── Category handlers ─────────────────────────────────────

  function handleAddCategory() {
    const newCat: Category = {
      id: `cat-${Date.now()}`,
      name: '새 카테고리',
      color: '#a1a1aa',
      icon: '🏷️',
      createdAt: Date.now(),
    };
    setCategories((prev) => [...prev, newCat]);
  }

  function handleUpdateCategory(
    id: string,
    partial: Partial<Omit<Category, 'id' | 'createdAt'>>,
  ) {
    setCategories((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...partial } : c)),
    );
  }

  function handleDeleteCategory(id: string) {
    setCategories((prev) => prev.filter((c) => c.id !== id));
  }

  // ── BasicSettings callbacks ───────────────────────────────

  function handleTestApi() {
    console.log('[Settings] testing API...');
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
          className="w-full sm:w-auto"
        >
          저장
        </Button>
      </div>
    </div>
  );
}
