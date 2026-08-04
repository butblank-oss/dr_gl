import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TrackedExternalLink } from "@/components/analytics/TrackedLink";
import { ExternalLinkIcon } from "@/components/icons";
import { EVENTS, hostOf } from "@/lib/analytics";
import { BackButton } from "@/components/site/BackButton";
import { BannerBackdrop, PosterCard } from "@/components/site/Banner";
import { CommentSection } from "@/components/site/CommentSection";
import { ContentCard } from "@/components/site/ContentCard";
import {
  getContentById,
  getRelatedByCategory,
  getRelatedByLead,
  getVisibleComments,
} from "@/lib/queries";

export const dynamic = "force-dynamic";

type Params = Promise<{ id: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const id = Number((await params).id);
  const item = Number.isInteger(id) ? await getContentById(id) : null;
  if (!item) return { title: "Dr. GL" };
  return {
    title: `${item.title} · Dr. GL`,
    description: item.synopsis,
  };
}

export default async function ContentDetailPage({ params }: { params: Params }) {
  const id = Number((await params).id);
  if (!Number.isInteger(id) || id <= 0) notFound();

  const item = await getContentById(id);
  if (!item) notFound();

  const [related, byLead, comments] = await Promise.all([
    getRelatedByCategory(item),
    getRelatedByLead(item),
    getVisibleComments(item.id),
  ]);

  return (
    <div>
      <div className="page-shell pt-5">
        <BackButton />
      </div>

      <div className="relative mt-2 h-[360px] w-full overflow-hidden md:h-[440px]">
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
            {item.juice ? <span className="badge-juice px-[11px] py-1 text-xs">착즙</span> : null}
            <span className="text-xs text-fg55">
              {item.countryDetail} · {item.year}
            </span>
          </div>
          <h1 className="text-[26px] font-extrabold tracking-[-0.5px] md:text-[38px]">{item.title}</h1>
          <div className="text-[13px] text-fg60">
            {item.creatorLabel} {item.creatorName}
          </div>
        </div>
        </div>
        </div>
      </div>

      <div className="page-shell grid grid-cols-1 gap-12 pb-15 pt-10 lg:grid-cols-[1fr_320px]">
        <div className="flex flex-col gap-7">
          <section>
            <h2 className="mb-2.5 text-base font-bold">줄거리</h2>
            <p className="text-[15px] leading-[1.75] text-fg72">{item.synopsis}</p>
          </section>

          <section>
            <h2 className="mb-2.5 text-base font-bold">출연</h2>
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
            <h2 className="mb-2.5 text-base font-bold">태그</h2>
            <div className="flex flex-wrap gap-2">
              {item.tags.map((tag) => (
                <span key={tag} className="rounded-pill bg-surface6 px-3 py-1.5 text-xs text-fg70">
                  #{tag}
                </span>
              ))}
            </div>
          </section>

          {related.length > 0 ? (
            <section>
              <h2 className="mb-3.5 text-base font-bold">이런 작품은 어때요?</h2>
              <div className="grid gap-[18px] [grid-template-columns:repeat(auto-fill,minmax(150px,1fr))]">
                {related.map((entry, index) => (
                  <ContentCard
                    key={entry.id}
                    item={entry}
                    listName="이런 작품은 어때요"
                    position={index + 1}
                  />
                ))}
              </div>
            </section>
          ) : null}

          {byLead.items.length > 0 ? (
            <section>
              <h2 className="mb-3.5 text-base font-bold">{byLead.sharedLeadName}의 다른 작품</h2>
              <div className="grid gap-[18px] [grid-template-columns:repeat(auto-fill,minmax(150px,1fr))]">
                {byLead.items.map((entry, index) => (
                  <ContentCard
                    key={entry.id}
                    item={entry}
                    listName="배우의 다른 작품"
                    position={index + 1}
                  />
                ))}
              </div>
            </section>
          ) : null}

          <CommentSection itemId={item.id} initialComments={comments} />
        </div>

        <aside
          id="watch"
          className="flex h-fit flex-col gap-3.5 rounded-2xl border border-line8 bg-card p-[22px] lg:sticky lg:top-[88px]"
        >
          <div className="text-[15px] font-bold">시청·감상 가능한 곳</div>
          <div className="flex flex-col gap-2.5">
            {item.platforms.length === 0 ? (
              <div className="text-[13px] text-fg35">등록된 시청처가 아직 없어요.</div>
            ) : null}
            {item.platforms.map((platform, index) => {
              const inner = (
                <>
                  <span className="text-[13px] font-semibold text-fg">{platform.name}</span>
                  <div className="flex items-center gap-2">
                    <span
                      className={
                        platform.type === "무료"
                          ? "rounded-pill bg-accent-soft px-2.5 py-1 text-[11px] font-bold text-accent"
                          : "rounded-pill bg-surface6 px-2.5 py-1 text-[11px] font-semibold text-fg55"
                      }
                    >
                      {platform.type}
                    </span>
                    {platform.url ? <ExternalLinkIcon className="text-fg40" /> : null}
                  </div>
                </>
              );
              const className =
                "flex items-center justify-between rounded-[10px] border border-line6 bg-surface3 px-3.5 py-3 hover:bg-surface6";

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
                    platform_type: platform.type,
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
      </div>
    </div>
  );
}
