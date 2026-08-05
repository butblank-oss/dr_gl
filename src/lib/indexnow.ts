import "server-only";

import { SITE_URL } from "@/lib/site";

/**
 * IndexNow — 새 주소가 생기거나 바뀐 걸 검색엔진에 먼저 알린다.
 *
 * 사이트맵이 "훑어갈 때 참고하세요"라면 이건 "방금 이게 바뀌었어요"에 가깝다.
 * 빙과 네이버가 이 방식을 지원해서, 며칠 걸리던 색인이 몇 시간~하루로 줄어든다.
 *
 * 통보는 어디까지나 부수적인 일이라 절대 실패를 밖으로 던지지 않는다.
 * 색인 통보 때문에 작품 발행이 실패하는 일은 없어야 한다.
 */

const ENDPOINT = "https://api.indexnow.org/indexnow";

/**
 * 소유 확인용 키. 공개돼도 문제없는 값이라(키 파일로 어차피 노출된다)
 * 기본값을 코드에 두고 환경변수로 덮어쓸 수 있게 한다.
 */
export const INDEXNOW_KEY = process.env.INDEXNOW_KEY || "9f2c41d7a58b40e6b1c37d05e8a94f62";

/** 키 파일 위치 — IndexNow 규격상 키와 같은 내용을 이 주소에서 응답해야 한다. */
export const INDEXNOW_KEY_LOCATION = `${SITE_URL}/indexnow.txt`;

/**
 * 바뀐 주소들을 알린다. 응답을 기다릴 필요가 없어 호출한 쪽에서 await 하지 않아도 된다.
 * @param paths 사이트 내 경로 목록 (예: ["/content/12", "/"])
 */
export async function pingIndexNow(paths: string[]): Promise<void> {
  if (!INDEXNOW_KEY) return;

  const urlList = [...new Set(paths)]
    .filter(Boolean)
    .map((path) => (path.startsWith("http") ? path : `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`));
  if (urlList.length === 0) return;

  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({
        host: new URL(SITE_URL).host,
        key: INDEXNOW_KEY,
        keyLocation: INDEXNOW_KEY_LOCATION,
        urlList,
      }),
    });
    if (!res.ok) {
      console.warn(`[indexnow] 통보 실패 (${res.status}) — ${urlList.join(", ")}`);
      return;
    }
    console.info(`[indexnow] 통보 완료 — ${urlList.join(", ")}`);
  } catch (error) {
    console.warn(`[indexnow] 통보 중 오류: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * 작품 하나가 바뀌었을 때 알릴 주소들.
 * 홈도 함께 넣는다 — 큐레이션 줄이 바뀌면 홈 내용도 달라지기 때문.
 */
export function contentPaths(contentId: number): string[] {
  return [`/content/${contentId}`, "/"];
}
