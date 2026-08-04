import { fail, handle, ok, parseId } from "@/lib/api";
import { hashPassword, requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { serializeAdminUser } from "@/lib/serialize";
import { adminUpdateSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

/** 활성 슈퍼관리자가 최소 한 명은 남아 있어야 한다. 아무도 못 들어오는 상황을 막는 가드. */
async function wouldRemoveLastAdmin(targetId: number): Promise<boolean> {
  const activeAdmins = await prisma.adminUser.count({ where: { role: "ADMIN", isActive: true } });
  if (activeAdmins > 1) return false;
  const target = await prisma.adminUser.findUnique({ where: { id: targetId } });
  return target?.role === "ADMIN" && target.isActive;
}

export async function PATCH(req: Request, { params }: Params) {
  return handle(async () => {
    const me = await requireRole("ADMIN");
    const id = parseId((await params).id);
    const existing = await prisma.adminUser.findUnique({ where: { id } });
    if (!existing) return fail("계정을 찾을 수 없어요.", 404);

    const input = adminUpdateSchema.parse(await req.json());

    const losesAdmin =
      (input.role !== undefined && input.role !== "ADMIN") || input.isActive === false;
    if (losesAdmin && (await wouldRemoveLastAdmin(id))) {
      return fail("마지막 슈퍼관리자예요. 다른 슈퍼관리자를 먼저 만들어주세요.", 409);
    }
    // 자기 자신을 강등·비활성화하면 그 즉시 계정 관리 화면에 못 들어가 되돌릴 수도 없다.
    if (me.id === id && input.isActive === false) {
      return fail("자기 계정은 비활성화할 수 없어요.", 409);
    }
    if (me.id === id && input.role !== undefined && input.role !== "ADMIN") {
      return fail("자기 역할은 낮출 수 없어요. 다른 슈퍼관리자에게 요청하세요.", 409);
    }

    const row = await prisma.adminUser.update({
      where: { id },
      data: {
        ...(input.name === undefined ? {} : { name: input.name }),
        ...(input.role === undefined ? {} : { role: input.role }),
        ...(input.isActive === undefined ? {} : { isActive: input.isActive }),
        ...(input.password === undefined ? {} : { passwordHash: await hashPassword(input.password) }),
      },
    });
    return ok({ admin: serializeAdminUser(row) });
  });
}

export async function DELETE(_req: Request, { params }: Params) {
  return handle(async () => {
    const me = await requireRole("ADMIN");
    const id = parseId((await params).id);
    const existing = await prisma.adminUser.findUnique({ where: { id } });
    if (!existing) return fail("계정을 찾을 수 없어요.", 404);

    if (me.id === id) return fail("자기 계정은 삭제할 수 없어요.", 409);
    if (await wouldRemoveLastAdmin(id)) {
      return fail("마지막 슈퍼관리자예요. 다른 슈퍼관리자를 먼저 만들어주세요.", 409);
    }

    await prisma.adminUser.delete({ where: { id } });
    return ok({ ok: true });
  });
}
