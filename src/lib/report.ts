import "server-only";

import { customDimension, runReports, type ReportRow } from "@/lib/ga-data";
import type { ReportKind, ReportSections } from "@/lib/report-shared";
import { prisma } from "@/lib/prisma";

/**
 * 방문 분석 자동 리포트.
 *
 * GA 수치를 그대로 보여주는 것만으로는 "그래서 뭘 해야 하지?"가 남는다.
 * 여기서 전 기간과 비교해 변화를 읽고, 운영자가 바로 할 수 있는 말로 바꾼다.
 * 판단 기준은 전부 코드에 있어서 같은 데이터면 늘 같은 문장이 나온다.
 */

export { REPORT_KINDS, REPORT_LABELS } from "@/lib/report-shared";
export type { ReportKind, ReportSections } from "@/lib/report-shared";

export type ReportMetrics = {
  users: number;
  usersBefore: number;
  sessions: number;
  views: number;
  outbound: number;
  outboundBefore: number;
  comments: number;
  shares: number;
};

/* ------------------------------------------------------------------ *
 * 기간 계산 — GA 속성이 한국 시간 기준이라 날짜도 한국 시간으로 센다.
 * ------------------------------------------------------------------ */

const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

function kstNow(now: Date): Date {
  // UTC 시각에 9시간을 더한 뒤 UTC 함수로 읽으면 한국 날짜가 된다.
  return new Date(now.getTime() + KST_OFFSET_MS);
}

function iso(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

export type Period = { start: string; end: string; label: string };

/** 리포트 종류별로 "이번 구간"과 "비교할 지난 구간"을 정한다. */
export function periodsFor(kind: ReportKind, now = new Date()): { current: Period; previous: Period } {
  const today = kstNow(now);

  if (kind === "daily") {
    const yesterday = addDays(today, -1);
    const before = addDays(today, -2);
    return {
      current: { start: iso(yesterday), end: iso(yesterday), label: `${iso(yesterday)} 하루` },
      previous: { start: iso(before), end: iso(before), label: "그 전날" },
    };
  }

  if (kind === "weekly") {
    // 지난주 월요일 ~ 일요일. (한국 기준으로 방금 끝난 한 주)
    const day = today.getUTCDay(); // 0=일요일
    const daysSinceMonday = (day + 6) % 7;
    const thisMonday = addDays(today, -daysSinceMonday);
    const lastMonday = addDays(thisMonday, -7);
    const lastSunday = addDays(thisMonday, -1);
    return {
      current: { start: iso(lastMonday), end: iso(lastSunday), label: `${iso(lastMonday)} ~ ${iso(lastSunday)}` },
      previous: { start: iso(addDays(lastMonday, -7)), end: iso(addDays(lastMonday, -1)), label: "그 전 주" },
    };
  }

  // monthly — 지난달 1일 ~ 말일
  const firstOfThisMonth = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1));
  const firstOfLastMonth = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - 1, 1));
  const lastOfLastMonth = addDays(firstOfThisMonth, -1);
  const firstOfTwoMonthsAgo = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - 2, 1));
  return {
    current: {
      start: iso(firstOfLastMonth),
      end: iso(lastOfLastMonth),
      label: `${firstOfLastMonth.getUTCFullYear()}년 ${firstOfLastMonth.getUTCMonth() + 1}월`,
    },
    previous: { start: iso(firstOfTwoMonthsAgo), end: iso(addDays(firstOfLastMonth, -1)), label: "그 전 달" },
  };
}

/* ------------------------------------------------------------------ *
 * 문장 만들기 도우미
 * ------------------------------------------------------------------ */

function fmt(value: number): string {
  return Math.round(value).toLocaleString("ko-KR");
}

