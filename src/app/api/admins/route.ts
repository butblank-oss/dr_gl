import { fail, handle, ok } from "@/lib/api";
import { hashPassword, requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { serializeAdminUser } from "@/lib/serialize";
import { adminCreateSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

/** 계정 관리는 슈퍼관리자(ADMIN) 전용이다. */
export async function GET() {
  return handle(async () => {
    await requireRole("ADMIN");
    const rows = await prisma.adminUser.findMany({ orderBy: { id: "asc" } });
    return ok({ admins: rows.map(serializeAdminUser) });
  });
}

export async function POST(req: Request) {
  return handle(async () => {
    await requireRole("ADMIN");
    const input = adminCreateSchema.parse(await req.json());

    const duplicate = await prisma.adminUser.findUnique({ where: { email: input.email } });
    if (duplicate) return fail("이미 등록된 이메일이에요.", 409);

    const row = await prisma.adminUser.create({
      data: {
        email: input.email,
        name: input.name,
        role: input.role,
        passwordHash: await hashPassword(input.password),
      },
    });
    return ok({ admin: serializeAdminUser(row) }, 201);
  });
}
