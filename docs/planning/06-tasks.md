# TodoAssist — TASKS.md

> AI 감정 안전 비서 데스크톱 앱
> 생성일: 2026-03-18
> Eros 원칙: "행동 변화는 강제가 아니라 감정적 안전감에서 시작된다"

## 프로젝트 메타 정보

| 항목 | 내용 |
|------|------|
| 프로젝트명 | TodoAssist |
| 총 Phase | 5 (P0~P5) |
| 총 Task | 27개 |
| 예상 기간 | 4개월 (병렬 진행 기준) |
| 핵심 원칙 | Eros 설계: 감정 안전감 기반 행동 변화 |

---

## P0: 프로젝트 셋업

**목표**: 개발 환경 구축 및 기본 기술 스택 초기화

### [x] P0-T0.1: Electron + React + TypeScript 프로젝트 초기화

**설명**: Electron main/renderer 구조, React 18, TypeScript 5.x 설정

- **담당**: infrastructure-specialist
- **의존성**: 없음
- **TDD**: 아니오
- **복잡도**: M
- **완료 조건**:
  - Electron 프로젝트 보일러플레이트 생성 완료
  - React 18 + TypeScript 5.x 컴파일 확인
  - Main/Renderer 프로세스 간 IPC 기본 구조 구현
  - 개발 모드 (`npm run dev`) 실행 확인

---

### [x] P0-T0.2: SQLite + better-sqlite3 설정

**설명**: better-sqlite3 설치, DB 연결, WAL 모드, pragma 설정

- **담당**: database-specialist
- **의존성**: P0-T0.1
- **TDD**: 아니오
- **복잡도**: S
- **완료 조건**:
  - better-sqlite3 패키지 설치 및 main process 통합
  - WAL 모드 활성화 및 성능 pragma 설정
  - DB 파일 경로 (사용자 AppData) 설정 완료
  - 기본 연결 테스트 통과

---

### [x] P0-T0.3: Tailwind CSS + shadcn/ui 설정

**설명**: Tailwind 4, shadcn/ui 컴포넌트 설치, 디자인 토큰 설정

- **담당**: frontend-specialist
- **의존성**: P0-T0.1
- **TDD**: 아니오
- **복잡도**: S
- **완료 조건**:
  - Tailwind CSS 4 설정 완료
  - shadcn/ui 초기 컴포넌트 설치 (Button, Input, Card, Modal 등)
  - 디자인 토큰 정의 (색상, 타이포그래피, 스페이싱)
  - 샘플 UI 컴포넌트 렌더링 확인

---

### [x] P0-T0.4: Zustand 스토어 구조 설정

**설명**: 글로벌 스토어 구조 설계 (taskStore, uiStore, settingStore)

- **담당**: frontend-specialist
- **의존성**: P0-T0.1
- **TDD**: 아니오
- **복잡도**: S
- **완료 조건**:
  - Zustand 패키지 설치
  - 3개 스토어 구조 정의 (taskStore, uiStore, settingStore)
  - 상태 업데이트 액션 메서드 정의
  - DevTools 통합 완료

---

## P1: 공통 리소스 + 레이아웃

**목표**: 데이터베이스 기초 및 공통 컴포넌트 구축

### [x] P1-R1: DB 마이그레이션 + 스키마 생성

**설명**: 7개 테이블 (Task, TimeBox, Encouragement, Category, Template, Setting, DailyStats) DDL 생성 및 마이그레이션 시스템 구현

- **담당**: database-specialist
- **의존성**: P0-T0.2
- **TDD**: 예
- **복잡도**: M
- **파일**:
  - 테스트: `src/__tests__/database/migrations.test.ts`
  - 구현: `src/main/database/migrations.ts`, `src/main/database/schema.sql`
- **완료 조건**:
  - 7개 테이블 DDL 작성 및 검증
  - 마이그레이션 시스템 (버전 관리) 구현
  - 기본 데이터 시딩 (카테고리 5개: 일, 학습, 취미, 운동, 기타 / 기본 설정)
  - 스키마 무결성 테스트 100% 통과
  - 데이터베이스 쿼리 성능 테스트 (대규모 데이터셋)

---

### [x] P1-R2: Claude API 서비스

**설명**: Claude API 클라이언트 래퍼 및 AI 기능 모음 (격려 메시지, 태스크 메타데이터 추정, 스케줄 생성, 인사이트 생성, 과제 자동 쪼개기)

- **담당**: backend-specialist
- **의존성**: P0-T0.1
- **TDD**: 예
- **복잡도**: L
- **파일**:
  - 테스트: `src/__tests__/services/claude-api.test.ts`
  - 구현: `src/main/services/claude-api.ts`
