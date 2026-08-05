import Link from "next/link";
import { formatDate, formatDateTime } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/** 최근 N일 신규 건수를 함께 보여줄 기간 */
const RECENT_DAYS = 7;

function fmt(value: number): string {
  return value.toLocaleString("ko-KR");
}

function StatCard({
  label,
  value,
  hint,
  accent,
  href,
}: {
  label: string;
  value: string;
  hint?: string;
  accent?: boolean;
  href?: string;
}) {
  const body = (
    <div
      className={`flex h-full flex-col gap-2 rounded-2xl border p-5 ${
        accent ? "border-danger-line bg-danger-soft8" : "border-line8 bg-card"
      }`}
    >
      <div className={`text-xs ${accent ? "font-bold text-danger" : "text-fg50"}`}>{label}</div>
      <div className="text-[28px] font-extrabold">{value}</div>
      {hint ? <div className="text-[11px] leading-relaxed text-fg35">{hint}</div> : null}
    </div>
  );
  return href ? (
    <Link href={href} className="block h-full text-fg hover:text-fg">
      {body}
    </Link>
  ) : (
    body
  );
}

function Panel({
  title,
  action,
  children,
}: {
  title: string;
  action?: { href: string; label: string };
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3 rounded-[14px] border border-line8 bg-panel px-5 py-[18px]">
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm font-bold">{title}</div>
        {action ? (
          <Link href={action.href} className="flex-none text-xs text-accent">
            {action.label}
          </Link>
        ) : null}
      </div>
      {children}
    </section>
  );
}

function List({
  rows,
  empty,
}: {
  rows: { key: string | number; label: string; sub?: string; value: string }[];
  empty: string;
}) {
  if (rows.length === 0) return <div className="py-4 text-[13px] text-fg35">{empty}</div>;
  return (
    <div className="flex flex-col">
      {rows.map((row) => (
        <div
          key={row.key}
          className="flex items-baseline justify-between gap-3 border-t border-[rgba(255,255,255,0.05)] py-2.5 text-[13px]"
        >
          <span className="min-w-0 flex-1 truncate text-fg75">
            {row.label}
            {row.sub ? <span className="ml-2 text-[11px] text-fg35">{row.sub}</span> : null}
          </span>
          <span className="flex-none font-semibold text-fg">{row.value}</span>
        </div>
      ))}
    </div>
  );
}

