import { handle, ok } from "@/lib/api";
import { clearSessionCookie } from "@/lib/auth";

export async function POST() {
  return handle(async () => {
    await clearSessionCookie();
    return ok({ ok: true });
  });
}