- **완료 조건**:
  - Claude API 클라이언트 래퍼 (API 키, 요청 제한, 재시도 로직)
  - 격려 메시지 생성 프롬프트 (4가지 톤: warm, urgent, humorous, professional)
  - 태스크 메타데이터 추정 (소요시간 범위, 중요도, 카테고리 추천)
  - 스케줄 자동 생성 프롬프트 (중요도, 데드라인, 소요시간 기반)
  - AI 인사이트 생성 프롬프트 (주간/월간 분석, 패턴 탐지)
  - 과제 자동 쪼개기 프롬프트 (큰 태스크 → 2분 마이크로 태스크로 분해) — **Eros 원칙**
  - API 호출 모킹 테스트 100% 통과
  - 토큰 사용량 로깅

---

### [x] P1-S0: 공통 레이아웃

**설명**: AppShell (사이드바 + 메인 영역), 네비게이션, React Router 설정

- **담당**: frontend-specialist
- **의존성**: P0-T0.3, P0-T0.4
- **TDD**: 예
- **복잡도**: M
- **파일**:
  - 테스트: `src/__tests__/components/AppShell.test.tsx`
  - 구현: `src/renderer/components/AppShell.tsx`, `src/renderer/App.tsx`
- **완료 조건**:
  - AppShell 컴포넌트 (사이드바 + 메인 영역 레이아웃)
  - 사이드바 네비게이션 (5개 페이지: Dashboard, Kanban, Task Tree, Statistics, Settings)
  - AI 비서 토글 버튼 (우측 상단, 전역 상태 연동)
  - React Router 설정 (5개 라우트)
  - 반응형 디자인 (데스크톱 600px~)
  - 컴포넌트 렌더링 테스트 100% 통과

---

## P2: 핵심 기능 — 태스크 관리

**목표**: 태스크 CRUD, 계층형 구조, 실시간 UI 동기화

### [x] P2-R1: Task CRUD API

**설명**: Task 생성/조회/수정/삭제 (IPC handler), 계층형 조회, 진행률 자동 계산, 필터/정렬, 검색

- **담당**: backend-specialist
- **의존성**: P1-R1
- **TDD**: 예
- **복잡도**: L
- **파일**:
  - 테스트: `src/__tests__/services/task-crud.test.ts`
  - 구현: `src/main/services/task-crud.ts`, `src/main/ipc/task-handlers.ts`
- **완료 조건**:
  - Task CRUD 함수 (create, read, update, delete)
  - IPC 핸들러 등록 (ipcMain.handle)
  - 계층형 조회 (재귀 CTE로 전체 트리 조회)
  - 진행률 자동 계산 (부모 = 자식 평균 방식)
  - 필터 기능 (카테고리, 중요도: [1-5], 상태: [todo, inProgress, completed, deferred], 데드라인 범위)
  - 정렬 기능 (생성일, 데드라인, 중요도, 진행률)
  - 검색 기능 (title LIKE, 부분 일치)
  - CRUD + 계층 + 진행률 자동 계산 테스트 100% 통과

---

### [x] P2-R2: Category CRUD API

**설명**: Category 생성/조회/수정/삭제 (IPC handler)

- **담당**: backend-specialist
- **의존성**: P1-R1
- **TDD**: 예
- **복잡도**: S
- **파일**:
  - 테스트: `src/__tests__/services/category-crud.test.ts`
  - 구현: `src/main/services/category-crud.ts`, `src/main/ipc/category-handlers.ts`
- **완료 조건**:
  - Category CRUD 함수
  - IPC 핸들러 등록
  - 이름, 색상(hex), 아이콘 필드 저장
  - CRUD 테스트 100% 통과

---

### [x] P2-R3: Template CRUD API

**설명**: Template 저장 (트리 구조 → JSON), Template 불러오기 (JSON → 새 Task 생성, 진행률 0%)

- **담당**: backend-specialist
- **의존성**: P1-R1, P2-R1
- **TDD**: 예
- **복잡도**: M
- **파일**:
  - 테스트: `src/__tests__/services/template-crud.test.ts`
  - 구현: `src/main/services/template-crud.ts`, `src/main/ipc/template-handlers.ts`
- **완료 조건**:
  - 템플릿 저장 (선택된 태스크 트리 → JSON 직렬화)
  - 템플릿 불러오기 (JSON → 새 Task 생성, 모든 상태 'todo', 진행률 0%)
  - 메타데이터 (이름, 설명, 생성일) 저장
  - 템플릿 목록 조회, 삭제
  - 테스트 100% 통과

