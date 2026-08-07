/**
 * 제보를 콘텐츠로 옮기기 전에 채우는 "조사 초안".
 *
 * 제보로 들어오는 건 대개 제목 하나뿐이다. 나머지(연도·감독·출연·태그·포스터·시청처)는
 * 운영자가 매번 손으로 찾아 채워 왔다. 그 조사 결과를 제보에 붙여 두고,
 * 검토 화면에서 제보 원문과 나란히 보게 한다.
 *
 * 규격은 운영자가 정리해 쓰던 템플릿을 그대로 옮긴 것이다.
 * 화면·프롬프트·파서가 모두 이 파일 하나를 본다 — 규칙이 세 군데로 흩어지면 곧 어긋난다.
 */

/** GL 층위 — 작품에서 GL이 차지하는 비중 */
export const GL_LAYERS = ["본편", "부분 서사", "착즙"] as const;
export type GlLayer = (typeof GL_LAYERS)[number];

export const GL_LAYER_DESC: Record<GlLayer, string> = {
  본편: "GL이 작품의 주제이자 메인 서사",
  "부분 서사": "극 중 실제 퀴어 관계가 명시되지만 메인 플롯은 아님",
  착즙: "텍스트상 관계는 없고 해석·팬 시점으로 즐기는 관계",
};

/** 조사 초안 한 건. 모든 값은 문자열이고, 확인 못 한 것은 빈 문자열로 둔다. */
export type ResearchDraft = {
  titleKo: string;
  titleEn: string;
  titleOriginal: string;
  category: string;
  glLayer: string;
  glLayerReason: string;
  year: string;
  country: string;
  countryDetail: string;
  creator: string;
  leads: string;
  tags: string;
  posterUrl: string;
  synopsis: string;
  platforms: string;
  links: string;
  /** 채우지 못한 항목과 이유 */
  unresolved: string;
};

export const EMPTY_DRAFT: ResearchDraft = {
  titleKo: "",
  titleEn: "",
  titleOriginal: "",
  category: "",
  glLayer: "",
  glLayerReason: "",
  year: "",
  country: "",
  countryDetail: "",
  creator: "",
  leads: "",
  tags: "",
  posterUrl: "",
  synopsis: "",
  platforms: "",
  links: "",
  unresolved: "",
};

/** 화면과 파서가 함께 쓰는 항목 정의. 순서가 곧 화면 순서다. */
export const DRAFT_FIELDS: { key: keyof ResearchDraft; label: string; hint?: string; multiline?: boolean }[] = [
  { key: "titleKo", label: "한국어 제목" },
  { key: "titleEn", label: "영어 제목" },
  { key: "titleOriginal", label: "원어 제목", hint: "태국어·일본어 등 현지 표기" },
  { key: "category", label: "카테고리" },
  { key: "glLayer", label: "GL 층위", hint: "본편 · 부분 서사 · 착즙" },
  { key: "glLayerReason", label: "층위 판정 근거" },
  { key: "year", label: "연도", hint: "2024 (06.09~09.01, 12부작)" },
  { key: "country", label: "국내/해외" },
  { key: "countryDetail", label: "국가상세" },
  { key: "creator", label: "제작자", hint: "감독 / 각본 / 제작사" },
  { key: "leads", label: "출연 · 주인공", hint: "GL 커플 당사자만. 한국어(English)" },
  { key: "tags", label: "태그", hint: "쉼표 구분. 커플명(국내/해외 호칭) 포함" },
  { key: "posterUrl", label: "포스터 주소", hint: "https 직접 이미지 URL, 세로형" },
  { key: "synopsis", label: "줄거리", hint: "3줄, GL 커플 중심", multiline: true },
  { key: "platforms", label: "시청·감상 가능한 곳" },
  { key: "links", label: "바로가기 주소", hint: "플랫폼 - URL (한 줄에 하나)", multiline: true },
  { key: "unresolved", label: "확인 실패", hint: "채우지 못한 항목과 이유", multiline: true },
];

/** 프롬프트가 출력하는 라벨 ↔ 초안 키. 파서가 이 표를 뒤집어 쓴다. */
const OUTPUT_LABELS: [string, keyof ResearchDraft][] = [
  ["제목", "titleKo"],
  ["카테고리", "category"],
  ["GL 층위", "glLayer"],
  ["층위 근거", "glLayerReason"],
  ["연도", "year"],
  ["국내/해외 구분", "country"],
  ["국가상세", "countryDetail"],
  ["제작자이름", "creator"],
  ["출연,주인공", "leads"],
  ["태그", "tags"],
  ["포스터이미지", "posterUrl"],
  ["줄거리", "synopsis"],
  ["시청,감상가능한곳 플랫폼이름", "platforms"],
  ["바로가기 주소", "links"],
  ["확인 실패", "unresolved"],
];

