// @TASK INT-2 - Safe accessor for window.api (returns null in test / non-Electron environments)
import type { ElectronApi } from '../../preload/index';

/**
 * Returns window.api when running inside Electron renderer, or null otherwise.
 * All callers must guard: const api = getApi(); if (!api) return;
 */
export function getApi(): ElectronApi | null {
  if (typeof window !== 'undefined' && 'api' in window) {
    return (window as Window & { api: ElectronApi }).api;
  }
  return null;
}
