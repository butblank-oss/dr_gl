import type { Metadata } from "next";
import { TrackedLink } from "@/components/analytics/TrackedLink";
import { EVENTS } from "@/lib/analytics";
import { ContentCard } from "@/components/site/ContentCard";
import { SearchTracker } from "@/components/site/SearchTracker";
import { SearchBar } from "@/components/site/SearchBar";
import { searchContents } from "@/lib/queries";
import { dict, withLang } from "@/lib/i18n";
import { currentLang } from "@/lib/lang-server";

export const dynamic = "force-dynamic";

// 내부 검색 결과는 색인하지 않는다 — 구글이 "검색 결과 안의 검색 결과"로 보고 감점한다.
export const metadata: Metadata = {
  title: "검색",
  robots: { index: false, follow: true },
};

const SUGGESTED_TAGS = ["오피스", "학원", "로맨스판타지", "시대극", "착즙"];

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const lang = await currentLang();
  const t = dict(lang);
  const query = ((await searchParams).q ?? "").trim();
  const results = query ? await searchContents(query) : [];

  return (
    <div className="page-shell py-10">
      <SearchTracker query={query} results={results.length} />
      {/* 헤더에 검색창이 없으니 이 화면에서는 맨 위에 둔다 */}
      <div className="mb-7">
        <SearchBar initialQuery={query} />
      </div>
      {query ? (
        <>
          <div className="mb-5 text-[15px] text-fg60">
            <span className="font-bold text-fg">&apos;{query}&apos;</span> · {t.searchCount(results.length)}
          </div>
          {results.length > 0 ? (
            <div className="grid gap-[22px] [grid-template-columns:repeat(auto-fill,minmax(140px,1fr))] md:[grid-template-columns:repeat(auto-fill,minmax(170px,1fr))]">
              {results.map((item, index) => (
                <ContentCard key={item.id} item={item} listName="검색 결과" position={index + 1} lang={lang} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4 py-20 text-center">
              <div className="text-sm text-fg45">{t.searchNoResult(query)}</div>
              <div className="text-[13px] text-fg35">{t.searchSuggestSubmit}</div>
              {/* 찾다가 없으면 그 자리에서 제보로 이어지게 한다 — 검색어를 제목으로 미리 채워서 */}
              <TrackedLink
                href={withLang(lang, `/submit?title=${encodeURIComponent(query)}`)}
                className="btn-grad px-[22px] py-3 text-sm"
                event={EVENTS.nav}
                params={{ label: "검색 결과 없음에서 제보", nav_to: "/submit", nav_source: "검색 결과 없음", search_term: query }}
              >
                {t.searchSubmitCta}
              </TrackedLink>
            </div>
          )}
        </>
      ) : (
        <div className="flex flex-col items-center gap-5 py-25 text-center">
          <div className="text-lg font-bold">{t.searchEmptyQuery}</div>
          <div className="text-[13px] text-fg45">{t.searchLead}</div>
          <div className="flex max-w-[480px] flex-wrap justify-center gap-2">
            {SUGGESTED_TAGS.map((tag) => (
              <TrackedLink
                key={tag}
                href={withLang(lang, `/search?q=${encodeURIComponent(tag)}`)}
                className="rounded-pill border border-line12 bg-surface4 px-4 py-2 text-[13px] text-fg70"
                event={EVENTS.searchSuggestion}
                params={{ search_term: tag }}
              >
                #{tag}
              </TrackedLink>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