---

### [x] P2-S3: 태스크 트리 화면

**설명**: TreeView 컴포넌트, 진행률 바, 필터/정렬, 검색, 컨텍스트 메뉴, AI 쪼개기 제안, 템플릿 관리

- **담당**: frontend-specialist
- **의존성**: P2-R1, P2-R2, P2-R3, P1-S0
- **TDD**: 예
- **복잡도**: L
- **파일**:
  - 테스트: `src/__tests__/screens/TaskTree.test.tsx`, `src/__tests__/components/TreeView.test.tsx`
  - 구현: `src/renderer/screens/TaskTree.tsx`, `src/renderer/components/TreeView.tsx`, `src/renderer/components/ProgressBar.tsx`
- **완료 조건**:
  - TreeView 컴포넌트 (무한 중첩 지원, expand/collapse 애니메이션)
  - 진행률 바 (리프 노드: 드래그로 수동 조정, 부모: 자동 계산)
  - 필터 바 (카테고리, 중요도, 상태 다중선택, 체크박스)
  - 정렬 (생성일, 데드라인, 중요도, 진행률)
  - 실시간 검색 (title LIKE, 입력 중 즉시 업데이트)
  - 컨텍스트 메뉴 (우클릭: 수정, 삭제, 서브태스크 추가, "2분만 시작")
  - AI 쪼개기 제안 (2회 이상 미뤄진 태스크에 인라인 버튼 표시, "AI로 쪼개기") — **Eros 원칙**
  - 템플릿 저장/불러오기 모달
  - 트리 렌더링, 진행률 계산, 필터 적용 테스트 100% 통과

---

### [x] P2-S4: 태스크 등록/수정 모달

**설명**: 태스크 폼 (제목, 설명, 데드라인, 소요시간, 중요도, 카테고리), AI 추정, 부모 선택, 서브태스크 관리

- **담당**: frontend-specialist
- **의존성**: P2-R1, P2-R2, P1-R2
- **TDD**: 예
- **복잡도**: M
- **파일**:
  - 테스트: `src/__tests__/components/TaskForm.test.tsx`
  - 구현: `src/renderer/components/TaskForm.tsx`, `src/renderer/modals/TaskModal.tsx`
- **완료 조건**:
  - 폼 필드 (제목, 설명, 데드라인 DatePicker, 소요시간 범위 [15~240분], 중요도 [1-5], 카테고리 셀렉트)
  - AI 추정 뱃지 (제목 5자 이상 → "AI 추정" 버튼 자동 표시 → 클릭 시 Claude API 호출 → 소요시간/중요도/카테고리 자동 채우기)
  - 부모 태스크 선택 (트리 셀렉터, null 가능)
  - 서브태스크 인라인 추가/삭제 (리스트 뷰)
  - 유효성 검사 (제목 필수, 데드라인 > 오늘, 소요시간 범위 체크)
  - 폼 유효성, AI 추정 통합 테스트 100% 통과

---

### [x] P2-S3-V: 태스크 트리 연결점 검증

**설명**: Task CRUD → TreeView 데이터 바인딩, 진행률 자동 계산, 필터/정렬 실시간 업데이트 검증

- **담당**: test-specialist
- **의존성**: P2-S3, P2-R1
- **TDD**: 예 (통합 테스트)
- **복잡도**: S
- **파일**:
  - 테스트: `src/__tests__/integration/task-tree-integration.test.ts`
- **완료 조건**:
  - Task CRUD 동작 → TreeView 즉시 업데이트 검증
  - 서브태스크 추가 → 부모 진행률 자동 계산 검증
  - 필터/정렬 변경 → 트리 재구성 검증
  - 대규모 데이터 (1000+ 태스크) 성능 테스트
  - 통합 테스트 100% 통과

---

### [x] P2-S4-V: 태스크 폼 연결점 검증

**설명**: AI 추정 → 폼 필드 반영, 저장 → DB 반영 + 트리 업데이트 검증

- **담당**: test-specialist
- **의존성**: P2-S4, P2-R1
- **TDD**: 예 (통합 테스트)
- **복잡도**: S
- **파일**:
  - 테스트: `src/__tests__/integration/task-form-integration.test.ts`
- **완료 조건**:
  - AI 추정 버튼 → Claude API 응답 → 폼 자동 채우기 검증
  - 폼 제출 → DB 저장 → TreeView 업데이트 검증
  - 유효성 검사 실패 → 에러 메시지 표시 검증
  - 통합 테스트 100% 통과

---

