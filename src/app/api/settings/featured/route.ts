import { z } from "zod";
import { fail, handle, ok } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { FEATURED_SETTING_KEY } from "@/lib/queries";

export const dynamic = "force-dynamic";

const bodySchema = z.object({ contentId: z.coerce.number().int().positive() });

/** 홈 히어로 배너에 띄울 추천 콘텐츠 1개를 지정한다. */
export async function PUT(req: Request) {
  return handle(async () => {
    await requireAdmin();
    const { contentId } = bodySchema.parse(await req.json());

    const item = await prisma.content.findUnique({ where: { id: contentId }, select: { id: true } });
    if (!item) return fail("콘텐츠를 찾을 수 없어요.", 404);

    await prisma.siteSetting.upsert({
      where: { key: FEATURED_SETTING_KEY },
      create: { key: FEATURED_SETTING_KEY, value: String(contentId) },
      update: { value: String(contentId) },
    });
    return ok({ contentId });
  });
}