export default async function AdminDashboardPage() {
  const since = new Date(Date.now() - RECENT_DAYS * 24 * 60 * 60 * 1000);

  const [
    contentCount,
    juiceCount,
    categoryCount,
    contentRecent,
    commentTotal,
    commentVisible,
    commentHidden,
    commentRecent,
    submissionsByStatus,
    submissionRecent,
    notifyCount,
    homeRowCount,
    commentsByContent,
    contentsByCategory,
    recentPending,
    recentComments,
    recentContents,
  ] = await Promise.all([
    prisma.content.count(),
    prisma.content.count({ where: { juice: true } }),
    prisma.category.count(),
    prisma.content.count({ where: { createdAt: { gte: since } } }),
    prisma.comment.count(),
    prisma.comment.count({ where: { status: "visible" } }),
    prisma.comment.count({ where: { status: "hidden" } }),
    prisma.comment.count({ where: { createdAt: { gte: since } } }),
    prisma.submission.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.submission.count({ where: { createdAt: { gte: since } } }),
    prisma.notifySignup.count(),
    prisma.homeRow.count({ where: { isActive: true } }),
    prisma.comment.groupBy({
      by: ["itemId"],
      _count: { _all: true },
      orderBy: { _count: { itemId: "desc" } },
      take: 6,
    }),
    prisma.content.groupBy({ by: ["category"], _count: { _all: true } }),
    prisma.submission.findMany({ where: { status: "pending" }, orderBy: { id: "desc" }, take: 5 }),
    prisma.comment.findMany({
      orderBy: { id: "desc" },
      take: 6,
      include: { item: { select: { title: true } } },
    }),
    prisma.content.findMany({
      orderBy: { createdAt: "desc" },
      take: 6,
      select: { id: true, title: true, category: true, createdAt: true },
    }),
  ]);

  const submissionCount = (status: string) =>
    submissionsByStatus.find((row) => row.status === status)?._count._all ?? 0;

  // 한줄평이 많이 달린 작품에 제목을 붙인다
  const commentedTitles = new Map(
    (
      await prisma.content.findMany({
        where: { id: { in: commentsByContent.map((row) => row.itemId) } },
        select: { id: true, title: true },
      })
    ).map((row) => [row.id, row.title]),
  );

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-2xl font-extrabold">대시보드</h1>
        <Link href="/admin/analytics" className="text-xs text-accent">
          방문 지표 보기 →
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard
          label="대기중인 제보"
          value={fmt(submissionCount("pending"))}
          hint={`승인 ${fmt(submissionCount("approved"))} · 반려 ${fmt(submissionCount("rejected"))} · 최근 ${RECENT_DAYS}일 +${fmt(submissionRecent)}`}
          accent
          href="/admin/submissions"
        />
        <StatCard
          label="등록된 작품"
          value={fmt(contentCount)}
          hint={`착즙 ${fmt(juiceCount)}편 · 카테고리 ${categoryCount}개 · 최근 ${RECENT_DAYS}일 +${fmt(contentRecent)}`}
          href="/admin/content"
        />
        <StatCard
          label="한줄평"
          value={fmt(commentTotal)}
          hint={`노출 ${fmt(commentVisible)} · 숨김 ${fmt(commentHidden)} · 최근 ${RECENT_DAYS}일 +${fmt(commentRecent)}`}
          href="/admin/comments"
        />
        <StatCard
          label="게시판 알림 신청"
          value={fmt(notifyCount)}
          hint={`홈에 노출중인 큐레이션 줄 ${homeRowCount}개`}
          href="/admin/home-rows"
        />
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Panel title="대기중인 제보" action={{ href: "/admin/submissions", label: "제보 검토 →" }}>
          <List
            rows={recentPending.map((submission) => ({
              key: submission.id,
              label: submission.title,
              sub: submission.category,
              value: formatDate(submission.createdAt.toISOString()),
            }))}
            empty="대기중인 제보가 없어요."
          />
        </Panel>

        <Panel title="한줄평이 많이 달린 작품" action={{ href: "/admin/comments", label: "한줄평 검수 →" }}>
          <List
            rows={commentsByContent.map((row) => ({
              key: row.itemId,
              label: commentedTitles.get(row.itemId) ?? `작품 #${row.itemId}`,
              value: `${fmt(row._count._all)}개`,
            }))}
            empty="아직 한줄평이 없어요."
          />
        </Panel>

        <Panel title="최근 한줄평" action={{ href: "/admin/comments", label: "전체 보기 →" }}>
          <List
            rows={recentComments.map((comment) => ({
              key: comment.id,
              label: comment.text.length > 30 ? `${comment.text.slice(0, 30)}…` : comment.text,
              sub: `${comment.item.title}${comment.status === "hidden" ? " · 숨김" : ""}`,
              value: formatDateTime(comment.createdAt.toISOString()).slice(5),
            }))}
            empty="아직 한줄평이 없어요."
          />
        </Panel>

        <Panel title="최근 등록한 작품" action={{ href: "/admin/content", label: "콘텐츠 관리 →" }}>
          <List
            rows={recentContents.map((content) => ({
              key: content.id,
              label: content.title,
              sub: content.category,
              value: formatDate(content.createdAt.toISOString()),
            }))}
            empty="아직 등록된 작품이 없어요."
          />
        </Panel>

        <Panel title="형식별 작품 수" action={{ href: "/admin/categories", label: "카테고리 관리 →" }}>
          <List
            rows={[...contentsByCategory]
              .sort((a, b) => b._count._all - a._count._all)
              .map((row) => ({
                key: row.category,
                label: row.category,
                value: `${fmt(row._count._all)}편`,
              }))}
            empty="아직 등록된 작품이 없어요."
          />
        </Panel>
      </div>
    </>
  );
}
