import { clientIp, fail, handle, ok } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { duplicatesFor } from "@/lib/duplicate";
import { prisma } from "@/lib/prisma";
import { checkSubmissionRateLimit, hashIp } from "@/lib/rate-limit";
import { serializeSubmission } from "@/lib/serialize";
import { SUBMISSION_FILTER_TO_STATUS } from "@/lib/types";
import { submissionInputSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  return handle(async () => {
    await requireAdmin();
    const filter = new URL(req.url).searchParams.get("filter") ?? "전체";
    const status = SUBMISSION_FILTER_TO_STATUS[filter];
    const rows = await prisma.submission.findMany({
      where: status ? { status } : {},
      orderBy: { id: "desc" },
    });
    const pending = rows.filter((row) => row.status === "pending");
    return ok({
      submissions: rows.map(serializeSubmission),
      duplicates: await duplicatesFor(pending),
    });
  });
}

/** 공개 엔드포인트 — 사이트의 "콘텐츠 제보하기" 폼이 호출한다. */
export async function POST(req: Request) {
  return handle(async () => {
    const input = submissionInputSchema.parse(await req.json());

    const ipHash = hashIp(clientIp(req));
    const limit = await checkSubmissionRateLimit(ipHash);
    if (!limit.allowed) {
      return fail(
        `잠시 후 다시 시도해주세요. (${Math.ceil(limit.retryAfterSeconds / 60)}분 뒤에 다시 제보할 수 있어요)`,
        429,
      );
    }

    const row = await prisma.submission.create({ data: { ...input, status: "pending", ipHash } });
    return ok({ submission: serializeSubmission(row) }, 201);
  });
}
