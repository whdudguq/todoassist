# TodoAssist - 기술 요구사항 문서 (TRD)

> AI 업무 비서 데스크톱 앱의 기술 아키텍처, 스택, 데이터 모델

---

## 1. 기술 스택 상세

### 1.1 런타임 & 패키징
| 항목 | 선택 | 버전 | 사유 |
|------|------|------|------|
| **데스크톱 프레임워크** | Electron | 30.x | 크로스 플랫폼, 커뮤니티 활발 |
| **런타임** | Node.js | 20.x LTS | 안정성, 장기 지원 |
| **패키징 도구** | electron-builder | 25.x | 자동 업데이트, 멀티 플랫폼 빌드 |

### 1.2 프론트엔드
| 항목 | 선택 | 버전 | 사유 |
|------|------|------|------|
| **UI 프레임워크** | React | 18.x | 컴포넌트 기반, 생태계 풍부 |
| **상태관리** | Zustand | 4.x | 가볍고 직관적, 학습곡선 낮음 |
| **스타일링** | Tailwind CSS | 3.x | 유틸리티 기반, 빠른 개발 |
| **UI 라이브러리** | shadcn/ui | 최신 | 커스터마이징 가능, Tailwind 기반 |
| **차트 라이브러리** | Recharts | 2.x | React 친화, 반응형 차트 |
| **날짜 처리** | date-fns | 2.x | 가볍고 순수함수, Tree-shaking 가능 |
| **아이콘** | lucide-react | 최신 | 간결한 디자인, 다양한 아이콘 |
| **입력 라이브러리** | react-beautiful-dnd | 13.x | 드래그앤드롭 용이 |
| **타입스크립트** | TypeScript | 5.x | 타입 안전성, 개발 경험 향상 |

### 1.3 백엔드 (렌더러 프로세스에서 수행)
| 항목 | 선택 | 버전 | 사유 |
|------|------|------|------|
| **로컬 DB** | SQLite | 3.x | 구성 없음, 파일 기반, 경량 |
| **ORM/쿼리** | better-sqlite3 | 9.x | 동기식, 빠른 성능, 트랜잭션 지원 |
| **데이터 마이그레이션** | db-migrate | 0.11.x | 버전 관리, 롤백 지원 |
| **외부 API** | axios | 1.x | HTTP 클라이언트, 인터셉터 지원 |

### 1.4 개발 도구
| 항목 | 선택 | 버전 | 사유 |
|------|------|------|------|
| **빌드 도구** | Vite | 5.x | 빠른 번들링, HMR 지원 |
| **린터** | ESLint | 8.x | 코드 품질 관리 |
| **포매터** | Prettier | 3.x | 코드 스타일 통일 |
| **테스트 프레임워크** | Jest | 29.x | 메인스트림, TypeScript 지원 |
| **테스트 유틸** | React Testing Library | 14.x | React 컴포넌트 테스트 |

---

## 2. 아키텍처

### 2.1 Electron 구조

```
TodoAssist/
├── main/
│   ├── index.ts                  # 메인 프로세스 진입점
│   ├── windows/
│   │   ├── mainWindow.ts         # 메인 윈도우 생성
│   │   └── trayWindow.ts         # 시스템 트레이 아이콘
│   ├── ipc/
│   │   ├── handlers.ts           # IPC 핸들러 (DB, API)
│   │   └── channels.ts           # IPC 채널 정의
│   ├── database/
│   │   ├── index.ts              # DB 초기화
│   │   ├── queries.ts            # 쿼리 함수
│   │   └── migrations/           # 스키마 버전 관리
│   └── services/
│       ├── claudeApi.ts          # Claude API 호출
│       ├── scheduler.ts          # 스케줄 자동 생성 로직
│       └── analytics.ts          # 통계 계산
├── renderer/
│   ├── index.tsx                 # 진입점
│   ├── App.tsx                   # 루트 컴포넌트
│   ├── pages/
│   │   ├── Dashboard.tsx         # S1
│   │   ├── Kanban.tsx            # S2
│   │   ├── TaskTree.tsx          # S3
│   │   ├── TaskForm.tsx          # S4
│   │   ├── Statistics.tsx        # S5
│   │   ├── AiChat.tsx            # S6
│   │   └── Settings.tsx          # S7
│   ├── components/
│   │   ├── TaskCard.tsx
│   │   ├── TimeSlot.tsx
│   │   ├── ProgressBar.tsx
│   │   ├── AiMessage.tsx
│   │   └── ...
│   ├── store/
│   │   ├── taskStore.ts          # Zustand 태스크 저장소
│   │   ├── uiStore.ts            # UI 상태
│   │   └── settingStore.ts       # 설정
│   ├── hooks/
│   │   ├── useTask.ts
│   │   ├── useAi.ts
│   │   └── useDatabase.ts
│   └── styles/
│       └── globals.css           # 전역 스타일
└── public/
    ├── icon.png
    └── ...
```

