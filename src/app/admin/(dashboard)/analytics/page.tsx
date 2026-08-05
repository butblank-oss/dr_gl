import Link from "next/link";
import { AnalyticsSetupGuide } from "@/components/admin/AnalyticsSetupGuide";
import { GaConnectForm } from "@/components/admin/GaConnectForm";
import { requireAdmin } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import { customDimension, getGaStatus, runReport, toRows } from "@/lib/ga-data";
import type { ReportRow } from "@/lib/ga-data";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const RANGES = [
  { days: 7, label: "최근 7일" },
  { days: 28, label: "최근 28일" },
  { days: 90, label: "최근 90일" },
] as const;

type SearchParams = Promise<{ days?: string }>;

/** 숫자를 읽기 좋게 (12345 → 12,345) */
function fmt(value: number): string {
  return value.toLocaleString("ko-KR");
}

/** 초 → "1분 23초" */
function fmtDuration(seconds: number): string {
  const total = Math.round(seconds);
  if (total < 60) return `${total}초`;
  return `${Math.floor(total / 60)}분 ${String(total % 60).padStart(2, "0")}초`;
}

/** 주소에서 콘텐츠 id 를 뽑는다. 콘텐츠 상세가 아니면 null. */
function contentIdOf(path: string): number | null {
  const matched = /^\/content\/(\d+)/.exec(path);
  if (!matched) return null;
  const id = Number(matched[1]);
  return Number.isInteger(id) ? id : null;
}

/** 주소를 사람이 읽는 이름으로. 작품 상세는 제목으로 바꾼다. */
function pageLabel(path: string, titles: Map<number, string>): string {
  const id = contentIdOf(path);
  if (id != null) return titles.get(id) ?? `작품 #${id}`;

  const [base] = path.split("?");
  const named: Record<string, string> = {
    "/": "홈",
    "/category": "카테고리 탐색",
    "/search": "검색",
    "/submit": "콘텐츠 제보",
    "/board": "게시판(오픈 예정)",
    "/terms": "이용약관",
    "/privacy": "개인정보처리방침",
  };
  return named[base] ?? path;
}

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-4">
      <div>
        <h2 className="text-base font-bold">{title}</h2>
        {hint ? <p className="mt-1 text-[11px] leading-relaxed text-fg40">{hint}</p> : null}
      </div>
      {children}
    </section>
  );
}

function StatCard({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: string;
  hint?: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`flex flex-col gap-2 rounded-2xl border p-5 ${
        accent ? "border-accent-line bg-accent-soft8" : "border-line8 bg-card"
      }`}
    >
      <div className={`text-xs ${accent ? "font-bold text-accent" : "text-fg50"}`}>{label}</div>
      <div className="text-[26px] font-extrabold">{value}</div>
      {hint ? <div className="text-[11px] leading-relaxed text-fg35">{hint}</div> : null}
    </div>
  );
}

type Row = { label: string; sub?: string; value: string };