## P3: 스케줄링 — 칸반 보드

**목표**: 타임박스 관리, AI 스케줄 생성, 드래그앤드롭 UI

### [x] P3-R1: TimeBox CRUD API

**설명**: TimeBox 생성/조회/수정/삭제 (IPC handler), 날짜별 조회, 충돌 검사, 드래그 이동

- **담당**: backend-specialist
- **의존성**: P1-R1, P2-R1
- **TDD**: 예
- **복잡도**: M
- **파일**:
  - 테스트: `src/__tests__/services/timebox-crud.test.ts`
  - 구현: `src/main/services/timebox-crud.ts`, `src/main/ipc/timebox-handlers.ts`
- **완료 조건**:
  - TimeBox CRUD 함수 (taskId, date, startTime, endTime)
  - IPC 핸들러 등록
  - 날짜별 조회 (date 필터로 당일 타임박스 조회)
  - 충돌 검사 (같은 날, 같은 시간 슬롯 중복 방지)
  - 드래그 이동 시 슬롯 업데이트 (startTime, endTime 변경)
  - CRUD + 충돌 검사 테스트 100% 통과

---

### [x] P3-R2: AI 스케줄 자동 생성 서비스

**설명**: 미배치 태스크 목록 → Claude API → 최적 타임박스 배치 (중요도, 데드라인, 소요시간, 근무시간 고려)

- **담당**: backend-specialist
- **의존성**: P1-R2, P3-R1
- **TDD**: 예
- **복잡도**: M
- **파일**:
  - 테스트: `src/__tests__/services/ai-schedule.test.ts`
  - 구현: `src/main/services/ai-schedule.ts`
- **완료 조건**:
  - 미배치 태스크 목록 수집 (오늘 데드라인인 태스크 + 미루기 아이템)
  - Claude API 호출 프롬프트 (중요도 우선 순위, 데드라인 임박도, 소요시간 합계)
  - 근무시간 범위 내 배치 (기본: 09:00~18:00)
  - 점심시간 자동 제외 (12:00~13:00)
  - 타임박스 생성 (충돌 없이)
  - 스케줄 생성 로직 테스트 100% 통과

---

### [x] P3-S2: 칸반 보드 화면

**설명**: 타임슬롯 그리드, 태스크 카드, 드래그앤드롭, AI 스케줄 제안, "2분만 시작", 저장

- **담당**: frontend-specialist
- **의존성**: P3-R1, P3-R2, P1-S0
- **TDD**: 예
- **복잡도**: L
- **파일**:
  - 테스트: `src/__tests__/screens/Kanban.test.tsx`, `src/__tests__/components/TimeGrid.test.tsx`
  - 구현: `src/renderer/screens/Kanban.tsx`, `src/renderer/components/TimeGrid.tsx`, `src/renderer/components/TaskCard.tsx`
- **완료 조건**:
  - 타임슬롯 그리드 (30분 단위, 근무시간 범위: 09:00~18:00)
  - 태스크 카드 (카테고리별 색상, 중요도 배지, 상태 스타일)
  - 드래그앤드롭 (react-beautiful-dnd 또는 dnd-kit 라이브러리)
  - AI 스케줄 제안 버튼 → 초안 생성 (사용자 수정 가능) → 저장
  - "2분만 시작하기" 버튼 (각 태스크) — **Eros 원칙**
  - 스케줄 저장 버튼 (선택된 배치 DB 저장)
  - D&D 인터랙션, 슬롯 렌더링 테스트 100% 통과

---

### [x] P3-S2-V: 칸반 보드 연결점 검증

**설명**: TimeBox API → 칸반 그리드 데이터 바인딩, D&D → DB 업데이트, AI 스케줄 → UI 반영 검증

- **담당**: test-specialist
- **의존성**: P3-S2, P3-R1
- **TDD**: 예 (통합 테스트)
- **복잡도**: S
- **파일**:
  - 테스트: `src/__tests__/integration/kanban-integration.test.ts`
- **완료 조건**:
  - TimeBox 조회 → 칸반 그리드 렌더링 검증
  - D&D → DB 슬롯 업데이트 검증
  - AI 스케줄 생성 → 그리드 즉시 반영 검증
  - 시간 충돌 방지 검증
  - 통합 테스트 100% 통과

---

## P4: 대시보드 + AI 비서

**목표**: 일일 통계, 감정 인식 격려 메시지, 대시보드 UI, AI 채팅 비서

### [x] P4-R1: DailyStats 집계 서비스

**설명**: 일일 통계 자동 집계 (completedCount, totalPlanned, deferredCount), 카테고리별 시간 분포, 성취 축적 카운터

