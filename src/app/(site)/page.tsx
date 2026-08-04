import Link from "next/link";
import { redirect } from "next/navigation";
import { BannerBackdrop, PosterCard } from "@/components/site/Banner";
import { ContentCard } from "@/components/site/ContentCard";
import { getFeaturedContent, getHomeRows } from "@/lib/queries";

// 어드민에서 바꾼 내용이 사이트에 바로 보이도록 매 요청마다 최신 데이터를 읽는다.
export const dynamic = "force-dynamic";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ detail?: string }>;
}) {
  // 프로토타입의 `?detail=<id>` 딥링크를 그대로 받아 /content/<id> 라우트로 넘겨준다.
  const detail = Number((await searchParams).detail);
  if (Number.isInteger(detail) && detail > 0) redirect(`/content/${detail}`);

  const [hero, rows] = await Promise.all([getFeaturedContent(), getHomeRows()]);

  if (!hero) {
    return (
      <div className="px-10 py-40 text-center text-sm text-fg45">
        아직 등록된 콘텐츠가 없어요. 어드민에서 콘텐츠를 추가해보세요.
      </div>
    );
  }

  return (
    <div>
      <section className="relative h-[420px] w-full overflow-hidden md:h-[520px]">
        <BannerBackdrop item={hero} />
        <div className="banner-scrim pointer-events-none absolute inset-0" />
        {/* 배경은 화면 끝까지, 글자는 본문과 같은 왼쪽 기준선에 맞춘다 */}
        <div className="page-shell absolute inset-x-0 bottom-8 md:bottom-14">
        <div className="flex items-end gap-5 md:gap-7">
        <PosterCard item={hero} hideOnMobile />
        <div className="flex max-w-[600px] flex-col gap-3 md:gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-pill border border-line16 bg-surface10 px-[11px] py-1 text-xs font-semibold text-fg">
              {hero.category}
            </span>
            {hero.juice ? <span className="badge-juice px-[11px] py-1 text-xs">착즙</span> : null}
            <span className="text-xs text-fg55">
              {hero.countryDetail} · {hero.year}
            </span>
          </div>
          <h1 className="text-[30px] font-extrabold leading-[1.15] tracking-[-1px] md:text-[44px]">
            {hero.title}
          </h1>
          <p className="line-clamp-2-box text-[13px] leading-relaxed text-fg68 md:text-sm">{hero.synopsis}</p>
          <div className="mt-1 flex flex-wrap gap-2.5">
            <Link href={`/content/${hero.id}`} className="btn-grad px-[22px] py-3 text-sm">
              상세보기
            </Link>
            <Link href={`/content/${hero.id}#watch`} className="btn-ghost px-[22px] py-3 text-sm">
              시청 가능한 곳
            </Link>
          </div>
        </div>
        </div>
        </div>
      </section>

      <div className="page-shell flex flex-col gap-9 pb-15 pt-10">
        {rows.map((row) => (
          <section key={row.id} className="flex flex-col gap-4">
            <h2 className="text-[19px] font-bold text-fg">{row.title}</h2>
            <div className="flex gap-[18px] overflow-x-auto pb-1.5">
              {row.items.map((item) => (
                <div key={item.id} className="w-[132px] flex-none md:w-[170px]">
                  <ContentCard item={item} />
                </div>
              ))}
            </div>
          </section>
        ))}
        {rows.length === 0 ? (
          <div className="py-20 text-center text-sm text-fg45">
            아직 큐레이션된 행이 없어요. 어드민의 &quot;홈 큐레이션&quot;에서 만들어보세요.
          </div>
        ) : null}
      </div>
    </div>
  );
}