function Table({
  title,
  hint,
  columns,
  rows,
  empty,
  action,
}: {
  title: string;
  hint?: string;
  columns: [string, string];
  rows: Row[];
  empty: string;
  action?: { href: string; label: string };
}) {
  return (
    <section className="flex flex-col gap-3 rounded-[14px] border border-line8 bg-panel px-5 py-[18px]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-bold">{title}</div>
          {hint ? <div className="mt-1 text-[11px] leading-relaxed text-fg40">{hint}</div> : null}
        </div>
        {action ? (
          <Link href={action.href} className="flex-none text-xs text-accent">
            {action.label}
          </Link>
        ) : null}
      </div>
      {rows.length === 0 ? (
        <div className="py-6 text-center text-[13px] text-fg35">{empty}</div>
      ) : (
        <table className="w-full border-collapse text-[13px]">
          <thead>
            <tr className="text-left text-[11px] text-fg40">
              <th className="pb-2 font-semibold">{columns[0]}</th>
              <th className="pb-2 text-right font-semibold">{columns[1]}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={`${row.label}-${index}`} className="border-t border-[rgba(255,255,255,0.05)]">
                <td className="py-2.5 pr-3">
                  <span className="mr-2 text-fg30">{index + 1}</span>
                  <span className="text-fg80">{row.label}</span>
                  {row.sub ? <span className="ml-2 text-[11px] text-fg35">{row.sub}</span> : null}
                </td>
                <td className="py-2.5 text-right font-semibold text-fg">{row.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}

/** 보고서 하나가 실패해도 화면 전체가 죽지 않게 감싼다 (맞춤 측정기준 미등록 등) */
async function safeRows(promise: Promise<ReturnType<typeof toRows>>): Promise<ReportRow[]> {
  try {
    return await promise;
  } catch {
    return [];
  }
}

/** 값이 비어 있거나 GA가 "(not set)" 으로 준 줄은 버린다 — 측정기준 등록 전 데이터 */
function named(rows: ReportRow[]): ReportRow[] {
  return rows.filter((row) => {
    const key = row.keys[0] ?? "";
    return key !== "" && key !== "(not set)" && key !== "(other)";
  });
}

export default async function AdminAnalyticsPage({ searchParams }: { searchParams: SearchParams }) {
  const me = await requireAdmin();
  const status = await getGaStatus();

  const requested = Number((await searchParams).days);
  const days = RANGES.some((r) => r.days === requested) ? requested : 28;
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  /* ---------------------------------------------------------------- *
   * 우리 DB 지표 — GA와 무관하게 항상 정확하다.
   * ---------------------------------------------------------------- */
  const [
    contentCount,
    juiceCount,
    categoryCount,
    commentTotal,
    commentVisible,
    commentHidden,
    commentRecent,
    submissionsByStatus,
    submissionRecent,
    notifyCount,
    commentsByContent,
    recentContents,
    recentComments,
    contentsByCategory,
  ] = await Promise.all([
    prisma.content.count(),
    prisma.content.count({ where: { juice: true } }),
    prisma.category.count(),
    prisma.comment.count(),
    prisma.comment.count({ where: { status: "visible" } }),
    prisma.comment.count({ where: { status: "hidden" } }),
    prisma.comment.count({ where: { createdAt: { gte: since } } }),
    prisma.submission.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.submission.count({ where: { createdAt: { gte: since } } }),
    prisma.notifySignup.count(),
    prisma.comment.groupBy({
      by: ["itemId"],
      _count: { _all: true },
      orderBy: { _count: { itemId: "desc" } },
      take: 8,
    }),
    prisma.content.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, title: true, category: true, createdAt: true },
    }),
    prisma.comment.findMany({
      orderBy: { id: "desc" },
      take: 5,
      select: { id: true, text: true, status: true, createdAt: true, item: { select: { title: true } } },
    }),
    prisma.content.groupBy({ by: ["category"], _count: { _all: true } }),
  ]);

  const submissionCount = (statusName: string) =>
    submissionsByStatus.find((row) => row.status === statusName)?._count._all ?? 0;

  // 한줄평이 많이 달린 작품 — 제목을 붙인다
  const commentedIds = commentsByContent.map((row) => row.itemId);
  const commentedTitles = new Map(
    (
      await prisma.content.findMany({
        where: { id: { in: commentedIds } },
        select: { id: true, title: true },
      })
    ).map((row) => [row.id, row.title]),
  );

  /* ---------------------------------------------------------------- *
   * GA 지표
   * ---------------------------------------------------------------- */
  const dateRanges = [{ startDate: `${days}daysAgo`, endDate: "today" }];
  const report = (body: Parameters<typeof runReport>[0]) => runReport(body).then(toRows);
  const eventFilter = (name: string) => ({
    filter: { fieldName: "eventName", stringFilter: { value: name } },
  });

  // 아직 아무것도 넣지 않았으면 설정 방법부터 안내한다. (DB 지표는 그 아래에 그대로 보여준다)
  const notConnected = !status.ready && !status.problem;

  let setupError = "";
  const [summary, pages, outbound, platforms, searches, lists, sources] = notConnected
    ? [[], [], [], [], [], [], []].map(() => [] as ReportRow[])
    : await Promise.all([
        report({
          dateRanges,
          metrics: [
            { name: "activeUsers" },
            { name: "sessions" },
            { name: "screenPageViews" },
            { name: "userEngagementDuration" },
          ],
        }).catch((error: unknown) => {
          setupError = error instanceof Error ? error.message : "GA 데이터를 불러오지 못했어요.";
          return [] as ReportRow[];
        }),
        // 주소별 조회수. 작품 순위도 여기서 뽑는다 — 맞춤 측정기준 등록 전 데이터까지 잡히기 때문.
        safeRows(
          report({
            dateRanges,
            dimensions: [{ name: "pagePath" }],
            metrics: [{ name: "screenPageViews" }, { name: "userEngagementDuration" }],
            orderBys: [{ metric: { metricName: "screenPageViews" }, desc: true }],
            limit: 200,
          }),
        ),
        // 시청처 클릭 총합 — 맞춤 측정기준과 무관하게 항상 집계된다.
        safeRows(
          report({
            dateRanges,
            metrics: [{ name: "eventCount" }],
            dimensionFilter: eventFilter("outbound_platform_click"),
          }),
        ),
        safeRows(
          report({
            dateRanges,
            dimensions: [customDimension("platform_name")],
            metrics: [{ name: "eventCount" }],
            dimensionFilter: eventFilter("outbound_platform_click"),
            orderBys: [{ metric: { metricName: "eventCount" }, desc: true }],
            limit: 10,
          }),
        ),
        safeRows(
          report({
            dateRanges,
            dimensions: [customDimension("search_term")],
            metrics: [{ name: "eventCount" }],
            dimensionFilter: eventFilter("search"),
            orderBys: [{ metric: { metricName: "eventCount" }, desc: true }],
            limit: 10,
          }),
        ),
        safeRows(
          report({
            dateRanges,
            dimensions: [customDimension("list_name")],
            metrics: [{ name: "eventCount" }],
            dimensionFilter: eventFilter("select_content"),
            orderBys: [{ metric: { metricName: "eventCount" }, desc: true }],
            limit: 10,
          }),
        ),
        safeRows(
          report({
            dateRanges,
            dimensions: [{ name: "sessionDefaultChannelGroup" }],
            metrics: [{ name: "sessions" }],
            orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
            limit: 8,
          }),
        ),
      ]);

  const [users = 0, sessions = 0, views = 0, engagement = 0] = summary[0]?.values ?? [];
  const outboundTotal = outbound[0]?.values[0] ?? 0;

  // 주소에 섞인 작품 id 의 제목을 한 번에 읽어 표에 붙인다.
  const pageIds = pages.map((row) => contentIdOf(row.keys[0] ?? "")).filter((id): id is number => id != null);
  const pageTitles = new Map(
    (
      await prisma.content.findMany({
        where: { id: { in: [...new Set(pageIds)] } },
        select: { id: true, title: true },
      })
    ).map((row) => [row.id, row.title]),
  );

  // 작품 상세 조회수를 작품별로 합친다 (쿼리스트링 때문에 여러 줄로 나뉠 수 있다)
  const contentViews = new Map<number, number>();
  for (const row of pages) {
    const id = contentIdOf(row.keys[0] ?? "");
    if (id == null) continue;
    contentViews.set(id, (contentViews.get(id) ?? 0) + (row.values[0] ?? 0));
  }
  const topContents: Row[] = [...contentViews.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([id, count]) => ({
      label: pageTitles.get(id) ?? `작품 #${id}`,
      sub: `#${id}`,
      value: fmt(count),
    }));

  const connectForm = (
    <GaConnectForm
      ready={status.ready}
      propertyId={status.propertyId}
      clientEmail={status.clientEmail}
      canEdit={me.role === "ADMIN"}
    />
  );

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-extrabold">방문 분석</h1>
        <div className="flex gap-2">
          {RANGES.map((range) => (
            <Link
              key={range.days}
              href={`/admin/analytics?days=${range.days}`}
              className={`chip !px-[13px] !py-2 !text-xs ${days === range.days ? "chip-on" : "chip-off"}`}
            >
              {range.label}
            </Link>
          ))}
        </div>
      </div>

      {/* ── 우리 데이터 (항상 정확) ─────────────────────────────── */}
      <Section
        title="사이트 현황"
        hint="우리 데이터베이스에서 바로 세는 값이라 광고 차단이나 집계 지연과 무관하게 정확해요."
      >
        <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
          <StatCard
            label="등록된 작품"
            value={fmt(contentCount)}
            hint={`착즙 ${fmt(juiceCount)}편 · 카테고리 ${categoryCount}개`}
          />
          <StatCard
            label="한줄평"
            value={fmt(commentTotal)}
            hint={`노출 ${fmt(commentVisible)} · 숨김 ${fmt(commentHidden)} · 최근 ${days}일 +${fmt(commentRecent)}`}
          />
          <StatCard
            label="대기중인 제보"
            value={fmt(submissionCount("pending"))}
            hint={`승인 ${fmt(submissionCount("approved"))} · 반려 ${fmt(submissionCount("rejected"))} · 최근 ${days}일 +${fmt(submissionRecent)}`}
          />
          <StatCard label="게시판 오픈 알림 신청" value={fmt(notifyCount)} hint="게시판이 열리면 안내할 사람 수" />
        </div>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <Table
            title="한줄평이 많이 달린 작품"
            hint="반응이 실제로 남은 작품이에요"
            columns={["작품", "한줄평"]}
            rows={commentsByContent.map((row) => ({
              label: commentedTitles.get(row.itemId) ?? `작품 #${row.itemId}`,
              sub: `#${row.itemId}`,
              value: fmt(row._count._all),
            }))}
            empty="아직 한줄평이 없어요."
            action={{ href: "/admin/comments", label: "한줄평 검수 →" }}
          />
          <Table
            title="형식별 작품 수"
            columns={["형식", "작품"]}
            rows={[...contentsByCategory]
              .sort((a, b) => b._count._all - a._count._all)
              .map((row) => ({ label: row.category, value: fmt(row._count._all) }))}
            empty="아직 등록된 작품이 없어요."
            action={{ href: "/admin/content", label: "콘텐츠 관리 →" }}
          />
          <Table
            title="최근 등록한 작품"
            columns={["작품", "등록일"]}
            rows={recentContents.map((row) => ({
              label: row.title,
              sub: row.category,
              value: formatDate(row.createdAt.toISOString()),
            }))}
            empty="아직 등록된 작품이 없어요."
          />
          <Table
            title="최근 한줄평"
            columns={["내용", "작성일"]}
            rows={recentComments.map((row) => ({
              label: row.text.length > 28 ? `${row.text.slice(0, 28)}…` : row.text,
              sub: `${row.item.title}${row.status === "hidden" ? " · 숨김" : ""}`,
              value: formatDate(row.createdAt.toISOString()),
            }))}
            empty="아직 한줄평이 없어요."
            action={{ href: "/admin/comments", label: "전체 보기 →" }}
          />
        </div>
      </Section>

      {/* ── 방문 (GA) ──────────────────────────────────────────── */}
      <Section
        title="방문 지표"
        hint="구글 애널리틱스 집계예요. 광고 차단 프로그램을 쓰는 방문자는 잡히지 않아 실제보다 조금 적게 나올 수 있고, 반영에 24~48시간이 걸립니다."
      >
        {notConnected ? <AnalyticsSetupGuide /> : null}

        {setupError || status.problem ? (
          <div className="flex flex-col gap-1.5 rounded-[14px] border border-danger-line bg-danger-soft8 px-5 py-4 text-[13px] leading-relaxed text-fg70">
            <div>
              <strong className="text-danger">연결 확인이 필요해요.</strong> {status.problem || setupError}
            </div>
            {status.hint ? <div className="text-[11px] text-fg45">{status.hint}</div> : null}
            {status.fromEnv ? (
              <div className="text-[11px] text-fg45">
                지금 값은 배포 환경변수에서 읽고 있어요. 아래 &quot;연결 설정&quot;에 붙여넣으면 그 값이 우선
                적용되고 재배포도 필요 없습니다.
              </div>
            ) : null}
          </div>
        ) : null}

        {connectForm}

        {status.ready ? (
          <>
            <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
              <StatCard label="방문자" value={fmt(users)} hint={`최근 ${days}일`} />
              <StatCard label="방문 횟수" value={fmt(sessions)} />
              <StatCard label="화면 조회" value={fmt(views)} />
              <StatCard
                label="1인당 머문 시간"
                value={users ? fmtDuration(engagement / users) : "—"}
                hint="총 참여 시간 ÷ 방문자"
              />
            </div>

            <StatCard
              label="시청처로 나간 클릭"
              value={`${fmt(outboundTotal)}회`}
              hint="작품을 보러 실제로 떠난 횟수예요. 이 숫자가 이 사이트가 제 역할을 했는지를 가장 잘 보여줍니다."
              accent
            />

            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
              <Table
                title="많이 열린 작품"
                hint="작품 상세를 몇 번 봤는지"
                columns={["작품", "조회"]}
                rows={topContents}
                empty="아직 작품 상세를 본 기록이 없어요."
              />
              <Table
                title="많이 본 화면"
                columns={["화면", "조회"]}
                rows={pages.slice(0, 10).map((row) => {
                  const path = row.keys[0] ?? "/";
                  const perView = row.values[0] ? row.values[1] / row.values[0] : 0;
                  return {
                    label: pageLabel(path, pageTitles),
                    sub: perView ? `머문 시간 ${fmtDuration(perView)}` : undefined,
                    value: fmt(row.values[0]),
                  };
                })}
                empty="아직 데이터가 없어요."
              />
              <Table
                title="어느 플랫폼으로 나갔나"
                hint="상세의 '시청·감상 가능한 곳' 클릭"
                columns={["플랫폼", "클릭"]}
                rows={named(platforms).map((row) => ({ label: row.keys[0], value: fmt(row.values[0]) }))}
                empty="아직 데이터가 없어요. 맞춤 측정기준을 등록한 뒤부터 쌓입니다."
              />
              <Table
                title="검색어"
                hint="결과가 없던 검색어는 앞으로 채워야 할 작품이에요"
                columns={["검색어", "횟수"]}
                rows={named(searches).map((row) => ({ label: row.keys[0], value: fmt(row.values[0]) }))}
                empty="아직 데이터가 없어요. 맞춤 측정기준 search_term 을 등록했는지 확인해주세요."
              />
              <Table
                title="어느 줄에서 눌렸나"
                hint="홈 큐레이션 순서를 정하는 근거로 쓰세요"
                columns={["목록", "클릭"]}
                rows={named(lists).map((row) => ({ label: row.keys[0], value: fmt(row.values[0]) }))}
                empty="아직 데이터가 없어요. 맞춤 측정기준을 등록한 뒤부터 쌓입니다."
              />
              <Table
                title="어디서 들어왔나"
                columns={["유입 경로", "방문"]}
                rows={named(sources).map((row) => ({ label: row.keys[0], value: fmt(row.values[0]) }))}
                empty="아직 데이터가 없어요."
              />
            </div>
          </>
        ) : null}
      </Section>
    </>
  );
}
