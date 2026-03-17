// @TASK INT-2 - Window.api type declaration (generated from preload/index.ts)
import type { ElectronApi } from '../../preload/index';

declare global {
  interface Window {
    api: ElectronApi;
  }
}

export {};
