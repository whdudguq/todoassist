// @vitest-environment jsdom
// @TASK P2-S4 - TaskForm 컴포넌트 테스트 (TDD RED FIRST)
// @SPEC docs/planning/03-user-flow.md#태스크-등록수정-모달
import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom';

import { TaskForm } from '@renderer/components/TaskForm';
import type { Task, Category } from '@shared/types';

// ── Mock data ──────────────────────────────────────────────
const mockCategories: Category[] = [
  { id: 'cat-1', name: '품질', color: '#f59e0b', icon: '🔍', createdAt: Date.now() },
  { id: 'cat-2', name: '보고서', color: '#3b82f6', icon: '📄', createdAt: Date.now() },
];

const futureDeadline = Date.now() + 7 * 24 * 60 * 60 * 1000; // 1주일 후

const mockTask: Task = {
  id: 'task-1',
  title: '기존 태스크 제목',
  description: '기존 설명',
  deadline: futureDeadline,
  estimatedMinutes: 60,
  importance: 3,
  category: '품질',
  relatedClass: '',
  parentId: null,
  status: 'pending',
  progress: 0,
  templateId: null,
  createdAt: Date.now(),
  updatedAt: Date.now(),
  completedAt: null,
};

const mockTasks: Task[] = [
  mockTask,
  {
    id: 'task-2',
    title: '다른 태스크',
    description: '',
    deadline: null,
    estimatedMinutes: 30,
    importance: 2,
    category: '보고서',
    relatedClass: '',
    parentId: null,
    status: 'pending',
    progress: 0,
    templateId: null,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    completedAt: null,
  },
];

// ── 기본 Props ──────────────────────────────────────────────
function makeProps(overrides: Partial<React.ComponentProps<typeof TaskForm>> = {}) {
  return {
    categories: mockCategories,
    tasks: mockTasks,
    onSubmit: vi.fn(),
    onCancel: vi.fn(),
    ...overrides,
  };
}

// ── 날짜 포맷 헬퍼 ──────────────────────────────────────────
function toDateInputValue(ts: number): string {
  return new Date(ts).toISOString().slice(0, 10);
}

// ══════════════════════════════════════════════════════════════
describe('TaskForm - 필드 렌더링', () => {
  it('title 입력 필드가 렌더링된다', () => {
    render(<TaskForm {...makeProps()} />);
    expect(screen.getByLabelText(/제목/i)).toBeInTheDocument();
  });

  it('description 텍스트에어리어가 렌더링된다', () => {
    render(<TaskForm {...makeProps()} />);
    expect(screen.getByLabelText(/설명/i)).toBeInTheDocument();
  });

  it('deadline 날짜 입력 필드가 렌더링된다', () => {
    render(<TaskForm {...makeProps()} />);
    expect(screen.getByLabelText(/마감일/i)).toBeInTheDocument();
  });

  it('estimatedMinutes 숫자 입력 필드가 렌더링된다', () => {
    render(<TaskForm {...makeProps()} />);
    expect(screen.getByLabelText(/예상 소요/i)).toBeInTheDocument();
  });

  it('importance 선택기(5개 원)가 렌더링된다', () => {
    render(<TaskForm {...makeProps()} />);
    const importanceButtons = screen.getAllByRole('button', { name: /중요도 [1-5]/i });
    expect(importanceButtons).toHaveLength(5);
  });

  it('category 드롭다운이 렌더링된다', () => {
    render(<TaskForm {...makeProps()} />);
    expect(screen.getByLabelText(/카테고리/i)).toBeInTheDocument();
  });

  it('category 드롭다운에 mockCategories 옵션이 표시된다', () => {
    render(<TaskForm {...makeProps()} />);
    const select = screen.getByLabelText(/카테고리/i);
    expect(within(select as HTMLElement).getByText('품질')).toBeInTheDocument();
    expect(within(select as HTMLElement).getByText('보고서')).toBeInTheDocument();
  });

  it('parent 드롭다운이 렌더링된다', () => {
    render(<TaskForm {...makeProps()} />);
    expect(screen.getByLabelText(/상위 태스크/i)).toBeInTheDocument();
  });

  it('parent 드롭다운에 "없음 (최상위)" 옵션이 있다', () => {
    render(<TaskForm {...makeProps()} />);
    const select = screen.getByLabelText(/상위 태스크/i);
    expect(within(select as HTMLElement).getByText(/없음.*최상위/i)).toBeInTheDocument();
  });

  it('parent 드롭다운에 기존 태스크 목록이 표시된다', () => {
    render(<TaskForm {...makeProps()} />);
    const select = screen.getByLabelText(/상위 태스크/i);
    expect(within(select as HTMLElement).getByText('기존 태스크 제목')).toBeInTheDocument();
    expect(within(select as HTMLElement).getByText('다른 태스크')).toBeInTheDocument();
  });

  it('Submit 버튼이 렌더링된다', () => {
    render(<TaskForm {...makeProps()} />);
    expect(screen.getByRole('button', { name: /저장|등록|확인/i })).toBeInTheDocument();
  });

  it('Cancel 버튼이 렌더링된다', () => {
    render(<TaskForm {...makeProps()} />);
    expect(screen.getByRole('button', { name: /취소/i })).toBeInTheDocument();
  });
});

