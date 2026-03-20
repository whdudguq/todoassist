/**
 * Focus Guard — OS 수준 집중 감시 서비스
 *
 * mortem 반영 사항:
 * - @paymoapp/active-window subscribe + unsubscribe (메모리 누수 방지)
 * - 아이콘 캐시 OFF (메모리 절약)
 * - powerMonitor lock-screen 시 감시 일시중지
 * - null guard로 native addon 크래시 방지
 * - getSystemIdleTime() 초기 검증 (항상 0 버그 감지)
 * - 허용 앱 whitelist (false positive 방지)
 * - 토글 on/off (설정)
 */
import { BrowserWindow, Notification, powerMonitor } from 'electron';
import { execFile } from 'child_process';

// ── Active Window (native addon — try-catch로 감싸서 크래시 방지) ──
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let activeWindow: { subscribe: (cb: (win: any) => void, opts?: any) => number; unsubscribe: (id: number) => void } | null = null;
try {
  // default export는 인스턴스 (ActiveWindowClass)
  const mod = require('@paymoapp/active-window');
  activeWindow = mod.default ?? mod.ActiveWindow ?? mod;
} catch {
  // WSL2 dev 환경 등에서 native 모듈 로드 실패 시 graceful degradation
}

// ── 상수 ──
const IDLE_SOFT_SEC = 180;   // 입력 정지 3분 → 부드러운 알림
const IDLE_HARD_SEC = 300;   // 입력 정지 5분 → 단호한 알림
const DISTRACT_SOFT_SEC = 60;  // 비허용 앱 1분 → 부드러운 알림
const DISTRACT_HARD_SEC = 180; // 비허용 앱 3분 → 단호한 알림
const IDLE_CHECK_MS = 10_000;  // idle 체크 10초 간격

// ── 기본 허용 앱 (false positive 방지) ──
const DEFAULT_WHITELIST: string[] = [
  'todoassist',
  'electron',
  'code',           // VS Code
  'devenv',         // Visual Studio
  'explorer',       // 파일 탐색기
  'calc',           // 계산기
  'calculator',     // Windows 11 계산기
  'notepad',        // 메모장
  'excel',          // Excel
  'winword',        // Word
  'powerpnt',       // PowerPoint
  'outlook',        // Outlook
  'teams',          // Teams
  'slack',          // Slack
];

// ── 앱 이름 정규화 매핑 (mortem: Layer 1 vs Layer 2 이름 불일치 방지) ──
// @paymoapp/active-window가 반환하는 이름과 Get-Process의 ProcessName이 다를 수 있음
const APP_NAME_MAP: Record<string, string> = {
  'google chrome': 'chrome',
  'microsoft edge': 'msedge',
  'firefox': 'firefox',
  'visual studio code': 'code',
  'windows explorer': 'explorer',
  'microsoft teams': 'teams',
  'microsoft outlook': 'outlook',
  'microsoft excel': 'excel',
  'microsoft word': 'winword',
  'microsoft powerpoint': 'powerpnt',
  'kakaoTalk': 'kakaotalk',
};

/** 앱 이름 정규화: 대소문자, .exe, 표시명→프로세스명 매핑 */
function normalizeAppName(raw: string): string {
  const lower = raw.toLowerCase().replace(/\.exe$/, '').trim();
  return APP_NAME_MAP[lower] ?? lower;
}

interface DistractionRecord {
  app: string;
  title: string;
  startedAt: number;
  durationMs: number;
}

/** 백그라운드에서 열려있는 비허용 앱 (듀얼 모니터 등) */
interface VisibleAppRecord {
  app: string;
  title: string;
  detectedCount: number;  // 몇 회 감지되었는지 (30초 간격)
}

interface FocusSession {
  taskTitle: string;
  startedAt: number;
  // idle 감지
  idleSoftSent: boolean;
  idleHardSent: boolean;
  idleSupported: boolean;       // getSystemIdleTime 버그 여부
  idleEverNonZero: boolean;     // 한 번이라도 0이 아닌 값이 나왔는지
  // 활성 윈도우 감지
  activeWinWatchId: number | null;
  currentDistractionStart: number | null;
  currentDistractionApp: string | null;
  distractSoftSent: boolean;
  distractHardSent: boolean;
  // 통계
  totalFocusMs: number;
  totalDistractionMs: number;
  totalIdleMs: number;
  lastIdleAccumulatedSec: number;  // 마지막으로 idle 누적한 시점의 idleSec 값
  distractions: DistractionRecord[];
  lastFocusAt: number;
  // 백그라운드 열린 앱 감지 (듀얼 모니터)
  visibleApps: Map<string, VisibleAppRecord>;
  // lock 상태
  locked: boolean;
}

