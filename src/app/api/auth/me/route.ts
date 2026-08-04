import { handle, ok } from "@/lib/api";
import { getSessionUser } from "@/lib/auth";

export async function GET() {
  return handle(async () => ok({ user: await getSessionUser() }));
}
