# TodoAssist - 화면 명세 문서 (Screen Specs)

> 7개 화면의 상세 레이아웃, 컴포넌트, 인터랙션, 데이터 바인딩

---

## S1. 대시보드 (Dashboard)

### 1.1 목적
오늘의 업무 현황 한눈에 파악, 스케줄 시작점

### 1.2 레이아웃

```
┌─────────────────────────────────────────────────────────────┐
│ TodoAssist              ⚙️ 설정  프로필                     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ 좌측 사이드바 (200px)  │  메인 콘텐츠 영역 (가변)         │
│                       │                                   │
│ □ Dashboard          │  안녕하세요, 준호님! 🌅           │
│ □ Kanban             │  2026년 3월 17일 (화)             │
│ □ Task Tree          │                                   │
│ □ Statistics         │  ┌─────────────────────────────┐ │
│ □ Settings           │  │ 📊 오늘 진행률              │ │
│                      │  │                             │ │
│                      │  │    ███████░░░░░░  65%      │ │
│                      │  │  4개 완료 / 6개 예정        │ │
│                      │  └─────────────────────────────┘ │
│                      │                                   │
│                      │  ┌─────────────────────────────┐ │
│                      │  │ 💬 AI 인사                  │ │
│                      │  │                             │ │
│                      │  │ "화이팅! 오늘도 소화해낼  │ │
│                      │  │ 거 있어요. 먼저 품질검사   │ │
│                      │  │ 리포트부터 시작해봅시다!"  │ │
│                      │  │                  [다음 넛지] │ │
│                      │  └─────────────────────────────┘ │
│                      │                                   │
│                      │  ┌─────────────────────────────┐ │
│                      │  │ 📅 예정 태스크              │ │
│                      │  │                             │ │
│                      │  │ 1. [08:00~10:00]           │ │
│                      │  │    품질 리포트 작성         │ │
│                      │  │    중요도: ★★★★☆          │ │
│                      │  │    [ 지금 시작 ]            │ │
│                      │  │                             │ │
│                      │  │ 2. [10:00~10:30]           │ │
│                      │  │    이메일 확인              │ │
│                      │  │    중요도: ★★☆☆☆          │ │
│                      │  │                             │ │
│                      │  │ 3. [점심] 12:00~13:00      │ │
│                      │  │    점심시간                 │ │
│                      │  │ ...                         │ │
│                      │  └─────────────────────────────┘ │
│                      │                                   │
│                      │  ┌─────────────────────────────┐ │
│                      │  │ 📈 주간 미니 차트           │ │
│                      │  │                             │ │
│                      │  │  완료율 추이                │ │
│                      │  │  월 화 수 목 금 토 일       │ │
│                      │  │  ▁▂▃▄▅▆▇█  ⬅ 오늘        │ │
│                      │  │  60% 63% 70% 68% 65% ... │ │
│                      │  │                             │ │
│                      │  │  [ 상세 통계 보기 ]         │ │
│                      │  └─────────────────────────────┘ │
│                      │                                   │
└─────────────────────────────────────────────────────────────┘
```

### 1.3 섹션별 상세

#### 1.3.1 헤더
- **인사말**: "안녕하세요, {사용자명}님! {시간대별 이모지}"
  - 06:00~12:00: 🌅 (아침)
  - 12:00~18:00: ☀️ (오후)
  - 18:00~24:00: 🌙 (저녁)
- **날짜**: "2026년 3월 17일 (화)"

#### 1.3.2 진행률 카드
- **큰 원형 진행률**: 65% (중앙)
- **상세**: "4개 완료 / 6개 예정"
- **색상**: 진행률에 따라
  - <30%: Error-400 (빨강)
  - 30~70%: Warning-400 (노랑)
  - >70%: Success-500 (초록)

#### 1.3.3 AI 인사말
- **메시지**: Claude API로 생성
- **톤**: 아침 시간대에 warm, 마감 임박 시 urgent
- **액션**: "[다음 넛지]" 버튼으로 스스로 격려 메시지 생성 가능

#### 1.3.4 예정 태스크 리스트
- **표시 내용**: 오늘 스케줄된 태스크 3~5개 (우선도순)
  - 시간 범위 (예: [08:00~10:00])
  - 제목
  - 중요도 별 표시
  - 상태 배지 (scheduled, in_progress 등)
- **액션**: 각 태스크마다 "[지금 시작]" 또는 "[계속하기]" 버튼

#### 1.3.5 주간 미니 차트
- **차트 유형**: 라인 차트 (Recharts)
- **X축**: 월~일 (또는 지난 7일)
- **Y축**: 완료율 (%)
- **현재 날짜 강조**: 색상 진하게 또는 수직선 표시
- **링크**: "[상세 통계 보기]" → S5로 이동

### 1.4 데이터 바인딩

