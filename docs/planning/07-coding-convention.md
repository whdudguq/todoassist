# TodoAssist - 코딩 컨벤션 문서

> 프로젝트 구조, 네이밍, 패턴, 에러 처리, 테스트 전략

---

## 1. 프로젝트 구조

### 1.1 디렉토리 레이아웃

```
TodoAssist/
├── src/
│   ├── main/                      # Electron 메인 프로세스
│   │   ├── index.ts               # 진입점
│   │   ├── config.ts              # 설정 (API 키 등)
│   │   ├── logger.ts              # 로깅 유틸리티
│   │   ├── windows/
│   │   │   ├── mainWindow.ts      # 메인 윈도우 생성
│   │   │   └── trayWindow.ts      # 트레이 아이콘
│   │   ├── ipc/
│   │   │   ├── channels.ts        # IPC 채널 정의 (상수)
│   │   │   └── handlers.ts        # IPC 핸들러 함수
│   │   ├── database/
│   │   │   ├── index.ts           # DB 연결 & 초기화
│   │   │   ├── queries.ts         # SQL 쿼리 함수
│   │   │   ├── migration.ts       # 마이그레이션 관리
│   │   │   └── migrations/        # 마이그레이션 SQL 파일
│   │   │       ├── 001_initial_schema.sql
│   │   │       └── ...
│   │   └── services/
│   │       ├── claudeApi.ts       # Claude API 호출 로직
│   │       ├── scheduler.ts       # 스케줄 제안 로직
│   │       ├── analyzer.ts        # 통계 분석 로직
│   │       └── backup.ts          # 백업 관리
│   │
│   ├── renderer/                   # React 렌더러 프로세스
│   │   ├── index.tsx              # 진입점
│   │   ├── App.tsx                # 루트 컴포넌트
│   │   ├── pages/                 # 페이지 (스크린)
│   │   │   ├── Dashboard.tsx      # S1
│   │   │   ├── Kanban.tsx         # S2
│   │   │   ├── TaskTree.tsx       # S3
│   │   │   ├── TaskForm.tsx       # S4
│   │   │   ├── Statistics.tsx     # S5
│   │   │   ├── AiChat.tsx         # S6
│   │   │   └── Settings.tsx       # S7
│   │   ├── components/            # 재사용 컴포넌트
│   │   │   ├── ui/
│   │   │   │   ├── Button.tsx
│   │   │   │   ├── Card.tsx
│   │   │   │   ├── Modal.tsx
│   │   │   │   └── ...
│   │   │   ├── TaskCard.tsx       # 커스텀
│   │   │   ├── TimeSlot.tsx
│   │   │   ├── ProgressBar.tsx
│   │   │   ├── AiMessage.tsx
│   │   │   ├── KanbanColumn.tsx
│   │   │   ├── TreeNode.tsx
│   │   │   ├── Layout.tsx         # 레이아웃 래퍼
│   │   │   └── Navigation.tsx     # 좌측 메뉴
│   │   ├── store/                 # Zustand 상태 관리
│   │   │   ├── taskStore.ts
│   │   │   ├── uiStore.ts
│   │   │   ├── settingStore.ts
│   │   │   └── index.ts           # 통합 export
│   │   ├── hooks/                 # 커스텀 hooks
│   │   │   ├── useTask.ts         # 태스크 CRUD
│   │   │   ├── useAi.ts           # AI 호출
│   │   │   ├── useDatabase.ts     # DB 쿼리
│   │   │   ├── useIpc.ts          # IPC 통신
│   │   │   └── ...
│   │   ├── utils/                 # 유틸리티
│   │   │   ├── dateUtils.ts
│   │   │   ├── calculateProgress.ts
│   │   │   ├── formatters.ts
│   │   │   └── validators.ts
│   │   ├── types/                 # TypeScript 타입 정의
│   │   │   ├── task.ts
│   │   │   ├── timebox.ts
│   │   │   ├── encouragement.ts
│   │   │   └── api.ts
│   │   ├── styles/
│   │   │   ├── globals.css        # 전역 스타일
│   │   │   └── tailwind.config.js
│   │   └── assets/
│   │       ├── icons/
│   │       └── images/
│   │
│   └── shared/                    # 메인/렌더러 공유 코드
│       ├── types/                 # 공유 타입
│       │   ├── ipc.ts             # IPC 메시지 타입
│       │   └── models.ts          # 데이터 모델
│       └── constants/
│           ├── ipcChannels.ts     # IPC 채널 상수
│           └── ...
│
├── tests/
│   ├── unit/                      # 유닛 테스트
│   │   ├── utils/
│   │   ├── hooks/
│   │   └── services/
│   ├── integration/               # 통합 테스트
│   ├── e2e/                       # E2E 테스트
│   └── fixtures/                  # 테스트 데이터
│
├── docs/
│   └── planning/                  # 기획 문서
│       ├── 01-prd.md
│       ├── ...
│       └── 07-coding-convention.md
│
├── public/
│   ├── icon.png
│   └── ...
│
├── package.json
├── tsconfig.json
├── tailwind.config.js
├── vite.config.ts
├── .eslintrc.js
├── .prettierrc.js
└── README.md
```