- **담당**: backend-specialist
- **의존성**: P1-R1, P2-R1
- **TDD**: 예
- **복잡도**: M
- **파일**:
  - 테스트: `src/__tests__/services/daily-stats.test.ts`
  - 구현: `src/main/services/daily-stats.ts`
- **완료 조건**:
  - 일일 통계 자동 집계 (당일 완료 태스크 수, 계획 태스크 수, 미루기 수)
  - 카테고리별 시간 분포 (categoryBreakdown JSON)
  - 성취 축적 카운터 (누적 완료 건수, 감소 없음) — **Eros 원칙**
  - 일일 집계 스케줄 (매일 자정)
  - 집계 정확성 테스트 100% 통과

---

### [x] P4-R2: Encouragement 서비스

**설명**: 감정 인식 격려 메시지 생성 (morning, start, complete, nudge, milestone), 톤 결정 로직

- **담당**: backend-specialist
- **의존성**: P1-R2, P4-R1
- **TDD**: 예
- **복잡도**: M
- **파일**:
  - 테스트: `src/__tests__/services/encouragement.test.ts`
  - 구현: `src/main/services/encouragement.ts`
- **완료 조건**:
  - 메시지 타입별 생성 (morning: 아침 인사, start: 태스크 시작, complete: 완료 축하, nudge: 넛지, milestone: 마일스톤)
  - 감정 인식 톤 결정 로직 (시간대, 완료율, 미루기 횟수 기반):
    - 오전 (06:00~12:00): upbeat, energetic
    - 정오~오후 (12:00~18:00): balanced, supportive
    - 저녁~밤 (18:00~24:00): calm, encouraging
    - 완료율 100%: celebration tone
    - 미루기 3회 이상: gentle, nudge tone
  - "이 과제가 좀 지루하죠?" 스타일 감정 입입 넛지 — **Eros 원칙**
  - "2분만 해볼까요?" 제안 연동 — **Eros 원칙**
  - Claude API 호출로 개인화 메시지 생성
  - 톤 결정 로직 테스트 100% 통과

---

### [x] P4-S1: 대시보드 화면

**설명**: 진행률 링, AI 인사말, 오늘 예정 리스트, "2분만 시작", "지금 안 할래요", 성취 뱃지, 주간 미니 차트

- **담당**: frontend-specialist
- **의존성**: P4-R1, P4-R2, P1-S0
- **TDD**: 예
- **복잡도**: L
- **파일**:
  - 테스트: `src/__tests__/screens/Dashboard.test.tsx`, `src/__tests__/components/DashboardWidgets.test.tsx`
  - 구현: `src/renderer/screens/Dashboard.tsx`, `src/renderer/components/ProgressRing.tsx`, `src/renderer/components/TaskListToday.tsx`, `src/renderer/components/MiniChart.tsx`
- **완료 조건**:
  - 진행률 링 (원형 진행 바, 오늘 완료율 백분율 표시)
  - AI 인사말 카드 (시간대별 이모지 + 감정 인식 메시지)
  - 오늘 예정 태스크 리스트 (우선도순 3-5개, 클릭 시 상세 보기)
  - "2분만 시작하기" 버튼 (각 태스크, 클릭 시 상태 → inProgress 변경) — **Eros 원칙**
  - "지금 안 할래요" 버튼 (죄책감 없는 리스케줄, 격려 메시지 함께 표시) — **Eros 원칙**
  - 총 완료 건수 뱃지 (성취 축적 카운터) — **Eros 원칙**
  - 주간 미니 차트 (Recharts 라인 차트, 최근 7일 완료율)
  - 대시보드 렌더링, 액션 (버튼 클릭) 테스트 100% 통과

---

### [x] P4-S6: AI 비서 채팅 사이드바

**설명**: 우측 슬라이드인 패널, 메시지 타임라인, 감정 인식 넛지, 빠른 액션

- **담당**: frontend-specialist
- **의존성**: P4-R2, P1-S0
- **TDD**: 예
- **복잡도**: M
- **파일**:
  - 테스트: `src/__tests__/components/AiAssistant.test.tsx`
  - 구현: `src/renderer/components/AiAssistant.tsx`, `src/renderer/components/ChatMessage.tsx`
- **완료 조건**:
  - 우측 슬라이드인 패널 (300px 폭, 모든 화면에서 토글 가능)
  - 메시지 타임라인 (AI/사용자 메시지, 타임스탐프)
  - 감정 인식 넛지 메시지 자동 생성 (Encouragement 서비스 연동) — **Eros 원칙**
  - 텍스트 입력 + Enter로 메시지 전송
  - 빠른 액션 버튼 ("다음 제안", "오늘 분석" 등)
  - 채팅 렌더링, 메시지 전송 테스트 100% 통과

