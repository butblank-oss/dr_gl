import { INDEXNOW_KEY } from "@/lib/indexnow";

export const dynamic = "force-dynamic";

/**
 * IndexNow 소유 확인 파일.
 * 통보를 보낼 때 keyLocation 으로 이 주소를 알려주고, 검색엔진은 여기 내용이
 * 키와 같은지 확인해 우리가 이 사이트의 주인임을 인정한다.
 */
export async function GET() {
  return new Response(INDEXNOW_KEY, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
