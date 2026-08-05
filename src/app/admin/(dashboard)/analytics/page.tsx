import Link from "next/link";
import { AnalyticsSetupGuide, GaDimensionGuide } from "@/components/admin/AnalyticsSetupGuide";
import { GaConnectForm } from "@/components/admin/GaConnectForm";
import { requireAdmin } from "@/lib/auth";
import { customDimension, getGaStatus, runReports } from "@/lib/ga-data";
import type { ReportRow } from "@/lib/ga-data";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const RANGES = [
  { days: 7, label: "최근 7일" },
  { days: 28, label: "최근 28일" },
  { days: 90, label: "최근 90일" },
] as const;

type SearchParams = Promise<{ days?: string }>;

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

function fmt(value: number): string {
  return value.toLocaleString("ko-KR");
}

function pct(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

/** 초 → "1분 23초" */
function fmtDuration(seconds: number): string {
  const total = Math.round(seconds);
  if (total < 60) return `${total}초`;
  return `${Math.floor(total / 60)}분 ${String(total % 60).padStart(2, "0")}초`;
}

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

/** 우리가 심은 이벤트 이름을 한국어로 */
const EVENT_LABELS: Record<string, string> = {
  page_view: "화면 열람",
  page_engagement: "화면 체류(이탈 시 기록)",
  scroll_depth: "스크롤 깊이 도달",
  select_content: "작품 카드 클릭",
  outbound_platform_click: "시청처로 나감",
  search: "검색",
  search_suggestion_click: "추천 태그 클릭",
  filter_change: "필터 조작",
  nav_click: "내비게이션 클릭",
  submission_start: "제보 폼 열람",
  submission_complete: "제보 완료",
  submission_error: "제보 실패",
  comment_submit: "한줄평 작성",
  comment_expand: "한줄평 더보기",
  board_notify_signup: "게시판 알림 신청",
  session_start: "방문 시작",
  first_visit: "첫 방문",
  user_engagement: "참여(구글 기본)",
};

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

type Row = { label: string; sub?: string; value: string; ratio?: number };

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
  rows: Row[];
  empty: string;
}) {
  const max = rows.reduce((m, row) => Math.max(m, row.ratio ?? 0), 0);
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
                  <div className="flex items-baseline gap-2">
                    <span className="text-fg30">{index + 1}</span>
                    <span className="min-w-0 flex-1 truncate text-fg80">{row.label}</span>
                    {row.sub ? <span className="flex-none text-[11px] text-fg35">{row.sub}</span> : null}
                  </div>
                  {/* 값의 크기를 눈으로 비교할 수 있게 가는 막대를 깐다 */}
                  {row.ratio && max > 0 ? (
                    <div className="mt-1.5 h-[3px] w-full overflow-hidden rounded-full bg-surface6">
                      <div
                        className="h-full rounded-full bg-accent-soft"
                        style={{ width: `${Math.max(2, (row.ratio / max) * 100)}%` }}
                      />
                    </div>
                  ) : null}
                </td>
                <td className="py-2.5 text-right align-top font-semibold text-fg">{row.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}

/** 값이 비었거나 GA가 "(not set)" 으로 준 줄은 버린다 — 측정기준 등록 전 데이터 */
function named(rows: ReportRow[]): ReportRow[] {
  return rows.filter((row) => {
    const key = row.keys[0] ?? "";
    return key !== "" && key !== "(not set)" && key !== "(other)";
  });
}

function simpleRows(rows: ReportRow[], unit = ""): Row[] {
  return named(rows).map((row) => ({
    label: row.keys[0],
    value: `${fmt(row.values[0])}${unit}`,
    ratio: row.values[0],
  }));
}

export default async function AdminAnalyticsPage({ searchParams }: { searchParams: SearchParams }) {
  const me = await requireAdmin();
  const status = await getGaStatus();

  const requested = Number((await searchParams).days);
  const days = RANGES.some((r) => r.days === requested) ? requested : 28;
  const dateRanges = [{ startDate: `${days}daysAgo`, endDate: "today" }];

  const connectForm = (
    <GaConnectForm
      ready={status.ready}
      propertyId={status.propertyId}
      clientEmail={status.clientEmail}
      canEdit={me.role === "ADMIN"}
    />
  );

  const header = (
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
  );

  // 아직 연결 전이면 설정 안내만 보여준다.
  if (!status.ready) {
    return (
      <>
        {header}
        {status.problem ? (
          <div className="flex flex-col gap-1.5 rounded-[14px] border border-danger-line bg-danger-soft8 px-5 py-4 text-[13px] leading-relaxed text-fg70">
            <div>
              <strong className="text-danger">연결 확인이 필요해요.</strong> {status.problem}
            </div>
            {status.hint ? <div className="text-[11px] text-fg45">{status.hint}</div> : null}
          </div>
        ) : (
          <AnalyticsSetupGuide />
        )}
        {connectForm}
      </>
    );
  }

  const eventFilter = (name: string) => ({
    filter: { fieldName: "eventName", stringFilter: { value: name } },
  });
  const top = (metric: string) => [{ metric: { metricName: metric }, desc: true }];

  let loadError = "";
  const reports = await runReports([
    // 0 요약
    {
      dateRanges,
      metrics: [
        { name: "activeUsers" },
        { name: "sessions" },
        { name: "screenPageViews" },
        { name: "userEngagementDuration" },
        { name: "newUsers" },
        { name: "engagementRate" },
      ],
    },
    // 1 화면별 (작품 순위도 여기서 뽑는다)
    {
      dateRanges,
      dimensions: [{ name: "pagePath" }],
      metrics: [{ name: "screenPageViews" }, { name: "userEngagementDuration" }],
      orderBys: top("screenPageViews"),
      limit: 200,
    },
    // 2 이벤트별 발생 횟수
    {
      dateRanges,
      dimensions: [{ name: "eventName" }],
      metrics: [{ name: "eventCount" }],
      orderBys: top("eventCount"),
      limit: 25,
    },
    // 3 시청처(플랫폼)별
    {
      dateRanges,
      dimensions: [customDimension("platform_name")],
      metrics: [{ name: "eventCount" }],
      dimensionFilter: eventFilter("outbound_platform_click"),
      orderBys: top("eventCount"),
      limit: 10,
    },
    // 4 작품별 시청처 클릭
    {
      dateRanges,
      dimensions: [customDimension("content_title")],
      metrics: [{ name: "eventCount" }],
      dimensionFilter: eventFilter("outbound_platform_click"),
      orderBys: top("eventCount"),
      limit: 10,
    },
    // 5 검색어
    {
      dateRanges,
      dimensions: [customDimension("search_term")],
      metrics: [{ name: "eventCount" }],
      dimensionFilter: eventFilter("search"),
      orderBys: top("eventCount"),
      limit: 15,
    },
    // 6 목록별 클릭
    {
      dateRanges,
      dimensions: [customDimension("list_name")],
      metrics: [{ name: "eventCount" }],
      dimensionFilter: eventFilter("select_content"),
      orderBys: top("eventCount"),
      limit: 10,
    },
    // 7 유입 경로
    {
      dateRanges,
      dimensions: [{ name: "sessionDefaultChannelGroup" }],
      metrics: [{ name: "sessions" }],
      orderBys: top("sessions"),
      limit: 8,
    },
    // 8 국가
    {
      dateRanges,
      dimensions: [{ name: "country" }],
      metrics: [{ name: "activeUsers" }],
      orderBys: top("activeUsers"),
      limit: 10,
    },
    // 9 기기
    {
      dateRanges,
      dimensions: [{ name: "deviceCategory" }],
      metrics: [{ name: "activeUsers" }],
      orderBys: top("activeUsers"),
      limit: 5,
    },
    // 10 신규 vs 재방문
    {
      dateRanges,
      dimensions: [{ name: "newVsReturning" }],
      metrics: [{ name: "activeUsers" }],
      orderBys: top("activeUsers"),
      limit: 5,
    },
    // 11 요일
    {
      dateRanges,
      dimensions: [{ name: "dayOfWeek" }],
      metrics: [{ name: "sessions" }],
      limit: 7,
    },
    // 12 시간대
    {
      dateRanges,
      dimensions: [{ name: "hour" }],
      metrics: [{ name: "sessions" }],
      limit: 24,
    },
    // 13 첫 화면
    {
      dateRanges,
      dimensions: [{ name: "landingPage" }],
      metrics: [{ name: "sessions" }],
      orderBys: top("sessions"),
      limit: 10,
    },
    // 14 나간 도메인
    {
      dateRanges,
      dimensions: [customDimension("destination")],
      metrics: [{ name: "eventCount" }],
      dimensionFilter: eventFilter("outbound_platform_click"),
      orderBys: top("eventCount"),
      limit: 10,
    },
    // 15 결과가 없던 검색어
    {
      dateRanges,
      dimensions: [customDimension("search_term")],
      metrics: [{ name: "eventCount" }],
      dimensionFilter: {
        andGroup: {
          expressions: [
            eventFilter("search"),
            { filter: { fieldName: "customEvent:results", stringFilter: { value: "0" } } },
          ],
        },
      },
      orderBys: top("eventCount"),
      limit: 15,
    },
    // 16 필터 사용
    {
      dateRanges,
      dimensions: [customDimension("filter_type"), customDimension("filter_value")],
      metrics: [{ name: "eventCount" }],
      dimensionFilter: eventFilter("filter_change"),
      orderBys: top("eventCount"),
      limit: 15,
    },
    // 17 눌린 버튼
    {
      dateRanges,
      dimensions: [customDimension("label")],
      metrics: [{ name: "eventCount" }],
      dimensionFilter: eventFilter("nav_click"),
      orderBys: top("eventCount"),
      limit: 12,
    },
    // 18 스크롤 깊이
    {
      dateRanges,
      dimensions: [customDimension("percent")],
      metrics: [{ name: "eventCount" }],
      dimensionFilter: eventFilter("scroll_depth"),
      limit: 5,
    },
    // 19 착즙 작품이 얼마나 눌리나
    {
      dateRanges,
      dimensions: [customDimension("juice")],
      metrics: [{ name: "eventCount" }],
      dimensionFilter: eventFilter("select_content"),
      limit: 3,
    },
    // 20 어떤 형식이 눌리나
    {
      dateRanges,
      dimensions: [customDimension("content_category")],
      metrics: [{ name: "eventCount" }],
      dimensionFilter: eventFilter("select_content"),
      orderBys: top("eventCount"),
      limit: 10,
    },
    // 21 제보 완료의 형식 분포
    {
      dateRanges,
      dimensions: [customDimension("submit_category")],
      metrics: [{ name: "eventCount" }],
      dimensionFilter: eventFilter("submission_complete"),
      orderBys: top("eventCount"),
      limit: 10,
    },
  ]).catch((error: unknown) => {
    loadError = error instanceof Error ? error.message : "GA 데이터를 불러오지 못했어요.";
    return [] as ReportRow[][];
  });

  const [
    summary = [],
    pages = [],
    events = [],
    platforms = [],
    contentOutbound = [],
    searches = [],
    lists = [],
    channels = [],
    countries = [],
    devices = [],
    visitors = [],
    weekdays = [],
    hours = [],
    landings = [],
    destinations = [],
    zeroSearches = [],
    filters = [],
    buttons = [],
    scrolls = [],
    juiceClicks = [],
    categoryClicks = [],
    submitCategories = [],
  ] = reports;

  const [users = 0, sessions = 0, views = 0, engagement = 0, newUsers = 0, engagementRate = 0] =
    summary[0]?.values ?? [];

  const eventCount = (name: string) =>
    events.find((row) => row.keys[0] === name)?.values[0] ?? 0;
  const outboundTotal = eventCount("outbound_platform_click");
  const cardClicks = eventCount("select_content");

  // 주소에 섞인 작품 id 의 제목을 한 번에 읽어 붙인다.
  const pageIds = [
    ...new Set(pages.map((row) => contentIdOf(row.keys[0] ?? "")).filter((id): id is number => id != null)),
  ];
  const pageTitles = new Map(
    (
      await prisma.content.findMany({ where: { id: { in: pageIds } }, select: { id: true, title: true } })
    ).map((row) => [row.id, row.title]),
  );

  const contentViews = new Map<number, number>();
  for (const row of pages) {
    const id = contentIdOf(row.keys[0] ?? "");
    if (id == null) continue;
    contentViews.set(id, (contentViews.get(id) ?? 0) + (row.values[0] ?? 0));
  }
  const detailViews = [...contentViews.values()].reduce((sum, value) => sum + value, 0);
  const topContents: Row[] = [...contentViews.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([id, count]) => ({
      label: pageTitles.get(id) ?? `작품 #${id}`,
      value: fmt(count),
      ratio: count,
    }));

  return (
    <>
      {header}

      {loadError ? (
        <div className="rounded-[14px] border border-danger-line bg-danger-soft8 px-5 py-4 text-[13px] leading-relaxed text-fg70">
          <strong className="text-danger">불러오지 못했어요.</strong> {loadError}
        </div>
      ) : null}

      {/* ── 한눈에 ─────────────────────────────────────────── */}
      <Section
        title="한눈에"
        hint={`최근 ${days}일. 구글 애널리틱스 집계라 광고 차단 프로그램을 쓰는 방문자는 빠지고, 반영에 24~48시간이 걸립니다.`}
      >
        <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
          <StatCard
            label="방문자"
            value={fmt(users)}
            hint={`신규 ${fmt(newUsers)} · 재방문 ${fmt(Math.max(users - newUsers, 0))}`}
          />
          <StatCard
            label="방문 횟수"
            value={fmt(sessions)}
            hint={`참여한 방문 비율 ${pct(engagementRate)}`}
          />
          <StatCard
            label="화면 조회"
            value={fmt(views)}
            hint={`방문당 ${sessions ? (views / sessions).toFixed(1) : "0"}화면`}
          />
          <StatCard
            label="1인당 머문 시간"
            value={users ? fmtDuration(engagement / users) : "—"}
            hint="총 참여 시간 ÷ 방문자"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <StatCard
            label="시청처로 나간 클릭"
            value={`${fmt(outboundTotal)}회`}
            hint="작품을 보러 실제로 떠난 횟수. 이 사이트가 제 역할을 했는지 가장 잘 보여주는 숫자예요."
            accent
          />
          <StatCard
            label="작품 상세 도달률"
            value={cardClicks ? pct(Math.min(detailViews / Math.max(cardClicks, 1), 1)) : "—"}
            hint={`카드 클릭 ${fmt(cardClicks)}회 → 상세 조회 ${fmt(detailViews)}회`}
          />
          <StatCard
            label="상세 → 시청처 전환율"
            value={detailViews ? pct(outboundTotal / detailViews) : "—"}
            hint="작품 상세를 본 사람 중 실제로 보러 나간 비율"
          />
        </div>
      </Section>

      {/* ── 무엇이 잘 보이나 ───────────────────────────────── */}
      <Section title="무엇이 잘 보이나" hint="어떤 작품과 화면이 실제로 열리는지">
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <Table
            title="많이 열린 작품"
            hint="작품 상세 조회수"
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
                sub: perView ? fmtDuration(perView) : undefined,
                value: fmt(row.values[0]),
                ratio: row.values[0],
              };
            })}
            empty="아직 데이터가 없어요."
          />
          <Table
            title="첫 화면 (들어오자마자 본 곳)"
            hint="검색으로 바로 들어온 작품을 알 수 있어요"
            columns={["화면", "방문"]}
            rows={named(landings).map((row) => ({
              label: pageLabel(row.keys[0], pageTitles),
              value: fmt(row.values[0]),
              ratio: row.values[0],
            }))}
            empty="아직 데이터가 없어요."
          />
          <Table
            title="어느 줄에서 눌렸나"
            hint="홈 큐레이션 순서를 정하는 근거로 쓰세요"
            columns={["목록", "클릭"]}
            rows={simpleRows(lists)}
            empty="맞춤 측정기준 list_name 을 등록한 뒤부터 쌓입니다."
          />
        </div>
      </Section>

      {/* ── 얼마나 나가나 ─────────────────────────────────── */}
      <Section title="얼마나 보러 나가나" hint="시청처 클릭은 이 사이트의 최종 목적이에요">
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <Table
            title="작품별 시청처 클릭"
            columns={["작품", "클릭"]}
            rows={simpleRows(contentOutbound)}
            empty="맞춤 측정기준 content_title 을 등록한 뒤부터 쌓입니다."
          />
          <Table
            title="플랫폼별 클릭"
            columns={["플랫폼", "클릭"]}
            rows={simpleRows(platforms)}
            empty="맞춤 측정기준 platform_name 을 등록한 뒤부터 쌓입니다."
          />
          <Table
            title="나간 도메인"
            columns={["도메인", "클릭"]}
            rows={simpleRows(destinations)}
            empty="맞춤 측정기준 destination 을 등록한 뒤부터 쌓입니다."
          />
          <Table
            title="검색어"
            columns={["검색어", "횟수"]}
            rows={simpleRows(searches)}
            empty="맞춤 측정기준 search_term 을 등록한 뒤부터 쌓입니다."
          />
          <Table
            title="결과가 없던 검색어"
            hint="찾았는데 없던 작품 — 다음에 채워야 할 목록이에요"
            columns={["검색어", "횟수"]}
            rows={simpleRows(zeroSearches)}
            empty="결과 없는 검색이 없었어요. (측정기준 results 등록 필요)"
          />
        </div>
      </Section>

      {/* ── 무엇을 눌러 찾나 ───────────────────────────────── */}
      <Section title="무엇을 눌러 찾나" hint="탐색 습관을 보면 어떤 입구를 키워야 할지 보여요">
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <Table
            title="많이 쓰는 필터"
            columns={["필터", "조작"]}
            rows={named(filters).map((row) => ({
              label: `${{ category: "형식", country: "국가", juice: "착즙" }[row.keys[0]] ?? row.keys[0]} · ${row.keys[1]}`,
              value: fmt(row.values[0]),
              ratio: row.values[0],
            }))}
            empty="맞춤 측정기준 filter_type · filter_value 를 등록한 뒤부터 쌓입니다."
          />
          <Table
            title="많이 눌린 버튼"
            hint="헤더·푸터·뒤로가기 등 이동 버튼"
            columns={["버튼", "클릭"]}
            rows={simpleRows(buttons)}
            empty="맞춤 측정기준 label 을 등록한 뒤부터 쌓입니다."
          />
          <Table
            title="어떤 형식이 눌리나"
            hint="카드 클릭 기준. 형식별 작품 수와 견줘보세요"
            columns={["형식", "클릭"]}
            rows={simpleRows(categoryClicks)}
            empty="맞춤 측정기준 content_category 를 등록한 뒤부터 쌓입니다."
          />
          <Table
            title="착즙 작품 반응"
            columns={["구분", "클릭"]}
            rows={named(juiceClicks).map((row) => ({
              label: row.keys[0] === "true" ? "착즙 작품" : "일반 작품",
              value: fmt(row.values[0]),
              ratio: row.values[0],
            }))}
            empty="맞춤 측정기준 juice 를 등록한 뒤부터 쌓입니다."
          />
          <Table
            title="어디까지 읽나 (스크롤)"
            hint="100%가 적으면 화면이 너무 길거나 아래가 안 읽히는 것"
            columns={["도달 지점", "횟수"]}
            rows={[...scrolls]
              .sort((a, b) => Number(a.keys[0]) - Number(b.keys[0]))
              .map((row) => ({ label: `${row.keys[0]}%`, value: fmt(row.values[0]), ratio: row.values[0] }))}
            empty="맞춤 측정기준 percent 를 등록한 뒤부터 쌓입니다."
          />
          <Table
            title="제보된 형식"
            hint="이용자가 어떤 형식을 더 원하는지"
            columns={["형식", "제보"]}
            rows={simpleRows(submitCategories)}
            empty="맞춤 측정기준 submit_category 를 등록한 뒤부터 쌓입니다."
          />
        </div>
      </Section>

      {/* ── 누가 언제 어디서 ───────────────────────────────── */}
      <Section title="누가 · 언제 · 어디서">
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <Table
            title="나라"
            hint="해외 유입이 보이면 영어 대응을 검토할 시점이에요"
            columns={["나라", "방문자"]}
            rows={simpleRows(countries)}
            empty="아직 데이터가 없어요."
          />
          <Table
            title="유입 경로"
            columns={["경로", "방문"]}
            rows={simpleRows(channels)}
            empty="아직 데이터가 없어요."
          />
          <Table
            title="기기"
            columns={["기기", "방문자"]}
            rows={named(devices).map((row) => ({
              label: { desktop: "PC", mobile: "모바일", tablet: "태블릿" }[row.keys[0]] ?? row.keys[0],
              value: fmt(row.values[0]),
              ratio: row.values[0],
            }))}
            empty="아직 데이터가 없어요."
          />
          <Table
            title="신규 · 재방문"
            columns={["구분", "방문자"]}
            rows={named(visitors).map((row) => ({
              label: { new: "처음 온 사람", returning: "다시 온 사람" }[row.keys[0]] ?? row.keys[0],
              value: fmt(row.values[0]),
              ratio: row.values[0],
            }))}
            empty="아직 데이터가 없어요."
          />
          <Table
            title="요일별 방문"
            columns={["요일", "방문"]}
            rows={[...weekdays]
              .sort((a, b) => Number(a.keys[0]) - Number(b.keys[0]))
              .map((row) => ({
                label: `${WEEKDAYS[Number(row.keys[0])] ?? row.keys[0]}요일`,
                value: fmt(row.values[0]),
                ratio: row.values[0],
              }))}
            empty="아직 데이터가 없어요."
          />
          <Table
            title="시간대별 방문"
            hint="사람이 몰리는 시간에 새 작품을 올리면 더 많이 보여요"
            columns={["시간", "방문"]}
            rows={[...hours]
              .filter((row) => row.values[0] > 0)
              .sort((a, b) => Number(a.keys[0]) - Number(b.keys[0]))
              .map((row) => ({
                label: `${String(row.keys[0]).padStart(2, "0")}시`,
                value: fmt(row.values[0]),
                ratio: row.values[0],
              }))}
            empty="아직 데이터가 없어요."
          />
        </div>
      </Section>

      {/* ── 행동 기록 전체 ─────────────────────────────────── */}
      <Section title="행동 기록" hint="사이트에 심어둔 이벤트가 각각 몇 번 발생했는지">
        <Table
          title="이벤트별 발생 횟수"
          columns={["이벤트", "횟수"]}
          rows={named(events).map((row) => ({
            label: EVENT_LABELS[row.keys[0]] ?? row.keys[0],
            sub: EVENT_LABELS[row.keys[0]] ? row.keys[0] : undefined,
            value: fmt(row.values[0]),
            ratio: row.values[0],
          }))}
          empty="아직 데이터가 없어요."
        />
      </Section>

      <Section title="설정">
        <GaDimensionGuide />
        {connectForm}
      </Section>
    </>
  );
}
