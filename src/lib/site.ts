/** 사이트 운영 정보 — 푸터·약관·개인정보처리방침·검색 노출에서 함께 쓴다. */

/**
 * 사이트의 공개 주소. 검색엔진에 알려주는 정식 주소(canonical)와 sitemap·OG 태그의 기준이 된다.
 * 나중에 직접 산 도메인을 붙이면 Vercel 환경변수 NEXT_PUBLIC_SITE_URL 만 바꾸면 된다.
 */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://dr-gl.vercel.app").replace(
  /\/+$/,
  "",
);

export const SITE = {
  name: "Dr. GL",
  operator: "닥터지엘",
  email: "drgl.help@gmail.com",
  url: SITE_URL,
  // 약관·개인정보처리방침 본문과 시행일은 DB에서 관리한다.
  // 어드민 → 약관·정책 관리에서 수정하면 버전이 쌓이고 사이트에 즉시 반영된다.
} as const;

/**
 * 검색 노출용 설명.
 * 한국어 서비스지만 GL·백합은 해외에서 yuri 로 불린다. 해외 이용자가 "korean yuri drama"
 * 같은 말로 찾아와도 걸리도록 한 설명 안에 두 표현을 함께 둔다.
 */
export const SITE_DESCRIPTION =
  "영화·드라마·웹툰·웹소설·소설·애니·만화 등 GL(백합) 콘텐츠를 한곳에 모아 소개·추천하고, 어디서 볼 수 있는지 연결해주는 콘텐츠 큐레이션 플랫폼. Dr. GL is a curation service for GL (yuri, 백합) movies, dramas, webtoons and novels — with where to watch each title.";

export const SITE_KEYWORDS = [
  "GL",
  "백합",
  "GL 콘텐츠",
  "백합 드라마",
  "백합 웹툰",
  "GL 영화 추천",
  "여성 서사",
  "yuri",
  "yuri anime",
  "korean GL drama",
  "yuri manga",
  "yuri webtoon",
  "sapphic",
  "where to watch",
];

/**
 * 검색엔진 소유 확인 값.
 *
 * 이 값들은 페이지 소스에 그대로 실려 나가는 공개 문자열이라 코드에 둬도 된다.
 * (남이 알아도 이 사이트의 소유권을 가져갈 수는 없다)
 * 나중에 도메인을 바꾸거나 재발급받으면 환경변수로 덮어쓰면 된다.
 */
export const SITE_VERIFICATION = {
  google: process.env.GOOGLE_SITE_VERIFICATION || "",
  naver: process.env.NAVER_SITE_VERIFICATION || "2ae32928aafdd0ec817f76e3946a3dccbce20eaa",
} as const;

/** 절대 주소로 바꾼다. 이미 http 로 시작하면 그대로 둔다. */
export function absoluteUrl(path: string): string {
  if (!path) return SITE_URL;
  if (/^https?:\/\//i.test(path)) return path;
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}