```typescript
// 상태 (Zustand store)
interface DashboardState {
  todayTasks: Task[];        // 오늘 스케줄된 태스크
  completedCount: number;    // 완료한 태스크 수
  totalPlanned: number;      // 예정된 태스크 수
  progressPercent: number;   // 진행률 (계산됨)
  aiGreeting: string;        // AI 인사말
  weeklyStats: DailyStats[]; // 지난 7일 통계
}

// 데이터 로드 (useEffect)
useEffect(() => {
  // 1. 오늘 날짜의 모든 태스크 조회
  const today = formatDate(new Date());
  const todayTasks = await db.query(
    `SELECT t.* FROM Task t
     JOIN TimeBox tb ON t.id = tb.taskId
     WHERE tb.date = ?`,
    [today]
  );

  // 2. 진행률 계산
  const completed = todayTasks.filter(t => t.status === 'completed').length;
  const total = todayTasks.length;
  setProgressPercent((completed / total) * 100);

  // 3. AI 인사말 생성
  const greeting = await claudeApi.generateGreeting({
    userName: '준호',
    hour: new Date().getHours(),
    completedToday: completed,
    totalPlanned: total,
  });

  // 4. 주간 통계 조회
  const weeklyStats = await db.query(
    `SELECT * FROM DailyStats
     WHERE date >= ? AND date <= ?`,
    [sevenDaysAgo, today]
  );

  setDashboardState({
    todayTasks,
    completedCount: completed,
    totalPlanned: total,
    progressPercent: (completed / total) * 100,
    aiGreeting: greeting,
    weeklyStats,
  });
}, []);
```

### 1.5 인터랙션

| 요소 | 액션 | 결과 |
|------|------|------|
| 예정 태스크 카드 | 클릭 | S4 태스크 상세 모달 열림 |
| "[지금 시작]" 버튼 | 클릭 | 상태 → in_progress, S2 칸반으로 이동 |
| "[상세 통계 보기]" | 클릭 | S5 통계 화면으로 이동 |
| "[다음 넛지]" | 클릭 | AI 격려 메시지 재생성 |
| "Kanban" 메뉴 | 클릭 | S2로 이동 |

---

## S2. 칸반 보드 (Kanban Board - Timebox Scheduling)

### 2.1 목적
30분 단위 타임박스로 오늘의 스케줄 시각화 및 조정

### 2.2 레이아웃

```
┌─────────────────────────────────────────────────────────────┐
│ TodoAssist                                    ⚙️ 설정  👤  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ 좌측          │ 오늘 스케줄 (2026-03-17 Mon)             │
│ 메뉴          │ 근무시간: 08:30 ~ 17:30  [AI 재생성]    │
│               │ [스케줄 저장]  [다시 생성]  [수동 편집 ✓]│
│ □ Dashboard   │                                           │
│ □ Kanban ✓    │ 08:00   08:30   09:00   09:30   10:00   │
│ □ Task Tree   │  │        │        │        │        │   │
│ □ Statistics  │  ├─────────────────────────────────────┤ │
│ □ Settings    │ 08:30│ 품질 리포트 (AI)                 │ │
│               │ ~    │ 중요도: ★★★★☆                │ │
│               │ 10:00│ [편집] [삭제]                   │ │
│               │      ├─────────────────────────────────┤ │
│               │ 10:00│ 이메일 확인 (AI)                │ │
│               │ ~    │ [편집] [삭제]                   │ │
│               │ 10:30│                                 │ │
│               │      ├─────────────────────────────────┤ │
│               │ 10:30│ [+ 빈 공간]                     │ │
│               │ ~    │                                 │ │
│               │ 12:00│                                 │ │
│               │      ├─────────────────────────────────┤ │
│               │ 12:00│ 점심시간 (고정)                 │ │
│               │ ~    │                                 │ │
│               │ 13:00│                                 │ │
│               │      ├─────────────────────────────────┤ │
│               │ 13:00│ 품질 회의 (중요도 5)             │ │
│               │ ~    │ 14:30 [편집] [삭제]             │ │
│               │      │                                 │ │
│               │ 14:30│ ├─────────────────────────────┤ │
│               │      │ │ 세부 문서 검토 (서브)        │ │
│               │      │ │ [+] [삭제]                  │ │
│               │      │ └─────────────────────────────┘ │
│               │      ├─────────────────────────────────┤ │
│               │ 15:00│ [+ 태스크 추가]                 │ │
│               │ ~    │                                 │ │
│               │ 16:00│                                 │ │
│               │      ├─────────────────────────────────┤ │
│               │ 16:00│ 업무 종료                       │ │
│               │ ~    │ (이후 근무 시간 외)             │ │
│               │ 17:30│                                 │ │
│               │      │                                 │ │
└─────────────────────────────────────────────────────────────┘
```

### 2.3 핵심 컴포넌트

#### 2.3.1 헤더
- **제목**: "오늘 스케줄 (YYYY-MM-DD Day)"
- **근무시간**: "근무시간: 08:30 ~ 17:30" (설정에서 변경 가능)
- **버튼**:
  - "[AI 재생성]": Claude API 호출해서 새 스케줄 제안
  - "[스케줄 저장]": 모든 변경사항을 DB에 저장
  - "[다시 생성]": 수동 편집 모드 토글

