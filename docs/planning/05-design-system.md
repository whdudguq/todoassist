# TodoAssist - 디자인 시스템 문서

> 따뜻하고 생산적인 UI/UX를 위한 색상, 타이포그래피, 컴포넌트 명세

---

## 1. 디자인 철학

### 1.1 핵심 가치
- **따뜻함 (Warmth)**: 사용자를 격려하는 톤과 색감
- **명확성 (Clarity)**: 정보 계층이 명확한 UI
- **효율성 (Efficiency)**: 최소 클릭으로 핵심 기능 접근
- **신뢰성 (Reliability)**: 일관성 있는 컴포넌트와 패턴

### 1.2 사용자 심리
- 제조업 엔지니어: 전문성 존중, 과도한 장식 제거
- 미루기 성향: 긍정적 강화, 넛지 제공
- 생산성 추구: 데이터 시각화, 진행 상황 즉시 확인

---

## 2. 색상 팔레트

### 2.1 프라이머리 색상 (Primary)

```
메인 액션, 포커스, 강조 요소

라이트 모드 (기본):
┌─────────────────────────────────────┐
│ Primary-50    #FFFAF0 (최연한)      │
│ Primary-100   #FEE4CE               │
│ Primary-200   #FDD5A6               │
│ Primary-300   #FCC171               │
│ Primary-400   #FBAE3C (따뜻한 주황) │ ← PRIMARY (버튼, 링크)
│ Primary-500   #F59E0B               │
│ Primary-600   #D97706               │
│ Primary-700   #B45309               │
│ Primary-800   #92400E               │
│ Primary-900   #78350F (최심함)      │
└─────────────────────────────────────┘

사용처:
- 주요 CTA 버튼 (Primary-400)
- 버튼 호버 (Primary-500)
- 버튼 프레스 (Primary-600)
- 링크 텍스트 (Primary-500)
- 포커스 아웃라인 (Primary-400)
```

### 2.2 세컨더리 색상 (Secondary - 초록)

```
성공, 완료, 긍정적 상태

라이트 모드:
┌─────────────────────────────────────┐
│ Success-50    #F0FDF4 (최연한)      │
│ Success-100   #DCFCE7               │
│ Success-200   #BBF7D0               │
│ Success-300   #86EFAC               │
│ Success-400   #4ADE80 (생생한 초록) │ ← 완료 상태
│ Success-500   #22C55E               │
│ Success-600   #16A34A               │
│ Success-700   #15803D               │
│ Success-800   #166534               │
│ Success-900   #145231 (최심함)      │
└─────────────────────────────────────┘

사용처:
- 완료된 태스크 (Success-400)
- 체크마크 (Success-500)
- 성공 메시지 배경 (Success-50)
- 진행률 바 (Success-500)
```

### 2.3 경고/긴급 색상 (Warning/Danger)

```
경고, 미루기, 긴급 상황

경고 (Warning):
┌─────────────────────────────────────┐
│ Warning-50    #FFFBEB               │
│ Warning-100   #FEF3C7               │
│ Warning-200   #FCD34D               │
│ Warning-400   #FBBF24 (노랑)        │ ← 진행 중
│ Warning-500   #F59E0B               │
│ Warning-600   #D97706               │
│ Warning-700   #B45309               │
└─────────────────────────────────────┘

긴급 (Danger):
┌─────────────────────────────────────┐
│ Error-50      #FEF2F2               │
│ Error-100     #FEE2E2               │
│ Error-200     #FECACA               │
│ Error-400     #F87171 (빨강)        │ ← 미루기, 긴급
│ Error-500     #EF4444               │
│ Error-600     #DC2626               │
│ Error-700     #B91C1C               │
└─────────────────────────────────────┘

사용처:
- 진행 중 상태 (Warning-400)
- 타임박스 초과 경고 (Warning-500)
- 미루기 넛지 (Error-400)
- 데드라인 임박 (Error-500)
- 에러 메시지 (Error-600)
```

### 2.4 뉴트럴 색상 (Neutral)

```
배경, 텍스트, 경계선

라이트 모드:
┌─────────────────────────────────────┐
│ Neutral-0     #FFFFFF (최밝음)      │ ← 배경
│ Neutral-50    #FAFAFA               │ ← 서브 배경
│ Neutral-100   #F4F4F5               │ ← 카드 배경
│ Neutral-200   #E4E4E7               │ ← 경계선
│ Neutral-300   #D4D4D8               │
│ Neutral-400   #A1A1A6               │ ← 보조 텍스트
│ Neutral-500   #71717A               │
│ Neutral-600   #52525B               │
│ Neutral-700   #3F3F46               │ ← 본문 텍스트
│ Neutral-800   #27272A               │ ← 헤더, 강조
│ Neutral-900   #18181B               │ ← 최어두움
│ Neutral-950   #09090B               │
└─────────────────────────────────────┘

사용처:
- 페이지 배경 (Neutral-0)
- 카드/컨테이너 배경 (Neutral-100)
- 경계선 (Neutral-200)
- 비활성 텍스트 (Neutral-400)
- 본문 텍스트 (Neutral-700)
- 제목 텍스트 (Neutral-900)
```