export interface FocusGuardStats {
  focusMs: number;
  distractionMs: number;
  idleMs: number;
  distractions: DistractionRecord[];
  visibleApps: VisibleAppRecord[];  // 백그라운드에서 열려있던 비허용 앱 목록
}

export class FocusGuardService {
  private session: FocusSession | null = null;
  private idleTimer: ReturnType<typeof setInterval> | null = null;
  private visibleAppsTimer: ReturnType<typeof setInterval> | null = null;
  private whitelist: Set<string> = new Set(DEFAULT_WHITELIST);
  private lockHandler: (() => void) | null = null;
  private unlockHandler: (() => void) | null = null;

  /** 허용 앱 목록 설정 (설정에서 로드) */
  setWhitelist(apps: string[]): void {
    this.whitelist = new Set([...DEFAULT_WHITELIST, ...apps.map(a => a.toLowerCase())]);
  }

  /** 집중 감시 시작 */
  start(taskTitle: string, _win: BrowserWindow): void {
    this.stop(); // 기존 세션 정리

    const now = Date.now();

    // getSystemIdleTime 버그 검증: 3회 호출하여 모두 0이면 비활성화
    let idleSupported = true;
    try {
      const samples = [0, 1, 2].map(() => powerMonitor.getSystemIdleTime());
      if (samples.every(s => s === 0)) {
        // 앱 시작 직후라 0일 수 있으므로 warning만 (이후 poll에서 재검증)
        idleSupported = true; // 일단 true, poll에서 10연속 0이면 false로 전환
      }
    } catch {
      idleSupported = false;
    }

    this.session = {
      taskTitle,
      startedAt: now,
      idleSoftSent: false,
      idleHardSent: false,
      idleSupported,
      idleEverNonZero: false,
      activeWinWatchId: null,
      currentDistractionStart: null,
      currentDistractionApp: null,
      distractSoftSent: false,
      distractHardSent: false,
      totalFocusMs: 0,
      totalDistractionMs: 0,
      totalIdleMs: 0,
      lastIdleAccumulatedSec: 0,
      distractions: [],
      lastFocusAt: now,
      visibleApps: new Map(),
      locked: false,
    };

    // ── Active Window subscribe (이벤트 기반, 폴링 아님) ──
    this.startActiveWindowWatch();

    // ── Idle 감지 폴링 ──
    this.idleTimer = setInterval(() => this.pollIdle(), IDLE_CHECK_MS);

    // ── 열린 앱 감지 (듀얼 모니터 대응, 30초 간격) ──
    this.visibleAppsTimer = setInterval(() => this.scanVisibleApps(), 30_000);

    // ── 화면 잠금 처리 (mortem: lock-screen 시 감시 일시중지) ──
    this.lockHandler = () => this.onLockScreen();
    this.unlockHandler = () => this.onUnlockScreen();
    powerMonitor.on('lock-screen', this.lockHandler);
    powerMonitor.on('unlock-screen', this.unlockHandler);
  }

  /** 집중 감시 종료 — 세션 통계 반환 */
  stop(): FocusGuardStats | null {
    if (!this.session) return null;

    // Active window unsubscribe (mortem: 메모리 누수 방지)
    this.stopActiveWindowWatch();

    // Timer 정리
    if (this.idleTimer) {
      clearInterval(this.idleTimer);
      this.idleTimer = null;
    }
    if (this.visibleAppsTimer) {
      clearInterval(this.visibleAppsTimer);
      this.visibleAppsTimer = null;
    }

    // Lock 이벤트 해제
    if (this.lockHandler) powerMonitor.removeListener('lock-screen', this.lockHandler);
    if (this.unlockHandler) powerMonitor.removeListener('unlock-screen', this.unlockHandler);
    this.lockHandler = null;
    this.unlockHandler = null;

    // 마지막 시간 정산
    const now = Date.now();
    if (this.session.currentDistractionStart) {
      const dur = now - this.session.currentDistractionStart;
      this.session.totalDistractionMs += dur;
      if (this.session.currentDistractionApp) {
        this.session.distractions.push({
          app: this.session.currentDistractionApp,
          title: '',
          startedAt: this.session.currentDistractionStart,
          durationMs: dur,
        });
      }
    } else {
      this.session.totalFocusMs += now - this.session.lastFocusAt;
    }

    const stats: FocusGuardStats = {
      focusMs: this.session.totalFocusMs,
      distractionMs: this.session.totalDistractionMs,
      idleMs: this.session.totalIdleMs,
      distractions: this.session.distractions,
      visibleApps: Array.from(this.session.visibleApps.values()),
    };

    this.session = null;
    return stats;
  }

