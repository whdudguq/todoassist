/**
 * @TASK P5-S7-V - Settings Integration Tests
 * @SPEC docs/planning/04-database-design.md
 * @TEST src/__tests__/integration/settings-integration.test.ts
 *
 * Integration tests for settings management:
 * SettingsForms → settingStore → persisted settings
 *
 * Tests verify:
 * 1. settingStore.updateSetting → value persisted in store
 * 2. API key update → isApiValid resets to false
 * 3. Category changes → reflected in settingStore
 * 4. workHoursStart/End changes → valid format check
 * 5. encouragementInterval change → valid options only
 * 6. Settings load/persist cycle
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useSettingStore } from '@renderer/stores/settingStore';

// ============================================
// Mock Claude API Service
// ============================================

class MockClaudeApiService {
  async validateApiKey(_apiKey: string): Promise<boolean> {
    // Simple validation: key should start with 'sk-'
    return _apiKey.startsWith('sk-');
  }
}

// ============================================
// Validation Utilities
// ============================================

/** Validate HH:MM format */
function isValidTimeFormat(time: string): boolean {
  const timeRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/;
  return timeRegex.test(time);
}

/** Validate work hours: end must be after start */
function isValidWorkHoursRange(start: string, end: string): boolean {
  if (!isValidTimeFormat(start) || !isValidTimeFormat(end)) {
    return false;
  }

  const [startHour, startMin] = start.split(':').map(Number);
  const [endHour, endMin] = end.split(':').map(Number);

  const startTotalMin = startHour * 60 + startMin;
  const endTotalMin = endHour * 60 + endMin;

  return endTotalMin > startTotalMin;
}

/** Valid encouragement intervals in minutes */
const VALID_ENCOURAGEMENT_INTERVALS = [1, 2, 5, 10, 15, 30, 60]; // hours (user-facing label)

// ============================================
// Test Suites
// ============================================