### 2.5 다크 모드 (선택사항, Phase 3+)

```
다크 모드에서는 색상을 역전:
- 배경: Neutral-900
- 텍스트: Neutral-100
- 강조: 더 밝은 Primary 색상
```

### 2.6 카테고리별 색상

```
Task의 category 필드별 시각적 구분

┌─────────────────────────────────────┐
│ 품질검사  → #FF6B6B (빨강)          │
│ 보고서   → #4ECDC4 (민트)          │
│ 회의     → #45B7D1 (파랑)          │
│ 이메일   → #FFA07A (연한 오렌지)   │
│ 기타     → #95A5A6 (회색)          │
└─────────────────────────────────────┘

칸반 보드에서 카드 상단 테두리로 사용
```

---

## 3. 타이포그래피

### 3.1 폰트 시스템

```
시스템 폰트 스택 (한글 최적화):

제목 (Headings):
font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans KR', sans-serif;
font-weight: 700;

본문 (Body):
font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans KR', sans-serif;
font-weight: 400;

코드 (Code):
font-family: 'Monaco', 'Courier New', monospace;
font-weight: 400;
```

### 3.2 타입 스케일

```
rem 기준 (1rem = 16px)

┌────────────────────────────────────┐
│ H1 (Display)                       │
│ size: 2.5rem (40px)                │
│ weight: 700                        │
│ line-height: 1.2 (48px)            │
│ letter-spacing: -0.02em            │
│ 사용: 앱 제목, 페이지 헤더        │
├────────────────────────────────────┤
│ H2 (Section)                       │
│ size: 2rem (32px)                  │
│ weight: 700                        │
│ line-height: 1.3 (42px)            │
│ 사용: 섹션 제목                    │
├────────────────────────────────────┤
│ H3 (Subsection)                    │
│ size: 1.5rem (24px)                │
│ weight: 600                        │
│ line-height: 1.4 (34px)            │
│ 사용: 서브섹션, 모달 제목          │
├────────────────────────────────────┤
│ H4 (Component)                     │
│ size: 1.25rem (20px)               │
│ weight: 600                        │
│ line-height: 1.5 (30px)            │
│ 사용: 태스크 제목, 카드 제목       │
├────────────────────────────────────┤
│ Body (Large)                       │
│ size: 1.125rem (18px)              │
│ weight: 400                        │
│ line-height: 1.6 (29px)            │
│ 사용: 큰 텍스트, 설명              │
├────────────────────────────────────┤
│ Body (Base)                        │
│ size: 1rem (16px)   ← 기본         │
│ weight: 400                        │
│ line-height: 1.6 (25px)            │
│ 사용: 일반 본문 텍스트             │
├────────────────────────────────────┤
│ Body (Small)                       │
│ size: 0.875rem (14px)              │
│ weight: 400                        │
│ line-height: 1.5 (21px)            │
│ 사용: 라벨, 캡션, 보조 텍스트     │
├────────────────────────────────────┤
│ Label (Tiny)                       │
│ size: 0.75rem (12px)               │
│ weight: 500                        │
│ line-height: 1.4 (17px)            │
│ 사용: 배지, 아이콘 라벨            │
└────────────────────────────────────┘
```

### 3.3 Tailwind 클래스 매핑

```jsx
// Tailwind CSS 기본 설정 (tailwind.config.js)
module.exports = {
  theme: {
    extend: {
      fontSize: {
        xs: ['0.75rem', { lineHeight: '1.4' }],
        sm: ['0.875rem', { lineHeight: '1.5' }],
        base: ['1rem', { lineHeight: '1.6' }],
        lg: ['1.125rem', { lineHeight: '1.6' }],
        xl: ['1.25rem', { lineHeight: '1.5' }],
        '2xl': ['1.5rem', { lineHeight: '1.4' }],
        '3xl': ['2rem', { lineHeight: '1.3' }],
        '4xl': ['2.5rem', { lineHeight: '1.2' }],
      },
      fontWeight: {
        400: '400',
        500: '500',
        600: '600',
        700: '700',
      },
    },
  },
};

// 사용 예
<h1 className="text-4xl font-bold">
  {/* 2.5rem, 700 weight */}
</h1>

<p className="text-base font-normal">
  {/* 1rem, 400 weight */}
</p>
```