---

## 2. 파일 네이밍 규칙

### 2.1 파일 이름

```
컴포넌트: PascalCase
  ✓ TaskCard.tsx
  ✓ AiMessage.tsx
  ✗ taskCard.tsx
  ✗ ai-message.tsx

유틸, 훅, 서비스: camelCase
  ✓ dateUtils.ts
  ✓ useTask.ts
  ✓ claudeApi.ts
  ✗ DateUtils.ts
  ✗ UseTask.ts

상수, 설정: camelCase (또는 UPPER_SNAKE_CASE 큰 상수)
  ✓ ipcChannels.ts
  ✓ API_BASE_URL (상수값)
  ✓ defaultSettings.ts

타입 정의: PascalCase
  ✓ task.ts (파일)
  ✓ type Task = {...} (타입명)
  ✗ taskTypes.ts (파일 이름에 Types 붙이지 않음)

테스트: {원본파일명}.test.ts 또는 {원본파일명}.spec.ts
  ✓ TaskCard.test.tsx
  ✓ useTask.spec.ts
```

### 2.2 디렉토리 이름

```
모두 lowercase, 복수형 또는 의미있는 단어

✓ components/
✓ pages/
✓ hooks/
✓ utils/
✓ store/
✓ services/
✓ types/

✗ Component/
✗ page/
✗ Hook/
```

---

## 3. 컴포넌트 패턴

### 3.1 함수형 컴포넌트 (필수)

```typescript
// ✓ 올바른 패턴
import React from 'react';

interface TaskCardProps {
  taskId: string;
  title: string;
  importance: number;
  onStart?: () => void;
  onDelete?: () => void;
}

/**
 * 태스크 카드 컴포넌트
 * @param props - 태스크 정보 및 핸들러
 * @returns JSX.Element
 */
export const TaskCard: React.FC<TaskCardProps> = ({
  taskId,
  title,
  importance,
  onStart,
  onDelete,
}) => {
  const [isHovered, setIsHovered] = React.useState(false);

  const handleStart = () => {
    onStart?.();
  };

  return (
    <div
      className="bg-white border-l-4 rounded-lg p-4 shadow-sm"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <h4 className="text-lg font-semibold">{title}</h4>
      {isHovered && (
        <div className="flex gap-2 mt-2">
          <button onClick={handleStart}>시작</button>
          <button onClick={onDelete}>삭제</button>
        </div>
      )}
    </div>
  );
};

TaskCard.displayName = 'TaskCard';
```

### 3.2 Props 정의

```typescript
// ✓ 필수 Props는 필수, 선택적 Props는 ?
interface ComponentProps {
  // 필수
  id: string;
  title: string;

  // 선택적
  subtitle?: string;
  onAction?: () => void;
  className?: string;

  // 기본값이 있는 경우
  variant?: 'primary' | 'secondary';  // 기본값은 컴포넌트에서
}

// ✓ 콜백 함수는 명확한 이름
interface FormProps {
  onSubmit: (data: FormData) => Promise<void>;
  onCancel?: () => void;
  onError?: (error: Error) => void;
}

// ✗ 모호한 이름 피하기
interface BadProps {
  on?: () => void;       // ✗ 뭔지 불명확
  onChange?: any;        // ✗ any 타입 피하기
}
```

### 3.3 컴포넌트 내부 구조

