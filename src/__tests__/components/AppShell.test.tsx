// @TASK P1-S0 - AppShell layout and navigation tests
// @SPEC docs/planning/03-user-flow.md
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import '@testing-library/jest-dom';

// Mock page components
vi.mock('@renderer/screens/Dashboard', () => ({
  Dashboard: () => <div data-testid="page-dashboard">Dashboard</div>,
}));
vi.mock('@renderer/screens/Kanban', () => ({
  Kanban: () => <div data-testid="page-kanban">Kanban</div>,
}));
vi.mock('@renderer/screens/TaskTree', () => ({
  TaskTree: () => <div data-testid="page-taskTree">Task Tree</div>,
}));
vi.mock('@renderer/screens/Statistics', () => ({
  Statistics: () => <div data-testid="page-statistics">Statistics</div>,
}));
vi.mock('@renderer/screens/Settings', () => ({
  Settings: () => <div data-testid="page-settings">Settings</div>,
}));

import { AppShell } from '@renderer/components/AppShell';
import { useUiStore } from '@renderer/stores/uiStore';

// Reset zustand store before each test
beforeEach(() => {
  useUiStore.setState({
    currentPage: 'dashboard',
    aiAssistantOpen: false,
    sidebarOpen: true,
    modalOpen: null,
    theme: 'dark',
  });
});

describe('AppShell', () => {
  it('renders sidebar and main content area', () => {
    render(<AppShell />);
    // sidebar nav should be present
    expect(screen.getByRole('complementary')).toBeInTheDocument();
    // main content area
    expect(screen.getByRole('main')).toBeInTheDocument();
  });

  it('renders sidebar always visible at 52px width', () => {
    render(<AppShell />);
    const sidebar = screen.getByRole('complementary');
    // sidebar should have w-[52px] class
    expect(sidebar.className).toMatch(/w-\[52px\]/);
  });

  it('renders dashboard page by default', () => {
    render(<AppShell />);
    expect(screen.getByTestId('page-dashboard')).toBeInTheDocument();
  });

  it('renders kanban page when currentPage is kanban', () => {
    useUiStore.setState({ currentPage: 'kanban' });
    render(<AppShell />);
    expect(screen.getByTestId('page-kanban')).toBeInTheDocument();
    expect(screen.queryByTestId('page-dashboard')).not.toBeInTheDocument();
  });

  it('renders taskTree page when currentPage is taskTree', () => {
    useUiStore.setState({ currentPage: 'taskTree' });
    render(<AppShell />);
    expect(screen.getByTestId('page-taskTree')).toBeInTheDocument();
  });

  it('renders statistics page when currentPage is statistics', () => {
    useUiStore.setState({ currentPage: 'statistics' });
    render(<AppShell />);
    expect(screen.getByTestId('page-statistics')).toBeInTheDocument();
  });

  it('renders settings page when currentPage is settings', () => {
    useUiStore.setState({ currentPage: 'settings' });
    render(<AppShell />);
    expect(screen.getByTestId('page-settings')).toBeInTheDocument();
  });

  it('sidebar navigation changes currentPage in uiStore', () => {
    render(<AppShell />);
    // Click Kanban nav button (title="Kanban")
    const kanbanBtn = screen.getByTitle('Kanban');
    fireEvent.click(kanbanBtn);
    expect(useUiStore.getState().currentPage).toBe('kanban');
  });

  it('navigates to taskTree when Tasks nav button clicked', () => {
    render(<AppShell />);
    const tasksBtn = screen.getByTitle('Tasks');
    fireEvent.click(tasksBtn);
    expect(useUiStore.getState().currentPage).toBe('taskTree');
  });

  it('navigates to statistics when Statistics nav button clicked', () => {
    render(<AppShell />);
    const statsBtn = screen.getByTitle('Statistics');
    fireEvent.click(statsBtn);
    expect(useUiStore.getState().currentPage).toBe('statistics');
  });

  it('navigates to settings when Settings nav button clicked', () => {
    render(<AppShell />);
    const settingsBtn = screen.getByTitle('Settings');
    fireEvent.click(settingsBtn);
    expect(useUiStore.getState().currentPage).toBe('settings');
  });

  it('AI assistant panel is hidden when aiAssistantOpen is false', () => {
    render(<AppShell />);
    expect(screen.queryByRole('region', { name: /ai assistant/i })).not.toBeInTheDocument();
  });

  it('AI assistant toggle button toggles aiAssistantOpen', () => {
    render(<AppShell />);
    expect(useUiStore.getState().aiAssistantOpen).toBe(false);
    const aiBtn = screen.getByTitle('AI Assistant');
    fireEvent.click(aiBtn);
    expect(useUiStore.getState().aiAssistantOpen).toBe(true);
    fireEvent.click(aiBtn);
    expect(useUiStore.getState().aiAssistantOpen).toBe(false);
  });

  it('AI assistant panel is shown when aiAssistantOpen is true', () => {
    useUiStore.setState({ aiAssistantOpen: true });
    render(<AppShell />);
    expect(screen.getByRole('region', { name: /ai assistant/i })).toBeInTheDocument();
  });

  it('is full height (h-screen)', () => {
    render(<AppShell />);
    const root = screen.getByRole('main').closest('[class*="h-screen"]');
    expect(root).toBeInTheDocument();
  });
});
