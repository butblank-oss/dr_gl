import { prisma } from "@/lib/prisma";
import { SITE, SITE_DESCRIPTION, SITE_URL } from "@/lib/site";

export const dynamic = "force-dynamic";

/** XML 안에서 문제를 일으키는 문자를 안전하게 바꾼다. */
function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * /rss.xml — 최근 등록한 작품 목록.
 *
 * 네이버 서치어드바이저는 RSS 를 받아 새 글을 빠르게 수집한다. 사이트맵이
 * "우리 사이트에 이런 주소가 있다"라면, RSS 는 "방금 이게 새로 올라왔다"에 가깝다.
 * 작품을 등록하면 별도 작업 없이 여기에 실린다.
 */
export async function GET() {
  const items = await prisma.content.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      title: true,
      category: true,
      countryDetail: true,
      year: true,
      synopsis: true,
      createdAt: true,
    },
  });

  const entries = items
    .map((item) => {
      const link = `${SITE_URL}/content/${item.id}`;
      const description = [
        `${item.countryDetail} ${item.category} · ${item.year}`,
        item.synopsis,
      ]
        .filter(Boolean)
        .join(" — ");
      return `    <item>
      <title>${escapeXml(item.title)}</title>
      <link>${link}</link>
      <guid isPermaLink="true">${link}</guid>
      <description>${escapeXml(description)}</description>
      <category>${escapeXml(item.category)}</category>
      <pubDate>${item.createdAt.toUTCString()}</pubDate>
    </item>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(SITE.name)} — GL(백합) 콘텐츠 큐레이션</title>
    <link>${SITE_URL}</link>
    <description>${escapeXml(SITE_DESCRIPTION)}</description>
    <language>ko</language>
    <lastBuildDate>${(items[0]?.createdAt ?? new Date()).toUTCString()}</lastBuildDate>
    <atom:link href="${SITE_URL}/rss.xml" rel="self" type="application/rss+xml" />
${entries}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      // 검색엔진이 자주 들르는 주소라 짧게 캐시한다.
      "Cache-Control": "public, max-age=0, s-maxage=1800",
    },
  });
}