```typescript
export const MyComponent: React.FC<MyComponentProps> = (props) => {
  // 1. Props 분해
  const { title, onAction } = props;

  // 2. 상태 (useState)
  const [isLoading, setIsLoading] = React.useState(false);
  const [data, setData] = React.useState<DataType | null>(null);

  // 3. Ref (useRef) - 필요한 경우만
  const inputRef = React.useRef<HTMLInputElement>(null);

  // 4. Context (useContext)
  const { theme } = React.useContext(ThemeContext);

  // 5. 커스텀 훅
  const { data: fetchedData } = useCustomHook();

  // 6. 효과 (useEffect) - 의존성 배열 명확히
  React.useEffect(() => {
    // 초기화 로직
    return () => {
      // 정리 로직
    };
  }, [dependency]);

  // 7. 헬퍼 함수
  const handleAction = React.useCallback(() => {
    // ...
  }, [dependency]);

  // 8. 렌더링
  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="container">
      {/* JSX */}
    </div>
  );
};
```

### 3.4 재사용 컴포넌트 vs 페이지

```typescript
// ✓ 컴포넌트: 독립적, 재사용 가능, Props 기반
export const UserAvatar: React.FC<{ userId: string }> = ({ userId }) => {
  // 로컬 상태만 사용
  // 전역 상태는 props로 받음
  return <img src={getAvatarUrl(userId)} />;
};

// ✓ 페이지: 라우팅, 글로벌 상태, 데이터 페칭
export const DashboardPage: React.FC = () => {
  // 글로벌 상태 사용 OK
  const { tasks, setTasks } = useTaskStore();

  React.useEffect(() => {
    // 페이지 로드 시 데이터 페칭
    loadTodayTasks();
  }, []);

  return (
    <Layout>
      <Header />
      <TaskCard task={tasks[0]} />
    </Layout>
  );
};
```

---

## 4. 상태 관리 패턴 (Zustand)

### 4.1 스토어 구조

```typescript
// src/renderer/store/taskStore.ts
import { create } from 'zustand';
import { Task, TimeBox } from '@shared/types';

/**
 * 태스크 관련 글로벌 상태
 */
interface TaskState {
  // 상태
  tasks: Task[];
  selectedTaskId: string | null;
  isLoading: boolean;
  error: Error | null;

  // 액션
  fetchTasks: (filters?: TaskFilter) => Promise<void>;
  addTask: (task: Task) => Promise<void>;
  updateTask: (id: string, updates: Partial<Task>) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  selectTask: (id: string) => void;
  clearSelection: () => void;
}

/**
 * Zustand 스토어 생성
 */
export const useTaskStore = create<TaskState>((set, get) => ({
  // 초기 상태
  tasks: [],
  selectedTaskId: null,
  isLoading: false,
  error: null,

  // 액션: 비동기 작업
  fetchTasks: async (filters?: TaskFilter) => {
    set({ isLoading: true, error: null });
    try {
      const tasks = await ipcInvoke('db:query', {
        sql: 'SELECT * FROM Task WHERE ...',
        params: [filters],
      });
      set({ tasks, isLoading: false });
    } catch (error) {
      set({ error: error as Error, isLoading: false });
    }
  },

  // 액션: 동기
  selectTask: (id: string) => {
    set({ selectedTaskId: id });
  },

  clearSelection: () => {
    set({ selectedTaskId: null });
  },

  // 액션: 동기 상태 업데이트
  addTask: async (task: Task) => {
    const { tasks } = get();
    set({ tasks: [...tasks, task] });
    // DB 동기화
    await ipcInvoke('db:insert', { table: 'Task', data: task });
  },

  // ...
}));
```

### 4.2 여러 스토어 조합

```typescript
// src/renderer/store/index.ts
/**
 * 여러 스토어 통합 접근 (선택사항)
 */
export const useAppStore = () => {
  const taskStore = useTaskStore();
  const uiStore = useUiStore();
  const settingStore = useSettingStore();

  return {
    // 선택적으로 노출
    tasks: taskStore.tasks,
    currentPage: uiStore.currentPage,
    settings: settingStore.settings,
  };
};

// 또는 각 스토어 개별 import
// const { tasks } = useTaskStore();
// const { currentPage } = useUiStore();
```

### 4.3 스토어 사용 (컴포넌트)