#### 2.3.2 타임슬롯 컬럼 (30분 단위)
- **높이**: 모두 동일 (30분 = 높이 80px)
- **시간 범위**: 08:00, 08:30, 09:00, ... 17:30 (총 20개 슬롯)
- **배경색**:
  - 근무 시간: Neutral-0 (흰색)
  - 근무 시간 외: Neutral-50 (연한 회색)
  - 점심/휴식(고정): Neutral-100 (더 연한 회색)

#### 2.3.3 태스크 카드 (드래그 가능)
- **크기**: 슬롯 높이 × 소요시간 (예: 120분 = 높이 320px)
- **배경색**: 카테고리별 색상
- **테두리**: 좌측 3px 카테고리 색상
- **콘텐츠**:
  - 제목
  - 중요도 배지
  - "[편집]", "[삭제]" 버튼 (호버 시)
- **상태별 스타일**:
  - scheduled: opacity 100%, 테두리 정상
  - in_progress: 노란색 배경 (Warning-50), 강조
  - completed: 초록색 배경 (Success-50), opacity 70%
  - 진행 중 표시: 좌측에 재생 아이콘 (▶️) 또는 하이라이트

#### 2.3.4 드래그앤드롭 인터랙션
```javascript
// react-beautiful-dnd 사용

<Droppable droppableId={`timeslot-${slotIndex}`}>
  {(provided, snapshot) => (
    <div
      ref={provided.innerRef}
      {...provided.droppableProps}
      className={`
        relative min-h-[80px] border-b border-neutral-200
        ${snapshot.isDraggingOver ? 'bg-primary-50' : ''}
      `}
    >
      {tasks.map((task, index) => (
        <Draggable key={task.id} draggableId={task.id} index={index}>
          {(provided, snapshot) => (
            <div
              ref={provided.innerRef}
              {...provided.draggableProps}
              {...provided.dragHandleProps}
              className={`
                absolute left-0 right-0 p-2 rounded border-l-4
                ${snapshot.isDragging ? 'opacity-50' : 'opacity-100'}
              `}
              style={{
                height: `${(task.estimatedMinutes / 30) * 80}px`,
                borderLeftColor: getCategoryColor(task.category),
                ...provided.draggableProps.style
              }}
            >
              {/* 카드 콘텐츠 */}
            </div>
          )}
        </Draggable>
      ))}
      {provided.placeholder}
    </div>
  )}
</Droppable>
```

### 2.4 데이터 바인딩

```typescript
interface KanbanState {
  date: string;                 // 'YYYY-MM-DD'
  timeSlots: TimeSlot[];        // 30분 단위 슬롯 (0~47)
  tasks: Task[];                // 이 날짜의 모든 태스크
  timeBoxes: TimeBox[];         // TaskId → TimeBox 매핑
  workStartHour: number;        // 8
  workStartMinute: number;      // 30
  workEndHour: number;          // 17
  workEndMinute: number;        // 30
}

// 로드
useEffect(() => {
  const today = formatDate(new Date());
  const timeBoxes = await db.query(
    `SELECT * FROM TimeBox WHERE date = ? ORDER BY startSlot`,
    [today]
  );

  const taskIds = timeBoxes.map(tb => tb.taskId);
  const tasks = await db.query(
    `SELECT * FROM Task WHERE id IN (${taskIds.map(() => '?').join(',')})`
  );

  const settings = await db.query(`SELECT * FROM Setting`);
  const workStart = parseInt(settings.find(s => s.key === 'workStartHour').value);

  setKanbanState({
    date: today,
    timeSlots: generateTimeSlots(workStart, workStart + 8),
    tasks,
    timeBoxes,
    workStartHour: workStart,
  });
}, []);
```

### 2.5 인터랙션

| 요소 | 액션 | 결과 |
|------|------|------|
| 태스크 카드 | 드래그 | 다른 슬롯으로 이동, 실시간 UI 업데이트 |
| "[편집]" 버튼 | 클릭 | S4 태스크 수정 모달 열림 |
| "[삭제]" 버튼 | 클릭 | 확인 후 TimeBox 삭제 (Task는 유지) |
| "[+ 태스크 추가]" | 클릭 | S4 신규 태스크 등록 모달 |
| "[AI 재생성]" | 클릭 | Claude API 호출, 새로운 스케줄 제안 |
| "[스케줄 저장]" | 클릭 | 모든 TimeBox 변경 DB 저장 |
| 태스크 카드 더블클릭 | 더블클릭 | 상태 toggle (pending ↔ in_progress) |

---

## S3. 태스크 트리 (Task Tree)

### 3.1 목적
모든 태스크를 계층형으로 조회 및 관리, 진행률 자동 계산

### 3.2 레이아웃

