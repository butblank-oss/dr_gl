import Link from "next/link";
import { AnalyticsSetupGuide } from "@/components/admin/AnalyticsSetupGuide";
import { requireAdmin } from "@/lib/auth";
import { customDimension, isGaConfigured, runReport, toRows } from "@/lib/ga-data";
import type { ReportRow } from "@/lib/ga-data";

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

function StatCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-line8 bg-card p-5">
      <div className="text-xs text-fg50">{label}</div>
      <div className="text-[26px] font-extrabold">{value}</div>
      {hint ? <div className="text-[11px] text-fg35">{hint}</div> : null}
    </div>
  );
}

function Table({
  title,
  hint,
  columns,
  rows,
  empty,
}: {
  title: string;
  hint?: string;
  columns: [string, string];
  rows: { label: string; sub?: string; value: string }[];
  empty: string;
}) {
  return (
    <section className="flex flex-col gap-3 rounded-[14px] border border-line8 bg-panel px-5 py-[18px]">
      <div>
        <div className="text-sm font-bold">{title}</div>
        {hint ? <div className="mt-1 text-[11px] leading-relaxed text-fg40">{hint}</div> : null}
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

export default async function AdminAnalyticsPage({ searchParams }: { searchParams: SearchParams }) {
  await requireAdmin();

  if (!isGaConfigured()) return <AnalyticsSetupGuide />;

  const requested = Number((await searchParams).days);
  const days = RANGES.some((r) => r.days === requested) ? requested : 28;
  const dateRanges = [{ startDate: `${days}daysAgo`, endDate: "today" }];

  const report = (body: Parameters<typeof runReport>[0]) => runReport(body).then(toRows);

  // 요약만은 오류를 그대로 보여준다. 권한·키 문제를 조용히 "데이터 없음"으로 감추면
  // 무엇이 잘못됐는지 알 수 없기 때문.
  let setupError = "";

  const [summary, pages, contents, platforms, searches, lists, sources] = await Promise.all([
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
    safeRows(
      report({
        dateRanges,
        dimensions: [{ name: "pagePath" }],
        metrics: [{ name: "screenPageViews" }, { name: "userEngagementDuration" }],
        orderBys: [{ metric: { metricName: "screenPageViews" }, desc: true }],
        limit: 10,
      }),
    ),
    safeRows(
      report({
        dateRanges,
        dimensions: [customDimension("content_title")],
        metrics: [{ name: "eventCount" }],
        dimensionFilter: {
          filter: { fieldName: "eventName", stringFilter: { value: "select_content" } },
        },
        orderBys: [{ metric: { metricName: "eventCount" }, desc: true }],
        limit: 10,
      }),
    ),
    safeRows(
      report({
        dateRanges,
        dimensions: [customDimension("platform_name"), customDimension("content_title")],
        metrics: [{ name: "eventCount" }],
        dimensionFilter: {
          filter: { fieldName: "eventName", stringFilter: { value: "outbound_platform_click" } },
        },
        orderBys: [{ metric: { metricName: "eventCount" }, desc: true }],
        limit: 10,
      }),
    ),
    safeRows(
      report({
        dateRanges,
        dimensions: [{ name: "searchTerm" }],
        metrics: [{ name: "eventCount" }],
        orderBys: [{ metric: { metricName: "eventCount" }, desc: true }],
        limit: 10,
      }),
    ),
    safeRows(
      report({
        dateRanges,
        dimensions: [customDimension("list_name")],
        metrics: [{ name: "eventCount" }],
        dimensionFilter: {
          filter: { fieldName: "eventName", stringFilter: { value: "select_content" } },
        },
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
  const outboundTotal = platforms.reduce((sum, row) => sum + (row.values[0] ?? 0), 0);
  const noData = users === 0 && views === 0;

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

      {setupError ? (
        <div className="rounded-[14px] border border-danger-line bg-danger-soft8 px-5 py-4 text-[13px] leading-relaxed text-fg70">
          <strong className="text-danger">연결 확인이 필요해요.</strong> {setupError}
        </div>
      ) : null}

      {!setupError && noData ? (
        <div className="rounded-[14px] border border-line8 bg-panel px-5 py-4 text-[13px] leading-relaxed text-fg55">
          아직 집계된 데이터가 없어요. 구글 애널리틱스는 방문이 실제 보고서에 반영되기까지
          <strong className="text-fg80"> 24~48시간</strong>이 걸립니다. 실시간 확인은 GA의 &quot;실시간&quot;
          보고서를 봐주세요.
        </div>
      ) : null}

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

      <div className="rounded-[14px] border border-accent-line bg-accent-soft8 px-5 py-4">
        <div className="text-xs font-bold text-accent">시청처로 나간 클릭</div>
        <div className="mt-1 text-[26px] font-extrabold">{fmt(outboundTotal)}회</div>
        <div className="mt-1 text-[11px] text-fg45">
          작품을 보러 실제로 떠난 횟수예요. 이 숫자가 이 사이트가 제 역할을 했는지를 가장 잘 보여줍니다.
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Table
          title="많이 열린 작품"
          hint="카드·배너를 눌러 상세로 들어간 횟수"
          columns={["작품", "클릭"]}
          rows={contents.map((row) => ({ label: row.keys[0] ?? "(이름 없음)", value: fmt(row.values[0]) }))}
          empty="아직 데이터가 없어요. 맞춤 측정기준 content_title 을 등록했는지 확인해주세요."
        />
        <Table
          title="어느 플랫폼으로 나갔나"
          hint="상세의 '시청·감상 가능한 곳' 클릭"
          columns={["플랫폼 · 작품", "클릭"]}
          rows={platforms.map((row) => ({
            label: row.keys[0] ?? "(이름 없음)",
            sub: row.keys[1],
            value: fmt(row.values[0]),
          }))}
          empty="아직 데이터가 없어요. 맞춤 측정기준 platform_name 을 등록했는지 확인해주세요."
        />
        <Table
          title="많이 본 화면"
          columns={["주소", "조회"]}
          rows={pages.map((row) => ({
            label: row.keys[0] ?? "/",
            sub: row.values[1] ? `머문 시간 ${fmtDuration(row.values[1] / Math.max(row.values[0], 1))}` : undefined,
            value: fmt(row.values[0]),
          }))}
          empty="아직 데이터가 없어요."
        />
        <Table
          title="검색어"
          hint="결과가 없던 검색어는 앞으로 채워야 할 작품이에요"
          columns={["검색어", "횟수"]}
          rows={searches.map((row) => ({ label: row.keys[0] ?? "(빈 검색)", value: fmt(row.values[0]) }))}
          empty="아직 데이터가 없어요."
        />
        <Table
          title="어느 줄에서 눌렸나"
          hint="홈 큐레이션 순서를 정하는 근거로 쓰세요"
          columns={["목록", "클릭"]}
          rows={lists.map((row) => ({ label: row.keys[0] ?? "(목록 없음)", value: fmt(row.values[0]) }))}
          empty="아직 데이터가 없어요. 맞춤 측정기준 list_name 을 등록했는지 확인해주세요."
        />
        <Table
          title="어디서 들어왔나"
          columns={["유입 경로", "방문"]}
          rows={sources.map((row) => ({ label: row.keys[0] ?? "(알 수 없음)", value: fmt(row.values[0]) }))}
          empty="아직 데이터가 없어요."
        />
      </div>

      <p className="text-[11px] leading-relaxed text-fg35">
        구글 애널리틱스의 집계를 그대로 읽어옵니다. 광고 차단 프로그램을 쓰는 방문자는 잡히지 않아
        실제보다 조금 적게 나올 수 있어요. 데이터는 5분 단위로 갱신됩니다.
      </p>
    </>
  );
}