```typescript
export const TaskList: React.FC = () => {
  // 필요한 상태와 액션만 가져오기
  const { tasks, isLoading, selectTask } = useTaskStore(
    (state) => ({
      tasks: state.tasks,
      isLoading: state.isLoading,
      selectTask: state.selectTask,
    })
  );

  if (isLoading) return <LoadingSpinner />;

  return (
    <div>
      {tasks.map((task) => (
        <TaskCard
          key={task.id}
          task={task}
          onClick={() => selectTask(task.id)}
        />
      ))}
    </div>
  );
};
```

---

## 5. API 호출 패턴

### 5.1 IPC (메인 ↔ 렌더러)

```typescript
// src/shared/types/ipc.ts
/**
 * IPC 메시지 타입 정의
 */
export interface IpcMessage {
  channel: string;
  args: any[];
}

// src/shared/constants/ipcChannels.ts
export const IPC_CHANNELS = {
  // 데이터베이스
  DB_QUERY: 'db:query',
  DB_INSERT: 'db:insert',
  DB_UPDATE: 'db:update',
  DB_DELETE: 'db:delete',

  // AI API
  AI_GENERATE_GREETING: 'ai:generateGreeting',
  AI_SCHEDULE_PROPOSAL: 'ai:scheduleProposal',
  AI_ENCOURAGEMENT: 'ai:encouragement',

  // 알림
  NOTIFICATION_SHOW: 'notification:show',
} as const;

// src/renderer/hooks/useIpc.ts
/**
 * IPC 호출 커스텀 훅
 */
export const useIpc = () => {
  const invoke = React.useCallback(
    async <T>(channel: string, args?: any): Promise<T> => {
      try {
        const result = await window.ipcRenderer.invoke(channel, args);
        return result as T;
      } catch (error) {
        logger.error(`IPC error on ${channel}:`, error);
        throw error;
      }
    },
    []
  );

  return { invoke };
};

// 사용 예
export const useDatabase = () => {
  const { invoke } = useIpc();

  const queryTasks = React.useCallback(
    async (where: string) => {
      return invoke<Task[]>('db:query', {
        sql: `SELECT * FROM Task WHERE ${where}`,
      });
    },
    [invoke]
  );

  return { queryTasks };
};
```

### 5.2 Claude API

```typescript
// src/main/services/claudeApi.ts
import Anthropic from '@anthropic-ai/sdk';

interface ClaudeRequest {
  type: 'greeting' | 'schedule' | 'encouragement' | 'insight';
  prompt: string;
  maxTokens?: number;
}

interface ClaudeResponse {
  content: string;
  tokensUsed: number;
  model: string;
}

/**
 * Claude API 호출 래퍼
 */
export class ClaudeApiService {
  private client: Anthropic;
  private model = 'claude-3-5-sonnet-20241022';

  constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey });
  }

  /**
   * 텍스트 생성 (공통)
   */
  async generate(request: ClaudeRequest): Promise<ClaudeResponse> {
    try {
      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: request.maxTokens || 500,
        messages: [
          {
            role: 'user',
            content: request.prompt,
          },
        ],
      });

      const content = response.content[0];
      if (content.type !== 'text') {
        throw new Error('Unexpected response type');
      }

      return {
        content: content.text,
        tokensUsed: response.usage.output_tokens,
        model: this.model,
      };
    } catch (error) {
      logger.error('Claude API error:', error);
      throw error;
    }
  }

  /**
   * 아침 인사 생성
   */
  async generateGreeting(context: GreetingContext): Promise<string> {
    const prompt = `
      사용자 이름: ${context.userName}
      현재 시간: ${context.hour}:00
      오늘 완료율: ${context.completionRate}%

      따뜻하고 격려적인 톤의 30자~50자 인사말을 생성해주세요.
    `;

    const response = await this.generate({
      type: 'greeting',
      prompt,
      maxTokens: 100,
    });

    return response.content;
  }

  // ...더 많은 메서드들
}

// 사용 (메인 프로세스)
const claudeApi = new ClaudeApiService(process.env.CLAUDE_API_KEY!);

ipcMain.handle('ai:generateGreeting', async (event, context) => {
  const greeting = await claudeApi.generateGreeting(context);
  return greeting;
});
```

### 5.3 에러 처리

