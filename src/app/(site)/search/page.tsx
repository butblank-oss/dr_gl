import Link from "next/link";
import { ContentCard } from "@/components/site/ContentCard";
import { searchContents } from "@/lib/queries";

export const dynamic = "force-dynamic";

const SUGGESTED_TAGS = ["오피스", "학원", "로맨스판타지", "시대극", "착즙"];

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const query = ((await searchParams).q ?? "").trim();
  const results = query ? await searchContents(query) : [];

  return (
    <div className="mx-auto max-w-[1200px] p-10">
      {query ? (
        <>
          <div className="mb-5 text-[15px] text-fg60">
            <span className="font-bold text-fg">&apos;{query}&apos;</span> 검색 결과 {results.length}건
          </div>
          {results.length > 0 ? (
            <div className="grid gap-[22px] [grid-template-columns:repeat(auto-fill,minmax(170px,1fr))]">
              {results.map((item) => (
                <ContentCard key={item.id} item={item} />
              ))}
            </div>
          ) : (
            <div className="py-20 text-center text-sm text-fg45">
              일치하는 작품이 없어요. 다른 검색어로 시도해보세요.
            </div>
          )}
        </>
      ) : (
        <div className="flex flex-col items-center gap-5 py-25 text-center">
          <div className="text-lg font-bold">찾고 싶은 작품을 검색해보세요</div>
          <div className="flex max-w-[480px] flex-wrap justify-center gap-2">
            {SUGGESTED_TAGS.map((tag) => (
              <Link
                key={tag}
                href={`/search?q=${encodeURIComponent(tag)}`}
                className="rounded-pill border border-line12 bg-surface4 px-4 py-2 text-[13px] text-fg70"
              >
                #{tag}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
