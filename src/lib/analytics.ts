/**
 * 이벤트 추적 얇은 래퍼.
 *
 * NEXT_PUBLIC_GA_ID 가 설정돼 있으면 GA4로 보내고, 없으면 아무 일도 하지 않는다.
 * 그래서 애널리틱스를 붙이기 전에도 코드가 그대로 돌아가고,
 * 나중에 환경변수 하나만 넣으면 지금까지 심어둔 이벤트가 한꺼번에 살아난다.
 */

type Params = Record<string, string | number | boolean | undefined>;

declare global {
  interface Window {
    gtag?: (command: string, ...args: unknown[]) => void;
    dataLayer?: unknown[];
  }
}

export const GA_ID = process.env.NEXT_PUBLIC_GA_ID ?? "";

/** 우리가 쓰는 이벤트 이름 모음. 오타로 지표가 갈라지지 않게 한곳에 모아둔다. */
export const EVENTS = {
  /** 콘텐츠 카드/배너를 눌러 상세로 이동 */
  selectContent: "select_content",
  /** 상세에서 시청처 링크를 눌러 외부로 나감 — 가장 중요한 전환 지표 */
  outboundPlatform: "outbound_platform_click",
  /** 검색 실행 */
  search: "search",
  /** 추천 태그 칩 클릭 */
  searchSuggestion: "search_suggestion_click",
  /** 카테고리 탐색의 필터 조작 */
  filter: "filter_change",
  /** 헤더 내비게이션 클릭 */
  nav: "nav_click",
  /** 제보 폼 진입 / 제출 성공 / 제출 실패 */
  submitStart: "submission_start",
  submitComplete: "submission_complete",
  submitError: "submission_error",
  /** 한줄평 작성 성공 */
  commentSubmit: "comment_submit",
  /** 한줄평 더보기 */
  commentExpand: "comment_expand",
  /** 게시판 오픈 알림 신청 */
  notifySignup: "board_notify_signup",
  /** 공유 버튼으로 링크를 내보냄 */
  share: "share",
  /** 페이지를 떠날 때 머문 시간 */
  pageEngagement: "page_engagement",
  /** 스크롤 깊이 (25/50/75/100) */
  scrollDepth: "scroll_depth",
} as const;

/**
 * gtag 대기열을 만들어 둔다.
 *
 * GA 스크립트(gtag.js)는 화면이 그려진 뒤에 로드되기 때문에, 그 전에 발생한 이벤트는
 * 그냥 두면 사라진다. 구글 공식 스니펫과 같은 방식으로 dataLayer 대기열을 먼저 만들어두면
 * 스크립트가 늦게 도착해도 쌓아둔 이벤트를 순서대로 처리한다.
 * js → config → event 순서가 보장돼야 하므로 초기화도 여기서 함께 한다.
 */
export function ensureGtag(): void {
  if (typeof window === "undefined" || !GA_ID) return;
  window.dataLayer = window.dataLayer ?? [];
  if (typeof window.gtag === "function") return;

  window.gtag = function gtag() {
    // 구글 스니펫과 동일하게 arguments 객체를 그대로 넣는다.
    // eslint-disable-next-line prefer-rest-params
    window.dataLayer?.push(arguments);
  };
  window.gtag("js", new Date());
  // 화면 전환은 직접 보내므로 자동 page_view 는 끈다.
  window.gtag("config", GA_ID, { send_page_view: false });
}

export function track(name: string, params: Params = {}): void {
  if (typeof window === "undefined") return;
  ensureGtag();

  // undefined 값은 GA에서 잡음이 되므로 걸러낸다.
  const clean: Params = {};
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") clean[key] = value;
  }

  if (typeof window.gtag === "function") {
    window.gtag("event", name, clean);
    return;
  }

  // 애널리틱스가 없을 때는 개발 중에만 콘솔로 확인할 수 있게 한다.
  if (process.env.NODE_ENV === "development") {
    console.debug("[analytics]", name, clean);
  }
}

/** 외부 링크의 도메인만 뽑는다 (전체 URL은 개인정보가 섞일 수 있어 보내지 않는다) */
export function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "unknown";
  }
}
