import { redirect } from "next/navigation";
import { AccountManager } from "@/components/admin/AccountManager";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { serializeAdminUser } from "@/lib/serialize";

export const dynamic = "force-dynamic";

export default async function AdminAccountsPage() {
  const me = await getSessionUser();
  if (!me) redirect("/admin/login");
  // 운영자가 주소로 직접 들어와도 막는다. (API 쪽에서도 한 번 더 검사)
  if (me.role !== "ADMIN") redirect("/admin");

  const rows = await prisma.adminUser.findMany({ orderBy: { id: "asc" } });
  return <AccountManager initialAdmins={rows.map(serializeAdminUser)} me={me} />;
}