  isActive(): boolean {
    return this.session !== null;
  }

  // ── Active Window Watch ──

  private startActiveWindowWatch(): void {
    if (!this.session || !activeWindow) return;

    try {
      const watchId = activeWindow.subscribe(
        (win: { application?: string; title?: string } | null) => {
          try {
            this.onActiveWindowChange(win);
          } catch {
            // native addon 콜백 내 에러 → main process 크래시 방지
          }
        },
      );
      this.session.activeWinWatchId = watchId;
    } catch {
      // native addon 초기화 실패 → graceful degradation
    }
  }

  private stopActiveWindowWatch(): void {
    if (!this.session || !activeWindow || this.session.activeWinWatchId === null) return;
    try {
      activeWindow.unsubscribe(this.session.activeWinWatchId);
    } catch {
      // ignore
    }
    this.session.activeWinWatchId = null;
  }

  private onActiveWindowChange(win: { application?: string; title?: string } | null): void {
    if (!this.session || this.session.locked) return;

    const now = Date.now();
    const rawApp = win?.application ?? '';
    const appName = normalizeAppName(rawApp);

    // 허용 앱이면 집중으로 간주
    const isAllowed = !appName || this.whitelist.has(appName);

    if (isAllowed) {
      // 산만함 → 집중 복귀
      if (this.session.currentDistractionStart) {
        const dur = now - this.session.currentDistractionStart;
        this.session.totalDistractionMs += dur;
        this.session.distractions.push({
          app: this.session.currentDistractionApp ?? appName,
          title: win?.title ?? '',
          startedAt: this.session.currentDistractionStart,
          durationMs: dur,
        });
        this.session.currentDistractionStart = null;
        this.session.currentDistractionApp = null;
        this.session.distractSoftSent = false;
        this.session.distractHardSent = false;
      }
      this.session.lastFocusAt = now;
    } else {
      // 비허용 앱으로 전환
      if (!this.session.currentDistractionStart) {
        // 집중 시간 정산
        this.session.totalFocusMs += now - this.session.lastFocusAt;
        this.session.currentDistractionStart = now;
        this.session.currentDistractionApp = appName;
        this.session.distractSoftSent = false;
        this.session.distractHardSent = false;
      }
    }
  }

  // ── Idle 감지 ──

