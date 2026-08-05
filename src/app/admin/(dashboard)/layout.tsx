import { redirect } from "next/navigation";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Dr. GL Admin",
  // 어드민은 검색에 절대 노출되면 안 된다
  robots: { index: false, follow: false },
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect("/admin/login");

  const pendingCount = await prisma.submission.count({ where: { status: "pending" } });

  return (
    <div className="flex min-h-screen flex-col bg-ink text-fg lg:flex-row">
      <AdminSidebar user={user} pendingCount={pendingCount} />
      <div className="flex min-w-0 flex-1 flex-col gap-5 px-5 pb-20 pt-6 md:gap-[26px] lg:px-11 lg:pt-9">
        {children}
      </div>
    </div>
  );
}
