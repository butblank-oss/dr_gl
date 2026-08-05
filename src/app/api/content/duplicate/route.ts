import { handle, ok } from "@/lib/api";
import { countPendingDuplicates, findDuplicateContents } from "@/lib/duplicate";

export const dynamic = "force-dynamic";

/**
 * 제보 화면이 제목을 입력하는 동안 부르는 확인용 엔드포인트.
 * 이미 사이트에 공개된 정보(제목·형식·연도)만 돌려준다.
 */
export async function GET(req: Request) {
  return handle(async () => {
    const title = new URL(req.url).searchParams.get("title")?.trim() ?? "";
    if (title.length < 2) return ok({ matches: [], pending: 0 });

    const [matches, pending] = await Promise.all([
      findDuplicateContents(title),
      countPendingDuplicates(title),
    ]);
    return ok({ matches, pending });
  });
}