  private pollIdle(): void {
    if (!this.session || this.session.locked) return;

    // ── Idle 체크 ──
    if (this.session.idleSupported) {
      const idleSec = powerMonitor.getSystemIdleTime();

      // mortem fix: idle=0은 활발한 입력 중에도 정상.
      // 버그 판별: 세션 시작 후 60초(6회 poll) 경과했는데 한 번도 0 이상이 안 나온 경우만.
      // (활발히 입력해도 10초 간격 poll 사이에 1-2초 idle은 나옴)
      if (idleSec === 0) {
        const elapsed = (Date.now() - this.session.startedAt) / 1000;
        if (elapsed > 60 && !this.session.idleEverNonZero) {
          this.session.idleSupported = false;
        }
      } else {
        this.session.idleEverNonZero = true;
      }

      // ── idle 시간 누적 (mortem P3 fix: 300초 초과분 유실 방지) ──
      // IDLE_SOFT_SEC 이상이면 매 poll마다 증가분만큼 누적
      if (idleSec >= IDLE_SOFT_SEC) {
        const delta = idleSec - this.session.lastIdleAccumulatedSec;
        if (delta > 0) {
          this.session.totalIdleMs += delta * 1000;
          this.session.lastIdleAccumulatedSec = idleSec;
        }
      }

      // ── 알림 ──
      if (idleSec >= IDLE_HARD_SEC && !this.session.idleHardSent) {
        this.notify(
          '아직 거기 계신가요?',
          `${Math.floor(idleSec / 60)}분째 입력이 없어요. 잠시 쉬는 거라면 타이머를 정지해주세요.`,
        );
        this.session.idleHardSent = true;
      } else if (idleSec >= IDLE_SOFT_SEC && !this.session.idleSoftSent) {
        this.notify(
          '잠깐 멈춰있네요',
          `"${this.session.taskTitle}" 진행 중이에요. 생각 중이시라면 괜찮아요!`,
        );
        this.session.idleSoftSent = true;
      }

      if (idleSec < IDLE_SOFT_SEC) {
        this.session.idleSoftSent = false;
        this.session.idleHardSent = false;
        this.session.lastIdleAccumulatedSec = 0;  // 활동 재개 → 리셋
      }
    }

    // ── 비허용 앱 체류 시간 체크 ──
    if (this.session.currentDistractionStart) {
      const distractSec = (Date.now() - this.session.currentDistractionStart) / 1000;

      if (distractSec >= DISTRACT_HARD_SEC && !this.session.distractHardSent) {
        this.notify(
          '돌아올 때가 됐어요!',
          `"${this.session.taskTitle}" 집중 중이었어요. ${Math.floor(distractSec / 60)}분째 다른 곳에 계세요.`,
        );
        this.session.distractHardSent = true;
      } else if (distractSec >= DISTRACT_SOFT_SEC && !this.session.distractSoftSent) {
        this.notify(
          '잠깐 쉬는 건가요?',
          `"${this.session.taskTitle}" 타이머가 돌아가고 있어요. 준비되면 돌아와주세요.`,
        );
        this.session.distractSoftSent = true;
      }
    }

    // ── 가상 데스크톱 감지 보조 (mortem: idle 0 + 포커스 변경 없음 = 다른 데스크톱) ──
    // active window 변경이 없는데 idle이 0이면 → 다른 가상 데스크톱에서 활동 중일 수 있음
    // 이 경우 별도 처리 없이 로그만 남김 (현재는 탐지 한계로 안내)
  }

  // ── 열린 앱 스캔 (듀얼 모니터 대응) ──

  private scanVisibleApps(): void {
    if (!this.session || this.session.locked) return;

    // PowerShell로 창 제목이 있는(= 보이는) 프로세스 목록 조회
    // Windows 전용, 다른 OS에서는 무시
    // IsIconic(최소화 여부) 필터로 실제 화면에 보이는 앱만 감지 (mortem P2 fix)
    const psCommand = [
      "Add-Type @'",
      'using System;using System.Runtime.InteropServices;',
      'public class WinCheck{[DllImport("user32.dll")]public static extern bool IsIconic(IntPtr h);}',
      "'@ -ErrorAction SilentlyContinue;",
      'Get-Process | Where-Object {$_.MainWindowTitle -and -not [WinCheck]::IsIconic($_.MainWindowHandle)}',
      "| ForEach-Object { $_.ProcessName + '|' + $_.MainWindowTitle }",
    ].join('\n');

    execFile(
      'powershell.exe',
      ['-NoProfile', '-NonInteractive', '-Command', psCommand],
      { timeout: 5000 },
      (err, stdout) => {
        if (err || !this.session) return;

        const lines = stdout.trim().split('\n').filter(Boolean);
        for (const line of lines) {
          const sep = line.indexOf('|');
          if (sep === -1) continue;
          const rawApp = line.substring(0, sep).trim();
          const title = line.substring(sep + 1).trim();
          const app = normalizeAppName(rawApp);

          // 허용 앱은 무시
          if (this.whitelist.has(app)) continue;

          // 비허용 앱이 열려있음 → 기록
          const key = app;
          const existing = this.session.visibleApps.get(key);
          if (existing) {
            existing.detectedCount++;
            existing.title = title; // 최신 제목으로 갱신
          } else {
            this.session.visibleApps.set(key, {
              app,
              title,
              detectedCount: 1,
            });
          }
        }
      },
    );
  }

  // ── 화면 잠금 처리 ──

  private onLockScreen(): void {
    if (!this.session) return;
    this.session.locked = true;
    // 잠금 중에는 감시 일시중지 (null 반환 크래시 방지)
  }

  private onUnlockScreen(): void {
    if (!this.session) return;
    this.session.locked = false;
    this.session.lastFocusAt = Date.now();
  }

  // ── 알림 ──

  private notify(title: string, body: string): void {
    if (!Notification.isSupported()) return;
    new Notification({ title, body, silent: false }).show();
  }
}
