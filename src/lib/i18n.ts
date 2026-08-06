/**
 * 두 언어를 사전 하나로 관리한다.
 *
 * 라이브러리를 쓰지 않는 이유: 화면에 나오는 고정 문구가 백 개 남짓이라
 * 번들을 늘려가며 얻을 게 없다. 대신 규칙을 좁게 둔다 —
 * 키를 빠뜨리면 타입 검사에서 걸리고, 번역이 없으면 한국어가 나온다.
 *
 * 작품 제목·줄거리처럼 운영자가 넣는 값은 여기 없다. 그건 데이터 쪽 일이다.
 */
export const LANGS = ["ko", "en"] as const;
export type Lang = (typeof LANGS)[number];

export const DEFAULT_LANG: Lang = "ko";

/** 영어 페이지는 /en 아래에 둔다. 한국어는 접두어 없이 지금 주소 그대로. */
export const EN_PREFIX = "/en";

export function isLang(value: string | null | undefined): value is Lang {
  return value === "ko" || value === "en";
}

/** 브라우저 주소에서 언어를 읽는다. (/en/category → en) */
export function langFromPath(pathname: string): Lang {
  return pathname === EN_PREFIX || pathname.startsWith(`${EN_PREFIX}/`) ? "en" : "ko";
}

/** /en 접두어를 뗀 순수 경로. (/en/category → /category, /en → /) */
export function stripLang(pathname: string): string {
  if (pathname === EN_PREFIX) return "/";
  if (pathname.startsWith(`${EN_PREFIX}/`)) return pathname.slice(EN_PREFIX.length) || "/";
  return pathname;
}

/** 사이트 안 링크에 언어를 붙인다. 한국어는 그대로 둔다. */
export function withLang(lang: Lang, path: string): string {
  if (lang === "ko") return path;
  return path === "/" ? EN_PREFIX : `${EN_PREFIX}${path}`;
}

const KO = {
  navHome: "홈",
  navCategory: "카테고리",
  navSearch: "검색",
  navBoard: "게시판",
  navBoardBadge: "OPEN 예정",
  searchPlaceholder: "작품, 감독, 작가로 검색",
  searchAria: "작품 검색",
  submitShort: "+ 제보",
  submitLong: "+ 제보하기",
  back: "뒤로가기",
  backToList: "← 돌아가기",
  logoAria: "홈으로",

  langLabel: "English",
  langAria: "View in English",

  watchAt: "시청·감상 가능한 곳",
  noWatchAt: "등록된 시청처가 아직 없어요.",
  synopsis: "줄거리",
  cast: "출연",
  tags: "태그",
  related: "이런 작품은 어때요?",
  moreByLead: (name: string) => `${name}의 다른 작품`,
  share: "공유하기",
  shareCopied: "링크를 복사했어요",
  shareAria: (title: string) => `${title} 공유하기`,

  cardNoPoster: "포스터 준비중",
  cardCast: "출연",
  juice: "착즙",

  heroWatch: "시청 가능한 곳",

  categoryTitle: "카테고리 탐색",
  categoryLead: "장르와 형식을 넘나들며, 원하는 콘텐츠를 찾아보세요.",
  filterAll: "전체",
  filterDomestic: "국내",
  filterOverseas: "해외",
  juiceOnly: "착즙만",
  emptyList: "조건에 맞는 작품이 없어요.",

  searchTitle: "검색",
  searchLead: "작품 제목, 감독·작가, 출연, 태그로 찾을 수 있어요.",
  searchEmptyQuery: "검색어를 입력해보세요.",
  searchNoResult: (q: string) => `"${q}"에 대한 결과가 없어요.`,
  searchSuggestSubmit: "찾으시는 작품이 아직 없나요? 알려주시면 등록할게요.",
  searchSubmitCta: "이 작품 제보하기",
  searchCount: (n: number) => `${n}개의 작품을 찾았어요.`,

  comments: "한줄평",
  commentPlaceholder: "한줄평을 남겨보세요",
  commentAria: "한줄평 입력",
  commentSubmit: "남기기",
  commentEmpty: "아직 한줄평이 없어요. 첫 한줄평을 남겨보세요.",
  commentMore: "더보기",

  footerTerms: "이용약관",
  footerPrivacy: "개인정보처리방침",
  footerContact: "문의 · 저작권 삭제 요청",
  footerDisclaimer:
    "Dr. GL은 작품을 소개하고 감상처를 안내하는 큐레이션 서비스입니다. 작품을 직접 제작·유통하지 않으며, 게시된 제목·줄거리·이미지의 권리는 각 저작권자에게 있습니다. 수정이나 삭제가 필요하시면 아래 주소로 알려주시면 확인 후 신속히 조치하겠습니다.",
  footerOperator: "운영",
  footerRights: "© 2026 Dr. GL · GL 콘텐츠 큐레이션 플랫폼",

  langNoticeTitle: "This page is in Korean",
  langNoticeBody: "Titles and synopses are written in Korean. The interface is available in English.",
  langNoticeCta: "Switch to English",
  // as const 를 붙이지 않는다 — 붙이면 한국어 문자열이 그대로 타입이 되어
  // 영어 사전이 "Home 은 홈이 아니다"라며 통과하지 못한다.
};