/**
 * 조사에 쓸 프롬프트. 제보로 들어온 값을 미리 박아 넣어, 그대로 복사해 쓰면 되게 한다.
 * 규칙은 운영자가 쓰던 문서를 그대로 옮겼다.
 */
export function buildResearchPrompt(input: {
  title: string;
  category?: string;
  country?: string;
  platform?: string;
  url?: string;
  note?: string;
}): string {
  const known = [
    input.category ? `- 제보된 형식: ${input.category}` : "",
    input.country ? `- 제보된 국가 구분: ${input.country}` : "",
    input.platform ? `- 제보된 플랫폼: ${input.platform}` : "",
    input.url ? `- 제보된 링크: ${input.url}` : "",
    input.note ? `- 제보자 코멘트: ${input.note}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  return `너는 GL(Girls' Love) 콘텐츠 DB의 데이터 수집·정리를 담당한다.
아래 작품을 웹 검색으로 조사해 템플릿을 채워 출력한다.

## 조사 대상

작품명: ${input.title}
${known || "- 제보에 함께 들어온 정보 없음"}

## 출력 템플릿 (라벨을 그대로 두고 값만 채운다)

제목 : 한국어 제목 / English Title / 원어 제목
카테고리 : 드라마|영화|웹툰|웹소설|연프
GL 층위 : 본편|부분 서사|착즙
층위 근거 : 한 줄
연도 : YYYY (방영·연재 기간)
국내/해외 구분 : 국내|해외
국가상세 :
제작자이름 : 감독 / 각본 / 제작사
출연,주인공 : 한국어표기 (English)
태그 : 쉼표로 구분 (커플명을 태그 안에 포함)
포스터이미지 : https 직접 이미지 URL (세로형)
줄거리 : 3줄
시청,감상가능한곳 플랫폼이름 :
바로가기 주소 : 플랫폼명 - URL (여러 개면 줄바꿈)
확인 실패 : {필드명} — {이유} (없으면 비움)

## 절대 규칙

1. 검증 없이 값을 채우지 않는다. 확인 못 한 필드는 공란으로 두고
   "확인 실패"에 {필드명} — {이유}로 명시한다.
   "(본문 참고)", "TBD", "미정" 같은 placeholder는 절대 쓰지 않는다.

2. 출연·주인공은 GL 커플 당사자만 적는다. 작품의 명목상 주연이 아니어도
   GL 라인의 두 사람만 쓴다. 조연·특별출연이면 태그에 그 사실을 표시한다.

3. 포스터는 반드시 https로 시작하는 직접 이미지 파일 URL이어야 한다.
   페이지 링크는 실패로 처리한다. 세로형(portrait)을 우선한다.
   추출법: 대상 페이지의 og:image 메타태그를 읽는다.

   소스 우선순위:
   - 아시아 드라마·영화 → mydramalist.com → i.mydramalist.com/{해시}_4f.jpg
   - 미드 → thetvdb.com/series/{슬러그}/seasons/official/1
            → artworks.thetvdb.com/banners/seasons/{ID}-{시즌}-{n}.jpg
   - 서구권 영화 → thetvdb.com/movies/{슬러그}, 또는
                  tv.apple.com 페이지의 og:image에서 끝 크기를 800x1200.jpg로 변경
   - 웹툰·웹소설 → ridibooks.com/books/{번호} → img.ridicdn.net/cover/{번호}/xxlarge
   - 레진 웹툰 → lezhin.com/ko/comic/{슬러그} → ccdn.lezhin.com/.../tall.jpg
   - IMP Awards는 http만 지원하므로 사용 금지

4. 웨이브·티빙·왓챠 등 한국 OTT의 작품 ID는 외부에 노출되지 않는다.
   검색으로 찾지 말고 "수동 입력 필요"로 표시한다.
   넷플릭스는 netflix.com/kr/title/{숫자} 형태로 확보 가능하니 시도한다.
   지역 제한이 있으면 "(태국 한정)" 식으로 병기한다.

5. 커플명은 별도 필드가 아니라 태그 안에 넣는다.
   국내 팬덤 호칭과 해외 팬덤 호칭을 각각 태그로 추가한다. (예: 링옴, LingOrm)
   커뮤니티 실사용 여부가 확인될 때만 적는다. 확인 안 되면 임의 조합하지 말고 비운다.

6. 시즌이 여러 개인 작품은 하나의 항목으로 통합한다. 시즌별로 쪼개지 않는다.

7. 태국 배우는 한국어 발음 약칭으로 쓴다 (밀크, 러브, 프린, 베키, 링링, 옴, 남딴, 필름).
   영문 표기는 풀네임을 병기한다.

## 줄거리 규칙

- 정확히 3줄
- 명목상 주연 커플이 따로 있어도 GL 라인 중심으로 서술한다
- GL 팬 시점의 애정 어린 톤. 이모지·느낌표 남발은 피하고 담백한 문장에 팬심이 배어나오게
- 마지막 줄에 작품의 위상이나 감상 포인트를 넣는다
- 결말은 "닫힌결말", "해피엔딩" 정도로만 암시하고 구체적 전개는 쓰지 않는다

## GL 층위 판정

- 본편 : GL이 작품의 주제이자 메인 서사
- 부분 서사 : 극 중 실제 퀴어 관계가 명시되지만 메인 플롯은 아님
- 착즙 : 텍스트상 관계는 없고 해석·팬 시점으로 즐기는 관계

공식 홍보 문구가 아니라 본편에 실제로 나오는 내용을 기준으로 판단하고,
판정 근거를 "층위 근거"에 한 줄로 적는다.`;
}

/** `한국어 / English / 원어` 형태의 제목 줄을 셋으로 나눈다. */
function splitTitleLine(value: string): Pick<ResearchDraft, "titleKo" | "titleEn" | "titleOriginal"> {
  const parts = value.split("/").map((x) => x.trim());
  return {
    titleKo: parts[0] ?? "",
    titleEn: parts[1] ?? "",
    titleOriginal: parts.slice(2).join(" / ") ?? "",
  };
}

/** `드라마 (본편)` 처럼 괄호에 층위가 붙어 오는 경우를 갈라낸다. */
function splitCategoryLine(value: string): { category: string; glLayer: string } {
  const matched = /^(.*?)\s*[(（]\s*(본편|부분\s*서사|착즙)\s*[)）]\s*$/.exec(value.trim());
  if (!matched) return { category: value.trim(), glLayer: "" };
  return { category: matched[1].trim(), glLayer: matched[2].replace(/\s+/g, " ") };
}

/**
 * 조사 결과 텍스트를 초안으로 옮긴다.
 *
 * 라벨로 시작하는 줄을 만나면 그 항목으로 넘어가고, 아니면 직전 항목에 이어 붙인다.
 * 줄거리처럼 여러 줄인 값을 살리기 위해서다.
 * 알아보지 못한 줄은 버리지 않고 직전 항목에 붙는다 — 조용히 사라지는 것보다 낫다.
 */
export function parseResearchOutput(text: string): ResearchDraft {
  const draft: ResearchDraft = { ...EMPTY_DRAFT };
  if (!text.trim()) return draft;

  const labelOf = (line: string): { key: keyof ResearchDraft; value: string } | null => {
    const matched = /^\s*[-*]?\s*\*{0,2}([^:：]{1,30}?)\*{0,2}\s*[:：]\s*(.*)$/.exec(line);
    if (!matched) return null;
    const raw = matched[1].replace(/\s+/g, " ").trim();
    const found = OUTPUT_LABELS.find(([label]) => label === raw || label.replace(/\s+/g, "") === raw.replace(/\s+/g, ""));
    return found ? { key: found[1], value: matched[2].trim() } : null;
  };

  let current: keyof ResearchDraft | null = null;
  for (const line of text.split(/\r?\n/)) {
    const hit = labelOf(line);
    if (hit) {
      current = hit.key;
      draft[current] = hit.value;
      continue;
    }
    if (current && line.trim()) {
      draft[current] = draft[current] ? `${draft[current]}\n${line.trim()}` : line.trim();
    }
  }

  if (draft.titleKo.includes("/")) Object.assign(draft, splitTitleLine(draft.titleKo));
  if (draft.category) {
    const split = splitCategoryLine(draft.category);
    draft.category = split.category;
    if (split.glLayer && !draft.glLayer) draft.glLayer = split.glLayer;
  }
  return draft;
}

/** 저장된 JSON을 초안 모양으로 되돌린다. 모르는 키는 버리고 빠진 키는 채운다. */
export function toDraft(value: unknown): ResearchDraft {
  if (!value || typeof value !== "object") return { ...EMPTY_DRAFT };
  const source = value as Record<string, unknown>;
  const draft = { ...EMPTY_DRAFT };
  for (const key of Object.keys(EMPTY_DRAFT) as (keyof ResearchDraft)[]) {
    const found = source[key];
    if (typeof found === "string") draft[key] = found;
  }
  return draft;
}

/** 초안에 쓸 만한 값이 하나라도 들었는지 */
export function hasDraftContent(draft: ResearchDraft): boolean {
  return Object.values(draft).some((value) => value.trim() !== "");
}
