import { z } from "zod";
import { fail, handle, ok, parseId } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { serializeSubmission } from "@/lib/serialize";
import { SUBMISSION_STATUSES } from "@/lib/types";

export const dynamic = "force-dynamic";

const patchSchema = z.object({ status: z.enum(SUBMISSION_STATUSES) });

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Params) {
  return handle(async () => {
    await requireAdmin();
    const id = parseId((await params).id);
    const existing = await prisma.submission.findUnique({ where: { id } });
    if (!existing) return fail("제보를 찾을 수 없어요.", 404);

    const { status } = patchSchema.parse(await req.json());
    const row = await prisma.submission.update({ where: { id }, data: { status } });
    return ok({ submission: serializeSubmission(row) });
  });
}

export async function DELETE(_req: Request, { params }: Params) {
  return handle(async () => {
    await requireAdmin();
    const id = parseId((await params).id);
    const existing = await prisma.submission.findUnique({ where: { id } });
    if (!existing) return fail("제보를 찾을 수 없어요.", 404);

    await prisma.submission.delete({ where: { id } });
    return ok({ ok: true });
  });
}
