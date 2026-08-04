import { redirect } from "next/navigation";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export const metadata = { title: "Dr. GL Admin" };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect("/admin/login");

  const pendingCount = await prisma.submission.count({ where: { status: "pending" } });

  return (
    <div className="flex min-h-screen bg-ink text-fg">
      <AdminSidebar user={user} pendingCount={pendingCount} />
      <div className="flex min-w-0 flex-1 flex-col gap-[26px] px-11 pb-20 pt-9">{children}</div>
    </div>
  );
}