```typescript
/**
 * API 호출 시 에러 처리
 */
export const useTaskQuery = () => {
  const { invoke } = useIpc();
  const [error, setError] = React.useState<Error | null>(null);

  const fetchTask = React.useCallback(
    async (taskId: string) => {
      setError(null);
      try {
        const task = await invoke<Task>('db:query', {
          sql: 'SELECT * FROM Task WHERE id = ?',
          params: [taskId],
        });
        return task;
      } catch (err) {
        const error = err instanceof Error
          ? err
          : new Error('Unknown error');

        // 에러 분류 & 처리
        if (error.message.includes('not found')) {
          setError(new Error('태스크를 찾을 수 없습니다'));
        } else if (error.message.includes('timeout')) {
          setError(new Error('요청 시간 초과'));
        } else {
          setError(error);
        }

        logger.error('Task fetch failed:', error);
        throw error;
      }
    },
    [invoke]
  );

  return { fetchTask, error };
};
```

---

## 6. 에러 처리

### 6.1 에러 클래스

```typescript
// src/shared/errors/index.ts

/**
 * 공통 에러 클래스
 */
export class TodoAssistError extends Error {
  constructor(
    public code: string,
    public message: string,
    public statusCode?: number,
    public context?: Record<string, any>
  ) {
    super(message);
    this.name = 'TodoAssistError';
  }
}

/**
 * 데이터베이스 에러
 */
export class DatabaseError extends TodoAssistError {
  constructor(message: string, context?: any) {
    super('DB_ERROR', message, undefined, context);
    this.name = 'DatabaseError';
  }
}

/**
 * API 에러
 */
export class ApiError extends TodoAssistError {
  constructor(message: string, statusCode?: number, context?: any) {
    super('API_ERROR', message, statusCode, context);
    this.name = 'ApiError';
  }
}

/**
 * 유효성 검사 에러
 */
export class ValidationError extends TodoAssistError {
  constructor(message: string, context?: any) {
    super('VALIDATION_ERROR', message, 400, context);
    this.name = 'ValidationError';
  }
}
```

### 6.2 에러 처리 패턴

```typescript
// 메인 프로세스
ipcMain.handle('db:insert', async (event, payload) => {
  try {
    // 입력 검증
    if (!payload.table || !payload.data) {
      throw new ValidationError('Missing required fields', { payload });
    }

    // 데이터 삽입
    const result = await database.insert(payload.table, payload.data);
    return result;
  } catch (error) {
    logger.error('DB insert failed:', error);

    if (error instanceof TodoAssistError) {
      return { success: false, error: error.code, message: error.message };
    }

    // 예상치 못한 에러
    return {
      success: false,
      error: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
    };
  }
});

// 렌더러 프로세스
const handleSave = React.useCallback(async (data: Task) => {
  try {
    const result = await invoke('db:insert', {
      table: 'Task',
      data,
    });

    if (!result.success) {
      if (result.error === 'VALIDATION_ERROR') {
        toast.error('입력 데이터가 유효하지 않습니다');
      } else {
        toast.error('저장에 실패했습니다');
      }
      return;
    }

    toast.success('저장되었습니다');
  } catch (error) {
    logger.error('Task save failed:', error);
    toast.error('알 수 없는 오류가 발생했습니다');
  }
}, [invoke]);
```

### 6.3 로깅

```typescript
// src/main/logger.ts
enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

const LOG_FILE = path.join(app.getPath('userData'), 'logs', 'app.log');

export const logger = {
  debug: (msg: string, data?: any) => {
    console.log(`[DEBUG] ${msg}`, data);
    writeLog('DEBUG', msg, data);
  },

  info: (msg: string, data?: any) => {
    console.log(`[INFO] ${msg}`, data);
    writeLog('INFO', msg, data);
  },

  warn: (msg: string, data?: any) => {
    console.warn(`[WARN] ${msg}`, data);
    writeLog('WARN', msg, data);
  },

  error: (msg: string, error?: Error) => {
    console.error(`[ERROR] ${msg}`, error);
    writeLog('ERROR', msg, {
      message: error?.message,
      stack: error?.stack,
    });
  },
};

function writeLog(level: string, msg: string, data?: any) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] [${level}] ${msg}`;

  // 파일에 기록
  fs.appendFileSync(
    LOG_FILE,
    `${logMessage}${data ? ` ${JSON.stringify(data)}` : ''}\n`
  );
}
```

---

## 7. 테스트 전략

### 7.1 테스트 구조

```
tests/
├── unit/                          # 함수/컴포넌트 단위 테스트
│   ├── utils/
│   │   ├── dateUtils.test.ts
│   │   └── calculateProgress.test.ts
│   ├── hooks/
│   │   └── useTask.test.ts
│   └── services/
│       └── claudeApi.test.ts
├── integration/                   # 여러 모듈 함께
│   └── taskFlow.test.ts
├── e2e/                           # 전체 사용자 흐름
│   └── dashboard.e2e.test.ts
└── fixtures/                      # 테스트 데이터
    ├── mockTasks.ts
    └── mockTimebox.ts
