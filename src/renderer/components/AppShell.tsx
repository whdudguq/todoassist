// @TASK P1-S0 - AppShell: common layout (SidebarNav + main content + AI panel)
// @SPEC docs/planning/03-user-flow.md
import React from 'react';
import { SidebarNav } from './ui/sidebar-nav';
import { useUiStore, type PageRoute } from '@renderer/stores/uiStore';
import { cn } from '@renderer/lib/cn';
import { Dashboard } from '@renderer/screens/Dashboard';
import { Kanban } from '@renderer/screens/Kanban';
import { TaskTree } from '@renderer/screens/TaskTree';
import { Statistics } from '@renderer/screens/Statistics';
import { Settings } from '@renderer/screens/Settings';
import { TaskModal } from '@renderer/modals/TaskModal';
import { AiAssistant } from '@renderer/components/AiAssistant';
import { useTaskStore } from '@renderer/stores/taskStore';
import { getApi } from '@renderer/hooks/useApi';
import type { Task } from '@shared/types';
import type { TaskFormData } from '@renderer/components/TaskForm';

// Map SidebarNav route strings to PageRoute values
const ROUTE_TO_PAGE: Record<string, PageRoute> = {
  '/': 'dashboard',
  '/kanban': 'kanban',
  '/tasks': 'taskTree',
  '/statistics': 'statistics',
  '/settings': 'settings',
};

const PAGE_TO_ROUTE: Record<PageRoute, string> = {
  dashboard: '/',
  kanban: '/kanban',
  taskTree: '/tasks',
  statistics: '/statistics',
  settings: '/settings',
};

function ActivePage({ page }: { page: PageRoute }) {
  switch (page) {
    case 'dashboard':
      return <Dashboard />;
    case 'kanban':
      return <Kanban />;
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
  const currentPage = useUiStore((s) => s.currentPage);
  const aiAssistantOpen = useUiStore((s) => s.aiAssistantOpen);
  const setCurrentPage = useUiStore((s) => s.setCurrentPage);
  const toggleAiAssistant = useUiStore((s) => s.toggleAiAssistant);

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
      <main className="flex-1 overflow-auto">
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
        categories={[]}
        onSubmit={async (data: TaskFormData) => {
          const api = getApi();
          const now = Date.now();
          const taskData = {
            title: data.title,
            description: data.description || '',
            deadline: data.deadline,
            estimatedMinutes: data.estimatedMinutes,
            importance: data.importance,
            category: data.category || '',
            parentId: data.parentId,
          };
          if (api) {
            const created = await api.tasks.create(taskData) as Task;
            useTaskStore.getState().addTask(created);
          } else {
            // Dev mode fallback: add to store with temp ID
            const tempTask: Task = {
              id: crypto.randomUUID(),
              ...taskData,
              relatedClass: '',
              status: 'pending',
              progress: 0,
              templateId: null,
              createdAt: now,
              updatedAt: now,
              completedAt: null,
            };
            useTaskStore.getState().addTask(tempTask);
          }
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
