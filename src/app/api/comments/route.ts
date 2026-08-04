import { clientIp, fail, handle, ok } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkCommentRateLimit, hashIp } from "@/lib/rate-limit";
import { serializeComment } from "@/lib/serialize";
import { COMMENT_FILTER_TO_STATUS } from "@/lib/types";
import { commentInputSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  return handle(async () => {
    const params = new URL(req.url).searchParams;
    const itemId = Number(params.get("itemId"));

    // 특정 콘텐츠의 노출중인 한줄평은 공개 조회 가능.
    if (Number.isInteger(itemId) && itemId > 0) {
      const rows = await prisma.comment.findMany({
        where: { itemId, status: "visible" },
        orderBy: { id: "asc" },
      });
      return ok({ comments: rows.map(serializeComment) });
    }

    // 전체 목록(검수용)은 운영자만.
    await requireAdmin();
    const status = COMMENT_FILTER_TO_STATUS[params.get("filter") ?? "전체"];
    const rows = await prisma.comment.findMany({
      where: status ? { status } : {},
      orderBy: { id: "desc" },
      include: { item: { select: { title: true } } },
    });
    return ok({
      comments: rows.map((row) => ({ ...serializeComment(row), itemTitle: row.item.title })),
    });
  });
}

/** 공개 엔드포인트 — 로그인 없이 누구나 남길 수 있다. 대신 서버에서 rate limit 을 건다. */
export async function POST(req: Request) {
  return handle(async () => {
    const { itemId, text } = commentInputSchema.parse(await req.json());

    const item = await prisma.content.findUnique({ where: { id: itemId }, select: { id: true } });
    if (!item) return fail("콘텐츠를 찾을 수 없어요.", 404);

    const ipHash = hashIp(clientIp(req));
    const limit = await checkCommentRateLimit(ipHash);
    if (!limit.allowed) {
      return fail("한줄평을 너무 자주 남기고 있어요. 잠시 후 다시 시도해주세요.", 429, {
        retryAfterSeconds: limit.retryAfterSeconds,
      });
    }

    const row = await prisma.comment.create({
      data: { itemId, text, status: "visible", ipHash },
    });
    return ok({ comment: serializeComment(row) }, 201);
  });
}