---

## 4. 스페이싱 시스템

### 4.1 스페이싱 스케일

```
4px 기준 (1 unit = 4px)

┌──────────────────────────────────┐
│ 0   → 0px    (제거)              │
│ 1   → 4px    (가장 좁음)         │
│ 2   → 8px                        │
│ 3   → 12px                       │
│ 4   → 16px   ← 기본 간격        │
│ 5   → 20px                       │
│ 6   → 24px                       │
│ 7   → 28px                       │
│ 8   → 32px                       │
│ 10  → 40px                       │
│ 12  → 48px   (가장 넓음)         │
└──────────────────────────────────┘

사용처:
- 패딩: p-4 (16px)
- 마진: m-2 (8px)
- 갭: gap-4 (16px)
- 마진-톱: mt-6 (24px)
```

### 4.2 컴포넌트별 스페이싱

```jsx
// 태스크 카드
<div className="p-4 gap-2">
  {/* 외부 패딩 4, 내부 요소 간격 2 */}
</div>

// 모달
<div className="p-6">
  {/* 모달은 더 큰 패딩 */}
</div>

// 리스트
<div className="space-y-3">
  {/* 항목 간 수직 간격 3 (12px) */}
</div>
```

---

## 5. 핵심 컴포넌트

### 5.1 Button (버튼)

```jsx
// Primary Button (주요 CTA)
<button className="px-4 py-2 bg-primary-400 text-white rounded-lg
  font-medium hover:bg-primary-500 active:bg-primary-600
  transition-colors duration-200">
  저장
</button>

// Secondary Button (보조 액션)
<button className="px-4 py-2 border border-neutral-200 text-neutral-700
  rounded-lg hover:bg-neutral-50 transition-colors">
  취소
</button>

// Small Button (아이콘)
<button className="p-2 rounded-md hover:bg-neutral-100">
  <Icon size={20} />
</button>

// Disabled State
<button className="px-4 py-2 bg-neutral-200 text-neutral-400
  cursor-not-allowed">
  비활성
</button>
```

**상태별 스타일**:
```
기본: bg-primary-400, text-white
호버: bg-primary-500 (밝아짐)
포커스: ring-2 ring-primary-300 (포커스 표시)
프레스: bg-primary-600 (어두워짐)
비활성: opacity-50, cursor-not-allowed
```

### 5.2 Task Card (태스크 카드)

```jsx
<div className="bg-white border-l-4 border-category-color rounded-lg
  p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
  {/* 좌측 카테고리 색상 테두리 */}

  {/* 헤더 */}
  <div className="flex justify-between items-start mb-2">
    <h4 className="text-xl font-semibold text-neutral-900">
      품질 리포트 작성
    </h4>
    <span className="text-xs font-medium px-2 py-1
      bg-primary-100 text-primary-700 rounded">
      중요도 4
    </span>
  </div>

  {/* 설명 */}
  <p className="text-sm text-neutral-600 mb-3 line-clamp-2">
    월간 품질 현황 보고서 작성
  </p>

  {/* 메타 정보 */}
  <div className="flex items-center gap-4 mb-3 text-xs text-neutral-500">
    <span>⏱️ 120분</span>
    <span>📅 2026-03-20</span>
  </div>

  {/* 진행률 바 */}
  <ProgressBar value={50} />

  {/* 액션 버튼 */}
  <div className="flex gap-2 mt-3">
    <button className="flex-1 py-1 text-sm font-medium
      bg-primary-400 text-white rounded hover:bg-primary-500">
      시작
    </button>
    <button className="flex-1 py-1 text-sm border border-neutral-200
      text-neutral-700 rounded hover:bg-neutral-50">
      미루기
    </button>
  </div>
</div>
```

**카드 상태**:
```
pending: bg-white, opacity-100
in_progress: bg-warning-50 (연한 노랑), 배경 하이라이트
completed: bg-success-50 (연한 초록), opacity-70
deferred: bg-error-50 (연한 빨강), 우측에 ⏸️ 배지
```

### 5.3 Progress Bar (진행률 바)

```jsx
<div className="w-full h-2 bg-neutral-200 rounded-full overflow-hidden">
  <div className="h-full bg-success-500 rounded-full transition-all
    duration-300 ease-out"
    style={{ width: `${progress}%` }}>
  </div>
</div>

// 라벨 포함
<div className="flex items-center gap-2">
  <div className="flex-1 h-2 bg-neutral-200 rounded-full overflow-hidden">
    <div className="h-full bg-success-500" style={{ width: `${progress}%` }} />
  </div>
  <span className="text-sm font-medium text-neutral-700 w-12">
    {progress}%
  </span>
</div>
```

