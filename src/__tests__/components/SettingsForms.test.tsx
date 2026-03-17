// @vitest-environment jsdom
// @TASK P5-S7 - Settings form components tests
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom';
import { useSettingStore } from '@renderer/stores/settingStore';
import type { Category } from '@shared/types';

// Mock settingStore
vi.mock('@renderer/stores/settingStore', () => ({
  useSettingStore: vi.fn(),
}));

const mockStore = {
  userName: 'testuser',
  workHoursStart: '09:00',
  workHoursEnd: '18:00',
  apiKey: 'sk-test-key',
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

// ── BasicSettings ──────────────────────────────────────────
import { BasicSettings } from '@renderer/components/BasicSettings';

describe('BasicSettings', () => {
  const defaultProps = {
    onTestApi: vi.fn(),
    onBackup: vi.fn(),
    onRestore: vi.fn(),
  };

  it('renders username input', () => {
    render(<BasicSettings {...defaultProps} />);
    expect(screen.getByLabelText(/사용자 이름/i)).toBeInTheDocument();
  });

  it('renders work hours start and end inputs', () => {
    render(<BasicSettings {...defaultProps} />);
    expect(screen.getByLabelText(/시작/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/종료/i)).toBeInTheDocument();
  });

  it('renders API key input masked by default', () => {
    render(<BasicSettings {...defaultProps} />);
    const apiInput = screen.getByLabelText(/API 키/i);
    expect(apiInput).toBeInTheDocument();
    expect(apiInput).toHaveAttribute('type', 'password');
  });

  it('"연결 테스트" button exists', () => {
    render(<BasicSettings {...defaultProps} />);
    expect(screen.getByRole('button', { name: /연결 테스트/i })).toBeInTheDocument();
  });

  it('"백업" and "복원" buttons exist', () => {
    render(<BasicSettings {...defaultProps} />);
    expect(screen.getByRole('button', { name: /백업/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /복원/i })).toBeInTheDocument();
  });
});

// ── CategoryManager ────────────────────────────────────────
import { CategoryManager } from '@renderer/components/CategoryManager';

const sampleCategories: Category[] = [
  { id: 'cat-1', name: '품질', color: '#ff0000', icon: '🔍', createdAt: 1000 },
  { id: 'cat-2', name: '보고서', color: '#00ff00', icon: '📄', createdAt: 2000 },
];

describe('CategoryManager', () => {
  const defaultProps = {
    categories: sampleCategories,
    onAdd: vi.fn(),
    onUpdate: vi.fn(),
    onDelete: vi.fn(),
  };

  it('renders category list', () => {
    render(<CategoryManager {...defaultProps} />);
    expect(screen.getByDisplayValue('품질')).toBeInTheDocument();
    expect(screen.getByDisplayValue('보고서')).toBeInTheDocument();
  });

  it('"추가" button exists', () => {
    render(<CategoryManager {...defaultProps} />);
    expect(screen.getByRole('button', { name: /추가/i })).toBeInTheDocument();
  });

  it('each category has name input, color input, icon input, delete button', () => {
    render(<CategoryManager {...defaultProps} />);
    const colorInputs = screen.getAllByDisplayValue(/#[0-9a-fA-F]{6}/);
    expect(colorInputs.length).toBe(sampleCategories.length);

    const deleteButtons = screen.getAllByRole('button', { name: /삭제/i });
    expect(deleteButtons.length).toBe(sampleCategories.length);
  });
});

// ── NotificationSettings ───────────────────────────────────
import { NotificationSettings } from '@renderer/components/NotificationSettings';

describe('NotificationSettings', () => {
  it('renders ON/OFF toggle (checkbox)', () => {
    render(<NotificationSettings />);
    const toggle = screen.getByRole('checkbox');
    expect(toggle).toBeInTheDocument();
  });

  it('renders AI encouragement frequency select with correct options', () => {
    render(<NotificationSettings />);
    const select = screen.getByRole('combobox');
    expect(select).toBeInTheDocument();

    const options = screen.getAllByRole('option');
    const values = options.map((o) => (o as HTMLOptionElement).value);
    expect(values).toContain('1');
    expect(values).toContain('2');
    expect(values).toContain('4');
    expect(values).toContain('0');
  });
});