```

### 7.2 유닛 테스트 (Jest + RTL)

```typescript
// src/renderer/utils/calculateProgress.test.ts
import { calculateProgress } from './calculateProgress';

describe('calculateProgress', () => {
  it('should return progress of leaf node unchanged', () => {
    const task = {
      id: '1',
      progress: 50,
      parentId: null,
      children: [],
    };

    expect(calculateProgress(task)).toBe(50);
  });

  it('should calculate average progress of children', () => {
    const task = {
      id: '1',
      parentId: null,
      progress: 0, // 무시됨
    };

    const children = [
      { id: '1-1', progress: 50 },
      { id: '1-2', progress: 100 },
    ];

    expect(calculateProgress(task, children)).toBe(75);
  });

  it('should handle empty children array', () => {
    const task = { id: '1', progress: 30 };
    expect(calculateProgress(task, [])).toBe(30);
  });
});
```

### 7.3 컴포넌트 테스트

```typescript
// src/renderer/components/TaskCard.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { TaskCard } from './TaskCard';

describe('TaskCard', () => {
  const mockTask = {
    id: 'task-1',
    title: 'Test Task',
    importance: 4,
  };

  it('should render task title', () => {
    render(<TaskCard {...mockTask} />);
    expect(screen.getByText('Test Task')).toBeInTheDocument();
  });

  it('should call onStart when start button clicked', () => {
    const onStart = jest.fn();
    render(<TaskCard {...mockTask} onStart={onStart} />);

    const startButton = screen.getByRole('button', { name: /시작/i });
    fireEvent.click(startButton);

    expect(onStart).toHaveBeenCalled();
  });

  it('should show action buttons on hover', () => {
    render(<TaskCard {...mockTask} />);
    const card = screen.getByText('Test Task').closest('div');

    fireEvent.mouseEnter(card!);
    expect(screen.getByRole('button', { name: /시작/i })).toBeInTheDocument();
  });
});
```

### 7.4 통합 테스트

```typescript
// tests/integration/taskFlow.test.ts
describe('Task Creation Flow', () => {
  it('should create task and update UI', async () => {
    // 1. 태스크 생성
    const newTask = await createTask({
      title: 'New Task',
      importance: 3,
    });

    // 2. DB에 저장되었는지 확인
    const savedTask = await queryTask(newTask.id);
    expect(savedTask.title).toBe('New Task');

    // 3. UI 상태 업데이트 확인
    const { tasks } = useTaskStore.getState();
    expect(tasks.find(t => t.id === newTask.id)).toBeDefined();

    // 4. AI 추정값 확인
    const estimatedMinutes = await estimateTaskDuration('New Task');
    expect(estimatedMinutes).toBeGreaterThan(0);
  });
});
```

### 7.5 테스트 커버리지 목표

```
전체 커버리지: 70% 이상

유틸리티 함수: 90%+
  - dateUtils, calculateProgress, formatters 등

커스텀 훅: 80%+
  - useTask, useDatabase, useIpc 등

컴포넌트: 70%+
  - 중요 컴포넌트 (TaskCard, ProgressBar) 80%
  - UI 컴포넌트 (Button, Modal) 60%

서비스: 80%+
  - claudeApi, scheduler, analyzer 등
```

---

## 8. 명명 규칙

### 8.1 변수 & 함수

```typescript
// ✓ 명확한 이름
const isLoading = true;
const userTasks: Task[] = [];
const handleTaskClick = () => {};
const calculateTotalMinutes = () => {};

