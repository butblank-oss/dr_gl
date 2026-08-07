import { z } from "zod";
import { fail, handle, ok, parseId } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { serializeSubmission } from "@/lib/serialize";
import { EMPTY_DRAFT, toDraft } from "@/lib/research";
import { autoResearchEnabled, autoResearchSubmission } from "@/lib/auto-research";

export const dynamic = "force-dynamic";

/** 초안은 전부 문자열 필드다. 모르는 키는 스키마에서 걸러진다. */
const draftSchema = z.object(
  Object.fromEntries(
    Object.keys(EMPTY_DRAFT).map((key) => [key, z.string().max(4000).default("")]),
  ) as Record<keyof typeof EMPTY_DRAFT, z.ZodDefault<z.ZodString>>,
);

type Params = { params: Promise<{ id: string }> };

/** 지금 이 자리에서 자동 조사를 돌린다. 어드민의 "자동으로 조사하기" 버튼이 부른다. */
export async function POST(_req: Request, { params }: Params) {
  return handle(async () => {
    await requireAdmin();
    const id = parseId((await params).id);
    if (!autoResearchEnabled()) {
      return fail(
        "자동 조사가 꺼져 있어요. Vercel 환경변수에 TMDB_API_KEY(무료) 또는 ANTHROPIC_API_KEY 를 넣으면 켜집니다.",
        503,
      );
    }
    // 어드민이 직접 누른 경우이므로 기존 초안을 덮어쓴다.
    const done = await autoResearchSubmission(id, true);
    if (!done) return fail("조사에 실패했어요. 잠시 후 다시 시도하거나 직접 채워주세요.", 502);

    const row = await prisma.submission.findUnique({ where: { id } });
    if (!row) return fail("제보를 찾을 수 없어요.", 404);
    return ok({ submission: serializeSubmission(row) });
  });
}

/** 조사 초안 저장. 검토 화면에서 붙여넣거나 손으로 고친 값을 그대로 받는다. */
export async function PUT(req: Request, { params }: Params) {
  return handle(async () => {
    await requireAdmin();
    const id = parseId((await params).id);
    const existing = await prisma.submission.findUnique({ where: { id } });
    if (!existing) return fail("제보를 찾을 수 없어요.", 404);

    const draft = toDraft(draftSchema.parse(await req.json()));
    const row = await prisma.submission.update({
      where: { id },
      data: { research: draft, researchedAt: new Date() },
    });
    return ok({ submission: serializeSubmission(row) });
  });
}

/** 초안 비우기 — 잘못 붙여넣었을 때 되돌리는 길 */
export async function DELETE(_req: Request, { params }: Params) {
  return handle(async () => {
    await requireAdmin();
    const id = parseId((await params).id);
    const row = await prisma.submission.update({
      where: { id },
      data: { research: undefined, researchedAt: null },
    });
    return ok({ submission: serializeSubmission(row) });
  });
}
