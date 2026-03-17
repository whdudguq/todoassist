// @vitest-environment jsdom
// @TASK P5-S7 - Settings screen tests
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom';
import { useSettingStore } from '@renderer/stores/settingStore';

// Mock settingStore
vi.mock('@renderer/stores/settingStore', () => ({
  useSettingStore: vi.fn(),
}));

// Mock child components to isolate Settings screen tests
vi.mock('@renderer/components/BasicSettings', () => ({
  BasicSettings: () => <div data-testid="basic-settings">BasicSettings</div>,
}));
vi.mock('@renderer/components/CategoryManager', () => ({
  CategoryManager: () => <div data-testid="category-manager">CategoryManager</div>,
}));
vi.mock('@renderer/components/NotificationSettings', () => ({
  NotificationSettings: () => <div data-testid="notification-settings">NotificationSettings</div>,
}));

import { Settings } from '@renderer/screens/Settings';

const mockStore = {
  userName: 'testuser',
  workHoursStart: '09:00',
  workHoursEnd: '18:00',
  apiKey: 'sk-test',
  notificationsEnabled: true,
  encouragementInterval: 2,
  isApiValid: false,
  updateSetting: vi.fn(),
  setApiKey: vi.fn(),
  setApiValid: vi.fn(),
  loadSettings: vi.fn(),
};

beforeEach(() => {
  vi.clearAllMocks();
  (useSettingStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue(mockStore);
});

describe('Settings screen', () => {
  it('renders 3 tabs: 기본, 카테고리, 알림', () => {
    render(<Settings />);
    expect(screen.getByRole('button', { name: '기본' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '카테고리' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '알림' })).toBeInTheDocument();
  });

  it('default tab is 기본 — shows BasicSettings', () => {
    render(<Settings />);
    expect(screen.getByTestId('basic-settings')).toBeInTheDocument();
    expect(screen.queryByTestId('category-manager')).not.toBeInTheDocument();
    expect(screen.queryByTestId('notification-settings')).not.toBeInTheDocument();
  });

  it('clicking 카테고리 tab shows CategoryManager', () => {
    render(<Settings />);
    fireEvent.click(screen.getByRole('button', { name: '카테고리' }));
    expect(screen.getByTestId('category-manager')).toBeInTheDocument();
    expect(screen.queryByTestId('basic-settings')).not.toBeInTheDocument();
  });

  it('clicking 알림 tab shows NotificationSettings', () => {
    render(<Settings />);
    fireEvent.click(screen.getByRole('button', { name: '알림' }));
    expect(screen.getByTestId('notification-settings')).toBeInTheDocument();
    expect(screen.queryByTestId('basic-settings')).not.toBeInTheDocument();
  });
});
