import Link from "next/link";
import { ContentCard } from "@/components/site/ContentCard";
import { getCategories, getFilteredContents } from "@/lib/queries";
import { COUNTRY_FILTERS } from "@/lib/types";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ category?: string; country?: string; juice?: string }>;

function chipHref(params: Record<string, string | undefined>) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value && value !== "전체" && value !== "false") query.set(key, value);
  }
  const qs = query.toString();
  return qs ? `/category?${qs}` : "/category";
}

export default async function CategoryPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const category = params.category ?? "전체";
  const country = params.country ?? "전체";
  const juiceOnly = params.juice === "true";

  const [categories, items] = await Promise.all([
    getCategories(),
    getFilteredContents({ category, country, juiceOnly }),
  ]);

  const juiceParam = juiceOnly ? undefined : "true";

  return (
    <div className="page-shell py-10">
      <h1 className="mb-1.5 text-[28px] font-extrabold">카테고리 탐색</h1>
      <p className="mb-7 text-sm text-fg55">장르와 형식을 넘나들며, 원하는 콘텐츠를 찾아보세요.</p>

      <div className="mb-3.5 flex flex-wrap gap-2">
        {["전체", ...categories.map((c) => c.name)].map((name) => (
          <Link
            key={name}
            href={chipHref({ category: name, country, juice: juiceOnly ? "true" : undefined })}
            className={`chip ${category === name ? "chip-on" : "chip-off"}`}
          >
            {name}
          </Link>
        ))}
      </div>

      <div className="mb-8 flex flex-wrap items-center gap-2">
        {COUNTRY_FILTERS.map((name) => (
          <Link
            key={name}
            href={chipHref({ category, country: name, juice: juiceOnly ? "true" : undefined })}
            className={`chip ${country === name ? "chip-on" : "chip-off"}`}
          >
            {name}
          </Link>
        ))}
        <div className="mx-1.5 h-5 w-px bg-line12" />
        <Link
          href={chipHref({ category, country, juice: juiceParam })}
          className={`chip ${juiceOnly ? "chip-juice-on" : "chip-off"}`}
        >
          착즙만 보기
        </Link>
      </div>

      {items.length > 0 ? (
        <div className="grid gap-[22px] [grid-template-columns:repeat(auto-fill,minmax(140px,1fr))] md:[grid-template-columns:repeat(auto-fill,minmax(170px,1fr))]">
          {items.map((item) => (
            <ContentCard key={item.id} item={item} />
          ))}
        </div>
      ) : (
        <div className="py-20 text-center text-sm text-fg45">조건에 맞는 작품이 없어요. 필터를 조정해보세요.</div>
      )}
    </div>
  );
}
