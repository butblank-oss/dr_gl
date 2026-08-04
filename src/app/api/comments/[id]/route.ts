import { z } from "zod";
import { fail, handle, ok, parseId } from "@/lib/api";
import { requireAdmin, requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { serializeComment } from "@/lib/serialize";
import { COMMENT_STATUSES } from "@/lib/types";

export const dynamic = "force-dynamic";

const patchSchema = z.object({ status: z.enum(COMMENT_STATUSES) });

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Params) {
  return handle(async () => {
    await requireAdmin();
    const id = parseId((await params).id);
    const existing = await prisma.comment.findUnique({ where: { id } });
    if (!existing) return fail("한줄평을 찾을 수 없어요.", 404);

    const { status } = patchSchema.parse(await req.json());
    const row = await prisma.comment.update({ where: { id }, data: { status } });
    return ok({ comment: serializeComment(row) });
  });
}

export async function DELETE(_req: Request, { params }: Params) {
  return handle(async () => {
    await requireRole("ADMIN");
    const id = parseId((await params).id);
    const existing = await prisma.comment.findUnique({ where: { id } });
    if (!existing) return fail("한줄평을 찾을 수 없어요.", 404);

    await prisma.comment.delete({ where: { id } });
    return ok({ ok: true });
  });
}
