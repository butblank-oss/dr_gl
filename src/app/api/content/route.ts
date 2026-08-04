import { handle, ok } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getFilteredContents, searchContents } from "@/lib/queries";
import { serializeContent } from "@/lib/serialize";
import { contentInputSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  return handle(async () => {
    const params = new URL(req.url).searchParams;
    const q = params.get("q")?.trim() ?? "";
    if (q) return ok({ items: await searchContents(q) });

    return ok({
      items: await getFilteredContents({
        category: params.get("category") ?? undefined,
        country: params.get("country") ?? undefined,
        juiceOnly: params.get("juiceOnly") === "true",
      }),
    });
  });
}

export async function POST(req: Request) {
  return handle(async () => {
    await requireAdmin();
    const input = contentInputSchema.parse(await req.json());
    const row = await prisma.content.create({ data: { ...input, platforms: input.platforms } });
    return ok({ item: serializeContent(row) }, 201);
  });
}