```
┌─────────────────────────────────────────────────────────────┐
│ TodoAssist                                    ⚙️ 설정  👤  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ 좌측          │ 전체 태스크 (Task Tree)                   │
│ 메뉴          │                                           │
│               │ 필터: [카테고리 ▼] [중요도 ▼] [상태 ▼]   │
│ □ Dashboard   │ 정렬: [생성일 ▼]                         │
│ □ Kanban      │ [🔍 검색]  [템플릿]  [+ 새 태스크]      │
│ □ Task Tree ✓ │                                           │
│ □ Statistics  │ ▼ 품질검사 (상위)                         │
│ □ Settings    │ │ └─ 진행률: ███░░ 60%                 │
│               │ │                                       │
│               │ ├─ ☐ 월간 품질 리포트 (123분 | 💾)      │
│               │ │ └─ ██████░░ 70%                       │
│               │ │   ├─ ☐ 데이터 수집 (45분)             │
│               │ │   ├─ ✓ 보고서 작성 (60분)             │
│               │ │   └─ ☐ 검수 및 제출 (15분)             │
│               │ │                                       │
│               │ ├─ ☐ 제품 검사 A품목 (90분 | 중요도 5)   │
│               │ │ └─ ░░░░░░ 0%                          │
│               │ │                                       │
│               │ └─ ☐ 부적합 리포트 작성 (60분)           │
│               │   └─ ██████░░░░░░ 40%                   │
│               │                                       │
│               │ ▼ 보고서                                 │
│               │ │ └─ 진행률: ████░░ 50%                 │
│               │ │                                       │
│               │ └─ ☐ 주간 업무 리포트 (180분)            │
│               │   └─ ░░░░░░░░ 10%                       │
│               │   ├─ ☐ 지난주 이슈 정리                │
│               │   ├─ ☐ 이번주 계획 수립                │
│               │   └─ ☐ 최종 검수                       │
│               │                                       │
│               │ ⊙ 기타 (완료된 항목 숨김)                │
│               │                                       │
└─────────────────────────────────────────────────────────────┘
```

### 3.3 핵심 기능

#### 3.3.1 계층 표현
- **확장/축소 화살표** (▼/▶): 자식이 있는 노드만 표시
- **들여쓰기**: 각 깊이별 16px 증가
- **계층 연결선** (선택): 부모-자식 관계 시각화

#### 3.3.2 필터 & 정렬
- **카테고리**: 선택된 카테고리만 표시 (다중선택 가능)
- **중요도**: 1~5 범위 필터
- **상태**: pending, in_progress, completed, deferred 다중선택
- **정렬**: 생성일, 데드라인, 중요도, 진행률

#### 3.3.3 진행률 계산
```typescript
// 리프 노드: 사용자 입력값
// 부모 노드: 자식의 가중 평균
function calculateProgress(task: Task): number {
  const children = getChildren(task.id);
  if (children.length === 0) {
    return task.progress; // 리프 노드는 그대로
  }

  // 부모 노드
  const totalProgress = children.reduce(
    (sum, child) => sum + calculateProgress(child),
    0
  );
  return Math.round(totalProgress / children.length);
}
```

#### 3.3.4 템플릿 저장/불러오기
```
[템플릿] 버튼 → 팝업
├─ 저장 또는 불러오기 선택
├─ 저장: 현재 트리 구조를 Template으로 저장
│   입력: 템플릿명 (예: "월간 품질 보고서")
│   저장: 진행률 제외, 구조만 저장
└─ 불러오기: 기존 템플릿 선택
    선택 후 새로운 Task 생성 (기존 진행률 0%)
```

### 3.4 데이터 바인딩

```typescript
interface TaskTreeState {
  allTasks: Task[];           // 모든 태스크 (필터 전)
  filteredTasks: Task[];      // 필터 적용 후
  expandedNodeIds: Set<string>; // 전개된 노드
  selectedNodeId: string | null;
  filters: {
    categories: string[];
    importanceRange: [number, number];
    statuses: string[];
  };
  sortBy: 'createdAt' | 'deadline' | 'importance' | 'progress';
  searchQuery: string;
}

// 로드
useEffect(() => {
  const allTasks = await db.query(`SELECT * FROM Task`);
  applyFiltersAndSort(allTasks);
}, [filters, sortBy]);

// 계층형 렌더링 (재귀)
function renderTaskTree(tasks: Task[], parentId: string | null): JSX.Element {
  const childTasks = tasks.filter(t => t.parentId === parentId);
  return (
    <>
      {childTasks.map(task => (
        <div key={task.id}>
          <TreeNode task={task} />
          {isExpanded(task.id) && renderTaskTree(tasks, task.id)}
        </div>
      ))}
    </>
  );
}
```

### 3.5 인터랙션

| 요소 | 액션 | 결과 |
|------|------|------|
| 화살표 (▼/▶) | 클릭 | 자식 노드 전개/축소 |
| 체크박스 | 클릭 | 상태 toggle (pending ↔ completed) |
| 노드 (텍스트) | 더블클릭 | S4 태스크 수정 모달 |
| 노드 (텍스트) | 우클릭 | 컨텍스트 메뉴 (수정, 삭제, 서브태스크 추가) |
| "[+ 새 태스크]" | 클릭 | S4 신규 태스크 모달 (루트 레벨) |
| 필터 드롭다운 | 변경 | 실시간 필터 적용 |
| 진행률 바 | 드래그 | 리프 노드 진행률 수동 조정 (부모 자동 계산) |