### 5.4 Kanban Column (칸반 컬럼)

```jsx
<div className="flex flex-col h-full bg-neutral-50 rounded-lg p-4 w-48">
  {/* 헤더 */}
  <div className="mb-4">
    <h3 className="text-sm font-semibold text-neutral-900 mb-1">
      08:00~08:30
    </h3>
    <p className="text-xs text-neutral-500">
      30분 슬롯
    </p>
  </div>

  {/* 드래그앤드롭 영역 */}
  <div className="flex-1 space-y-3 overflow-y-auto"
    onDragOver={handleDragOver}
    onDrop={handleDrop}>

    {tasks.map(task => (
      <TaskCard key={task.id} task={task} draggable />
    ))}

    {/* 빈 상태 */}
    {tasks.length === 0 && (
      <div className="h-24 border-2 border-dashed border-neutral-300
        rounded-lg flex items-center justify-center">
        <p className="text-xs text-neutral-400">
          여기에 드롭하세요
        </p>
      </div>
    )}
  </div>
</div>
```

### 5.5 Tree Node (태스크 트리 노드)

```jsx
<div className="flex items-start gap-3 py-2 px-3 hover:bg-neutral-50
  rounded-lg transition-colors group">

  {/* 확장 버튼 */}
  <button className="flex-shrink-0 w-6 h-6 flex items-center justify-center
    text-neutral-400 hover:text-neutral-600">
    {hasChildren ? '▼' : '·'}
  </button>

  {/* 체크박스 */}
  <input type="checkbox" className="mt-1 w-4 h-4 rounded
    accent-success-500 cursor-pointer" />

  {/* 콘텐츠 */}
  <div className="flex-1 min-w-0">
    <p className={`text-sm font-medium ${
      status === 'completed' ? 'line-through text-neutral-400' : 'text-neutral-900'
    }`}>
      {title}
    </p>
    <p className="text-xs text-neutral-500 mt-1">
      {estimatedMinutes}분 | {importance}/5
    </p>
  </div>

  {/* 진행률 (부모만) */}
  {!isLeaf && (
    <div className="flex-shrink-0 w-12">
      <div className="h-1.5 bg-neutral-200 rounded-full overflow-hidden">
        <div className="h-full bg-success-500"
          style={{ width: `${progress}%` }} />
      </div>
    </div>
  )}

  {/* 액션 메뉴 */}
  <button className="flex-shrink-0 opacity-0 group-hover:opacity-100
    transition-opacity p-1 hover:bg-neutral-200 rounded">
    ⋮
  </button>
</div>

{/* 자식 노드 (expanded 상태일 때) */}
{isExpanded && children && (
  <div className="pl-6 border-l border-neutral-200">
    {children.map(child => (
      <TreeNode key={child.id} node={child} />
    ))}
  </div>
)}
```

### 5.6 AI Message Bubble (AI 메시지)

```jsx
<div className="flex gap-3 mb-4">
  {/* AI 아바타 */}
  <div className="flex-shrink-0 w-8 h-8 rounded-full
    bg-primary-400 flex items-center justify-center text-white">
    🤖
  </div>

  {/* 메시지 */}
  <div className="flex-1 max-w-xs">
    <div className="bg-primary-50 border border-primary-200 rounded-lg
      p-3 text-sm text-neutral-900">
      좋은 아침입니다, 준호님! 오늘도 화이팅! 💪
    </div>
    <p className="text-xs text-neutral-500 mt-1">
      08:00
    </p>
  </div>
</div>

{/* 사용자 메시지 */}
<div className="flex gap-3 mb-4 justify-end">
  <div className="flex-1 max-w-xs">
    <div className="bg-primary-400 text-white rounded-lg p-3 text-sm">
      오늘 너무 피곤해
    </div>
    <p className="text-xs text-neutral-500 mt-1 text-right">
      08:05
    </p>
  </div>
  <div className="flex-shrink-0 w-8 h-8 rounded-full
    bg-neutral-300 flex items-center justify-center">
    👤
  </div>
</div>
```

---

## 6. 애니메이션 & 트랜지션

### 6.1 기본 애니메이션

