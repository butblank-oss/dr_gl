import { z } from "zod";
import { fail, handle, ok, parseId } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { contentPaths, pingIndexNow } from "@/lib/indexnow";
import { prisma } from "@/lib/prisma";
import { serializeContent, serializeSubmission } from "@/lib/serialize";
import type { Platform } from "@/lib/types";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

const bodySchema = z.object({ contentId: z.coerce.number().int().positive() });

/** 트랜잭션을 되돌리기 위한 내부 신호 — 동시에 같은 제보를 처리했을 때 */
class AlreadyHandledError extends Error {}

/**
 * 중복 제보 처리 — 새 콘텐츠를 만들지 않고, 제보된 시청처만 기존 작품에 더한다.
 *
 * 같은 작품 제보라도 아직 등록되지 않은 감상처를 알려주는 경우가 많다.
 * 그냥 반려하면 그 정보가 사라지므로, 링크만 흡수하고 제보는 승인으로 닫는다.
 */
export async function POST(req: Request, { params }: Params) {
  return handle(async () => {
    await requireAdmin();
    const submissionId = parseId((await params).id);
    const { contentId } = bodySchema.parse(await req.json());

    const [submission, content] = await Promise.all([
      prisma.submission.findUnique({ where: { id: submissionId } }),
      prisma.content.findUnique({ where: { id: contentId } }),
    ]);
    if (!submission) return fail("제보를 찾을 수 없어요.", 404);
    if (!content) return fail("합칠 작품을 찾을 수 없어요.", 404);
    if (submission.status !== "pending") return fail("이미 처리된 제보예요.", 409);

    const platforms = (content.platforms as Platform[] | null) ?? [];
    const url = submission.url.trim();
    const name = submission.platform.trim() || "제보된 링크";

    // 같은 주소가 이미 있으면 더하지 않는다.
    const already = platforms.some((platform) => (platform.url ?? "").trim() === url);
    const nextPlatforms = already ? platforms : [...platforms, { name, type: "유료" as const, url }];

    let result;
    try {
      result = await prisma.$transaction(async (tx) => {
        const updatedContent = already
          ? content
          : await tx.content.update({
              where: { id: contentId },
              data: { platforms: nextPlatforms },
            });

        const updated = await tx.submission.updateMany({
          where: { id: submissionId, status: "pending" },
          data: { status: "approved", contentId },
        });
        if (updated.count === 0) throw new AlreadyHandledError();

        const finalSubmission = await tx.submission.findUniqueOrThrow({ where: { id: submissionId } });
        return { content: updatedContent, submission: finalSubmission };
      });
    } catch (error) {
      if (error instanceof AlreadyHandledError) return fail("이미 처리된 제보예요.", 409);
      throw error;
    }

    if (!already) void pingIndexNow(contentPaths(result.content.id));
    return ok({
      item: serializeContent(result.content),
      submission: serializeSubmission(result.submission),
      added: !already,
    });
  });
}
