import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TrackedExternalLink } from "@/components/analytics/TrackedLink";
import { ExternalLinkIcon } from "@/components/icons";
import { EVENTS, hostOf } from "@/lib/analytics";
import { BackButton } from "@/components/site/BackButton";
import { BannerBackdrop, PosterCard } from "@/components/site/Banner";
import { CommentSection } from "@/components/site/CommentSection";
import { ShareButton } from "@/components/site/ShareButton";
import { ContentCard } from "@/components/site/ContentCard";
import { ContentJsonLd } from "@/components/site/JsonLd";
import {
  getContentById,
  getRelatedByCategory,
  getRelatedByLead,
  getVisibleComments,
} from "@/lib/queries";
import { absoluteUrl } from "@/lib/site";
import { dict, withLang } from "@/lib/i18n";
import { currentLang } from "@/lib/lang-server";

export const dynamic = "force-dynamic";

type Params = Promise<{ id: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const id = Number((await params).id);
  const item = Number.isInteger(id) ? await getContentById(id) : null;
  if (!item) return { title: "Dr. GL" };

  const path = `/content/${item.id}`;
  // canonical 은 "이 주소가 원본"이라는 선언이다. 영어판이 한국어를 가리키면
  // 구글은 영어판을 중복으로 보고 아예 색인하지 않는다. 각자 자기 주소를 가리켜야 한다.
  const lang = await currentLang();
  const canonical = withLang(lang, path);
  const image = item.poster && item.posterUrl ? absoluteUrl(item.posterUrl) : undefined;
  // 검색 결과에 그대로 노출되는 문장. 작품만 보고도 무엇인지 알 수 있게 앞에 정보를 붙인다.
  const description =
    `${item.countryDetail} ${item.category} · ${item.year}` +
    (item.creatorName ? ` · ${item.creatorLabel} ${item.creatorName}` : "") +
    (item.synopsis ? ` — ${item.synopsis}` : "");
  const watchAt = item.platforms.map((platform) => platform.name).join(", ");

  // 영어 제목을 따로 두게 되면서, 검색 결과에 보이는 문장에는 다시 합쳐서 넣는다.
  // 카드에는 한국어만 보이되 구글에는 두 이름 모두 알려주려는 것.
  const displayTitle = item.titleEn ? `${item.title} (${item.titleEn})` : item.title;

  return {
    title: `${displayTitle} (${item.year}) — 줄거리·출연·어디서 볼까`,
    description: watchAt ? `${description} 시청 가능한 곳: ${watchAt}.` : description,
    keywords: [item.title, ...(item.titleEn ? [item.titleEn] : []), ...item.leads, ...item.tags, item.category, "GL", "백합", "yuri"],
    alternates: {
      canonical,
      languages: { ko: path, en: `/en${path}`, "x-default": path },
    },
    openGraph: {
      type: "article",
      url: absoluteUrl(path),
      title: `${displayTitle} · Dr. GL`,
      description,
      images: image ? [{ url: image, alt: `${item.title} 포스터` }] : undefined,
    },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      title: `${displayTitle} · Dr. GL`,
      description,
      images: image ? [image] : undefined,
    },
  };
}

