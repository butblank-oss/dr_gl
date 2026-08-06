import { fail, handle, ok } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getCategoriesWithCount } from "@/lib/queries";
import { categoryOrderSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

/**
 * 카테고리 순서를 통째로 다시 매긴다.
 * 두 칸을 맞바꾸는 식으로 하지 않는 이유: 드래그 한 번에 여러 칸이 밀리고,
 * 중간에 실패하면 순서가 반쯤 뒤엉킨 채로 남는다. 한 트랜잭션에 전부 다시 쓴다.
 */
export async function PUT(req: Request) {
  return handle(async () => {
    await requireAdmin();
    const { ids } = categoryOrderSchema.parse(await req.json());

    const existing = await prisma.category.findMany({ select: { id: true } });
    const known = new Set(existing.map((row) => row.id));
    // 화면이 낡은 목록을 들고 있었다면(다른 창에서 추가·삭제) 조용히 어긋나느니 거절한다.
    if (ids.length !== known.size || ids.some((id) => !known.has(id))) {
      return fail("목록이 최신이 아니에요. 새로고침한 뒤 다시 시도해주세요.", 409);
    }

    await prisma.$transaction(
      ids.map((id, index) =>
        prisma.category.update({ where: { id }, data: { sortOrder: index + 1 } }),
      ),
    );

    return ok({ categories: await getCategoriesWithCount() });
  });
}
