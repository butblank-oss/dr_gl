import { handle, ok } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
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
    return ok({ submissions: rows.map(serializeSubmission) });
  });
}

/** 공개 엔드포인트 — 사이트의 "콘텐츠 제보하기" 폼이 호출한다. */
export async function POST(req: Request) {
  return handle(async () => {
    const input = submissionInputSchema.parse(await req.json());
    const row = await prisma.submission.create({ data: { ...input, status: "pending" } });
    return ok({ submission: serializeSubmission(row) }, 201);
  });
}