---

### [x] P4-S1-V: 대시보드 연결점 검증

**설명**: DailyStats → 진행률 링, Encouragement → AI 인사말, 액션 버튼 → 상태 변경 및 격려 메시지 검증

- **담당**: test-specialist
- **의존성**: P4-S1, P4-R1, P4-R2
- **TDD**: 예 (통합 테스트)
- **복잡도**: S
- **파일**:
  - 테스트: `src/__tests__/integration/dashboard-integration.test.ts`
- **완료 조건**:
  - DailyStats 조회 → 진행률 링 데이터 바인딩 검증
  - Encouragement 생성 → AI 인사말 카드 표시 검증
  - "2분만 시작하기" 버튼 → 태스크 상태 inProgress 변경 검증
  - "지금 안 할래요" 버튼 → 리스케줄 + 격려 메시지 표시 검증
  - 총 완료 건수 뱃지 → 누적 값 정확성 검증
  - 통합 테스트 100% 통과

---

### [x] P4-S6-V: AI 채팅 연결점 검증

**설명**: Encouragement 서비스 → 채팅 메시지, 사용자 입력 → AI 응답 생성 검증

- **담당**: test-specialist
- **의존성**: P4-S6, P4-R2
- **TDD**: 예 (통합 테스트)
- **복잡도**: S
- **파일**:
  - 테스트: `src/__tests__/integration/ai-chat-integration.test.ts`
- **완료 조건**:
  - Encouragement 서비스 호출 → 채팅 메시지 렌더링 검증
  - 사용자 텍스트 입력 → Claude API 호출 → AI 응답 생성 검증
  - 빠른 액션 버튼 → 해당 AI 인사이트 생성 검증
  - 통합 테스트 100% 통과

---

## P5: 통계 + 설정

**목표**: 분석 리포트, 사용자 설정 관리

### [x] P5-R1: 통계 분석 서비스

**설명**: 기간별 완료율, 카테고리별 시간, 미루기 패턴 분석, AI 인사이트 생성

- **담당**: backend-specialist
- **의존성**: P4-R1, P1-R2
- **TDD**: 예
- **복잡도**: M
- **파일**:
  - 테스트: `src/__tests__/services/analytics.test.ts`
  - 구현: `src/main/services/analytics.ts`
- **완료 조건**:
  - 기간별 완료율 계산 (주간, 월간, 커스텀 범위)
  - 카테고리별 시간 집계 (시간/분 단위)
  - 미루기 패턴 분석 (요일별 미루기 수, 카테고리별 미루기율)
  - AI 인사이트 생성 (Claude API 호출, 패턴 설명 + 개선 제안)
  - 분석 정확성 테스트 100% 통과

---

### [x] P5-S5: 통계/리포트 화면

**설명**: 기간 선택 탭, 완료율 차트, 카테고리 원형 차트, 미루기 패턴 막대, AI 인사이트, 성취 카운터

- **담당**: frontend-specialist
- **의존성**: P5-R1, P1-S0
- **TDD**: 예
- **복잡도**: L
- **파일**:
  - 테스트: `src/__tests__/screens/Statistics.test.tsx`, `src/__tests__/components/Charts.test.tsx`
  - 구현: `src/renderer/screens/Statistics.tsx`, `src/renderer/components/LineChart.tsx`, `src/renderer/components/PieChart.tsx`, `src/renderer/components/BarChart.tsx`
- **완료 조건**:
  - 기간 선택 탭 (이번주, 지난주, 이번달, 지난달, 커스텀)
  - 완료율 라인 차트 (Recharts, X축: 날짜, Y축: 백분율)
  - 카테고리별 시간 원형 차트 (각 슬라이스: 카테고리명 + 시간)
  - 미루기 패턴 막대 그래프 (X축: 요일 또는 카테고리, Y축: 미루기 수)
  - AI 인사이트 카드 (3-5개 항목, 격려 톤의 설명 + 개선 제안)
  - 총 완료 건수 카운터 (성취 축적) — **Eros 원칙**
  - 차트 렌더링 테스트 100% 통과

---

### [x] P5-S7: 설정 화면

**설명**: 탭 그룹 (기본, 카테고리, 알림), 설정 항목 CRUD, API 키 테스트

