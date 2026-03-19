// @TASK P1-S0 - AppShell: common layout (SidebarNav + main content + AI panel)
// @SPEC docs/planning/03-user-flow.md
import React, { useState, useEffect } from 'react';
import { SidebarNav } from './ui/sidebar-nav';
import { useUiStore, type PageRoute } from '@renderer/stores/uiStore';
import { cn } from '@renderer/lib/cn';
import { FocusDay } from '@renderer/screens/FocusDay';
import { Dashboard } from '@renderer/screens/Dashboard';
import { MonthCalendar } from '@renderer/screens/MonthCalendar';
import { TaskTree } from '@renderer/screens/TaskTree';
import { Statistics } from '@renderer/screens/Statistics';
import { Settings } from '@renderer/screens/Settings';
import { TaskModal } from '@renderer/modals/TaskModal';
import { AiAssistant } from '@renderer/components/AiAssistant';
import { useTaskStore } from '@renderer/stores/taskStore';
import { getApi } from '@renderer/hooks/useApi';
import { useDevData } from '@renderer/hooks/useDevData';
import type { Task, Category } from '@shared/types';
import type { TaskFormData } from '@renderer/components/TaskForm';

// Map SidebarNav route strings to PageRoute values
const ROUTE_TO_PAGE: Record<string, PageRoute> = {
  '/': 'dashboard',
  '/calendar': 'calendar',
  '/tasks': 'taskTree',
  '/statistics': 'statistics',
  '/settings': 'settings',
};

const PAGE_TO_ROUTE: Record<PageRoute, string> = {
  dashboard: '/',
  calendar: '/calendar',
  taskTree: '/tasks',
  statistics: '/statistics',
  settings: '/settings',
};

function ActivePage({ page }: { page: PageRoute }) {
  switch (page) {
    case 'dashboard':
      return <FocusDay />;
    case 'calendar':
      return <MonthCalendar />;
    case 'taskTree':
      return <TaskTree />;
    case 'statistics':
      return <Statistics />;
    case 'settings':
      return <Settings />;
    default:
      return <Dashboard />;
  }
}

export function AppShell() {
  useDevData(); // Seeds mock data in dev mode (no-op in Electron)

  const currentPage = useUiStore((s) => s.currentPage);
  const aiAssistantOpen = useUiStore((s) => s.aiAssistantOpen);
  const setCurrentPage = useUiStore((s) => s.setCurrentPage);
  const toggleAiAssistant = useUiStore((s) => s.toggleAiAssistant);
  const selectedTaskId = useTaskStore((s) => s.selectedTaskId);
  const tasks = useTaskStore((s) => s.tasks);
  const editingTask = selectedTaskId ? tasks.find((t) => t.id === selectedTaskId) : undefined;

  const modalOpen = useUiStore((s) => s.modalOpen);
  const [categories, setCategories] = useState<Category[]>([]);

  // ── 전역 데이터 로드: 태스크 + 카테고리 (한 번만) ──
  useEffect(() => {
    const api = getApi();
    if (!api) return;
    api.tasks.getAll().then((ts) => {
      useTaskStore.getState().setTasks(ts as Task[]);
    }).catch(console.error);
    api.category.getAll().then((cats) => setCategories(cats as Category[])).catch(console.error);
  }, []);

  // 카테고리는 모달 열릴 때 갱신
  useEffect(() => {
    if (!modalOpen) return;
    const api = getApi();
    if (!api) return;
    api.category.getAll().then((cats) => setCategories(cats as Category[])).catch(console.error);
  }, [modalOpen]);

  function handleNavigate(route: string) {
    const page = ROUTE_TO_PAGE[route];
    if (page) setCurrentPage(page);
  }

  return (
    <div className={cn('flex flex-row h-screen bg-surface-50 overflow-hidden')}>
      {/* Sidebar — always visible, 52px */}
      <SidebarNav
        activeRoute={PAGE_TO_ROUTE[currentPage]}
        onNavigate={handleNavigate}
        onToggleChat={toggleAiAssistant}
      />

      {/* Main content area */}
      <main className="flex-1 overflow-hidden">
        <ActivePage page={currentPage} />
      </main>

      {/* AI assistant panel — conditional, 300px */}
      {aiAssistantOpen && (
        <section
          aria-label="AI Assistant"
          className={cn(
            'w-[300px] h-full',
            'bg-surface-0 border-l border-surface-200/60',
            'flex flex-col',
          )}
        >
          <AiAssistant />
        </section>
      )}

      {/* Task Modal (global) */}
      <TaskModal
        task={editingTask}
        categories={categories}
        onSubmit={async (data: TaskFormData) => {
          const api = getApi();
          const selectedId = useTaskStore.getState().selectedTaskId;

          const taskData = {
            title: data.title,
            description: data.description || '',
            deadline: data.deadline,
            estimatedMinutes: data.estimatedMinutes,
            importance: data.importance,
            category: data.category || '',
            parentId: data.parentId,
          };

          if (selectedId) {
            // Update existing task
            if (api) {
              const updated = await api.tasks.update(selectedId, taskData) as Task;
              useTaskStore.getState().updateTask(selectedId, updated);
            } else {
              useTaskStore.getState().updateTask(selectedId, taskData);
            }
          } else {
            // Create new task
            if (api) {
              const created = await api.tasks.create(taskData) as Task;
              useTaskStore.getState().addTask(created);
            } else {
              const now = Date.now();
              const tempTask: Task = {
                id: crypto.randomUUID(),
                ...taskData,
                importance: taskData.importance as Task['importance'],
                relatedClass: '',
                status: 'pending',
                progress: 0,
                templateId: null,
                createdAt: now,
                updatedAt: now,
                completedAt: null,
                scheduledDate: null,
              };
              useTaskStore.getState().addTask(tempTask);
            }
          }
          useTaskStore.getState().setSelectedTask(null);
        }}
        onAiEstimate={async (title: string, desc?: string) => {
          const api = getApi();
          if (api) {
            return await api.ai.estimateTask(title, desc) as { estimatedMinutes: number; importance: number; category: string };
          }
          return { estimatedMinutes: 30, importance: 3, category: '기타' };
        }}
      />
    </div>
  );
}