// ══════════════════════════════════════════════════════════════
describe('TaskForm - 유효성 검사', () => {
  it('title이 빈 상태로 submit 시 에러 메시지를 표시한다', async () => {
    render(<TaskForm {...makeProps()} />);
    fireEvent.click(screen.getByRole('button', { name: /저장|등록|확인/i }));
    await waitFor(() => {
      expect(screen.getByText(/제목.*필수|제목.*입력/i)).toBeInTheDocument();
    });
  });

  it('title이 빈 상태로 submit 시 onSubmit이 호출되지 않는다', async () => {
    const onSubmit = vi.fn();
    render(<TaskForm {...makeProps({ onSubmit })} />);
    fireEvent.click(screen.getByRole('button', { name: /저장|등록|확인/i }));
    await waitFor(() => {
      expect(onSubmit).not.toHaveBeenCalled();
    });
  });

  it('과거 날짜를 deadline으로 입력하면 submit 시 에러 메시지를 표시한다', async () => {
    render(<TaskForm {...makeProps()} />);
    // title 먼저 채움
    fireEvent.change(screen.getByLabelText(/제목/i), { target: { value: '테스트 태스크' } });
    // 과거 날짜
    fireEvent.change(screen.getByLabelText(/마감일/i), { target: { value: '2020-01-01' } });
    fireEvent.click(screen.getByRole('button', { name: /저장|등록|확인/i }));
    await waitFor(() => {
      expect(screen.getByText(/마감일.*미래|미래.*날짜|과거.*날짜|이미 지난/i)).toBeInTheDocument();
    });
  });

  it('estimatedMinutes가 15 미만이면 에러를 표시한다', async () => {
    render(<TaskForm {...makeProps()} />);
    fireEvent.change(screen.getByLabelText(/제목/i), { target: { value: '테스트' } });
    fireEvent.change(screen.getByLabelText(/예상 소요/i), { target: { value: '10' } });
    fireEvent.click(screen.getByRole('button', { name: /저장|등록|확인/i }));
    await waitFor(() => {
      expect(screen.getByText(/15분|최소.*15/i)).toBeInTheDocument();
    });
  });

  it('estimatedMinutes가 240 초과면 에러를 표시한다', async () => {
    render(<TaskForm {...makeProps()} />);
    fireEvent.change(screen.getByLabelText(/제목/i), { target: { value: '테스트' } });
    fireEvent.change(screen.getByLabelText(/예상 소요/i), { target: { value: '300' } });
    fireEvent.click(screen.getByRole('button', { name: /저장|등록|확인/i }));
    await waitFor(() => {
      expect(screen.getByText(/240분|최대.*240/i)).toBeInTheDocument();
    });
  });
});