- **담당**: frontend-specialist
- **의존성**: P2-R2, P1-S0
- **TDD**: 예
- **복잡도**: M
- **파일**:
  - 테스트: `src/__tests__/screens/Settings.test.tsx`, `src/__tests__/components/SettingsForms.test.tsx`
  - 구현: `src/renderer/screens/Settings.tsx`, `src/renderer/components/BasicSettings.tsx`, `src/renderer/components/CategoryManager.tsx`, `src/renderer/components/NotificationSettings.tsx`
- **완료 조건**:
  - 탭 그룹 (기본, 카테고리, 알림)
  - 기본 탭:
    - 사용자명 입력 (텍스트)
    - 근무시간 범위 (시간:분 ~ 시간:분, 기본: 09:00~18:00)
    - Claude API 키 입력 (마스킹)
    - "연결 테스트" 버튼 (API 호출 테스트)
    - 백업/복원 버튼 (SQLite 파일 내보내기/가져오기)
  - 카테고리 탭:
    - CRUD 테이블 (이름, 색상 picker, 아이콘 선택)
    - 추가/삭제 버튼
  - 알림 탭:
    - 알림 ON/OFF 토글 (시스템 알림)
    - AI 격려 빈도 선택 (1시간, 2시간, 4시간, 없음)
  - 설정 저장 (DB 반영)
  - 설정 저장/불러오기, API 키 검증 테스트 100% 통과

---

### [x] P5-S5-V: 통계 연결점 검증

**설명**: 통계 서비스 → 차트 데이터 바인딩, 기간 변경 → 차트 업데이트 검증

- **담당**: test-specialist
- **의존성**: P5-S5, P5-R1
- **TDD**: 예 (통합 테스트)
- **복잡도**: S
- **파일**:
  - 테스트: `src/__tests__/integration/statistics-integration.test.ts`
- **완료 조건**:
  - 통계 서비스 호출 → 차트 데이터 수신 검증
  - 기간 탭 변경 → 새 데이터 조회 + 차트 재렌더링 검증
  - AI 인사이트 → 카드 표시 검증
  - 통합 테스트 100% 통과

---

### [x] P5-S7-V: 설정 연결점 검증

**설명**: 설정 변경 → DB 저장 + UI 반영, API 키 테스트 → 연결 확인 검증

- **담당**: test-specialist
- **의존성**: P5-S7
- **TDD**: 예 (통합 테스트)
- **복잡도**: S
- **파일**:
  - 테스트: `src/__tests__/integration/settings-integration.test.ts`
- **완료 조건**:
  - 설정 필드 수정 → DB 저장 + 다른 화면에서 반영 검증
  - API 키 테스트 → 유효성 확인 + 피드백 메시지 검증
  - 카테고리 추가 → TaskTree 필터에 즉시 반영 검증
  - 근무시간 변경 → 칸반 보드 그리드 업데이트 검증
  - 통합 테스트 100% 통과

---

## 개발 워크플로우

### 담당자 역할

| 역할 | 담당 에이전트 | 주요 테스크 |
|------|--------------|----------|
| 인프라 | infrastructure-specialist | P0-T0.1 |
| 데이터베이스 | database-specialist | P0-T0.2, P1-R1, P3-R1 |
| 백엔드 API | backend-specialist | P1-R2, P2-R1, P2-R2, P2-R3, P3-R1, P3-R2, P4-R1, P4-R2, P5-R1 |
| 프론트엔드 UI | frontend-specialist | P0-T0.3, P0-T0.4, P1-S0, P2-S3, P2-S4, P3-S2, P4-S1, P4-S6, P5-S5, P5-S7 |
| 테스트 & QA | test-specialist | P0-T0 (계약), P2-S3-V, P2-S4-V, P3-S2-V, P4-S1-V, P4-S6-V, P5-S5-V, P5-S7-V |

### 의존성 및 병렬 실행

**Phase 0** (순차): P0-T0.1 → P0-T0.2, P0-T0.3, P0-T0.4 (T0.2/T0.3/T0.4 병렬 가능)

**Phase 1** (병렬 가능): P1-R1, P1-R2, P1-S0

**Phase 2** (순차): P1 완료 후 R1 → R2/R3 (병렬) → S3/S4 (병렬) → V (순차)

**Phase 3** (순차): P2 완료 후 R1 → R2 → S2 → V (순차)

**Phase 4** (병렬 가능): P3 완료 후 R1, R2, S1, S6 병렬 진행 → V (순차)

**Phase 5** (병렬 가능): P4 완료 후 R1, S5, S7 병렬 진행 → V (순차)

### Phase 병합

각 Phase 완료 후 orchestrator가 단위별로 병합 (main → develop → main):

