import { handle, ok } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { notifySignupSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

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