function pct(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

/** 전 기간 대비 변화를 사람 말로. 0에서 시작한 경우는 배수 대신 다르게 적는다. */
function change(current: number, before: number): string {
  if (before === 0 && current === 0) return "지난 구간과 같이 없었어요";
  if (before === 0) return "지난 구간에는 없던 기록이에요";
  const ratio = (current - before) / before;
  if (Math.abs(ratio) < 0.05) return `지난 구간과 비슷해요 (${fmt(before)} → ${fmt(current)})`;
  const direction = ratio > 0 ? "늘었어요" : "줄었어요";
  return `지난 구간보다 ${pct(Math.abs(ratio))} ${direction} (${fmt(before)} → ${fmt(current)})`;
}

function topOf(rows: ReportRow[]): { key: string; value: number } | null {
  const usable = rows.filter((row) => {
    const key = row.keys[0] ?? "";
    return key !== "" && key !== "(not set)" && key !== "(other)";
  });
  if (usable.length === 0) return null;
  return { key: usable[0]!.keys[0]!, value: usable[0]!.values[0] ?? 0 };
}

function countOf(rows: ReportRow[], name: string): number {
  return rows.find((row) => row.keys[0] === name)?.values[0] ?? 0;
}

/* ------------------------------------------------------------------ *
 * 생성
 * ------------------------------------------------------------------ */

export async function generateReport(kind: ReportKind, now = new Date()) {
  const { current, previous } = periodsFor(kind, now);
  const range = (period: Period) => [{ startDate: period.start, endDate: period.end }];
  const eventFilter = (name: string) => ({
    filter: { fieldName: "eventName", stringFilter: { value: name } },
  });
  const top = (metric: string) => [{ metric: { metricName: metric }, desc: true }];

  const [
    summaryNow = [],
    summaryBefore = [],
    eventsNow = [],
    eventsBefore = [],
    pages = [],
    countries = [],
    devices = [],
    searches = [],
    zeroSearches = [],
    lists = [],
    platforms = [],
    scrolls = [],
  ] = await runReports([
    {
      dateRanges: range(current),
      metrics: [
        { name: "activeUsers" },
        { name: "sessions" },
        { name: "screenPageViews" },
        { name: "userEngagementDuration" },
        { name: "newUsers" },
        { name: "engagementRate" },
      ],
    },
    {
      dateRanges: range(previous),
      metrics: [{ name: "activeUsers" }, { name: "sessions" }, { name: "screenPageViews" }],
    },
    {
      dateRanges: range(current),
      dimensions: [{ name: "eventName" }],
      metrics: [{ name: "eventCount" }],
      orderBys: top("eventCount"),
      limit: 30,
    },
    {
      dateRanges: range(previous),
      dimensions: [{ name: "eventName" }],
      metrics: [{ name: "eventCount" }],
      orderBys: top("eventCount"),
      limit: 30,
    },
    {
      dateRanges: range(current),
      dimensions: [{ name: "pagePath" }],
      metrics: [{ name: "screenPageViews" }],
      orderBys: top("screenPageViews"),
      limit: 100,
    },
    {
      dateRanges: range(current),
      dimensions: [{ name: "country" }],
      metrics: [{ name: "activeUsers" }],
      orderBys: top("activeUsers"),
      limit: 10,
    },
    {
      dateRanges: range(current),
      dimensions: [{ name: "deviceCategory" }],
      metrics: [{ name: "activeUsers" }],
      orderBys: top("activeUsers"),
      limit: 5,
    },
    {
      dateRanges: range(current),
      dimensions: [customDimension("search_term")],
      metrics: [{ name: "eventCount" }],
      dimensionFilter: eventFilter("search"),
      orderBys: top("eventCount"),
      limit: 10,
    },
    {
      dateRanges: range(current),
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
      limit: 10,
    },
    {
      dateRanges: range(current),
      dimensions: [customDimension("list_name")],
      metrics: [{ name: "eventCount" }],
      dimensionFilter: eventFilter("select_content"),
      orderBys: top("eventCount"),
      limit: 10,
    },
    {
      dateRanges: range(current),
      dimensions: [customDimension("platform_name")],
      metrics: [{ name: "eventCount" }],
      dimensionFilter: eventFilter("outbound_platform_click"),
      orderBys: top("eventCount"),
      limit: 10,
    },
    {
      dateRanges: range(current),
      dimensions: [customDimension("percent")],
      metrics: [{ name: "eventCount" }],
      dimensionFilter: eventFilter("scroll_depth"),
      limit: 5,
    },
  ]);

  const [users = 0, sessions = 0, views = 0, engagement = 0, newUsers = 0, engagementRate = 0] =
    summaryNow[0]?.values ?? [];
  const [usersBefore = 0, , viewsBefore = 0] = summaryBefore[0]?.values ?? [];

  const outbound = countOf(eventsNow, "outbound_platform_click");
  const outboundBefore = countOf(eventsBefore, "outbound_platform_click");
  const cardClicks = countOf(eventsNow, "select_content");
  const comments = countOf(eventsNow, "comment_submit");
  const shares = countOf(eventsNow, "share");
  const searchCount = countOf(eventsNow, "search");
  const submitStart = countOf(eventsNow, "submission_start");
  const submitDone = countOf(eventsNow, "submission_complete");

  // 작품 상세 조회수 — 주소에서 모아 합친다
  const contentViews = new Map<number, number>();
  for (const row of pages) {
    const matched = /^\/content\/(\d+)/.exec(row.keys[0] ?? "");
    if (!matched) continue;
    const id = Number(matched[1]);
    contentViews.set(id, (contentViews.get(id) ?? 0) + (row.values[0] ?? 0));
  }
  const detailViews = [...contentViews.values()].reduce((sum, value) => sum + value, 0);
  const bestContent = [...contentViews.entries()].sort((a, b) => b[1] - a[1])[0];
  const bestTitle = bestContent
    ? ((await prisma.content.findUnique({ where: { id: bestContent[0] }, select: { title: true } }))?.title ??
      `작품 #${bestContent[0]}`)
    : null;

  const sections: ReportSections = { summary: [], content: [], conversion: [], audience: [], behavior: [] };

  /* ── 요약 ── */
  if (users === 0) {
    sections.summary.push("이 기간에 잡힌 방문이 없어요. 링크를 아직 아무 데도 알리지 않았다면 자연스러운 결과예요.");
  } else {
    sections.summary.push(`방문자 ${fmt(users)}명 — ${change(users, usersBefore)}.`);
    sections.summary.push(
      `화면 조회 ${fmt(views)}회 — ${change(views, viewsBefore)}. 방문 한 번에 평균 ${
        sessions ? (views / sessions).toFixed(1) : "0"
      }개 화면을 봤어요.`,
    );
    sections.summary.push(
      `1인당 머문 시간 ${fmt(engagement / Math.max(users, 1))}초, 참여한 방문 비율 ${pct(engagementRate)}.`,
    );
    if (newUsers > 0) {
      const newRatio = newUsers / users;
      sections.summary.push(
        newRatio > 0.8
          ? `대부분(${pct(newRatio)})이 처음 온 사람이에요. 아직 다시 찾는 단계는 아니니, 한 번 온 사람이 더 볼 거리를 만드는 데 집중할 시점이에요.`
          : `재방문이 ${pct(1 - newRatio)}예요. 다시 찾는 사람이 생기고 있다는 뜻이라 좋은 신호예요.`,
      );
    }
    sections.summary.push(
      outbound > 0
        ? `시청처로 나간 클릭 ${fmt(outbound)}회 — ${change(outbound, outboundBefore)}. 이게 이 사이트의 최종 성과예요.`
        : `시청처로 나간 클릭이 0회예요. 작품을 봤는데도 보러 나가지 않았다면, 시청처 링크가 비어 있는 작품이 없는지 확인해보세요.`,
    );
  }

  /* ── 콘텐츠 ── */
  if (bestTitle && bestContent) {
    sections.content.push(
      `가장 많이 열린 작품은 "${bestTitle}" (${fmt(bestContent[1])}회). 홈 큐레이션 앞줄에 그대로 두세요.`,
    );
  }
  if (detailViews > 0 && cardClicks > 0) {
    const reach = Math.min(detailViews / cardClicks, 1);
    sections.content.push(
      reach < 0.7
        ? `카드를 눌렀지만 상세까지 닿지 않은 경우가 있어요 (도달률 ${pct(reach)}). 목록이 너무 길거나 카드가 잘 안 보이는지 확인해보세요.`
        : `카드 클릭이 상세로 잘 이어지고 있어요 (도달률 ${pct(reach)}).`,
    );
  }
  const bestList = topOf(lists);
  if (bestList) {
    sections.content.push(
      `가장 많이 눌린 줄은 "${bestList.key}" (${fmt(bestList.value)}회). 이 줄에 새 작품을 먼저 넣으면 노출이 커져요.`,
    );
  }
  if (contentViews.size > 0) {
    const total = await prisma.content.count();
    const seen = contentViews.size;
    if (total > 0 && seen / total < 0.5) {
      sections.content.push(
        `등록된 ${total}편 중 ${seen}편만 열렸어요. 나머지는 아직 아무도 못 본 셈이라, 홈 큐레이션에 번갈아 올려보는 게 좋아요.`,
      );
    }
  }

  /* ── 전환 · 공유 ── */
  if (detailViews > 0) {
    const rate = outbound / detailViews;
    sections.conversion.push(
      rate >= 0.15
        ? `상세를 본 사람 중 ${pct(rate)}가 실제로 보러 나갔어요. 좋은 수치예요.`
        : `상세 → 시청처 전환율이 ${pct(rate)}예요. 시청처가 비어 있거나 링크가 하나뿐인 작품이 많지 않은지 살펴보세요.`,
    );
  }
  const bestPlatform = topOf(platforms);
  if (bestPlatform) {
    sections.conversion.push(
      `가장 많이 나간 곳은 ${bestPlatform.key} (${fmt(bestPlatform.value)}회). 이 플랫폼 링크는 항상 채워두는 게 좋아요.`,
    );
  }
  if (searchCount > 0) {
    const zero = zeroSearches.filter((row) => (row.keys[0] ?? "") !== "");
    if (zero.length > 0) {
      sections.conversion.push(
        `찾았는데 결과가 없던 검색어: ${zero
          .slice(0, 5)
          .map((row) => `"${row.keys[0]}"`)
          .join(", ")}. 다음에 채울 후보예요.`,
      );
    } else {
      const bestSearch = topOf(searches);
      if (bestSearch) {
        sections.conversion.push(`가장 많이 찾은 말은 "${bestSearch.key}"였어요. 결과는 모두 있었습니다.`);
      }
    }
  }
  if (shares > 0) {
    sections.conversion.push(`공유 버튼이 ${fmt(shares)}번 눌렸어요. 사람들이 남에게 알리고 싶어 한 신호예요.`);
  }

  /* ── 방문자 ── */
  const bestCountry = topOf(countries);
  if (bestCountry) {
    const overseas = countries
      .filter((row) => row.keys[0] !== "South Korea" && row.keys[0] !== "대한민국")
      .reduce((sum, row) => sum + (row.values[0] ?? 0), 0);
    sections.audience.push(`가장 많이 들어온 나라는 ${bestCountry.key} (${fmt(bestCountry.value)}명).`);
    if (overseas > 0 && users > 0) {
      const ratio = overseas / users;
      sections.audience.push(
        ratio > 0.2
          ? `해외 방문이 ${pct(ratio)}예요. 영어 안내를 붙이는 걸 검토할 만합니다.`
          : `해외 방문은 ${fmt(overseas)}명이에요. 아직은 국내 위주입니다.`,
      );
    }
  }
  const bestDevice = topOf(devices);
  if (bestDevice) {
    const label = { desktop: "PC", mobile: "모바일", tablet: "태블릿" }[bestDevice.key] ?? bestDevice.key;
    const ratio = users ? bestDevice.value / users : 0;
    sections.audience.push(
      `${label}에서 ${pct(ratio)}가 들어왔어요.${
        bestDevice.key === "mobile" ? " 화면을 고칠 때 모바일부터 확인하세요." : ""
      }`,
    );
  }

  /* ── 행동 ── */
  if (comments > 0) sections.behavior.push(`한줄평이 ${fmt(comments)}건 작성됐어요. 검수에서 확인해주세요.`);
  if (submitStart > 0) {
    sections.behavior.push(
      submitDone > 0
        ? `제보 폼을 ${fmt(submitStart)}번 열어 ${fmt(submitDone)}건이 제출됐어요 (완료율 ${pct(submitDone / submitStart)}).`
        : `제보 폼을 ${fmt(submitStart)}번 열었지만 제출까지 간 건 없어요. 입력 항목이 부담스럽지 않은지 살펴보세요.`,
    );
  }
  const scrollTotal = scrolls.reduce((sum, row) => sum + (row.values[0] ?? 0), 0);
  const scroll100 = scrolls.find((row) => row.keys[0] === "100")?.values[0] ?? 0;
  if (scrollTotal > 0) {
    const ratio = scroll100 / scrollTotal;
    sections.behavior.push(
      ratio < 0.15
        ? `끝까지 읽은 비율이 ${pct(ratio)}로 낮아요. 화면이 길거나 아래쪽 내용이 안 읽히고 있을 수 있어요.`
        : `끝까지 읽은 비율이 ${pct(ratio)}예요. 아래쪽 내용도 잘 소비되고 있습니다.`,
    );
  }
  if (sections.behavior.length === 0) {
    sections.behavior.push("이 기간에는 한줄평·제보 같은 참여 기록이 없었어요.");
  }

  const metrics: ReportMetrics = {
    users,
    usersBefore,
    sessions,
    views,
    outbound,
    outboundBefore,
    comments,
    shares,
  };

  return prisma.analyticsReport.upsert({
    where: { kind_periodStart: { kind, periodStart: current.start } },
    create: {
      kind,
      periodStart: current.start,
      periodEnd: current.end,
      sections,
      metrics,
    },
    update: { periodEnd: current.end, sections, metrics, createdAt: new Date() },
  });
}

/** 화면에 보여줄 가장 최근 리포트 */
export async function latestReport(kind: ReportKind) {
  return prisma.analyticsReport.findFirst({ where: { kind }, orderBy: { periodStart: "desc" } });
}

/**
 * 오늘 만들어야 할 리포트를 정한다.
 * 하루 한 번 도는 예약 작업에서 부른다 — 월요일이면 주별도, 1일이면 월별도 함께 만든다.
 */
export function dueKinds(now = new Date()): ReportKind[] {
  const today = kstNow(now);
  const kinds: ReportKind[] = ["daily"];
  if (today.getUTCDay() === 1) kinds.push("weekly");
  if (today.getUTCDate() === 1) kinds.push("monthly");
  return kinds;
}