- Phase 0 완료 → develop 브랜치 생성
- Phase 1 → develop에 병합
- Phase 2~5 → develop에 순차 병합
- 최종 → main에 병합

---

## 품질 기준 (모든 테스트)

### 필수 테스트 커버리지
- 단위 테스트: 80% 이상
- 통합 테스트: 주요 플로우 100%
- E2E 테스트: 사용자 시나리오 (별도 TDD 테스트로 정의)

### TDD 원칙
- 테스트 먼저 작성 (Red → Green → Refactor)
- Mock/Stub 활용 (Claude API, DB)
- 각 Task 완료 시 테스트 100% 통과 필수

### 코드 품질
- TypeScript strict mode
- ESLint + Prettier (일관된 포맷)
- 주석: 복잡한 로직만 (자명한 코드는 불필요)

---

## Eros 원칙 적용 체크리스트

### P0-P1: 기초 설계
- [x] 감정 안전감 중심 아키텍처 검토
- [x] AI 격려 메시지 톤 정의 (warm, urgent, humorous, professional)
- [x] 도망 가능 UI 플로우 설계 (리스케줄 버튼 배치)

### P2: 태스크 관리
- [x] "2분만 시작" 버튼 실장 (매 화면)
- [x] AI 쪼개기 제안 (미루기 2회+ 태스크)
- [x] 진행률 자동 계산 (성취감 강화)

### P3: 스케줄링
- [x] "2분만 시작" 칸반 연동
- [x] AI 자동 스케줄 (감정 고려)

### P4: 대시보드 + AI 비서
- [x] 성취 축적 카운터 (감소 없음) — **필수**
- [x] "지금 안 할래요" (죄책감 없는 리스케줄) — **필수**
- [x] 감정 인식 격려 메시지 (시간대, 완료율 기반) — **필수**
- [x] AI 비서 채팅 (감정 지지)

### P5: 통계
- [x] 성취 축적 뱃지 (누적 완료 수)
- [x] AI 인사이트 (격려 톤)
- [x] 미루기 패턴 분석 (개선 제안)

---

## 예상 일정

| Phase | 예상 기간 | 상태 |
|-------|---------|------|
| P0 (셋업) | 1주 | **완료** |
| P1 (기초) | 2주 | **완료** |
| P2 (태스크 관리) | 3주 | **완료** |
| P3 (스케줄링) | 2주 | **완료** |
| P4 (대시보드 + AI) | 3주 | **완료** |
| P5 (통계 + 설정) | 2주 | **완료** |
| **총계** | **13주 (병렬 시 ~8주)** | **완료 (2026-03-18)** |

---

## 파일 구조 (생성 예정)

```
todo-assist/
├── src/
│   ├── main/
│   │   ├── database/
│   │   │   ├── migrations.ts
│   │   │   └── schema.sql
│   │   ├── services/
│   │   │   ├── claude-api.ts
│   │   │   ├── task-crud.ts
│   │   │   ├── category-crud.ts
│   │   │   ├── template-crud.ts
│   │   │   ├── timebox-crud.ts
│   │   │   ├── ai-schedule.ts
│   │   │   ├── daily-stats.ts
│   │   │   ├── encouragement.ts
│   │   │   └── analytics.ts
│   │   └── ipc/
│   │       ├── task-handlers.ts
│   │       ├── category-handlers.ts
│   │       ├── template-handlers.ts
│   │       └── timebox-handlers.ts
│   ├── renderer/
│   │   ├── screens/
│   │   │   ├── Dashboard.tsx
│   │   │   ├── TaskTree.tsx
│   │   │   ├── Kanban.tsx
│   │   │   ├── Statistics.tsx
│   │   │   └── Settings.tsx
│   │   ├── components/
│   │   │   ├── AppShell.tsx
│   │   │   ├── TreeView.tsx
│   │   │   ├── TaskForm.tsx
│   │   │   ├── TimeGrid.tsx
│   │   │   ├── AiAssistant.tsx
│   │   │   └── ...
│   │   └── App.tsx
│   └── __tests__/
│       ├── database/
│       ├── services/
│       ├── components/
│       ├── screens/
│       └── integration/
├── docs/
│   └── planning/
│       ├── 01-prd.md
│       ├── 02-trd.md
│       ├── 03-user-flow.md
│       ├── 04-database-design.md
│       ├── 05-design-system.md
│       ├── 06-screens.md
│       ├── 07-coding-convention.md
│       └── 06-tasks.md (본 문서)
└── package.json
```

---

**작성 완료: 2026-03-18**
**Eros 원칙 적용 완료**