// ══════════════════════════════════════════════════════════════
describe('TaskForm - 정상 submit', () => {
  it('유효한 데이터로 submit 시 onSubmit이 form data와 함께 호출된다', async () => {
    const onSubmit = vi.fn();
    render(<TaskForm {...makeProps({ onSubmit })} />);

    fireEvent.change(screen.getByLabelText(/제목/i), { target: { value: '새 태스크' } });
    fireEvent.change(screen.getByLabelText(/예상 소요/i), { target: { value: '60' } });
    fireEvent.click(screen.getByRole('button', { name: /저장|등록|확인/i }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledOnce();
      const [data] = onSubmit.mock.calls[0];
      expect(data.title).toBe('새 태스크');
      expect(data.estimatedMinutes).toBe(60);
    });
  });

  it('submit data에 deadline이 null 또는 timestamp로 포함된다', async () => {
    const onSubmit = vi.fn();
    render(<TaskForm {...makeProps({ onSubmit })} />);

    fireEvent.change(screen.getByLabelText(/제목/i), { target: { value: '새 태스크' } });
    fireEvent.click(screen.getByRole('button', { name: /저장|등록|확인/i }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledOnce();
      const [data] = onSubmit.mock.calls[0];
      expect(data.deadline === null || typeof data.deadline === 'number').toBe(true);
    });
  });

  it('submit data에 subtasks 배열이 포함된다', async () => {
    const onSubmit = vi.fn();
    render(<TaskForm {...makeProps({ onSubmit })} />);
    fireEvent.change(screen.getByLabelText(/제목/i), { target: { value: '새 태스크' } });
    fireEvent.click(screen.getByRole('button', { name: /저장|등록|확인/i }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledOnce();
      const [data] = onSubmit.mock.calls[0];
      expect(Array.isArray(data.subtasks)).toBe(true);
    });
  });
});

// ══════════════════════════════════════════════════════════════
describe('TaskForm - Cancel 버튼', () => {
  it('Cancel 버튼 클릭 시 onCancel이 호출된다', () => {
    const onCancel = vi.fn();
    render(<TaskForm {...makeProps({ onCancel })} />);
    fireEvent.click(screen.getByRole('button', { name: /취소/i }));
    expect(onCancel).toHaveBeenCalledOnce();
  });
});

// ══════════════════════════════════════════════════════════════
describe('TaskForm - 수정 모드 (edit mode)', () => {
  it('task prop 전달 시 title이 pre-fill된다', () => {
    render(<TaskForm {...makeProps({ task: mockTask })} />);
    const input = screen.getByLabelText(/제목/i) as HTMLInputElement;
    expect(input.value).toBe('기존 태스크 제목');
  });

  it('task prop 전달 시 description이 pre-fill된다', () => {
    render(<TaskForm {...makeProps({ task: mockTask })} />);
    const textarea = screen.getByLabelText(/설명/i) as HTMLTextAreaElement;
    expect(textarea.value).toBe('기존 설명');
  });

  it('task prop 전달 시 estimatedMinutes가 pre-fill된다', () => {
    render(<TaskForm {...makeProps({ task: mockTask })} />);
    const input = screen.getByLabelText(/예상 소요/i) as HTMLInputElement;
    expect(input.value).toBe('60');
  });

  it('task prop 전달 시 importance가 pre-fill된다', () => {
    render(<TaskForm {...makeProps({ task: mockTask })} />);
    // importance=3 이면 3번째 버튼이 selected 상태여야 함
    const btn3 = screen.getByRole('button', { name: /중요도 3/i });
    expect(btn3).toHaveAttribute('data-selected', 'true');
  });

  it('task prop 전달 시 deadline이 pre-fill된다', () => {
    render(<TaskForm {...makeProps({ task: mockTask })} />);
    const input = screen.getByLabelText(/마감일/i) as HTMLInputElement;
    expect(input.value).toBe(toDateInputValue(futureDeadline));
  });
});

