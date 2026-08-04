import { fail, handle, ok } from "@/lib/api";
import { setSessionCookie, verifyPassword } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { loginSchema } from "@/lib/validation";
import type { AdminRole } from "@/lib/types";

export async function POST(req: Request) {
  return handle(async () => {
    const { email, password } = loginSchema.parse(await req.json());
    const user = await prisma.adminUser.findUnique({ where: { email: email.toLowerCase() } });

    // 계정 존재 여부를 노출하지 않도록 동일한 메시지를 쓴다.
    if (!user || !user.isActive || !(await verifyPassword(password, user.passwordHash))) {
      return fail("이메일 또는 비밀번호가 올바르지 않아요.", 401);
    }

    const session = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: (user.role === "ADMIN" ? "ADMIN" : "EDITOR") as AdminRole,
    };
    await setSessionCookie(session);
    await prisma.adminUser.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

    return ok({ user: session });
  });
}