```css
/* 페이드인/아웃 */
.fade-in {
  animation: fadeIn 0.3s ease-in-out;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

/* 슬라이드인 (우측) */
.slide-in-right {
  animation: slideInRight 0.3s ease-out;
}

@keyframes slideInRight {
  from { transform: translateX(100%); opacity: 0; }
  to { transform: translateX(0); opacity: 1; }
}

/* 스케일 (팝업 효과) */
.scale-in {
  animation: scaleIn 0.2s ease-out;
}

@keyframes scaleIn {
  from { transform: scale(0.95); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}
```

### 6.2 Tailwind 애니메이션

```jsx
// 호버 트랜지션
<button className="transition-colors duration-200
  hover:bg-primary-500">
  {/* 200ms 지속 */}
</button>

// 진행률 바 애니메이션
<div className="transition-all duration-300 ease-out"
  style={{ width: `${progress}%` }}>
  {/* 300ms, easing 함수 적용 */}
</div>

// 모달 슬라이드인
<div className="fixed inset-0 bg-black/50 z-50
  animate-in fade-in duration-200">
  <div className="slide-in-right">
    {/* 우측에서 슬라이드 */}
  </div>
</div>
```

### 6.3 로딩 상태

```jsx
// 스핀 로더
<div className="w-8 h-8 border-4 border-neutral-200 border-t-primary-400
  rounded-full animate-spin"></div>

// 펄스 (점멸)
<div className="w-2 h-2 bg-primary-400 rounded-full
  animate-pulse"></div>

// 스켈레톤 로더
<div className="w-full h-4 bg-neutral-200 rounded
  animate-pulse"></div>
```

---

## 7. 다크 모드 지원 (선택사항)

### 7.1 다크 모드 색상 오버라이드

```css
/* Tailwind dark mode */
@media (prefers-color-scheme: dark) {
  .bg-white {
    @apply bg-neutral-900;
  }

  .text-neutral-900 {
    @apply text-neutral-100;
  }

  .bg-neutral-50 {
    @apply bg-neutral-800;
  }
}

/* Tailwind 클래스 직접 사용 */
<div className="bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100">
  {/* 라이트/다크 모드 자동 전환 */}
</div>
```

---

## 8. 반응형 디자인

### 8.1 브레이크포인트

```
Tailwind 기본 브레이크포인트:
sm: 640px   (태블릿)
md: 768px
lg: 1024px  (데스크톱)
xl: 1280px
2xl: 1536px
```

### 8.2 반응형 컴포넌트

```jsx
// 모바일 우선
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {/* 모바일: 1열, 768px+: 2열, 1024px+: 3열 */}
</div>

// 숨김/표시
<div className="hidden lg:block">
  {/* 1024px 미만에서는 숨김 */}
</div>

<div className="block lg:hidden">
  {/* 1024px 이상에서는 숨김 */}
</div>
```

---

## 9. 접근성 (a11y)

### 9.1 색상 대비

```
WCAG AA 기준:
- 일반 텍스트: 4.5:1 이상
- 큰 텍스트 (18pt+): 3:1 이상

예시:
- 텍스트: Neutral-900 (#18181B)
- 배경: White (#FFFFFF)
- 대비: 19.36:1 ✓ 충분함
```

### 9.2 포커스 표시

```jsx
<button className="focus:ring-2 focus:ring-offset-2 focus:ring-primary-400
  focus:outline-none">
  {/* Tab 키로 포커스 시 표시 */}
</button>
```

### 9.3 ARIA 레이블

```jsx
<button aria-label="새 태스크 추가" className="p-2">
  <PlusIcon />
</button>

<div role="status" aria-live="polite" aria-atomic="true">
  {/* 상태 메시지 */}
</div>
```

---

## 10. 컴포넌트 라이브러리 가이드

### 10.1 shadcn/ui 활용

TodoAssist는 shadcn/ui를 기반으로 커스텀 컴포넌트를 구성합니다.

```bash
# 기본 컴포넌트 설치
npx shadcn-ui@latest add button
npx shadcn-ui@latest add card
npx shadcn-ui@latest add input
npx shadcn-ui@latest add dialog
npx shadcn-ui@latest add slider
npx shadcn-ui@latest add tabs
npx shadcn-ui@latest add dropdown-menu
```

### 10.2 커스텀 컴포넌트 구조

```
components/
├── ui/                    (shadcn/ui 기본)
│   ├── button.tsx
│   ├── card.tsx
│   └── ...
├── TaskCard.tsx           (커스텀)
├── TimeSlot.tsx
├── ProgressBar.tsx
├── AiMessage.tsx
├── KanbanColumn.tsx
├── TreeNode.tsx
└── index.ts               (통합 export)
```

---

**문서 생성일**: 2026-03-17
**버전**: 1.0
