import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function StatCard({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-line8 bg-card p-5">
      <div className="text-xs text-fg50">{label}</div>
      <div className={`text-[28px] font-extrabold ${accent ? "text-danger" : ""}`}>{value}</div>
    </div>
  );
}

export default async function AdminDashboardPage() {
  const [itemCount, pendingCount, visibleCommentCount, categoryCount, recentPending, recentComments] =
    await Promise.all([
      prisma.content.count(),
      prisma.submission.count({ where: { status: "pending" } }),
      prisma.comment.count({ where: { status: "visible" } }),
      prisma.category.count(),
      prisma.submission.findMany({ where: { status: "pending" }, orderBy: { id: "desc" }, take: 3 }),
      prisma.comment.findMany({
        orderBy: { id: "desc" },
        take: 3,
        include: { item: { select: { title: true } } },
      }),
    ]);

  return (
    <>
      <h1 className="text-2xl font-extrabold">대시보드</h1>

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard label="전체 콘텐츠" value={itemCount} />
        <StatCard label="대기중인 제보" value={pendingCount} accent />
        <StatCard label="노출중인 한줄평" value={visibleCommentCount} />
        <StatCard label="카테고리 수" value={categoryCount} />
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <section className="flex flex-col gap-3 rounded-[14px] border border-line8 bg-panel px-5 py-[18px]">
          <div className="flex items-center justify-between">
            <div className="text-sm font-bold">대기중인 제보</div>
            <Link href="/admin/submissions" className="text-xs text-accent">
              전체 보기 →
            </Link>
          </div>
          {recentPending.length > 0 ? (
            recentPending.map((submission) => (
              <div key={submission.id} className="border-t border-[rgba(255,255,255,0.05)] py-2 text-[13px] text-fg75">
                {submission.title}
              </div>
            ))
          ) : (
            <div className="text-[13px] text-fg35">대기중인 제보가 없어요.</div>
          )}
        </section>

        <section className="flex flex-col gap-3 rounded-[14px] border border-line8 bg-panel px-5 py-[18px]">
          <div className="flex items-center justify-between">
            <div className="text-sm font-bold">최근 한줄평</div>
            <Link href="/admin/comments" className="text-xs text-accent">
              전체 보기 →
            </Link>
          </div>
          {recentComments.length > 0 ? (
            recentComments.map((comment) => (
              <div key={comment.id} className="border-t border-[rgba(255,255,255,0.05)] py-2 text-[13px] text-fg75">
                {comment.item.title} · {comment.text}
              </div>
            ))
          ) : (
            <div className="text-[13px] text-fg35">아직 한줄평이 없어요.</div>
          )}
        </section>
      </div>
    </>
  );
}
