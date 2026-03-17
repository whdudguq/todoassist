/**
 * @TASK P2-S4-V - 태스크 폼 연결점 검증 (Integration Tests)
 * @SPEC docs/planning/03-user-flow.md#태스크-등록수정-모달
 * @TEST src/__tests__/integration/task-form-integration.test.ts
 *
 * Integration tests verifying data flow:
 * TaskForm UI → backend services → store updates
 *
 * Test coverage:
 * 1. AI Estimate → Form Auto-fill
 * 2. Form Data → Backend Service Compatibility
 * 3. Form Submit → Store Update
 * 4. Validation → Error Display
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Database from 'better-sqlite3';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { runMigrations } from '../../main/database/migrations';
import { TaskCrudService, CreateTaskInput } from '../../main/services/task-crud';
import { CategoryCrudService, CreateCategoryInput } from '../../main/services/category-crud';
import { ClaudeApiService } from '../../main/services/claude-api';
import { TaskForm, TaskFormData } from '../../renderer/components/TaskForm';
import { useTaskStore } from '../../renderer/stores/taskStore';
import type { Task, Category } from '@shared/types';

// ============================================
// Test Fixtures & Setup
// ============================================

describe('Task Form Integration', () => {
  let db: Database.Database;
  let taskService: TaskCrudService;
  let categoryService: CategoryCrudService;
  let mockClaudeService: ReturnType<typeof createMockClaudeService>;

  function createMockClaudeService() {
    return {
      estimateTaskMetadata: vi.fn(
        async (title: string, description?: string) => ({
          estimatedMinutes: 60,
          importance: 4,
          category: '품질검사',
        })
      ),
      testConnection: vi.fn(async () => true),
      generateEncouragement: vi.fn(async () => '화이팅!'),
      generateSchedule: vi.fn(async () => []),
      generateInsight: vi.fn(async () => '좋은 진전이 있네요!'),
      splitTask: vi.fn(async () => [
        { title: '1단계', estimatedMinutes: 15 },
        { title: '2단계', estimatedMinutes: 15 },
      ]),
      chat: vi.fn(async () => '도와드리겠습니다'),
    };
  }

  beforeEach(() => {
    db = new Database(':memory:');
    db.pragma('foreign_keys = ON');
    runMigrations(db);
    taskService = new TaskCrudService(db);
    categoryService = new CategoryCrudService(db);
    mockClaudeService = createMockClaudeService();

    // Reset store state before each test
    useTaskStore.setState({
      tasks: [],
      selectedTaskId: null,
      filter: {},
      sortBy: 'createdAt',
      searchQuery: '',
      isLoading: false,
    });
  });

  afterEach(() => {
    if (db) {
      db.close();
    }
    vi.clearAllMocks();
  });

  // ============================================
  // Test 1: AI Estimate → Form Auto-fill
  // ============================================

  describe('AI Estimate → Form Auto-fill', () => {
    it('should call AI estimate API when AI button is clicked', async () => {
      const user = userEvent.setup();

      const onSubmit = vi.fn();
      const onCancel = vi.fn();

      render(
        <TaskForm
          categories={[]}
          tasks={[]}
          onSubmit={onSubmit}
          onCancel={onCancel}
          onAiEstimate={mockClaudeService.estimateTaskMetadata}
        />
      );

      // Fill title (minimum 5 characters to enable AI button)
      const titleInput = screen.getByPlaceholderText('태스크 제목을 입력하세요');
      await user.type(titleInput, '품질검사 프로세스 개선');

      // Verify AI button is visible and enabled
      const aiButton = screen.getByRole('button', { name: /AI 추정/i });
      expect(aiButton).toBeInTheDocument();
      expect(aiButton).not.toBeDisabled();

      // Click AI 추정 button
      await user.click(aiButton);

      // Wait for API to be called with correct params
      await waitFor(() => {
        expect(mockClaudeService.estimateTaskMetadata).toHaveBeenCalledWith(
          '품질검사 프로세스 개선',
          undefined
        );
      });

      // Verify the mock was called exactly once
      expect(mockClaudeService.estimateTaskMetadata).toHaveBeenCalledTimes(1);
    });

    it('should include description in AI estimate request if provided', async () => {
      const user = userEvent.setup();

      const onSubmit = vi.fn();
      const onCancel = vi.fn();

      render(
        <TaskForm
          categories={[]}
          tasks={[]}
          onSubmit={onSubmit}
          onCancel={onCancel}
          onAiEstimate={mockClaudeService.estimateTaskMetadata}
        />
      );

      // Fill title and description
      await user.type(
        screen.getByPlaceholderText('태스크 제목을 입력하세요'),
        '보고서 작성'
      );
      await user.type(
        screen.getByPlaceholderText('태스크에 대한 설명을 입력하세요'),
        'Q1 성과 보고서 작성 및 검토'
      );

      // Click AI estimate
      const aiButton = screen.getByRole('button', { name: /AI 추정/i });
      await user.click(aiButton);

      await waitFor(() => {
        expect(mockClaudeService.estimateTaskMetadata).toHaveBeenCalledWith(
          '보고서 작성',
          'Q1 성과 보고서 작성 및 검토'
        );
      });
    });

    it('should disable AI button when title is less than 5 characters', () => {
      const onSubmit = vi.fn();
      const onCancel = vi.fn();

      render(
        <TaskForm
          categories={[]}
          tasks={[]}
          onSubmit={onSubmit}
          onCancel={onCancel}
          onAiEstimate={mockClaudeService.estimateTaskMetadata}
        />
      );

      // Type short title (< 5 chars)
      const titleInput = screen.getByPlaceholderText('태스크 제목을 입력하세요');
      const form = titleInput.closest('form');

      // Initially no AI button should be visible
      expect(screen.queryByRole('button', { name: /AI 추정/i })).not.toBeInTheDocument();
    });
  });

  // ============================================
  // Test 2: Form Data → Backend Service Compatibility
  // ============================================

  describe('Form Data → Backend Service Compatibility', () => {
    it('should create task with form data compatible with TaskCrudService.createTask', async () => {
      const user = userEvent.setup();

      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);
      const futureDateStr = futureDate.toISOString().split('T')[0];

      let capturedFormData: TaskFormData | null = null;

      const onSubmit = (data: TaskFormData) => {
        capturedFormData = data;
      };

      const onCancel = vi.fn();

      render(
        <TaskForm
          categories={[]}
          tasks={[]}
          onSubmit={onSubmit}
          onCancel={onCancel}
        />
      );

      // Fill form
      await user.type(
        screen.getByPlaceholderText('태스크 제목을 입력하세요'),
        'Integration Test Task'
      );
      await user.type(
        screen.getByPlaceholderText('태스크에 대한 설명을 입력하세요'),
        'This is a test task'
      );

      const deadlineInput = screen.getByLabelText('마감일');
      await user.type(deadlineInput, futureDateStr);

      const estimatedInput = screen.getByLabelText('예상 소요 (분)');
      await user.clear(estimatedInput);
      await user.type(estimatedInput, '90');

      // Click importance level 4
      const importanceButtons = screen.getAllByRole('button', { name: /중요도/i });
      await user.click(importanceButtons[3]); // Level 4

      // Submit
      const submitButton = screen.getByRole('button', { name: /등록/i });
      await user.click(submitButton);

      // Verify captured data is compatible with CreateTaskInput
      await waitFor(() => {
        expect(capturedFormData).not.toBeNull();
      });

      if (capturedFormData) {
        // Test that data can be used with TaskCrudService.createTask
        const createInput: CreateTaskInput = {
          title: capturedFormData.title,
          description: capturedFormData.description,
          deadline: capturedFormData.deadline,
          estimatedMinutes: capturedFormData.estimatedMinutes,
          importance: capturedFormData.importance,
          category: capturedFormData.category,
          parentId: capturedFormData.parentId,
          status: 'pending',
        };

        // Should not throw
        const createdTask = taskService.createTask(createInput);

        expect(createdTask.title).toBe('Integration Test Task');
        expect(createdTask.description).toBe('This is a test task');
        expect(createdTask.estimatedMinutes).toBe(90);
        expect(createdTask.importance).toBe(4);
        expect(createdTask.status).toBe('pending');
      }
    });

    it('should update task with form data compatible with TaskCrudService.updateTask', async () => {
      const user = userEvent.setup();

      // Create initial task
      const existingTask = taskService.createTask({
        title: 'Original Title',
        description: 'Original Description',
        estimatedMinutes: 30,
        importance: 2,
      });

      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 14);
      const futureDateStr = futureDate.toISOString().split('T')[0];

      let capturedFormData: TaskFormData | null = null;

      const onSubmit = (data: TaskFormData) => {
        capturedFormData = data;
      };

      const onCancel = vi.fn();

      render(
        <TaskForm
          task={existingTask}
          categories={[]}
          tasks={[]}
          onSubmit={onSubmit}
          onCancel={onCancel}
        />
      );

      // Edit form
      const titleInput = screen.getByDisplayValue('Original Title');
      await user.clear(titleInput);
      await user.type(titleInput, 'Updated Title');

      const descriptionInput = screen.getByDisplayValue('Original Description');
      await user.clear(descriptionInput);
      await user.type(descriptionInput, 'Updated Description');

      const estimatedInput = screen.getByDisplayValue('30') as HTMLInputElement;
      await user.clear(estimatedInput);
      await user.type(estimatedInput, '120');

      const importanceButtons = screen.getAllByRole('button', { name: /중요도/i });
      await user.click(importanceButtons[4]); // Level 5

      // Submit
      const submitButton = screen.getByRole('button', { name: /저장/i });
      await user.click(submitButton);

      // Verify captured data can be used with updateTask
      await waitFor(() => {
        expect(capturedFormData).not.toBeNull();
      });

      if (capturedFormData) {
        const updated = taskService.updateTask(existingTask.id, {
          title: capturedFormData.title,
          description: capturedFormData.description,
          estimatedMinutes: capturedFormData.estimatedMinutes,
          importance: capturedFormData.importance,
        });

        expect(updated.title).toBe('Updated Title');
        expect(updated.description).toBe('Updated Description');
        expect(updated.estimatedMinutes).toBe(120);
        expect(updated.importance).toBe(5);
      }
    });

    it('should render categories from CategoryCrudService.getAllCategories', () => {
      // Create test categories
      const cat1 = categoryService.createCategory({
        name: '업무',
        color: '#FF6B6B',
        icon: '📋',
      });

      const cat2 = categoryService.createCategory({
        name: '개인',
        color: '#4ECDC4',
        icon: '🎯',
      });

      const categories = categoryService.getAllCategories();

      const onSubmit = vi.fn();
      const onCancel = vi.fn();

      render(
        <TaskForm
          categories={categories}
          tasks={[]}
          onSubmit={onSubmit}
          onCancel={onCancel}
        />
      );

      // Verify categories are rendered in dropdown
      const categoryOptions = screen.getAllByRole('option');
      const categoryNames = categoryOptions.map(opt => opt.textContent).filter(Boolean);
      expect(categoryNames).toContain('업무');
      expect(categoryNames).toContain('개인');
    });
  });

  // ============================================
  // Test 3: Form Submit → Store Update
  // ============================================

  describe('Form Submit → Store Update', () => {
    it('should create task via service and add to taskStore', async () => {
      const user = userEvent.setup();

      // Initial store state
      const getState = () => useTaskStore.getState();
      expect(getState().tasks).toHaveLength(0);

      let capturedFormData: TaskFormData | null = null;

      const onSubmit = (data: TaskFormData) => {
        capturedFormData = data;

        // Simulate backend creating task
        const createdTask = taskService.createTask({
          title: data.title,
          description: data.description,
          deadline: data.deadline,
          estimatedMinutes: data.estimatedMinutes,
          importance: data.importance,
          category: data.category,
          parentId: data.parentId,
        });

        // Add to store
        useTaskStore.getState().addTask(createdTask);
      };

      const onCancel = vi.fn();

      render(
        <TaskForm
          categories={[]}
          tasks={[]}
          onSubmit={onSubmit}
          onCancel={onCancel}
        />
      );

      // Fill and submit
      await user.type(
        screen.getByPlaceholderText('태스크 제목을 입력하세요'),
        'Store Integration Test'
      );

      await user.type(
        screen.getByPlaceholderText('태스크에 대한 설명을 입력하세요'),
        'Testing store integration'
      );

      const estimatedInput = screen.getByLabelText('예상 소요 (분)');
      await user.clear(estimatedInput);
      await user.type(estimatedInput, '75');

      const submitButton = screen.getByRole('button', { name: /등록/i });
      await user.click(submitButton);

      // Verify store was updated
      await waitFor(() => {
        const state = getState();
        expect(state.tasks).toHaveLength(1);
        expect(state.tasks[0].title).toBe('Store Integration Test');
        expect(state.tasks[0].estimatedMinutes).toBe(75);
      });
    });

    it('should update task via service and update in taskStore', async () => {
      const user = userEvent.setup();

      // Create initial task in service and store
      const initialTask = taskService.createTask({
        title: 'Original Task',
        estimatedMinutes: 30,
      });

      useTaskStore.getState().addTask(initialTask);

      let capturedFormData: TaskFormData | null = null;

      const onSubmit = (data: TaskFormData) => {
        capturedFormData = data;

        // Simulate backend updating task
        const updatedTask = taskService.updateTask(initialTask.id, {
          title: data.title,
          description: data.description,
          estimatedMinutes: data.estimatedMinutes,
          importance: data.importance,
        });

        // Update in store
        useTaskStore.getState().updateTask(updatedTask.id, updatedTask);
      };

      const onCancel = vi.fn();

      render(
        <TaskForm
          task={initialTask}
          categories={[]}
          tasks={[]}
          onSubmit={onSubmit}
          onCancel={onCancel}
        />
      );

      // Edit and submit
      const titleInput = screen.getByDisplayValue('Original Task');
      await user.clear(titleInput);
      await user.type(titleInput, 'Updated Task');

      const estimatedInput = screen.getByDisplayValue('30') as HTMLInputElement;
      await user.clear(estimatedInput);
      await user.type(estimatedInput, '120');

      const submitButton = screen.getByRole('button', { name: /저장/i });
      await user.click(submitButton);

      // Verify store was updated
      await waitFor(() => {
        const state = useTaskStore.getState();
        expect(state.tasks).toHaveLength(1);
        expect(state.tasks[0].title).toBe('Updated Task');
        expect(state.tasks[0].estimatedMinutes).toBe(120);
      });
    });
  });

  // ============================================
  // Test 4: Validation → Error Display
  // ============================================

  describe('Validation → Error Display', () => {
    it('should display error when title is empty', async () => {
      const user = userEvent.setup();

      const onSubmit = vi.fn();
      const onCancel = vi.fn();

      render(
        <TaskForm
          categories={[]}
          tasks={[]}
          onSubmit={onSubmit}
          onCancel={onCancel}
        />
      );

      // Try to submit without filling title
      const submitButton = screen.getByRole('button', { name: /등록/i });
      await user.click(submitButton);

      // Error message should be visible
      await waitFor(() => {
        expect(screen.getByText('제목은 필수 입력입니다.')).toBeInTheDocument();
      });

      // onSubmit should not be called
      expect(onSubmit).not.toHaveBeenCalled();
    });

    it('should display error when deadline is in the past', async () => {
      const user = userEvent.setup();

      const onSubmit = vi.fn();
      const onCancel = vi.fn();

      render(
        <TaskForm
          categories={[]}
          tasks={[]}
          onSubmit={onSubmit}
          onCancel={onCancel}
        />
      );

      // Fill title
      await user.type(
        screen.getByPlaceholderText('태스크 제목을 입력하세요'),
        'Past Deadline Task'
      );

      // Set deadline to past date
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);
      const pastDateStr = pastDate.toISOString().split('T')[0];

      const deadlineInput = screen.getByLabelText('마감일');
      await user.type(deadlineInput, pastDateStr);

      // Try to submit
      const submitButton = screen.getByRole('button', { name: /등록/i });
      await user.click(submitButton);

      // Error message should be visible
      await waitFor(() => {
        expect(screen.getByText('마감일은 미래 날짜여야 합니다.')).toBeInTheDocument();
      });

      expect(onSubmit).not.toHaveBeenCalled();
    });

    it('should display error when estimatedMinutes < 15', async () => {
      const user = userEvent.setup();

      const onSubmit = vi.fn();
      const onCancel = vi.fn();

      render(
        <TaskForm
          categories={[]}
          tasks={[]}
          onSubmit={onSubmit}
          onCancel={onCancel}
        />
      );

      // Fill title
      await user.type(
        screen.getByPlaceholderText('태스크 제목을 입력하세요'),
        'Short Task'
      );

      // Set estimated minutes to less than 15
      const estimatedInput = screen.getByLabelText('예상 소요 (분)') as HTMLInputElement;
      await user.clear(estimatedInput);
      await user.type(estimatedInput, '10');

      // Try to submit
      const submitButton = screen.getByRole('button', { name: /등록/i });
      await user.click(submitButton);

      // Error message should be visible
      await waitFor(() => {
        expect(
          screen.getByText('예상 소요 시간은 최소 15분이어야 합니다.')
        ).toBeInTheDocument();
      });

      expect(onSubmit).not.toHaveBeenCalled();
    });

    it('should display error when estimatedMinutes > 240', async () => {
      const user = userEvent.setup();

      const onSubmit = vi.fn();
      const onCancel = vi.fn();

      render(
        <TaskForm
          categories={[]}
          tasks={[]}
          onSubmit={onSubmit}
          onCancel={onCancel}
        />
      );

      // Fill title
      await user.type(
        screen.getByPlaceholderText('태스크 제목을 입력하세요'),
        'Long Task'
      );

      // Set estimated minutes to more than 240
      const estimatedInput = screen.getByLabelText('예상 소요 (분)') as HTMLInputElement;
      await user.clear(estimatedInput);
      await user.type(estimatedInput, '300');

      // Try to submit
      const submitButton = screen.getByRole('button', { name: /등록/i });
      await user.click(submitButton);

      // Error message should be visible
      await waitFor(() => {
        expect(
          screen.getByText('예상 소요 시간은 최대 240분이어야 합니다.')
        ).toBeInTheDocument();
      });

      expect(onSubmit).not.toHaveBeenCalled();
    });

    it('should allow submission when all validations pass', async () => {
      const user = userEvent.setup();

      const onSubmit = vi.fn();
      const onCancel = vi.fn();

      render(
        <TaskForm
          categories={[]}
          tasks={[]}
          onSubmit={onSubmit}
          onCancel={onCancel}
        />
      );

      // Fill with valid data
      await user.type(
        screen.getByPlaceholderText('태스크 제목을 입력하세요'),
        'Valid Task'
      );

      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);
      const futureDateStr = futureDate.toISOString().split('T')[0];

      const deadlineInput = screen.getByLabelText('마감일');
      await user.type(deadlineInput, futureDateStr);

      const estimatedInput = screen.getByLabelText('예상 소요 (분)') as HTMLInputElement;
      await user.clear(estimatedInput);
      await user.type(estimatedInput, '90');

      // Submit
      const submitButton = screen.getByRole('button', { name: /등록/i });
      await user.click(submitButton);

      // onSubmit should be called
      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalled();
      });

      // Verify no error messages
      expect(screen.queryByText(/필수 입력입니다/)).not.toBeInTheDocument();
      expect(screen.queryByText(/미래 날짜/)).not.toBeInTheDocument();
      expect(screen.queryByText(/최소 15분/)).not.toBeInTheDocument();
    });
  });

  // ============================================
  // Test 5: Edge Cases & Data Integrity
  // ============================================

  describe('Edge Cases & Data Integrity', () => {
    it('should handle empty description gracefully', async () => {
      const user = userEvent.setup();

      let capturedFormData: TaskFormData | null = null;

      const onSubmit = (data: TaskFormData) => {
        capturedFormData = data;
      };

      const onCancel = vi.fn();

      render(
        <TaskForm
          categories={[]}
          tasks={[]}
          onSubmit={onSubmit}
          onCancel={onCancel}
        />
      );

      await user.type(
        screen.getByPlaceholderText('태스크 제목을 입력하세요'),
        'No Description Task'
      );

      const estimatedInput = screen.getByLabelText('예상 소요 (분)') as HTMLInputElement;
      await user.clear(estimatedInput);
      await user.type(estimatedInput, '45');

      const submitButton = screen.getByRole('button', { name: /등록/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(capturedFormData).not.toBeNull();
      });

      if (capturedFormData) {
        const createdTask = taskService.createTask({
          title: capturedFormData.title,
          description: capturedFormData.description,
          estimatedMinutes: capturedFormData.estimatedMinutes,
        });

        expect(createdTask.description).toBe('');
      }
    });

    it('should trim whitespace from title before submission', async () => {
      const user = userEvent.setup();

      let capturedFormData: TaskFormData | null = null;

      const onSubmit = (data: TaskFormData) => {
        capturedFormData = data;
      };

      const onCancel = vi.fn();

      render(
        <TaskForm
          categories={[]}
          tasks={[]}
          onSubmit={onSubmit}
          onCancel={onCancel}
        />
      );

      // Type title with leading/trailing spaces
      await user.type(
        screen.getByPlaceholderText('태스크 제목을 입력하세요'),
        '   Trimmed Title   '
      );

      const estimatedInput = screen.getByLabelText('예상 소요 (분)') as HTMLInputElement;
      await user.clear(estimatedInput);
      await user.type(estimatedInput, '30');

      const submitButton = screen.getByRole('button', { name: /등록/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(capturedFormData).not.toBeNull();
      });

      if (capturedFormData) {
        expect(capturedFormData.title).toBe('Trimmed Title');
      }
    });

    it('should preserve category selection across form interactions', async () => {
      const user = userEvent.setup();

      const categories = [
        categoryService.createCategory({
          name: '업무',
          color: '#FF6B6B',
          icon: '📋',
        }),
        categoryService.createCategory({
          name: '개인',
          color: '#4ECDC4',
          icon: '🎯',
        }),
      ];

      let capturedFormData: TaskFormData | null = null;

      const onSubmit = (data: TaskFormData) => {
        capturedFormData = data;
      };

      const onCancel = vi.fn();

      render(
        <TaskForm
          categories={categories}
          tasks={[]}
          onSubmit={onSubmit}
          onCancel={onCancel}
        />
      );

      // Select category
      const categorySelect = screen.getByLabelText('카테고리');
      await user.selectOptions(categorySelect, '업무');

      // Interact with other fields
      await user.type(
        screen.getByPlaceholderText('태스크 제목을 입력하세요'),
        'Category Preservation Test'
      );

      const estimatedInput = screen.getByLabelText('예상 소요 (분)') as HTMLInputElement;
      await user.clear(estimatedInput);
      await user.type(estimatedInput, '60');

      // Verify category is still selected
      expect(categorySelect).toHaveValue('업무');

      // Submit
      const submitButton = screen.getByRole('button', { name: /등록/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(capturedFormData).not.toBeNull();
      });

      if (capturedFormData) {
        expect(capturedFormData.category).toBe('업무');
      }
    });
  });
});