// ══════════════════════════════════════════════════════════════
describe('TaskForm - Importance 선택기', () => {
  it('중요도 버튼 클릭 시 해당 레벨이 선택된다', () => {
    render(<TaskForm {...makeProps()} />);
    const btn4 = screen.getByRole('button', { name: /중요도 4/i });
    fireEvent.click(btn4);
    expect(btn4).toHaveAttribute('data-selected', 'true');
  });

  it('다른 중요도 버튼 클릭 시 이전 선택이 해제된다', () => {
    render(<TaskForm {...makeProps()} />);
    const btn2 = screen.getByRole('button', { name: /중요도 2/i });
    const btn5 = screen.getByRole('button', { name: /중요도 5/i });
    fireEvent.click(btn2);
    fireEvent.click(btn5);
    expect(btn2).toHaveAttribute('data-selected', 'false');
    expect(btn5).toHaveAttribute('data-selected', 'true');
  });
});

// ══════════════════════════════════════════════════════════════
describe('TaskForm - AI 추정 버튼', () => {
  it('title이 5자 미만일 때 AI 추정 버튼이 보이지 않는다', () => {
    render(<TaskForm {...makeProps({ onAiEstimate: vi.fn() })} />);
    fireEvent.change(screen.getByLabelText(/제목/i), { target: { value: '짧음' } }); // 3자
    expect(screen.queryByRole('button', { name: /AI 추정/i })).not.toBeInTheDocument();
  });

  it('title이 5자 이상일 때 AI 추정 버튼이 나타난다', () => {
    render(<TaskForm {...makeProps({ onAiEstimate: vi.fn() })} />);
    fireEvent.change(screen.getByLabelText(/제목/i), { target: { value: '다섯글자이상' } }); // 6자
    expect(screen.getByRole('button', { name: /AI 추정/i })).toBeInTheDocument();
  });

  it('onAiEstimate가 없으면 title이 5자 이상이어도 AI 추정 버튼이 보이지 않는다', () => {
    render(<TaskForm {...makeProps()} />); // onAiEstimate 없음
    fireEvent.change(screen.getByLabelText(/제목/i), { target: { value: '다섯글자이상' } });
    expect(screen.queryByRole('button', { name: /AI 추정/i })).not.toBeInTheDocument();
  });

  it('AI 추정 버튼 클릭 시 onAiEstimate가 title, description과 함께 호출된다', async () => {
    const onAiEstimate = vi.fn().mockResolvedValue({
      estimatedMinutes: 90,
      importance: 4,
      category: '품질',
    });
    render(<TaskForm {...makeProps({ onAiEstimate })} />);
    fireEvent.change(screen.getByLabelText(/제목/i), { target: { value: '다섯글자이상 제목' } });
    fireEvent.change(screen.getByLabelText(/설명/i), { target: { value: '설명 텍스트' } });
    fireEvent.click(screen.getByRole('button', { name: /AI 추정/i }));
    await waitFor(() => {
      expect(onAiEstimate).toHaveBeenCalledWith('다섯글자이상 제목', '설명 텍스트');
    });
  });

  it('AI 추정 결과로 estimatedMinutes, importance, category가 자동 채워진다', async () => {
    const onAiEstimate = vi.fn().mockResolvedValue({
      estimatedMinutes: 90,
      importance: 4,
      category: '품질',
    });
    render(<TaskForm {...makeProps({ onAiEstimate })} />);
    fireEvent.change(screen.getByLabelText(/제목/i), { target: { value: '다섯글자이상 제목' } });
    fireEvent.click(screen.getByRole('button', { name: /AI 추정/i }));

    await waitFor(() => {
      const minutesInput = screen.getByLabelText(/예상 소요/i) as HTMLInputElement;
      expect(minutesInput.value).toBe('90');
    });
    const btn4 = screen.getByRole('button', { name: /중요도 4/i });
    expect(btn4).toHaveAttribute('data-selected', 'true');
    const catSelect = screen.getByLabelText(/카테고리/i) as HTMLSelectElement;
    expect(catSelect.value).toBe('품질');
  });

  it('AI 추정 중 버튼에 로딩 상태가 표시된다', async () => {
    let resolve: (val: unknown) => void;
    const onAiEstimate = vi.fn().mockReturnValue(new Promise(r => { resolve = r; }));
    render(<TaskForm {...makeProps({ onAiEstimate })} />);
    fireEvent.change(screen.getByLabelText(/제목/i), { target: { value: '다섯글자이상 제목' } });
    fireEvent.click(screen.getByRole('button', { name: /AI 추정/i }));

    // 로딩 중 상태 확인 (aria-busy 또는 disabled)
    await waitFor(() => {
      const btn = screen.getByRole('button', { name: /AI 추정|추정 중/i });
      expect(btn).toBeDisabled();
    });

    resolve!({ estimatedMinutes: 60, importance: 3, category: '품질' });
  });
});