---

## S4. 태스크 등록/수정 (Task Form)

### 4.1 목적
태스크의 모든 정보 입력 및 편집

### 4.2 레이아웃 (모달)

```
┌─────────────────────────────────────────────────────┐
│ ✕ 새 태스크                                         │
├─────────────────────────────────────────────────────┤
│                                                     │
│ 제목 *                                              │
│ [품질 리포트 작성__________]                        │
│ 필수 필드, 50자 이내                                │
│                                                     │
│ 설명                                                │
│ [월간 품질 현황 보고서 작성...................       │
│  .............................................      │
│ ____________________________________]              │
│ 최대 1000자                                         │
│                                                     │
│ 데드라인                                            │
│ [날짜] 2026-03-20  [시간] 16:00 ← AI 추정: 16:00 │
│ (선택)                                              │
│                                                     │
│ 소요 시간                                            │
│ [120] 분  ← AI 추정: 120분 (사용자 수정 가능)     │
│                                                     │
│ 중요도                                              │
│ [슬라이더] ████░░░░░░ 4/5                         │
│                                                     │
│ 카테고리                                            │
│ [드롭다운 ▼]                                        │
│ 품질검사 ✓                                         │
│                                                     │
│ (AI 제안: 품질검사 - 정확도 95%)                  │
│ (또는 다른 카테고리로 변경)                         │
│ [ ] 다른 카테고리                                   │
│ [ ] 새 카테고리 추가                                │
│                                                     │
│ 관련 분류 (선택)                                    │
│ [텍스트 입력] ________                             │
│ 예: "품목A", "프로젝트X"                          │
│                                                     │
│ 부모 태스크 (선택)                                  │
│ [트리 선택] 월간 품질 리포트                        │
│ (계층형 구조: 선택 시 자식으로 등록)               │
│                                                     │
│ 서브태스크 추가                                      │
│ ☐ 데이터 수집 (45분)  [삭제]                      │
│ ☐ 보고서 작성 (60분)  [삭제]                      │
│ ☐ 검수 및 제출 (15분) [삭제]                      │
│ [+ 서브태스크 추가]                                │
│                                                     │
│ ─────────────────────────────────────────────────│
│                                                     │
│ [ 취소 ]                    [ 저장 ]               │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### 4.3 필드 상세

| 필드 | 타입 | 필수 | 제약 | AI 기능 |
|------|------|------|------|--------|
| 제목 | 텍스트 | ✓ | 50자 이내 | 없음 |
| 설명 | 텍스트 | | 1000자 이내 | 없음 |
| 데드라인 | 날짜+시간 | | 없음 | 추정 (선택) |
| 소요시간 | 숫자 | ✓ | 1~1440분 | 추정 (선택) |
| 중요도 | 슬라이더 | ✓ | 1~5 | 추정 (선택) |
| 카테고리 | 선택 | ✓ | 기존 또는 신규 | AI 분류 |
| 관련분류 | 텍스트 | | 없음 | 없음 |
| 부모태스크 | 선택 | | 없음 | 없음 |
| 서브태스크 | 목록 | | 무제한 중첩 | 없음 |

### 4.4 AI 자동 추정 로직

```typescript
async function estimateTaskMetadata(title: string, description: string) {
  const prompt = `
    제목: "${title}"
    설명: "${description}"

    다음을 추정하고 JSON으로 반환해주세요:
    {
      "estimatedMinutes": 숫자,
      "importance": 1~5,
      "suggestedCategory": "카테고리명",
      "confidence": 0~1,
      "reasoning": "간단한 이유"
    }

    제조업 품질 엔지니어 업무 기준으로 합리적인 추정.
  `;

  const response = await claudeApi.generate(prompt);
  return JSON.parse(response);
}

// UI에 표시
const estimate = await estimateTaskMetadata(title, description);
setAiEstimate(estimate);
// "(AI 추정: 120분, 중요도 4, 카테고리: 품질검사 - 정확도 85%)"
```

### 4.5 서브태스크 인터랙션

```jsx
// 서브태스크 추가
const [subtasks, setSubtasks] = useState<Subtask[]>([]);

function addSubtask() {
  setSubtasks([...subtasks, {
    id: uuid(),
    title: '',
    estimatedMinutes: 30,
  }]);
}

function removeSubtask(id: string) {
  setSubtasks(subtasks.filter(st => st.id !== id));
}

// 저장 시: 부모 Task 먼저 저장, 그 후 Subtask도 Task 테이블에 입력 (parentId 설정)
```

### 4.6 데이터 바인딩

```typescript
interface TaskFormState {
  isEditing: boolean;           // 신규 vs 수정
  originalTaskId: string | null;

