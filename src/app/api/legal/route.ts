import { handle, ok } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { getAllLegalDocuments } from "@/lib/queries";

export const dynamic = "force-dynamic";

export async function GET() {
  return handle(async () => {
    await requireAdmin();
    return ok({ documents: await getAllLegalDocuments() });
  });
}
