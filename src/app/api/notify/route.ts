import { handle, ok } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notifySignupSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

/** 어드민 — 오픈 알림을 신청한 이메일 목록 */
export async function GET() {
  return handle(async () => {
    await requireAdmin();
    const rows = await prisma.notifySignup.findMany({ orderBy: { id: "desc" } });
    return ok({
      signups: rows.map((row) => ({
        id: row.id,
        email: row.email,
        createdAt: row.createdAt.toISOString(),
      })),
    });
  });
}

/** 게시판 오픈 알림 신청. 실제 발송은 하지 않고 신청만 받아둔다. */
export async function POST(req: Request) {
  return handle(async () => {
    const { email } = notifySignupSchema.parse(await req.json());
    await prisma.notifySignup.upsert({
      where: { email },
      create: { email },
      update: {},
    });
    return ok({ ok: true }, 201);
  });
}