### 2.2 프로세스 간 통신 (IPC)

```
┌─────────────────────────────────────┐
│      Main Process (Node.js)         │
├─────────────────────────────────────┤
│ • SQLite 쿼리                       │
│ • Claude API 호출                   │
│ • 파일시스템 접근                   │
│ • 시스템 알림                       │
└────────────────┬────────────────────┘
                 │
        ┌────────┴────────┐
    IPC │                 │ IPC
        ↓                 ↑
┌─────────────────────────────────────┐
│   Renderer Process (React)           │
├─────────────────────────────────────┤
│ • UI 렌더링                         │
│ • 사용자 입력                       │
│ • 상태 관리 (Zustand)               │
│ • 로컬 캐시                         │
└─────────────────────────────────────┘
```

### 2.3 상태 관리 (Zustand)

```typescript
// taskStore.ts
export const useTaskStore = create((set) => ({
  tasks: [],
  addTask: (task) => set((state) => ({
    tasks: [...state.tasks, task]
  })),
  updateTask: (id, updates) => set((state) => ({
    tasks: state.tasks.map(t => t.id === id ? { ...t, ...updates } : t)
  })),
  // ...
}));

// uiStore.ts
export const useUiStore = create((set) => ({
  currentPage: 'dashboard',
  selectedTaskId: null,
  setCurrentPage: (page) => set({ currentPage: page }),
  // ...
}));
```

---

## 3. 데이터 모델

### 3.1 Task (주 테이블)
```typescript
interface Task {
  id: string;                 // UUID
  title: string;              // 필수, 50자 이내
  description: string;        // 선택, 텍스트
  deadline: number | null;    // Unix timestamp (ms)
  estimatedMinutes: number;   // 예상 소요 시간 (분)
  importance: 1 | 2 | 3 | 4 | 5;  // 중요도 (1=낮음, 5=높음)

  // 분류
  category: string;           // e.g. "품질검사", "보고서", "회의"
  relatedClass: string;       // e.g. "품목A", "프로젝트X"

  // 계층 구조
  parentId: string | null;    // 부모 태스크 ID

  // 상태 및 진행률
  status: 'pending' | 'in_progress' | 'completed' | 'deferred';
  progress: number;           // 0-100, 부모는 자동 계산

  // 템플릿
  templateId: string | null;

  // 메타데이터
  createdAt: number;          // Unix timestamp
  updatedAt: number;
  completedAt: number | null;
}
```

### 3.2 TimeBox (스케줄 슬롯)
```typescript
interface TimeBox {
  id: string;
  taskId: string;             // Task 외래키
  date: string;               // YYYY-MM-DD
  startSlot: number;          // 0-47 (30분 단위, 0=00:00, 47=23:30)
  endSlot: number;            // 포함 범위
  status: 'scheduled' | 'in_progress' | 'completed' | 'skipped';
  aiSuggested: boolean;       // AI가 제안했는가
  createdAt: number;
  updatedAt: number;
}
```

### 3.3 Encouragement (격려 메시지)
```typescript
interface Encouragement {
  id: string;
  taskId: string;
  type: 'start' | 'complete' | 'milestone' | 'nudge' | 'morning';
  message: string;            // AI가 생성한 메시지
  tone: 'warm' | 'urgent' | 'humorous' | 'professional';
  createdAt: number;
}
```

