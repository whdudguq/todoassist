import { useState } from 'react';
import { cn } from '@renderer/lib/cn';
import { ChevronDown } from 'lucide-react';

interface Section {
  title: string;
  content: string[];
}

const GUIDE_SECTIONS: Section[] = [
  {
    title: '전체 흐름',
    content: [
      'TodoAssist는 "등록 → 배정 → 집중 → 완료" 4단계로 하루를 관리합니다.',
      '1. 태스크 트리에서 할 일을 등록합니다.',
      '2. 캘린더에서 태스크를 원하는 날짜에 배정합니다.',
      '3. 포커스데이에서 배정된 태스크를 시간표에 배치하고 집중합니다.',
      '4. 완료되면 통계에서 성과를 확인합니다.',
    ],
  },
  {
    title: '태스크 트리 (등록)',
    content: [
      '왼쪽 사이드바 "태스크 트리"에서 모든 할 일을 관리합니다.',
      '상단 "+" 버튼으로 새 태스크를 추가합니다.',
      '태스크를 클릭하면 제목, 설명, 예상 시간, 중요도, 마감일을 설정할 수 있습니다.',
      '태스크 아래에 하위 태스크를 만들어 큰 일을 작게 쪼갤 수 있습니다.',
      '캘린더에는 하위(리프) 태스크만 배정할 수 있으므로, 큰 태스크는 반드시 하위 태스크로 나눠주세요.',
    ],
  },
  {
    title: '캘린더 (날짜 배정)',
    content: [
      '"캘린더" 화면에서 월간 일정을 한눈에 봅니다.',
      '오른쪽 미배정 목록에서 태스크를 날짜 칸으로 드래그하면 해당 날짜에 배정됩니다.',
      '이미 배정된 태스크를 다른 날짜로 드래그하면 날짜가 변경됩니다.',
      '배정된 태스크는 포커스데이의 "미배치" 영역에 자동으로 나타납니다.',
    ],
  },
  {
    title: '포커스데이 (집중)',
    content: [
      '"포커스데이"는 3개 컬럼으로 구성됩니다: 시간표 | 집중 | 통계',
      '',
      '[시간표 (왼쪽)]',
      '오전 7시부터 오후 9시까지의 타임라인이 표시됩니다.',
      '미배치 태스크를 선택 → 시간표에서 원하는 시간을 클릭하면 배치됩니다.',
      '"AI 스케줄 제안" 버튼으로 자동 배치를 받을 수도 있습니다.',
      '',
      '[집중 (가운데)]',
      '"2분만 시작" 버튼을 누르면 타이머가 시작됩니다. 부담 없이 2분만 해보세요!',
      '진행 중에는 "잠깐 쉴게요"로 일시정지하거나, "다 했어요!"로 완료할 수 있습니다.',
      '"다른 일이 더 급해요"를 선택하면 현재 태스크가 대기 상태로 전환됩니다.',
      '',
      '[통계 (오른쪽)]',
      '오늘 달성률, 누적 완료 수, 오늘의 마음(감사), 하루 돌아보기를 확인합니다.',
    ],
  },
  {
    title: '미루기 탐지',
    content: [
      '"지금 안 할래요"로 미룬 태스크는 미루기 탐지에 표시됩니다.',
      '며칠째 미루고 있는지 알려주며, "시작" 버튼으로 바로 시작할 수 있습니다.',
      '미루는 건 자연스러운 거예요. 부담 갖지 말고, 작게 시작해보세요.',
    ],
  },
  {
    title: '날짜 이동',
    content: [
      '포커스데이 상단의 좌우 화살표(< >)로 다른 날짜의 시간표를 볼 수 있습니다.',
      '해당 날짜에 배정된 태스크만 미배치 영역에 나타납니다.',
      '과거 날짜를 보면 그날 했던 기록을 확인할 수 있습니다.',
    ],
  },
  {
    title: '카테고리 & 설정',
    content: [
      '설정 > 카테고리 탭에서 업무 분류를 만들고 색상을 지정합니다.',
      '각 태스크에 카테고리를 지정하면 시간표와 통계에서 색상으로 구분됩니다.',
      '설정 > 기본 탭에서 이름, 업무 시간, API 키 등을 설정합니다.',
      '변경 후 반드시 하단 "저장" 버튼을 눌러주세요.',
    ],
  },
  {
    title: '키보드 단축키 & 팁',
    content: [
      '컬럼 사이 구분선을 드래그하면 각 영역의 너비를 조절할 수 있습니다.',
      '태스크의 예상 시간을 정확히 설정하면 시간표 배치가 더 정확해집니다.',
      '하루 돌아보기의 시작/중간/마무리 피드백은 시간대에 따라 활성화됩니다.',
    ],
  },
  {
    title: '집중 감시 (Focus Guard)',
    content: [
      '태스크 타이머를 시작하면 Focus Guard가 자동으로 활성화됩니다.',
      '3가지 방식으로 집중을 도와줍니다:',
      '',
      '[앱 전환 감지]',
      '집중 중에 비업무 앱(브라우저, 메신저 등)으로 전환하면 감지합니다.',
      '1분 후 부드러운 알림, 3분 후 단호한 알림으로 돌아오도록 안내합니다.',
      'VS Code, Excel, Teams 등 업무 앱은 허용 목록에 포함되어 있어 알림이 오지 않습니다.',
      '',
      '[열린 앱 감지]',
      '듀얼 모니터 환경에서 클릭하지 않아도 화면에 열려있는 비업무 앱을 감지합니다.',
      '최소화된 앱은 제외되며, 세션 종료 시 참고 정보로 제공됩니다.',
      '',
      '[자리비움 감지]',
      '마우스/키보드 입력이 3분간 없으면 부드러운 알림이 옵니다.',
      '5분간 없으면 타이머 정지를 안내하는 단호한 알림이 옵니다.',
      '생각 중일 때는 무시해도 괜찮습니다.',
      '',
      '[알아두세요]',
      '화면 잠금(Win+L) 중에는 감지가 자동으로 일시중지됩니다.',
      '태스크 완료/정지/보류 시 Focus Guard도 자동으로 종료됩니다.',
      '스마트폰 사용이나 최소화된 앱은 감지할 수 없습니다.',
    ],
  },
];

