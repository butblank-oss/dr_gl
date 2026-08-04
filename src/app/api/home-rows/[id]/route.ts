import { fail, handle, ok, parseId } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { homeRowInputSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Params) {
  return handle(async () => {
    await requireAdmin();
    const id = parseId((await params).id);
    const existing = await prisma.homeRow.findUnique({ where: { id } });
    if (!existing) return fail("행을 찾을 수 없어요.", 404);

    const input = homeRowInputSchema.partial({ title: true }).parse(await req.json());

    // 구성 콘텐츠가 넘어오면 통째로 교체한다(순서가 곧 노출 순서).
    await prisma.$transaction(async (tx) => {
      await tx.homeRow.update({
        where: { id },
        data: {
          ...(input.title === undefined ? {} : { title: input.title }),
          ...(input.sortOrder === undefined ? {} : { sortOrder: input.sortOrder }),
          ...(input.isActive === undefined ? {} : { isActive: input.isActive }),
        },
      });
      if (input.contentIds) {
        await tx.homeRowItem.deleteMany({ where: { rowId: id } });
        const unique = [...new Set(input.contentIds)];
        if (unique.length > 0) {
          await tx.homeRowItem.createMany({
            data: unique.map((contentId, index) => ({ rowId: id, contentId, sortOrder: index })),
            skipDuplicates: true,
          });
        }
      }
    });

    return ok({ ok: true });
  });
}

export async function DELETE(_req: Request, { params }: Params) {
  return handle(async () => {
    await requireAdmin();
    const id = parseId((await params).id);
    const existing = await prisma.homeRow.findUnique({ where: { id } });
    if (!existing) return fail("행을 찾을 수 없어요.", 404);

    await prisma.homeRow.delete({ where: { id } });
    return ok({ ok: true });
  });
}
