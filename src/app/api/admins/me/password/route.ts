import { fail, handle, ok } from "@/lib/api";
import { hashPassword, requireAdmin, verifyPassword } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { passwordChangeSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

/** 로그인한 본인이 자기 비밀번호를 바꾼다. 운영자도 쓸 수 있다. */
export async function PATCH(req: Request) {
  return handle(async () => {
    const me = await requireAdmin();
    const { currentPassword, newPassword } = passwordChangeSchema.parse(await req.json());

    const user = await prisma.adminUser.findUnique({ where: { id: me.id } });
    if (!user) return fail("계정을 찾을 수 없어요.", 404);
    if (!(await verifyPassword(currentPassword, user.passwordHash))) {
      return fail("현재 비밀번호가 맞지 않아요.", 401);
    }

    await prisma.adminUser.update({
      where: { id: me.id },
      data: { passwordHash: await hashPassword(newPassword) },
    });
    return ok({ ok: true });
  });
}
