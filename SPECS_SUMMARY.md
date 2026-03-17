# TodoAssist - Screen Spec v2.0 생성 완료

**생성일**: 2026-03-18
**프로젝트**: TodoAssist - AI 감정 안전 비서 데스크톱 앱
**기술 스택**: Electron + React + Zustand + Tailwind/shadcn + SQLite + Claude API

## 생성된 파일 구조

```
specs/
├── domain/
│   └── resources.yaml          # 도메인 리소스 정의 (DB 테이블 기반)
├── screens/
│   ├── index.yaml              # 스크린 목록 및 네비게이션
│   ├── dashboard.yaml          # 대시보드 (S1)
│   ├── kanban.yaml             # 칸반 보드 (S2)
│   ├── task-tree.yaml          # 태스크 트리 (S3)
│   ├── task-form.yaml          # 태스크 폼 (S4)
│   ├── statistics.yaml         # 통계/리포트 (S5)
│   ├── ai-chat.yaml            # AI 비서 채팅 (S6)
│   └── settings.yaml           # 설정 (S7)
└── shared/
    ├── components.yaml         # 공유 컴포넌트 라이브러리
    └── types.yaml              # 전역 타입 정의
```

## Eros 분석 설계 원칙 반영

### 1. AI 감정 안전 비서 ✓
- **구현**: `encouragements` 리소스로 감정 톤 차별화 (warm, urgent, humorous, professional, empathetic)
- **화면**: AI 비서 채팅, 대시보드, 통계
- **특징**: "미루고 있네요" → "이 과제가 좀 지루하죠?" 톤 전환

### 2. 2분 마이크로 시작 ✓
- **구현**: 모든 task에 `estimatedMinutes` (1-1440분), 모든 화면에 "2분만 시작하기" 버튼
- **특징**: 시작 심리 장벽 최소화, 타이머 강제 아님 (제안)
- **화면**: 대시보드, 칸반, 태스크 트리, 태스크 폼

### 3. 감정 인식 넛지 ✓
- **구현**: `deferredCount >= 2` 감지 시 인라인 제안 자동 표시
- **톤**: 따뜻함, 비난 없음, 공감
- **화면**: 태스크 트리 (인라인 제안), AI 비서 채팅

### 4. 과제 자동 쪼개기 ✓
- **구현**: task.parentId로 계층 관계 관리, AI가 오래 미뤄진 태스크 감지 후 "더 작게?" 제안
- **특징**: 사용자 승인 후 서브태스크 자동 생성
- **화면**: 태스크 트리 (ai_split_suggestion), 태스크 폼 (subtask_section)

### 5. 성취 축적 ✓
- **구현**: `daily_stats.completedCount` (절대값), 스트릭 없음
- **마일스톤**: 50, 100, 200 건수 달성 시 특별 축하 메시지
- **화면**: 대시보드 (total_completed_badge), 통계 (period_summary), AI 비서 (milestone 메시지)

## 핵심 데이터 모델

### 리소스 (domain/resources.yaml)
- **tasks**: 계층형 태스크 (parentId로 무한 중첩)
- **timeboxes**: 30분 단위 스케줄 (칸반 보드용)
- **encouragements**: AI 격려 메시지 (감정 톤 포함)
- **categories**: 태스크 분류
- **templates**: 반복 구조 템플릿
- **settings**: 사용자 설정 KV 저장소
- **daily_stats**: 일일 통계 (누적 성취 추적)

## 스크린 명세 개요

### 1. 대시보드 (/)
- AI 아침 인사말, 오늘 진행률 링, 할일 카드 리스트
- 주간 완료율 차트, 누적 성취 배지
- **Eros**: warm tone 인사, "2분만 시작하기", "지금 안 할래요"

### 2. 칸반 보드 (/kanban)
- 30분 단위 타임슬롯 그리드 (08:00-17:30)
- 드래그앤드롭 스케줄링
- **Eros**: AI가 중요도/마감일 기반 최적 배치 제안

