import { handle, ok } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getFilteredContents, searchContents } from "@/lib/queries";
import { syncHomeRowMembership } from "@/lib/home-rows";
import { contentPaths, pingIndexNow } from "@/lib/indexnow";
import { serializeContent } from "@/lib/serialize";
import { contentWithRowsSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  return handle(async () => {
    const params = new URL(req.url).searchParams;
    const q = params.get("q")?.trim() ?? "";
    if (q) return ok({ items: await searchContents(q) });

    return ok({
      items: await getFilteredContents({
        category: params.get("category") ?? undefined,
        country: params.get("country") ?? undefined,
        juiceOnly: params.get("juiceOnly") === "true",
      }),
    });
  });
}

export async function POST(req: Request) {
  return handle(async () => {
    await requireAdmin();
    const { homeRowIds, ...input } = contentWithRowsSchema.parse(await req.json());
    // 콘텐츠 생성과 홈 큐레이션 배치는 함께 반영되거나 함께 취소돼야 한다.
    const row = await prisma.$transaction(async (tx) => {
      const created = await tx.content.create({ data: { ...input, platforms: input.platforms } });
      await syncHomeRowMembership(tx, created.id, homeRowIds);
      return created;
    });
    // 검색엔진에 새 주소가 생겼다고 알린다. 실패해도 등록에는 영향이 없다.
    void pingIndexNow(contentPaths(row.id));
    return ok({ item: serializeContent(row) }, 201);
  });
}