// ══════════════════════════════════════════════════════════════
describe('TaskForm - 서브태스크 (subtasks)', () => {
  it('서브태스크 추가 버튼이 렌더링된다', () => {
    render(<TaskForm {...makeProps()} />);
    expect(screen.getByRole('button', { name: /서브태스크 추가|하위 추가|\+/i })).toBeInTheDocument();
  });

  it('서브태스크 추가 버튼 클릭 시 입력 필드가 생긴다', () => {
    render(<TaskForm {...makeProps()} />);
    const addBtn = screen.getByRole('button', { name: /서브태스크 추가|하위 추가|\+/i });
    fireEvent.click(addBtn);
    // 서브태스크 제목 입력 필드가 하나 생겨야 함
    expect(screen.getAllByPlaceholderText(/서브태스크|하위 태스크/i)).toHaveLength(1);
  });

  it('서브태스크 삭제 버튼 클릭 시 해당 서브태스크가 제거된다', () => {
    render(<TaskForm {...makeProps()} />);
    const addBtn = screen.getByRole('button', { name: /서브태스크 추가|하위 추가|\+/i });
    fireEvent.click(addBtn);
    fireEvent.click(addBtn);
    // 2개 추가됨
    expect(screen.getAllByPlaceholderText(/서브태스크|하위 태스크/i)).toHaveLength(2);

    // 첫 번째 삭제 버튼 클릭
    const deleteBtns = screen.getAllByRole('button', { name: /삭제|제거|×/i });
    fireEvent.click(deleteBtns[0]);
    expect(screen.getAllByPlaceholderText(/서브태스크|하위 태스크/i)).toHaveLength(1);
  });

  it('서브태스크 제목 입력 시 값이 변경된다', () => {
    render(<TaskForm {...makeProps()} />);
    const addBtn = screen.getByRole('button', { name: /서브태스크 추가|하위 추가|\+/i });
    fireEvent.click(addBtn);
    const subInput = screen.getByPlaceholderText(/서브태스크|하위 태스크/i) as HTMLInputElement;
    fireEvent.change(subInput, { target: { value: '서브태스크 1' } });
    expect(subInput.value).toBe('서브태스크 1');
  });

  it('submit 시 subtasks 배열에 입력된 서브태스크 제목이 포함된다', async () => {
    const onSubmit = vi.fn();
    render(<TaskForm {...makeProps({ onSubmit })} />);
    fireEvent.change(screen.getByLabelText(/제목/i), { target: { value: '메인 태스크' } });

    const addBtn = screen.getByRole('button', { name: /서브태스크 추가|하위 추가|\+/i });
    fireEvent.click(addBtn);
    const subInput = screen.getByPlaceholderText(/서브태스크|하위 태스크/i);
    fireEvent.change(subInput, { target: { value: '서브 1' } });

    fireEvent.click(screen.getByRole('button', { name: /저장|등록|확인/i }));
    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledOnce();
      const [data] = onSubmit.mock.calls[0];
      expect(data.subtasks).toEqual([{ title: '서브 1' }]);
    });
  });
});
