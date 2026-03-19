import { useTaskStore } from '@renderer/stores/taskStore';
import { useTimerStore } from '@renderer/stores/timerStore';
import { getApi } from '@renderer/hooks/useApi';

/**
 * 현재 진행 중인(in_progress + timer active) 태스크가 있는지 확인.
 * 있으면 true → 다른 태스크 시작을 차단해야 함.
 */
export function hasActiveTask(): boolean {
  const tasks = useTaskStore.getState().tasks;
  const timers = useTimerStore.getState().timers;
  return tasks.some((t) => t.status === 'in_progress' && timers[t.id]);
}

/**
 * 태스크 시작. 진행 중인 태스크가 있으면 차단(no-op).
 * 같은 태스크를 다시 시작하려 해도 멱등 처리.
 */
export function microStart(taskId: string): boolean {
  const tasks = useTaskStore.getState().tasks;
  const timers = useTimerStore.getState().timers;
  const currentActive = tasks.find((t) => t.status === 'in_progress' && timers[t.id]);

  // 이미 같은 태스크 → 멱등
  if (currentActive && currentActive.id === taskId) return false;

  // 다른 태스크 진행 중 → 차단
  if (currentActive) return false;

  // 시작
  const api = getApi();
  useTimerStore.getState().startTimer(taskId);
  useTaskStore.getState().updateTask(taskId, { status: 'in_progress' });
  if (api) api.tasks.update(taskId, { status: 'in_progress' }).catch(console.error);
  return true;
}
