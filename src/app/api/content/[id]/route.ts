import { fail, handle, ok, parseId } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { serializeContent } from "@/lib/serialize";
import { contentInputSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  return handle(async () => {
    const id = parseId((await params).id);
    const row = await prisma.content.findUnique({ where: { id } });
    if (!row) return fail("콘텐츠를 찾을 수 없어요.", 404);
    return ok({ item: serializeContent(row) });
  });
}

export async function PATCH(req: Request, { params }: Params) {
  return handle(async () => {
    await requireAdmin();
    const id = parseId((await params).id);
    const existing = await prisma.content.findUnique({ where: { id } });
    if (!existing) return fail("콘텐츠를 찾을 수 없어요.", 404);

    const input = contentInputSchema.parse(await req.json());
    const row = await prisma.content.update({
      where: { id },
      data: { ...input, platforms: input.platforms },
    });
    return ok({ item: serializeContent(row) });
  });
}

export async function DELETE(_req: Request, { params }: Params) {
  return handle(async () => {
    await requireAdmin();
    const id = parseId((await params).id);
    const existing = await prisma.content.findUnique({ where: { id } });
    if (!existing) return fail("콘텐츠를 찾을 수 없어요.", 404);

    await prisma.content.delete({ where: { id } });
    return ok({ ok: true });
  });
}