  // 입력값
  title: string;
  description: string;
  deadline: number | null;
  estimatedMinutes: number;
  importance: number;
  category: string;
  relatedClass: string;
  parentId: string | null;
  subtasks: Subtask[];

  // AI 추정값
  aiEstimate: {
    estimatedMinutes: number;
    importance: number;
    suggestedCategory: string;
    confidence: number;
  };

  // 유효성
  errors: Record<string, string>;
}

// 저장
async function handleSave() {
  // 1. 유효성 검사
  if (!formState.title.trim()) {
    setErrors({ title: '제목은 필수입니다' });
    return;
  }

  // 2. Task 저장 (또는 업데이트)
  const taskId = formState.isEditing
    ? await db.update('Task', { id: formState.originalTaskId, ...formState })
    : await db.insert('Task', { id: uuid(), ...formState });

  // 3. 서브태스크 저장
  for (const subtask of formState.subtasks) {
    await db.insert('Task', {
      id: uuid(),
      title: subtask.title,
      estimatedMinutes: subtask.estimatedMinutes,
      parentId: taskId,
      // ... 나머지 필드
    });
  }

  // 4. 닫기 & 알림
  setShowModal(false);
  toast.success('태스크가 저장되었습니다');
}
```

### 4.7 인터랙션

| 요소 | 액션 | 결과 |
|------|------|------|
| 제목 입력 | 입력 완료 후 1초 | AI 추정 시작 (로딩 표시) |
| "[AI 추정 사용]" | 클릭 | 추정값을 필드에 적용 |
| "[+ 서브태스크 추가]" | 클릭 | 새로운 입력줄 추가 |
| "[ 취소 ]" | 클릭 | 모달 닫음 (저장 안 함) |
| "[ 저장 ]" | 클릭 | 유효성 검사 후 DB 저장 |

---

## S5. 통계/리포트 (Statistics)

### 5.1 목적
주간·월간 완료율, 시간 분석, 미루기 패턴, AI 인사이트

### 5.2 레이아웃

```
┌─────────────────────────────────────────────────────┐
│ TodoAssist                                  ⚙️ 👤  │
├─────────────────────────────────────────────────────┤
│ 좌측    │ 통계 & 리포트                              │
│ 메뉴    │ 기간: [이번주 ▼]                          │
│         │ [지난주] [이번 달] [지난달] [커스텀]      │
│ □ Stats │                                           │
│ ✓       │ ┌──────────────────────────────────────┐ │
│         │ │ 📊 완료율 (%)                        │ │
│         │ │                                      │ │
│         │ │  78%                                 │ │
│         │ │ (75개 예정, 59개 완료)              │ │
│         │ │                                      │ │
│         │ │ 월 화 수 목 금 토 일                │ │
│         │ │ ▁▂▃▅▆▇█░ (선 그래프)               │ │
│         │ │ 60 65 70 85 90 75 60 0             │ │
│         │ └──────────────────────────────────────┘ │
│         │                                           │
│         │ ┌──────────────────────────────────────┐ │
│         │ │ ⏱️ 카테고리별 시간                   │ │
│         │ │                                      │ │
│         │ │        품질검사 45%                  │ │
│         │ │       ╱ ╲                            │ │
│         │ │      ╱   ╲ 보고서 25%               │ │
│         │ │     ╱     ╲                         │ │
│         │ │    ╱ 회의  ╲ 30%                    │ │
│         │ │ (원형 차트)                         │ │
│         │ └──────────────────────────────────────┘ │
│         │                                           │
│         │ ┌──────────────────────────────────────┐ │
│         │ │ 🚫 미루기 패턴                       │ │
│         │ │                                      │ │
│         │ │ 금요일 미루기 2배:                  │ │
│         │ │ 월: 2회, 화: 3회, 수: 1회,         │ │
│         │ │ 목: 2회, 금: 8회, 토일: 0회        │ │
│         │ │                                      │ │
│         │ │ (막대 그래프)                       │ │
│         │ └──────────────────────────────────────┘ │
│         │                                           │
│         │ ┌──────────────────────────────────────┐ │
│         │ │ 💡 AI 인사이트                       │ │
│         │ │                                      │ │
│         │ │ • 예상 120분 vs 실제 110분 (9%     │ │
│         │ │   빠름)                             │ │
│         │ │                                      │ │
│         │ │ • 이번 주는 월요일이 가장 생산적    │ │
│         │ │   (15개 완료)                      │ │
│         │ │                                      │ │
│         │ │ • "보고서" 카테고리가 지난주보다   │ │
│         │ │   40% 증가                         │ │
│         │ │                                      │ │
│         │ │ • 금요일 번아웃 주의: 오후에는     │ │
│         │ │   간단한 작업만 하기               │ │
│         │ │                                      │ │
│         │ │ [ 자세히 보기 ]                     │ │
│         │ └──────────────────────────────────────┘ │
│         │                                           │
│         │ [ 내보내기 (CSV/PDF) ]                   │
│         │                                           │
└─────────────────────────────────────────────────────┘
```

### 5.3 차트 구현 (Recharts)

```jsx
// 완료율 라인 차트
<LineChart data={dailyStats} width={400} height={250}>
  <CartesianGrid strokeDasharray="3 3" />
  <XAxis dataKey="day" />
  <YAxis />
  <Tooltip />
  <Legend />
  <Line
    type="monotone"
    dataKey="completedRate"
    stroke="#22C55E"
    strokeWidth={2}
  />
