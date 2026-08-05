import { z } from "zod";
import { fail, handle, ok, parseId } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { serializeSubmission } from "@/lib/serialize";
import { REJECT_REASON_CODES, SUBMISSION_STATUSES } from "@/lib/types";

export const dynamic = "force-dynamic";

const patchSchema = z.object({
  status: z.enum(SUBMISSION_STATUSES),
  rejectReason: z.enum(REJECT_REASON_CODES).optional(),
  rejectNote: z.string().trim().max(300).default(""),
});

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Params) {
  return handle(async () => {
    await requireAdmin();
    const id = parseId((await params).id);
    const existing = await prisma.submission.findUnique({ where: { id } });
    if (!existing) return fail("제보를 찾을 수 없어요.", 404);

    const { status, rejectReason, rejectNote } = patchSchema.parse(await req.json());

    // 반려는 왜 반려했는지가 함께 남아야 나중에 제보 폼 안내를 고칠 수 있다.
    if (status === "rejected") {
      if (!rejectReason) return fail("반려 사유를 선택해주세요.", 422);
      if (rejectReason === "other" && !rejectNote) {
        return fail("'기타'를 골랐을 땐 사유를 적어주세요.", 422);
      }
    }

    const row = await prisma.submission.update({
      where: { id },
      data:
        status === "rejected"
          ? { status, rejectReason, rejectNote }
          : // 반려를 되돌리면 사유도 같이 지운다. 남겨두면 화면에 유령처럼 붙어 다닌다.
            { status, rejectReason: "", rejectNote: "" },
    });
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
