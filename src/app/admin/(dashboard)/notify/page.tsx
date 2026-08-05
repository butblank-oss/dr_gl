import { NotifyManager } from "@/components/admin/NotifyManager";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminNotifyPage() {
  const rows = await prisma.notifySignup.findMany({ orderBy: { id: "desc" } });

  return (
    <NotifyManager
      initialSignups={rows.map((row) => ({
        id: row.id,
        email: row.email,
        createdAt: row.createdAt.toISOString(),
      }))}
    />
  );
}