### 3.4 추가 테이블들

```typescript
// Category
interface Category {
  id: string;
  name: string;               // e.g. "품질검사"
  color: string;              // HEX 코드
  icon: string;               // 아이콘 이름
  userId: string;
  createdAt: number;
}

// Template
interface Template {
  id: string;
  name: string;               // e.g. "월간 품질 보고서"
  description: string;
  taskTree: Task[];           // 계층형 태스크 배열
  category: string;
  createdAt: number;
}

// Setting
interface Setting {
  id: string;
  key: string;                // e.g. "workStartHour"
  value: string;              // JSON 형식
}

// DailyStats
interface DailyStats {
  id: string;
  date: string;               // YYYY-MM-DD
  completedCount: number;
  totalPlanned: number;
  deferredCount: number;
  totalMinutesUsed: number;
  categoryBreakdown: Record<string, number>; // {category: minutes}
}
```

---

## 4. API 설계

### 4.1 Claude API 연동

#### 4.1.1 스케줄 제안 (Scheduling)
```
Endpoint: Claude API Text Generation
Purpose: 30분 타임박스 초안 자동 생성

Request:
{
  "model": "claude-3-5-sonnet-20241022",
  "max_tokens": 1000,
  "messages": [
    {
      "role": "user",
      "content": "다음 태스크들을 오늘 8:30~17:30에 30분 단위로 스케줄해줘:\n- 품질 리포트 (120분, 중요도 4)\n- 이메일 확인 (30분, 중요도 2)\n...\n현재 시간: 2026-03-17 08:00\n\n JSON 형식으로 반환: [{taskId, startSlot, duration}, ...]"
    }
  ]
}

Response:
{
  "content": "[{\"taskId\": \"task-001\", \"startSlot\": 0, \"duration\": 4}, ...]"
}
```

#### 4.1.2 격려 메시지 생성 (Encouragement)
```
Request:
{
  "model": "claude-3-5-sonnet-20241022",
  "max_tokens": 500,
  "messages": [
    {
      "role": "user",
      "content": "사용자는 아침 08:00에 '품질 리포트' 태스크를 시작하려고 합니다. 예상 소요 시간은 2시간입니다. 데드라인은 16:00입니다.\n\n따뜻하고 격려적인 톤으로 30자 이내 메시지를 작성해주세요."
    }
  ]
}

Response:
{
  "content": "준호님, 오늘도 화이팅! 차근차근 진행하면 충분해요."
}
```

#### 4.1.3 AI 인사이트 (Analytics)
```
Request:
{
  "model": "claude-3-5-sonnet-20241022",
  "max_tokens": 800,
  "messages": [
    {
      "role": "user",
      "content": "지난 한 달 데이터:\n- 완료율: 72%\n- 품질검사 평균 30분 (예상 60분)\n- 금요일 미루기 횟수: 8회 (평일 평균 2회)\n\n개선할 수 있는 인사이트를 3가지 제시해주세요."
    }
  ]
}

Response:
{
  "content": "1. 금요일 오후 번아웃 주의...\n2. 품질검사는..."
}
```

### 4.2 IPC Channels (메인 ↔ 렌더러)

| 채널명 | 방향 | 목적 |
|-------|------|------|
| `db:query` | invoke | SQL 쿼리 실행 |
| `db:insert` | invoke | 데이터 삽입 |
| `db:update` | invoke | 데이터 수정 |
| `db:delete` | invoke | 데이터 삭제 |
| `ai:scheduleProposal` | invoke | 스케줄 제안 요청 |
| `ai:getEncouragement` | invoke | 격려 메시지 생성 |
| `ai:getInsight` | invoke | 분석 인사이트 |
| `task:updated` | send | 다른 탭에서 태스크 수정 시 알림 |
| `notification:show` | send | 시스템 알림 |

---

## 5. 보안 설계

### 5.1 API 키 관리
```typescript
// main/config.ts
import dotenv from 'dotenv';

dotenv.config({ path: path.join(app.getPath('userData'), '.env') });

export const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY;
// .env는 버전 관리에서 제외
```

