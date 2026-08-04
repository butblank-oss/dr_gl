import { handle, ok } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getAllHomeRows } from "@/lib/queries";
import { homeRowInputSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function GET() {
  return handle(async () => {
    await requireAdmin();
    return ok({ rows: await getAllHomeRows() });
  });
}

export async function POST(req: Request) {
  return handle(async () => {
    await requireAdmin();
    const input = homeRowInputSchema.parse(await req.json());
    const last = await prisma.homeRow.findFirst({ orderBy: { sortOrder: "desc" } });

    const row = await prisma.homeRow.create({
      data: {
        title: input.title,
        sortOrder: input.sortOrder ?? (last?.sortOrder ?? 0) + 1,
        isActive: input.isActive ?? true,
        items: {
          create: (input.contentIds ?? []).map((contentId, index) => ({ contentId, sortOrder: index })),
        },
      },
    });
    return ok({ row: { id: row.id } }, 201);
  });
}
