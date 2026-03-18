// @TASK DEV - Dev mode mock data initializer
// Seeds stores with realistic mock data when running without Electron IPC (Vite dev server)
import { useEffect } from 'react';
import { useTaskStore } from '@renderer/stores/taskStore';
import { useDashboardStore } from '@renderer/stores/dashboardStore';
import { getApi } from './useApi';
import type { Task } from '@shared/types';

const MOCK_TASKS: Task[] = [
  {
    id: 'mock-1',
    title: '품질 리포트 작성',
    description: '월간 품질 현황 보고서 작성',
    deadline: Date.now() + 86400000,
    estimatedMinutes: 120,
    importance: 4,
    category: '품질검사',
    relatedClass: '',
    parentId: null,
    status: 'pending',
    progress: 0,
    templateId: null,
    createdAt: Date.now() - 3600000,
    updatedAt: Date.now() - 3600000,
    completedAt: null,
  },
  {
    id: 'mock-2',
    title: '데이터 수집',
    description: '품질 데이터 수집 및 정리',
    deadline: Date.now() + 86400000,
    estimatedMinutes: 45,
    importance: 3,
    category: '품질검사',
    relatedClass: '',
    parentId: 'mock-1',
    status: 'pending',
    progress: 0,
    templateId: null,
    createdAt: Date.now() - 3000000,
    updatedAt: Date.now() - 3000000,
    completedAt: null,
  },
  {
    id: 'mock-3',
    title: '보고서 작성',
    description: '수집된 데이터 기반 보고서 작성',
    deadline: Date.now() + 86400000,
    estimatedMinutes: 60,
    importance: 3,
    category: '보고서',
    relatedClass: '',
    parentId: 'mock-1',
    status: 'pending',
    progress: 0,
    templateId: null,
    createdAt: Date.now() - 2400000,
    updatedAt: Date.now() - 2400000,
    completedAt: null,
  },
  {
    id: 'mock-4',
    title: '이메일 확인',
    description: '오전 이메일 확인 및 답변',
    deadline: null,
    estimatedMinutes: 30,
    importance: 2,
    category: '이메일',
    relatedClass: '',
    parentId: null,
    status: 'pending',
    progress: 0,
    templateId: null,
    createdAt: Date.now() - 1800000,
    updatedAt: Date.now() - 1800000,
    completedAt: null,
  },
  {
    id: 'mock-5',
    title: '팀 미팅',
    description: '주간 팀 미팅 참석',
    deadline: Date.now() + 7200000,
    estimatedMinutes: 60,
    importance: 5,
    category: '회의',
    relatedClass: '',
    parentId: null,
    status: 'in_progress',
    progress: 30,
    templateId: null,
    createdAt: Date.now() - 7200000,
    updatedAt: Date.now() - 1200000,
    completedAt: null,
  },
];

export function useDevData() {
  useEffect(() => {
    const api = getApi();
    // Only seed mock data in dev mode (no Electron IPC)
    if (api) return;

    const tasks = useTaskStore.getState().tasks;
    if (tasks.length > 0) return; // already seeded

    useTaskStore.getState().setTasks(MOCK_TASKS);

    useDashboardStore.getState().setAiGreeting('오늘도 화이팅! 작은 것부터 시작해봐요.');
    useDashboardStore.getState().setAccumulatedCompleted(12);
    useDashboardStore.getState().setWeeklyData([
      { date: '월', completionRate: 60 },
      { date: '화', completionRate: 75 },
      { date: '수', completionRate: 40 },
      { date: '목', completionRate: 80 },
      { date: '금', completionRate: 65 },
      { date: '토', completionRate: 30 },
      { date: '일', completionRate: 0 },
    ]);
  }, []);
}