export default async function ContentDetailPage({ params }: { params: Params }) {
  const id = Number((await params).id);
  if (!Number.isInteger(id) || id <= 0) notFound();

  const item = await getContentById(id);
  if (!item) notFound();

  const lang = await currentLang();
  const t = dict(lang);
  const [related, byLead, comments] = await Promise.all([
    getRelatedByCategory(item),
    getRelatedByLead(item),
    getVisibleComments(item.id),
  ]);

  return (
    <div>
      <ContentJsonLd item={item} />
      <div className="page-shell flex items-center justify-between gap-3 pb-1 pt-5">
        <BackButton />
        <ShareButton
          path={withLang(lang, `/content/${item.id}`)}
          title={item.title}
          contentId={item.id}
          campaign={`content_${item.id}`}
        />
      </div>

      <div className="relative mt-4 h-[380px] w-full overflow-hidden md:h-[440px]">
        <BannerBackdrop item={item} />
        <div className="banner-scrim pointer-events-none absolute inset-0" />
        <div className="page-shell absolute inset-x-0 bottom-8 md:bottom-10">
        <div className="flex items-end gap-5 md:gap-7">
        <PosterCard item={item} />
        <div className="flex max-w-[640px] flex-col gap-3 md:gap-3.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-pill border border-line16 bg-surface10 px-[11px] py-1 text-xs font-semibold text-fg">
              {item.category}
            </span>
            {item.juice ? <span className="badge-juice px-[11px] py-1 text-xs">{t.juice}</span> : null}
            <span className="text-xs text-fg55">
              {item.countryDetail} · {item.year}
            </span>
          </div>
          <h1 className="text-[26px] font-extrabold tracking-[-0.5px] md:text-[38px]">{item.title}</h1>
          {item.titleEn && item.titleEn !== item.title ? (
            <div className="-mt-1.5 text-[15px] font-semibold text-fg50">{item.titleEn}</div>
          ) : null}
          <div className="text-[13px] text-fg60">
            {item.creatorLabel} {item.creatorName}
          </div>
        </div>
        </div>
        </div>
      </div>

      {/*
        감상처가 DOM에서 먼저 온다 — 모바일에선 한 칸이라 줄거리 바로 위에 붙고,
        데스크톱에선 아래 col/row 지정으로 오른쪽 칸에 그대로 들어간다.
        (뒤에 두면 모바일에서 페이지 맨 아래, 푸터 직전까지 밀려났다)
      */}
      <div className="page-shell grid grid-cols-1 gap-6 pb-15 pt-10 lg:grid-cols-[1fr_320px] lg:gap-12">
        {/*
          같은 마크업을 폭에 따라 다르게 입힌다.
          모바일: 테두리 없는 절 + 알약 버튼이 두세 줄로 흐른다 (5개짜리 세로 목록이 화면을 통째로 먹었다)
          데스크톱: 예전 그대로 오른쪽에 붙는 카드
        */}
        <aside
          id="watch"
          className="flex h-fit flex-col gap-3 lg:sticky lg:top-[88px] lg:col-start-2 lg:row-start-1 lg:gap-3.5 lg:rounded-2xl lg:border lg:border-line8 lg:bg-card lg:p-[22px]"
        >
          <h2 className="text-base font-bold lg:text-[15px]">{t.watchAt}</h2>
          <div className="flex flex-wrap gap-2 lg:flex-col lg:gap-2.5">
            {item.platforms.length === 0 ? (
              <div className="text-[13px] text-fg35">{t.noWatchAt}</div>
            ) : null}
            {item.platforms.map((platform, index) => {
              const inner = (
                <>
                  <span className="text-[13px] font-semibold text-fg">{platform.name}</span>
                  {platform.url ? <ExternalLinkIcon className="shrink-0 text-fg40" /> : null}
                </>
              );
              const className =
                "inline-flex items-center gap-2 rounded-pill border border-line12 bg-surface4 px-3.5 py-2 hover:bg-surface6 lg:w-full lg:justify-between lg:rounded-[10px] lg:border-line6 lg:bg-surface3 lg:py-3";

              // URL이 등록된 플랫폼만 새 탭으로 열린다. 없으면 클릭해도 아무 동작 없음(안전 가드).
              return platform.url ? (
                <TrackedExternalLink
                  key={`${platform.name}-${index}`}
                  href={platform.url}
                  target="_blank"
                  rel="noreferrer noopener"
                  className={`${className} cursor-pointer text-fg hover:text-fg`}
                  event={EVENTS.outboundPlatform}
                  params={{
                    content_id: item.id,
                    content_title: item.title,
                    platform_name: platform.name,
                    destination: hostOf(platform.url),
                  }}
                >
                  {inner}
                </TrackedExternalLink>
              ) : (
                <div key={`${platform.name}-${index}`} className={className}>
                  {inner}
                </div>
              );
            })}
          </div>
        </aside>

        <div className="flex flex-col gap-7 lg:col-start-1 lg:row-start-1">
          <section>
            <h2 className="mb-2.5 text-base font-bold">{t.synopsis}</h2>
            <p className="text-[15px] leading-[1.75] text-fg72">{item.synopsis}</p>
          </section>

          <section>
            <h2 className="mb-2.5 text-base font-bold">{t.cast}</h2>
            <div className="flex flex-wrap gap-2">
              {item.leads.map((name) => (
                <span
                  key={name}
                  className="rounded-pill bg-accent-soft12 px-3 py-1.5 text-xs font-semibold text-accent"
                >
                  {name}
                </span>
              ))}
            </div>
          </section>

          <section>
            <h2 className="mb-2.5 text-base font-bold">{t.tags}</h2>
            <div className="flex flex-wrap gap-2">
              {item.tags.map((tag) => (
                <span key={tag} className="rounded-pill bg-surface6 px-3 py-1.5 text-xs text-fg70">
                  #{tag}
                </span>
              ))}
            </div>
          </section>

          {/*
            한줄평이 추천 줄보다 위에 온다. 지금 보고 있는 작품에 대한 이야기가 먼저고,
            다른 작품으로 넘어가는 길은 그 뒤에 두는 편이 순서에 맞다.
          */}
          <CommentSection itemId={item.id} initialComments={comments} lang={lang} />

          {/*
            추천 줄은 홈과 같은 가로 스크롤. 그리드로 깔면 모바일에서 카드가 화면 절반씩 차지해
            본문보다 커져 버린다. 카드도 홈보다 한 단계 작게 잡는다 — 여긴 곁다리니까.
          */}
          {related.length > 0 ? (
            <section>
              <h2 className="mb-3.5 text-base font-bold">{t.related}</h2>
              <div className="h-scroll flex gap-3.5 pb-1.5">
                {related.map((entry, index) => (
                  <div key={entry.id} className="w-[112px] flex-none md:w-[144px]">
                    <ContentCard
                      item={entry}
                      lang={lang}
                      listName="이런 작품은 어때요"
                      position={index + 1}
                    />
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          {byLead.items.length > 0 ? (
            <section>
              <h2 className="mb-3.5 text-base font-bold">{t.moreByLead(byLead.sharedLeadName)}</h2>
              <div className="h-scroll flex gap-3.5 pb-1.5">
                {byLead.items.map((entry, index) => (
                  <div key={entry.id} className="w-[112px] flex-none md:w-[144px]">
                    <ContentCard
                      item={entry}
                      lang={lang}
                      listName="배우의 다른 작품"
                      position={index + 1}
                    />
                  </div>
                ))}
              </div>
            </section>
          ) : null}
        </div>
      </div>
    </div>
  );
}
