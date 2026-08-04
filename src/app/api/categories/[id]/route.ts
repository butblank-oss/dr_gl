import { fail, handle, ok, parseId } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { serializeCategory } from "@/lib/serialize";
import { categoryUpdateSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Params) {
  return handle(async () => {
    await requireAdmin();
    const id = parseId((await params).id);
    const existing = await prisma.category.findUnique({ where: { id } });
    if (!existing) return fail("카테고리를 찾을 수 없어요.", 404);

    const input = categoryUpdateSchema.parse(await req.json());
    const nextName = input.name ?? existing.name;

    if (nextName !== existing.name) {
      const duplicate = await prisma.category.findUnique({ where: { name: nextName } });
      if (duplicate) return fail("이미 있는 카테고리예요.", 409);
    }

    // 이름 변경은 연관 콘텐츠의 category 필드까지 한 트랜잭션으로 cascade 갱신한다.
    const [row] = await prisma.$transaction([
      prisma.category.update({
        where: { id },
        data: { name: nextName, ...(input.sortOrder === undefined ? {} : { sortOrder: input.sortOrder }) },
      }),
      prisma.content.updateMany({
        where: { category: existing.name },
        data: { category: nextName },
      }),
    ]);

    const count = await prisma.content.count({ where: { category: row.name } });
    return ok({ category: serializeCategory(row, count) });
  });
}

export async function DELETE(_req: Request, { params }: Params) {
  return handle(async () => {
    await requireAdmin();
    const id = parseId((await params).id);
    const existing = await prisma.category.findUnique({ where: { id } });
    if (!existing) return fail("카테고리를 찾을 수 없어요.", 404);

    // 사용 중인 카테고리는 삭제를 차단하고 몇 개가 걸려 있는지 알려준다.
    const count = await prisma.content.count({ where: { category: existing.name } });
    if (count > 0) {
      return fail(`"${existing.name}" 카테고리를 사용하는 콘텐츠가 ${count}개 있어 삭제할 수 없어요.`, 409, {
        count,
      });
    }

    await prisma.category.delete({ where: { id } });
    return ok({ ok: true });
  });
}