### 5.2 데이터 암호화 (선택사항)
```typescript
// better-sqlite3의 내장 암호화는 유료
// sqlcipher 라이브러리 고려
```

### 5.3 접근 제어
- 메인 프로세스: 파일시스템, API, DB 접근 (권한 검증)
- 렌더러 프로세스: IPC를 통한 간접 접근만 가능
- preload.ts: 화이트리스트된 IPC 채널만 노출

---

## 6. 빌드 & 배포

### 6.1 빌드 프로세스
```bash
# 개발 환경
npm run dev

# 프로덕션 빌드
npm run build

# Electron 패키징 (electron-builder)
npm run electron-builder
# 출력:
# - dist/TodoAssist-3.0.0.exe (Windows)
# - dist/TodoAssist-3.0.0.dmg (macOS)
# - dist/todoassist_3.0.0_amd64.deb (Linux)
```

### 6.2 배포 플랫폼
| 플랫폼 | 형식 | 서명 |
|-------|------|------|
| Windows | .exe (NSIS 인스톨러) | Signtool (선택) |
| macOS | .dmg | Apple Notarization |
| Linux | .deb, .AppImage | GPG 서명 (선택) |

### 6.3 자동 업데이트
```typescript
// electron-updater를 사용한 자동 업데이트
import { autoUpdater } from 'electron-updater';

autoUpdater.checkForUpdatesAndNotify();
```

---

## 7. 의존성 목록

### 7.1 주요 npm 패키지

```json
{
  "dependencies": {
    "react": "^18.2.0",
    "zustand": "^4.4.0",
    "tailwindcss": "^3.3.0",
    "shadcn/ui": "^0.8.0",
    "recharts": "^2.10.0",
    "date-fns": "^2.30.0",
    "axios": "^1.6.0",
    "better-sqlite3": "^9.2.0",
    "db-migrate": "^0.11.13",
    "electron": "^30.0.0",
    "electron-updater": "^6.1.0"
  },
  "devDependencies": {
    "typescript": "^5.3.0",
    "vite": "^5.0.0",
    "@vitejs/plugin-react": "^4.2.0",
    "eslint": "^8.54.0",
    "prettier": "^3.1.0",
    "jest": "^29.7.0",
    "@testing-library/react": "^14.1.0",
    "electron-builder": "^25.0.0"
  }
}
```

### 7.2 시스템 요구사항
- **Windows**: Windows 10 이상, .NET Framework 4.5+ (NSIS 인스톨러용)
- **macOS**: macOS 12 (Monterey) 이상, Apple Silicon 지원
- **Linux**: GTK 3.0+, gconf (freedesktop.org 호환)

---

## 8. 성능 요구사항

### 8.1 응답 시간
| 작업 | 목표 | 측정 방법 |
|------|------|---------|
| 앱 시작 | <2초 | 실제 측정 (electron-performance) |
| 화면 전환 | <300ms | React DevTools Profiler |
| 드래그앤드롭 | 60fps | Chrome DevTools FPS 미터 |
| DB 쿼리 (100개 항목) | <100ms | performance.now() |
| AI API 호출 | <10초 | 타임아웃 설정 |

### 8.2 메모리 사용
- **기본 상태**: <150MB
- **1000개 태스크 로드**: <300MB
- **메모리 누수**: 1시간 연속 사용 후 <5% 증가

---

## 9. 모니터링 & 로깅

### 9.1 로그 레벨
```typescript
// main/logger.ts
enum LogLevel {
  DEBUG = 0,    // 개발용 상세 정보
  INFO = 1,     // 일반 정보
  WARN = 2,     // 경고
  ERROR = 3,    // 오류
}

export const logger = {
  debug: (msg: string, data?: any) => { /* */ },
  info: (msg: string, data?: any) => { /* */ },
  warn: (msg: string, data?: any) => { /* */ },
  error: (msg: string, error: Error) => { /* */ },
};
```

### 9.2 로그 저장소
- **위치**: `%APPDATA%/TodoAssist/logs/` (Windows), `~/Library/Logs/TodoAssist/` (macOS)
- **회전**: 일일 회전, 최대 30개 파일 유지

---

**문서 생성일**: 2026-03-17
**버전**: 1.0