type Dict = typeof KO;

const EN: Dict = {
  navHome: "Home",
  navCategory: "Browse",
  navSearch: "Search",
  navBoard: "Community",
  navBoardBadge: "COMING SOON",
  searchPlaceholder: "Search titles, directors, authors",
  searchAria: "Search titles",
  submitShort: "+ Submit",
  submitLong: "+ Submit a title",
  back: "Back",
  backToList: "← Back",
  logoAria: "Go to home",

  langLabel: "한국어",
  langAria: "한국어로 보기",

  watchAt: "Where to watch",
  noWatchAt: "No streaming links yet.",
  synopsis: "Synopsis",
  cast: "Cast",
  tags: "Tags",
  related: "You might also like",
  moreByLead: (name: string) => `More with ${name}`,
  share: "Share",
  shareCopied: "Link copied",
  shareAria: (title: string) => `Share ${title}`,

  cardNoPoster: "No poster yet",
  cardCast: "Cast",
  juice: "Subtext",

  heroWatch: "Where to watch",

  categoryTitle: "Browse",
  categoryLead: "Explore GL titles across formats and genres.",
  filterAll: "All",
  filterDomestic: "Korean",
  filterOverseas: "International",
  juiceOnly: "Subtext only",
  emptyList: "No titles match these filters.",

  searchTitle: "Search",
  searchLead: "Search by title, director, author, cast or tag.",
  searchEmptyQuery: "Type something to search.",
  searchNoResult: (q: string) => `No results for "${q}".`,
  searchSuggestSubmit: "Not here yet? Tell us and we will add it.",
  searchSubmitCta: "Submit this title",
  searchCount: (n: number) => `${n} title${n === 1 ? "" : "s"} found.`,

  comments: "Reviews",
  commentPlaceholder: "Leave a one-line review",
  commentAria: "Write a review",
  commentSubmit: "Post",
  commentEmpty: "No reviews yet. Be the first.",
  commentMore: "Show more",

  footerTerms: "Terms",
  footerPrivacy: "Privacy Policy",
  footerContact: "Contact · Takedown request",
  footerDisclaimer:
    "Dr. GL is a curation service that introduces titles and points to where you can watch or read them. We do not produce or distribute any of the works. All titles, synopses and images belong to their respective rights holders. If something needs to be corrected or removed, write to the address below and we will act on it promptly.",
  footerOperator: "Operated by",
  footerRights: "© 2026 Dr. GL · GL content curation",

  langNoticeTitle: "한국어 페이지입니다",
  langNoticeBody: "작품 제목과 줄거리는 한국어로 제공됩니다.",
  langNoticeCta: "한국어로 보기",
};

const DICTS: Record<Lang, Dict> = { ko: KO, en: EN };

/** 사전을 통째로 넘겨 쓴다 — 화면마다 키를 하나씩 부르는 것보다 읽기 쉽다. */
export function dict(lang: Lang): Dict {
  return DICTS[lang] ?? KO;
}