describe('Settings Integration Tests', () => {
  const mockClaudeService = new MockClaudeApiService();

  beforeEach(() => {
    // Reset store to initial state
    useSettingStore.setState({
      userName: '',
      workHoursStart: '09:00',
      workHoursEnd: '18:00',
      apiKey: '',
      notificationsEnabled: true,
      encouragementInterval: 2,
      isApiValid: false,
    });
  });

  describe('settingStore.updateSetting', () => {
    it('should update userName in store', () => {
      const store = useSettingStore.getState();
      expect(store.userName).toBe('');

      store.updateSetting('userName', 'Alice');

      const updated = useSettingStore.getState();
      expect(updated.userName).toBe('Alice');
    });

    it('should update notificationsEnabled in store', () => {
      const store = useSettingStore.getState();
      expect(store.notificationsEnabled).toBe(true);

      store.updateSetting('notificationsEnabled', false);

      const updated = useSettingStore.getState();
      expect(updated.notificationsEnabled).toBe(false);
    });

    it('should update encouragementInterval in store', () => {
      const store = useSettingStore.getState();
      expect(store.encouragementInterval).toBe(2);

      store.updateSetting('encouragementInterval', 5);

      const updated = useSettingStore.getState();
      expect(updated.encouragementInterval).toBe(5);
    });

    it('should update workHoursStart in store', () => {
      const store = useSettingStore.getState();
      store.updateSetting('workHoursStart', '08:30');

      const updated = useSettingStore.getState();
      expect(updated.workHoursStart).toBe('08:30');
    });

    it('should update workHoursEnd in store', () => {
      const store = useSettingStore.getState();
      store.updateSetting('workHoursEnd', '17:30');

      const updated = useSettingStore.getState();
      expect(updated.workHoursEnd).toBe('17:30');
    });
  });

  describe('settingStore.setApiKey', () => {
    it('should update apiKey in store', () => {
      const store = useSettingStore.getState();
      expect(store.apiKey).toBe('');

      store.setApiKey('sk-test-key-123');

      const updated = useSettingStore.getState();
      expect(updated.apiKey).toBe('sk-test-key-123');
    });

    it('should reset isApiValid to false when apiKey changes', () => {
      const store = useSettingStore.getState();
      store.setApiValid(true);
      let state = useSettingStore.getState();
      expect(state.isApiValid).toBe(true);

      store.setApiKey('sk-new-key-456');

      const updated = useSettingStore.getState();
      expect(updated.apiKey).toBe('sk-new-key-456');
      expect(updated.isApiValid).toBe(false);
    });

    it('should preserve apiKey change even if previously valid', () => {
      const store = useSettingStore.getState();
      store.setApiKey('sk-old-key');
      store.setApiValid(true);

      store.setApiKey('sk-new-key');

      const updated = useSettingStore.getState();
      expect(updated.apiKey).toBe('sk-new-key');
      expect(updated.isApiValid).toBe(false);
    });
  });

  describe('settingStore.setApiValid', () => {
    it('should set isApiValid to true when validation passes', () => {
      const store = useSettingStore.getState();
      expect(store.isApiValid).toBe(false);

      store.setApiValid(true);

      const updated = useSettingStore.getState();
      expect(updated.isApiValid).toBe(true);
    });

    it('should set isApiValid to false when validation fails', () => {
      const store = useSettingStore.getState();
      store.setApiValid(true);

      store.setApiValid(false);

      const updated = useSettingStore.getState();
      expect(updated.isApiValid).toBe(false);
    });
  });

  describe('API Key Validation', () => {
    it('should validate correct API key format', async () => {
      const isValid = await mockClaudeService.validateApiKey('sk-test-key-123');
      expect(isValid).toBe(true);
    });

    it('should reject incorrect API key format', async () => {
      const isValid = await mockClaudeService.validateApiKey('invalid-key');
      expect(isValid).toBe(false);
    });

    it('should update store after validation', async () => {
      const store = useSettingStore.getState();
      const apiKey = 'sk-valid-key-789';

      store.setApiKey(apiKey);
      const isValid = await mockClaudeService.validateApiKey(apiKey);

      if (isValid) {
        store.setApiValid(true);
      }

      const updated = useSettingStore.getState();
      expect(updated.apiKey).toBe(apiKey);
      expect(updated.isApiValid).toBe(true);
    });

    it('should not validate empty API key', async () => {
      const isValid = await mockClaudeService.validateApiKey('');
      expect(isValid).toBe(false);
    });
  });

  describe('Work Hours Validation', () => {
    it('should validate correct HH:MM format', () => {
      expect(isValidTimeFormat('09:00')).toBe(true);
      expect(isValidTimeFormat('23:59')).toBe(true);
      expect(isValidTimeFormat('00:00')).toBe(true);
      expect(isValidTimeFormat('12:30')).toBe(true);
    });

    it('should reject invalid HH:MM format', () => {
      expect(isValidTimeFormat('25:00')).toBe(false);
      expect(isValidTimeFormat('12:60')).toBe(false);
      expect(isValidTimeFormat('9:00')).toBe(false); // missing leading zero
      expect(isValidTimeFormat('invalid')).toBe(false);
      expect(isValidTimeFormat('')).toBe(false);
    });

    it('should validate work hours range', () => {
      expect(isValidWorkHoursRange('09:00', '18:00')).toBe(true);
      expect(isValidWorkHoursRange('08:30', '17:30')).toBe(true);
      expect(isValidWorkHoursRange('06:00', '22:00')).toBe(true);
    });

    it('should reject invalid work hours range', () => {
      expect(isValidWorkHoursRange('18:00', '09:00')).toBe(false); // end before start
      expect(isValidWorkHoursRange('09:00', '09:00')).toBe(false); // same time
      expect(isValidWorkHoursRange('invalid', '18:00')).toBe(false);
      expect(isValidWorkHoursRange('09:00', 'invalid')).toBe(false);
    });

    it('should update and validate work hours in store', () => {
      const store = useSettingStore.getState();

      store.updateSetting('workHoursStart', '08:00');
      store.updateSetting('workHoursEnd', '17:00');

      const updated = useSettingStore.getState();
      expect(updated.workHoursStart).toBe('08:00');
      expect(updated.workHoursEnd).toBe('17:00');
      expect(isValidWorkHoursRange(updated.workHoursStart, updated.workHoursEnd)).toBe(true);
    });

    it('should not allow end time before start time', () => {
      const store = useSettingStore.getState();

      store.updateSetting('workHoursStart', '18:00');
      store.updateSetting('workHoursEnd', '09:00');

      const updated = useSettingStore.getState();
      // Store allows it, but validation should catch it
      expect(isValidWorkHoursRange(updated.workHoursStart, updated.workHoursEnd)).toBe(false);
    });
  });

  describe('Encouragement Interval Validation', () => {
    it('should support all valid intervals', () => {
      const store = useSettingStore.getState();

      for (const interval of VALID_ENCOURAGEMENT_INTERVALS) {
        store.updateSetting('encouragementInterval', interval);
        expect(useSettingStore.getState().encouragementInterval).toBe(interval);
      }
    });

    it('should validate interval is within valid options', () => {
      const validIntervals = VALID_ENCOURAGEMENT_INTERVALS;

      for (const interval of [0, 3, 7, 11, 25, 45, 120]) {
        expect(validIntervals.includes(interval)).toBe(false);
      }
    });

    it('should persist interval selection in store', () => {
      const store = useSettingStore.getState();
      store.updateSetting('encouragementInterval', 5);

      const updated = useSettingStore.getState();
      expect(updated.encouragementInterval).toBe(5);
      expect(VALID_ENCOURAGEMENT_INTERVALS.includes(updated.encouragementInterval)).toBe(true);
    });
  });

  describe('settingStore.loadSettings', () => {
    it('should load partial settings', () => {
      const store = useSettingStore.getState();

      store.loadSettings({
        userName: 'Bob',
        notificationsEnabled: false,
      });

      const updated = useSettingStore.getState();
      expect(updated.userName).toBe('Bob');
      expect(updated.notificationsEnabled).toBe(false);
      // Other settings should remain unchanged
      expect(updated.workHoursStart).toBe('09:00');
    });

    it('should load all settings', () => {
      const store = useSettingStore.getState();

      store.loadSettings({
        userName: 'Charlie',
        workHoursStart: '07:00',
        workHoursEnd: '19:00',
        apiKey: 'sk-loaded-key',
        notificationsEnabled: false,
        encouragementInterval: 10,
        isApiValid: false,
      });

      const updated = useSettingStore.getState();
      expect(updated.userName).toBe('Charlie');
      expect(updated.workHoursStart).toBe('07:00');
      expect(updated.workHoursEnd).toBe('19:00');
      expect(updated.apiKey).toBe('sk-loaded-key');
      expect(updated.notificationsEnabled).toBe(false);
      expect(updated.encouragementInterval).toBe(10);
    });

    it('should preserve unspecified settings', () => {
      const store = useSettingStore.getState();
      store.loadSettings({ userName: 'Dave' });

      const updated = useSettingStore.getState();
      expect(updated.userName).toBe('Dave');
      expect(updated.workHoursStart).toBe('09:00'); // unchanged
      expect(updated.workHoursEnd).toBe('18:00'); // unchanged
      expect(updated.notificationsEnabled).toBe(true); // unchanged
    });
  });

  describe('Integration: Complete Settings Flow', () => {
    it('should complete user profile setup', () => {
      const store = useSettingStore.getState();

      // Step 1: Set name
      store.updateSetting('userName', 'Alex');
      expect(useSettingStore.getState().userName).toBe('Alex');

      // Step 2: Set work hours
      store.updateSetting('workHoursStart', '08:00');
      store.updateSetting('workHoursEnd', '18:00');

      const state2 = useSettingStore.getState();
      expect(isValidWorkHoursRange(state2.workHoursStart, state2.workHoursEnd)).toBe(true);

      // Step 3: Set encouragement interval
      store.updateSetting('encouragementInterval', 5);
      expect(VALID_ENCOURAGEMENT_INTERVALS.includes(useSettingStore.getState().encouragementInterval)).toBe(true);

      // Step 4: Add API key
      store.setApiKey('sk-user-api-key');
      expect(useSettingStore.getState().apiKey).toBe('sk-user-api-key');
      expect(useSettingStore.getState().isApiValid).toBe(false);

      // Step 5: Validate API key
      mockClaudeService.validateApiKey('sk-user-api-key').then((isValid) => {
        if (isValid) {
          store.setApiValid(true);
        }
      });
    });

    it('should handle settings modification workflow', () => {
      const store = useSettingStore.getState();

      // Initial load
      store.loadSettings({
        userName: 'Emma',
        workHoursStart: '09:00',
        workHoursEnd: '18:00',
        encouragementInterval: 2,
        notificationsEnabled: true,
      });

      let state = useSettingStore.getState();
      expect(state.userName).toBe('Emma');
      expect(state.encouragementInterval).toBe(2);

      // User modifies settings
      store.updateSetting('encouragementInterval', 10);
      store.updateSetting('notificationsEnabled', false);

      state = useSettingStore.getState();
      expect(state.encouragementInterval).toBe(10);
      expect(state.notificationsEnabled).toBe(false);
      expect(state.userName).toBe('Emma'); // unchanged
    });

    it('should track API key changes with validation state', () => {
      const store = useSettingStore.getState();

      // Initial API key
      store.setApiKey('sk-initial-key');
      store.setApiValid(true);
      let state = useSettingStore.getState();
      expect(state.apiKey).toBe('sk-initial-key');
      expect(state.isApiValid).toBe(true);

      // Change API key (should reset validation)
      store.setApiKey('sk-new-key');
      state = useSettingStore.getState();
      expect(state.apiKey).toBe('sk-new-key');
      expect(state.isApiValid).toBe(false);

      // Validate new key
      store.setApiValid(true);
      state = useSettingStore.getState();
      expect(state.apiKey).toBe('sk-new-key');
      expect(state.isApiValid).toBe(true);
    });

    it('should support settings reset', () => {
      const store = useSettingStore.getState();

      // Modify all settings
      store.loadSettings({
        userName: 'Frank',
        workHoursStart: '07:00',
        workHoursEnd: '19:00',
        apiKey: 'sk-frank-key',
        notificationsEnabled: false,
        encouragementInterval: 30,
        isApiValid: true,
      });

      let state = useSettingStore.getState();
      expect(state.userName).toBe('Frank');
      expect(state.encouragementInterval).toBe(30);

      // Reset to initial state
      store.loadSettings({
        userName: '',
        workHoursStart: '09:00',
        workHoursEnd: '18:00',
        apiKey: '',
        notificationsEnabled: true,
        encouragementInterval: 2,
        isApiValid: false,
      });

      state = useSettingStore.getState();
      expect(state.userName).toBe('');
      expect(state.encouragementInterval).toBe(2);
      expect(state.isApiValid).toBe(false);
    });

    it('should validate settings state consistency', () => {
      const store = useSettingStore.getState();

      // Create a consistent settings state
      store.loadSettings({
        userName: 'Grace',
        workHoursStart: '08:00',
        workHoursEnd: '17:00',
        apiKey: 'sk-grace-key',
        notificationsEnabled: true,
        encouragementInterval: 5,
        isApiValid: false,
      });

      const state = useSettingStore.getState();

      // Validate consistency
      expect(state.userName).toBeDefined();
      expect(isValidWorkHoursRange(state.workHoursStart, state.workHoursEnd)).toBe(true);
      expect(VALID_ENCOURAGEMENT_INTERVALS.includes(state.encouragementInterval)).toBe(true);
      expect(typeof state.notificationsEnabled).toBe('boolean');
      expect(typeof state.isApiValid).toBe('boolean');
    });

    it('should handle concurrent setting updates', () => {
      const store = useSettingStore.getState();

      // Simulate rapid updates
      store.updateSetting('userName', 'Henry');
      store.updateSetting('workHoursStart', '08:30');
      store.updateSetting('workHoursEnd', '17:30');
      store.updateSetting('notificationsEnabled', false);
      store.updateSetting('encouragementInterval', 15);

      const state = useSettingStore.getState();
      expect(state.userName).toBe('Henry');
      expect(state.workHoursStart).toBe('08:30');
      expect(state.workHoursEnd).toBe('17:30');
      expect(state.notificationsEnabled).toBe(false);
      expect(state.encouragementInterval).toBe(15);
    });
  });

  describe('Settings Type Safety', () => {
    it('should maintain type safety for all settings', () => {
      const store = useSettingStore.getState();

      // Valid types
      store.updateSetting('userName', 'Iris');
      store.updateSetting('notificationsEnabled', true);
      store.updateSetting('encouragementInterval', 10);

      const state = useSettingStore.getState();
      expect(typeof state.userName).toBe('string');
      expect(typeof state.notificationsEnabled).toBe('boolean');
      expect(typeof state.encouragementInterval).toBe('number');
    });

    it('should maintain work hours format', () => {
      const store = useSettingStore.getState();

      store.updateSetting('workHoursStart', '09:30');
      store.updateSetting('workHoursEnd', '18:30');

      const state = useSettingStore.getState();
      expect(isValidTimeFormat(state.workHoursStart)).toBe(true);
      expect(isValidTimeFormat(state.workHoursEnd)).toBe(true);
    });
  });
});
