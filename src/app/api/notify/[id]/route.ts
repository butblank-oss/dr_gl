import { fail, handle, ok, parseId } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

/** 신청 취소 요청이 오면 지운다. 개인정보라 요청 즉시 삭제할 수 있어야 한다. */
export async function DELETE(_req: Request, { params }: Params) {
  return handle(async () => {
    await requireAdmin();
    const id = parseId((await params).id);
    const existing = await prisma.notifySignup.findUnique({ where: { id } });
    if (!existing) return fail("신청 내역을 찾을 수 없어요.", 404);

    await prisma.notifySignup.delete({ where: { id } });
    return ok({ ok: true });
  });
}
