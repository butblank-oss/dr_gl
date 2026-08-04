import { fail, handle, ok } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getCategoriesWithCount } from "@/lib/queries";
import { serializeCategory } from "@/lib/serialize";
import { categoryCreateSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function GET() {
  return handle(async () => ok({ categories: await getCategoriesWithCount() }));
}

export async function POST(req: Request) {
  return handle(async () => {
    await requireAdmin();
    const { name } = categoryCreateSchema.parse(await req.json());

    const duplicate = await prisma.category.findUnique({ where: { name } });
    if (duplicate) return fail("이미 있는 카테고리예요.", 409);

    const last = await prisma.category.findFirst({ orderBy: { sortOrder: "desc" } });
    const row = await prisma.category.create({
      data: { name, sortOrder: (last?.sortOrder ?? 0) + 1 },
    });
    return ok({ category: serializeCategory(row, 0) }, 201);
  });
}