function AccordionItem({ section }: { section: Section }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border border-surface-200/60 rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={cn(
          'w-full flex items-center justify-between px-4 py-3 text-left',
          'bg-surface-0 hover:bg-surface-50 transition-colors',
        )}
      >
        <span className="text-sm font-semibold text-surface-800">{section.title}</span>
        <ChevronDown
          size={16}
          className={cn(
            'text-surface-400 transition-transform duration-200',
            open && 'rotate-180',
          )}
        />
      </button>
      {open && (
        <div className="px-4 py-3 bg-surface-50/50 border-t border-surface-200/60">
          {section.content.map((line, i) => (
            line === '' ? (
              <div key={i} className="h-2" />
            ) : line.startsWith('[') && line.endsWith(']') ? (
              <p key={i} className="text-xs font-semibold text-accent-600 mt-2 mb-1">
                {line.slice(1, -1)}
              </p>
            ) : (
              <p key={i} className="text-xs text-surface-600 leading-relaxed py-0.5">
                {line}
              </p>
            )
          ))}
        </div>
      )}
    </div>
  );
}

export function UserGuide() {
  return (
    <div className="flex flex-col gap-3 max-w-2xl">
      <div className="mb-2">
        <h2 className="text-base font-semibold text-surface-800">사용 설명서</h2>
        <p className="text-xs text-surface-400 mt-1">
          TodoAssist의 주요 기능과 사용법을 안내합니다. 항목을 클릭하면 내용이 펼쳐집니다.
        </p>
      </div>
      {GUIDE_SECTIONS.map((section) => (
        <AccordionItem key={section.title} section={section} />
      ))}
    </div>
  );
}