// ✗ 피할 이름
const loading = true;           // boolean인지 불명확
const data = [];                // 뭔지 모름
const onClick = () => {};       // 뭘 하는지 모름
const calc = () => {};          // 약자 사용
```

### 8.2 Boolean 변수

```typescript
// is*, has*, can*, should* 접두어
const isExpanded = false;
const hasChildren = true;
const canEdit = false;
const shouldShowAlert = true;
const isLoading = false;
const isError = false;
```

### 8.3 이벤트 핸들러

```typescript
// handle* 접두어
const handleClick = () => {};
const handleSubmit = () => {};
const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {};
const handleTaskSelect = (taskId: string) => {};
```

### 8.4 콜백/props

```typescript
// on* 접두어
interface ButtonProps {
  onClick?: () => void;
  onHover?: () => void;
  onChange?: (value: string) => void;
}

interface TaskCardProps {
  onStart?: () => void;
  onDelete?: () => void;
  onTaskSelect?: (taskId: string) => void;
}
```

### 8.5 상수

```typescript
// UPPER_SNAKE_CASE (중요한 상수)
const MAX_TASK_TITLE_LENGTH = 50;
const DEFAULT_WORK_START_HOUR = 8;
const API_TIMEOUT_MS = 5000;

// camelCase (설정값)
const defaultSettings = {
  importance: 3,
  estimatedMinutes: 60,
};
```

---

## 9. 주석 및 문서화

### 9.1 JSDoc 주석

```typescript
/**
 * 태스크의 진행률을 계산합니다.
 *
 * 리프 노드(자식이 없음): progress 값 그대로 반환
 * 부모 노드: 자식들의 진행률 평균
 *
 * @param task - 계산 대상 태스크
 * @param children - 자식 태스크 배열 (선택)
 * @returns 계산된 진행률 (0-100)
 * @throws {ValidationError} 잘못된 task 객체
 *
 * @example
 * const progress = calculateProgress(parentTask, childrenTasks);
 * console.log(progress); // 75
 */
export function calculateProgress(
  task: Task,
  children?: Task[]
): number {
  // ...
}

/**
 * React 컴포넌트 주석
 */
export const TaskForm: React.FC<TaskFormProps> = (props) => {
  // ...
};
```

### 9.2 인라인 주석

```typescript
// ✓ 왜인지 설명
const TASK_TIMEOUT = 3000; // 느린 네트워크 환경 고려

// ✗ 뭔지만 반복
const x = 3000; // 3000

// ✓ 복잡한 로직 설명
// AI 추정값과 사용자 입력값이 다르면 사용자 값 우선
const finalValue = userInput !== undefined ? userInput : aiEstimate;

// ✗ 당연한 설명
const count = 0; // count를 0으로 설정
```

---

## 10. Git 커밋 규칙

### 10.1 커밋 메시지 형식

```
<타입>(<범위>): <제목>

<본문>

<푸터>

---

타입:
- feat: 새 기능
- fix: 버그 수정
- refactor: 코드 리팩토링
- style: 코드 스타일 변경 (포매팅, 세미콜론 등)
- docs: 문서 수정
- test: 테스트 추가/수정
- chore: 빌드, 의존성 등

범위:
- components, pages, store, services, utils, db 등

제목:
- 명령형으로 작성 ("변경했다" X, "변경한다" O)
- 50자 이내
- 마침표 X
```

### 10.2 예시

```
feat(components): add progress bar animation

Add smooth transition animation to progress bar updates.
Duration: 300ms, easing: ease-out

Closes #123

---

fix(services): handle Claude API timeout

Retry failed requests up to 3 times with exponential backoff.
Timeout: 5s → 10s → 20s

---

refactor(store): simplify task state management

Extract task filtering logic to useTaskFilter hook.
Reduces boilerplate in components.
```

---

## 11. TypeScript 설정

### 11.1 tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "jsx": "react-jsx",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"],
      "@shared/*": ["src/shared/*"],
      "@main/*": ["src/main/*"],
      "@renderer/*": ["src/renderer/*"]
    }
  }
}
```

### 11.2 금지된 패턴

```typescript
// ✗ any 타입 금지
const data: any = fetchData();  // NO!

// ✓ 명확한 타입
interface DataType { /* ... */ }
const data: DataType = fetchData();

// ✗ 과도한 제네릭
function foo<T, U, V, W>(a: T, b: U, c: V): W {}

// ✓ 필요한 제네릭만
function foo<T>(items: T[]): T | undefined {
  return items[0];
}
```

---

**문서 생성일**: 2026-03-17
**버전**: 1.0
