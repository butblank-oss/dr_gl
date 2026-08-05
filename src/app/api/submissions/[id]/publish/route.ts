import { fail, handle, ok, parseId } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { syncHomeRowMembership } from "@/lib/home-rows";
import { contentPaths, pingIndexNow } from "@/lib/indexnow";
import { serializeContent, serializeSubmission } from "@/lib/serialize";
import { contentWithRowsSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

/** 트랜잭션을 롤백시키기 위한 내부 신호 — 동시에 같은 제보를 승인했을 때 발생한다. */
class AlreadyHandledError extends Error {}

/**
 * 어드민의 "검토 · 발행" — 콘텐츠 생성과 제보 승인이 하나의 트랜잭션으로 함께 반영된다.
 * 둘 중 하나라도 실패하면 아무것도 반영되지 않는다.
 */
export async function POST(req: Request, { params }: Params) {
  return handle(async () => {
    await requireAdmin();
    const submissionId = parseId((await params).id);

    const submission = await prisma.submission.findUnique({ where: { id: submissionId } });
    if (!submission) return fail("제보를 찾을 수 없어요.", 404);
    if (submission.status !== "pending") return fail("이미 처리된 제보예요.", 409);

    const { homeRowIds, ...input } = contentWithRowsSchema.parse(await req.json());

    let result;
    try {
      result = await prisma.$transaction(async (tx) => {
        const content = await tx.content.create({ data: { ...input, platforms: input.platforms } });
        // 발행과 동시에 홈 큐레이션에 배치한다. 선택하지 않았으면 아무 일도 일어나지 않는다.
        await syncHomeRowMembership(tx, content.id, homeRowIds);

        // 트랜잭션 안에서 상태를 한 번 더 확인해 동시 승인(중복 발행)을 막는다.
        const updated = await tx.submission.updateMany({
          where: { id: submissionId, status: "pending" },
          data: { status: "approved", contentId: content.id },
        });
        if (updated.count === 0) throw new AlreadyHandledError();

        const finalSubmission = await tx.submission.findUniqueOrThrow({ where: { id: submissionId } });
        return { content, submission: finalSubmission };
      });
    } catch (error) {
      if (error instanceof AlreadyHandledError) return fail("이미 처리된 제보예요.", 409);
      throw error;
    }

    void pingIndexNow(contentPaths(result.content.id));
    return ok(
      { item: serializeContent(result.content), submission: serializeSubmission(result.submission) },
      201,
    );
  });
}