</LineChart>

// 카테고리별 원형 차트
<PieChart width={300} height={300}>
  <Pie
    data={categoryData}
    cx="50%"
    cy="50%"
    labelLine={false}
    label={({ name, value }) => `${name}: ${value}%`}
    outerRadius={80}
    fill="#8884d8"
    dataKey="value"
  >
    {categoryData.map((entry, index) => (
      <Cell key={`cell-${index}`} fill={COLORS[index]} />
    ))}
  </Pie>
</PieChart>

// 미루기 패턴 막대 그래프
<BarChart data={deferralData} width={400} height={250}>
  <CartesianGrid strokeDasharray="3 3" />
  <XAxis dataKey="day" />
  <YAxis />
  <Tooltip />
  <Bar dataKey="deferredCount" fill="#EF4444" />
</BarChart>
```

### 5.4 AI 인사이트 생성

```typescript
async function generateInsights(weeklyStats: DailyStats[]): Promise<string[]> {
  const data = {
    completionRate: calculateAvgCompletionRate(weeklyStats),
    mostProductiveDay: findMostProductiveDay(weeklyStats),
    leastProductiveDay: findLeastProductiveDay(weeklyStats),
    estimationAccuracy: calculateEstimationAccuracy(weeklyStats),
    deferralPattern: calculateDeferralPattern(weeklyStats),
    categoryTrend: calculateCategoryTrend(weeklyStats),
  };

  const prompt = `
    다음은 사용자의 지난 주 업무 데이터입니다:
    ${JSON.stringify(data, null, 2)}

    3~5가지 실용적이고 동기부여가 되는 인사이트를 제시해주세요.
    예:
    - 완료율과 패턴 분석
    - 강점과 개선점
    - 구체적 행동 제안
  `;

  const response = await claudeApi.generate(prompt);
  const insights = response.split('\n').filter(line => line.trim().startsWith('•'));
  return insights;
}
```

### 5.5 데이터 바인딩

```typescript
interface StatisticsState {
  dateRange: [Date, Date];      // 기간
  dailyStats: DailyStats[];     // 일별 통계
  totalStats: {
    completedCount: number;
    totalPlanned: number;
    completionRate: number;
    totalMinutesUsed: number;
  };
  categoryBreakdown: Record<string, number>;
  deferralByDay: Record<string, number>;
  aiInsights: string[];
}
```

---

## S6. AI 비서 채팅 (AI Assistant Chat)

### 6.1 목적
실시간 격려, 넛지, 대화형 조언 제공

### 6.2 레이아웃 (우측 사이드바, 300px)

```
우측 슬라이드인 패널 (300px)

