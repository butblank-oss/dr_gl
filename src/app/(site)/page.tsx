import { redirect } from "next/navigation";
import { TrackedLink } from "@/components/analytics/TrackedLink";
import { EVENTS } from "@/lib/analytics";
import { BannerBackdrop, PosterCard } from "@/components/site/Banner";
import { ContentCard } from "@/components/site/ContentCard";
import { SiteJsonLd } from "@/components/site/JsonLd";
import { ShareButton } from "@/components/site/ShareButton";
import { getFeaturedContent, getHomeRows } from "@/lib/queries";
import { dict, withLang } from "@/lib/i18n";
import { currentLang } from "@/lib/lang-server";

// 어드민에서 바꾼 내용이 사이트에 바로 보이도록 매 요청마다 최신 데이터를 읽는다.
export const dynamic = "force-dynamic";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ detail?: string }>;
}) {
  // 프로토타입의 `?detail=<id>` 딥링크를 그대로 받아 /content/<id> 라우트로 넘겨준다.
  const detail = Number((await searchParams).detail);
  if (Number.isInteger(detail) && detail > 0) redirect(withLang(await currentLang(), `/content/${detail}`));

  const lang = await currentLang();
  const t = dict(lang);
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
      <SiteJsonLd />
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
            {hero.juice ? <span className="badge-juice px-[11px] py-1 text-xs">{t.juice}</span> : null}
            <span className="text-xs text-fg55">
              {hero.countryDetail} · {hero.year}
            </span>
          </div>
          <h1 className="text-[30px] font-extrabold leading-[1.15] tracking-[-1px] md:text-[44px]">
            {hero.title}
          </h1>
          <p className="line-clamp-2-box text-[13px] leading-relaxed text-fg68 md:text-sm">{hero.synopsis}</p>
          {/*
            버튼은 둘까지. 셋을 늘어놓으니 무엇을 눌러야 할지가 오히려 흐려졌다.
            상세보기와 시청 가능한 곳은 어차피 같은 페이지라, 사람들이 실제로 찾는 말 하나로 합친다.

            #watch 앵커는 일부러 뺐다. 감상처가 이미 상세 화면 맨 위에 있어서,
            앵커를 걸면 제목도 포스터도 건너뛴 채 페이지 중간에서 시작해 고장난 것처럼 보인다.
          */}
          <div className="mt-1 flex flex-wrap gap-2.5">
            <TrackedLink
              href={withLang(lang, `/content/${hero.id}`)}
              className="btn-grad px-[22px] py-3 text-sm"
              event={EVENTS.selectContent}
              params={{ content_id: hero.id, content_title: hero.title, list_name: "히어로", cta: "시청 가능한 곳" }}
            >
              {t.heroWatch}
            </TrackedLink>
            {/* 홈 주소를 공유한다 — 특정 작품이 아니라 사이트를 알리는 쪽 */}
            <ShareButton
              path={withLang(lang, "/")}
              title="Dr. GL"
              campaign="home"
              className="btn-ghost gap-1.5 px-[22px] py-3 text-sm text-fg75"
            />
          </div>
        </div>
        </div>
        </div>
      </section>

      <div className="page-shell flex flex-col gap-9 pb-15 pt-10">
        {rows.map((row) => (
          <section key={row.id} className="flex flex-col gap-4">
            <h2 className="text-[19px] font-bold text-fg">{row.title}</h2>
            <div className="h-scroll flex gap-[18px] pb-1.5">
              {row.items.map((item, index) => (
                <div key={item.id} className="w-[132px] flex-none md:w-[170px]">
                  <ContentCard item={item} listName={row.title} position={index + 1} lang={lang} />
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