### 3. 태스크 트리 (/tasks)
- 계층형 전체 태스크 보기
- 필터/검색/정렬, 진행률 자동 계산
- **Eros**: 미루기 감지 시 "더 작게?" 인라인 제안

### 4. 태스크 폼 (모달)
- 신규/수정 입력 폼
- **Eros**: AI가 제목 5자 이상일 때 즉시 추정값 표시, 서브태스크 인라인 추가

### 5. 통계/리포트 (/statistics)
- 완료율 추이, 카테고리 분포, 미루기 패턴
- **Eros**: 누적 완료 건수 강조, AI 격려 인사이트 3-5개

### 6. AI 비서 채팅 (우측 사이드바)
- 감정 인식 넛지, 완료 축하, 마일스톤 축하
- 사용자 대화 응답 (Claude API)
- **Eros**: warm tone, non-judgmental, empathetic

### 7. 설정 (/settings)
- 사용자 정보, 근무 시간, API 키
- 카테고리 관리 (CRUD)
- 알림 설정, AI 격려 빈도

## 컴포넌트 라이브러리 (shared/components.yaml)

### 내비게이션
- `sidebar-nav`: 좌측 메뉴 (Dashboard, Kanban, Task Tree, Statistics, Settings)
- `ai-chat-toggle`: 우측 상단 AI 비서 토글

### 입력 컴포넌트
- `text-input`, `textarea`, `select`, `toggle`
- `micro-start-button` (Eros 원칙), `guilt-free-defer` (Eros 원칙)

### 시각화
- `progress-bar` (색상: gray → orange → yellow → green)
- `task-card` (여러 variant)
- `badge`, `modal`, `spinner`, `toast`

## 전역 타입 정의 (shared/types.yaml)

### Enum 타입
- `TaskStatus`: pending, in_progress, completed, deferred
- `EncouragementType`: morning, start, complete, nudge, milestone
- `EncouragementTone`: warm, urgent, humorous, professional, empathetic
- `DateRange`: this_week, last_week, this_month, last_month, custom

### 객체 타입
- `AiEstimate`: estimatedMinutes, importance, suggestedCategory, confidence
- `DailyStats`: 일일 통계 (completedCount, completionRate, etc.)

## 통계

| 항목 | 수량 |
|------|------|
| 스크린 명세 파일 | 8개 (dashboard ~ settings) |
| 도메인 리소스 | 7개 (tasks, timeboxes, encouragements, etc.) |
| 공유 컴포넌트 | 15개+ |
| 전역 타입 | 20+ |
| **총 라인 수** | **775줄** |

## 주요 특징

### Eros 원칙 완전 구현
✓ "AI 강제 비서" → "AI 감정 안전 비서"
✓ 2분 마이크로 시작 (모든 작업 시작 가능)
✓ 감정 인식 넛지 ("지루하죠?" 스타일)
✓ 과제 자동 쪼개기 (AI 제안)
✓ 성취 축적 (스트릭 없음, 절대값만)

### 개발 친화적 명세
- 각 화면별 상호작용(interactions) 명시
- 테스트 케이스 정의
- 디자인 노트 포함 (색상, 타이포그래피, 애니메이션)
- Eros 원칙 체크리스트

### 확장 가능한 구조
- 공유 컴포넌트 라이브러리
- 일관된 타입 정의
- 계층형 리소스 모델 (self-join, one-to-many)
- AI 추정값 구조 (confidence 포함)

## 다음 단계

1. **Frontend Implementation**
   - React 컴포넌트 개발 (shadcn/ui 기반)
   - Zustand 상태 관리
   - API 통합 (Claude API, SQLite)

2. **Testing**
   - 각 스크린의 test cases 실행
   - E2E 테스트
   - Eros 원칙 준수 여부 검증

3. **Polish**
   - 애니메이션 미세 조정
   - 접근성 (a11y) 개선
   - 성능 최적화

---

**생성**: Claude Code v2.0
**Format**: screen-spec v2.0 (YAML)
**Eros Analysis**: 5가지 설계 원칙 완전 반영
