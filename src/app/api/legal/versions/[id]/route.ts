import { fail, handle, ok, parseId } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { serializeLegalVersion } from "@/lib/serialize";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

/** 특정 버전을 발행한다 (되돌리기 포함). 다른 버전은 자동으로 내려간다. */
export async function PATCH(_req: Request, { params }: Params) {
  return handle(async () => {
    await requireAdmin();
    const id = parseId((await params).id);
    const existing = await prisma.legalDocumentVersion.findUnique({ where: { id } });
    if (!existing) return fail("버전을 찾을 수 없어요.", 404);

    const updated = await prisma.$transaction(async (tx) => {
      await tx.legalDocumentVersion.updateMany({
        where: { documentId: existing.documentId },
        data: { isPublished: false },
      });
      return tx.legalDocumentVersion.update({
        where: { id },
        data: {
          isPublished: true,
          // 처음 발행되는 버전만 발행 시각을 남긴다.
          publishedAt: existing.publishedAt ?? new Date(),
        },
      });
    });

    return ok({ version: serializeLegalVersion(updated) });
  });
}

/** 아직 발행된 적 없는 초안만 지울 수 있다. 발행 이력은 남겨야 하므로 삭제 불가. */
export async function DELETE(_req: Request, { params }: Params) {
  return handle(async () => {
    await requireAdmin();
    const id = parseId((await params).id);
    const existing = await prisma.legalDocumentVersion.findUnique({ where: { id } });
    if (!existing) return fail("버전을 찾을 수 없어요.", 404);
    if (existing.publishedAt) {
      return fail("발행된 적 있는 버전은 이력으로 남겨야 해서 삭제할 수 없어요.", 409);
    }

    await prisma.legalDocumentVersion.delete({ where: { id } });
    return ok({ ok: true });
  });
}