┌─────────────────────────────┐
│ AI 비서 "준호님의 응원단"   │
├─────────────────────────────┤
│                             │
│ [타이틀 이모지: 🤖💬]      │
│                             │
│ ───────────────────────────│
│                             │
│ [메시지 목록 (스크롤)]      │
│                             │
│ 🤖 08:00                   │
│ "좋은 아침입니다!"         │
│                             │
│ 🤖 08:05                   │
│ "품질 리포트를 시작했군요" │
│                             │
│ 👤 08:10                   │
│ "오늘 너무 피곤해"         │
│                             │
│ 🤖 08:12                   │
│ "정말 수고하고 있네요!    │
│  이미 반정도 끝냈으니    │
│  충분히 잘하고 있어요"    │
│                             │
│ ───────────────────────────│
│                             │
│ [입력 영역]                 │
│ [무엇을 도와드릴까요?__  │
│  [🎯 제안] [📊 분석]      │
│                             │
│ [ 전송 ]                    │
│                             │
└─────────────────────────────┘

어느 화면에서든 토글 가능: 우측 상단 "[💬]" 버튼
```

### 6.3 메시지 타입

| 타입 | 트리거 | 톤 | 예시 |
|------|--------|-----|------|
| morning | 08:00 (근무 시작) | warm | "좋은 아침! 오늘도 화이팅" |
| start | 태스크 시작 | warm | "집중해봅시다! 💪" |
| complete | 태스크 완료 | celebration | "축하합니다! 🎉" |
| nudge | 미루기 감지 | urgent + warm | "지금 시작해봅시다!" |
| milestone | 완료율 50%, 100% | celebration | "절반을 했어요!" |
| insight | 주간 완료 후 | professional | "이번주 금요일에..." |

### 6.4 AI 메시지 생성

```typescript
async function generateMessage(context: MessageContext): Promise<string> {
  const prompt = `
    사용자 프로필:
    - 이름: ${context.userName}
    - 현재 시간: ${context.currentHour}:${context.currentMinute}
    - 오늘 완료율: ${context.completionRate}%
    - 미루기 횟수: ${context.deferredCount}

    트리거: ${context.triggerType}
    (${context.taskTitle}을(를) ${context.action})

    지시:
    - 한국어로 30자~100자 이내
    - 톤: ${context.tone}
    - 사용자 이름(${context.userName})을(를) 칭호로 사용
    - 이모지 활용

    메시지를 생성하세요:
  `;

  return await claudeApi.generate(prompt);
}
```

### 6.5 인터랙션

| 요소 | 액션 | 결과 |
|------|------|------|
| 입력창 | 텍스트 입력 | 실시간 입력 |
| "[전송]" | 클릭 | 메시지 전송, AI 응답 생성 (1~2초) |
| "[🎯 제안]" | 클릭 | 다음 태스크 추천 |
| "[📊 분석]" | 클릭 | 오늘 통계 요약 |
| 메시지 스크롤 | 스크롤 | 이전 메시지 확인 |
| "[💬]" 토글 | 클릭 | 사이드바 열기/닫기 |

---

## S7. 설정 (Settings)

### 7.1 목적
앱 전역 설정, 사용자 프로필, 카테고리/클래스 관리

### 7.2 레이아웃

```
┌─────────────────────────────────────────────────────┐
│ TodoAssist                                  ⚙️ 👤  │
├─────────────────────────────────────────────────────┤
│ 좌측    │ 설정                                        │
│ 메뉴    │                                            │
│         │ [기본] [외관] [카테고리] [알림]            │
│ □ Basic │                                            │
│ ✓       │ ┌─────────────────────────────────────┐  │
│         │ │ 사용자 정보                         │  │
│         │ │ 이름: [준호___________]             │  │
│         │ │ 직급: [품질 엔지니어____]           │  │
│         │ │                                     │  │
│         │ │ 근무시간                            │  │
│         │ │ 시작: [08시] [30분]                │  │
│         │ │ 종료: [17시] [30분]                │  │
│         │ │                                     │  │
│         │ │ Claude API 키                       │  │
│         │ │ [••••••••••••••__________] 연동됨  │  │
│         │ │ [ 재설정 ]  [ 테스트 ]             │  │
│         │ │                                     │  │
│         │ │ 데이터 & 백업                      │  │
│         │ │ 마지막 백업: 2026-03-17 09:00     │  │
│         │ │ [ 지금 백업 ] [ 백업 복원 ]        │  │
│         │ │ [ 데이터 내보내기 ] [ 데이터 삭제]│  │
│         │ │                                     │  │
│         │ └─────────────────────────────────────┘  │
│         │                                            │
│         │ [저장]  [기본값 복원]                     │
│         │                                            │
└─────────────────────────────────────────────────────┘
```

### 7.3 설정 탭

#### 기본 (Basic)
- 사용자명, 직급
- 근무시간 (시/분)
- Claude API 키 (마스킹)
- 백업 관리
- 데이터 관리

#### 외관 (Appearance) - Phase 3+
- 다크 모드 토글
- 언어 선택 (한국어, English)
- 폰트 크기

#### 카테고리 (Categories)
```
카테고리 목록:
┌──────────────┬─────────┬─────────┐
│ 이름         │ 색상    │ 아이콘  │
├──────────────┼─────────┼─────────┤
│ 품질검사     │ #FF6B6B │ 🔍      │
│ 보고서       │ #4ECDC4 │ 📄      │
│ 회의         │ #45B7D1 │ 👥      │
│ 이메일       │ #FFA07A │ ✉️      │
│ 기타         │ #95A5A6 │ 📌      │
└──────────────┴─────────┴─────────┘

[+ 새 카테고리 추가]
[편집] [삭제] 버튼 (각 행)
```

#### 알림 (Notifications)
- 타임박스 시작 알림 (ON/OFF)
- 미루기 감지 알림 (ON/OFF)
- 데드라인 알림 (ON/OFF)
- 음성 알림 (ON/OFF)
- AI 격려 메시지 빈도 (가끔, 자주, 항상)

### 7.4 데이터 바인딩

```typescript
interface SettingState {
  userName: string;
  userTitle: string;
  workStartHour: number;
  workStartMinute: number;
  workEndHour: number;
  workEndMinute: number;
  claudeApiKey: string;      // 마스킹
  darkMode: boolean;
  language: 'ko' | 'en';
  fontSizeScale: number;     // 0.9 ~ 1.2
  notifications: {
    timebox: boolean;
    deferral: boolean;
    deadline: boolean;
    sound: boolean;
  };
  aiGreetingFrequency: 'rare' | 'normal' | 'frequent';
  categories: Category[];
}

// 저장
async function saveSetting(key: string, value: any) {
  await db.update('Setting', { key, value: JSON.stringify(value) });
  applySettingChange(key, value); // UI 즉시 반영
}
```

---

**문서 생성일**: 2026-03-17
**버전**: 1.0
