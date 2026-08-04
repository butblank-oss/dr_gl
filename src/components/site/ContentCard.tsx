import Link from "next/link";
import { ImageWithFallback } from "@/components/ImageWithFallback";
import { leadsText } from "@/lib/format";
import type { ContentDTO } from "@/lib/types";

/** 포스터가 없을 때 쓰는 "포스터 준비중" 텍스트 타일 */
function PosterPlaceholder({ item, leads }: { item: ContentDTO; leads: string }) {
  return (
    <div className="poster-empty absolute inset-0 flex flex-col items-center justify-center gap-1.5 p-3.5 text-center">
      <div className="text-[9px] font-semibold uppercase tracking-[1.2px] text-fg28">포스터 준비중</div>
      <div className="line-clamp-2-box text-[13px] font-bold leading-tight text-fg72">{item.title}</div>
      <div className="text-[10px] text-fg32">{leads}</div>
    </div>
  );
}

/**
 * 사이트 전역에서 쓰는 콘텐츠 카드.
 * 영화·웹툰 포스터는 대부분 세로(2:3)라 카드도 같은 비율로 둔다.
 * 가로 4:3로 두면 포스터 위아래(제목·크레딧)가 잘려나간다.
 */
export function ContentCard({ item }: { item: ContentDTO }) {
  const leads = leadsText(item.leads);
  const image = item.poster ? item.posterUrl : null;
  const placeholder = <PosterPlaceholder item={item} leads={leads} />;

  return (
    <Link href={`/content/${item.id}`} className="group flex w-full flex-col gap-2.5 text-fg">
      <div className="card-hover relative aspect-2/3 w-full overflow-hidden rounded-[14px] bg-tile shadow-[0_1px_2px_rgba(0,0,0,0.4)]">
        {image ? (
          <ImageWithFallback
            src={image}
            alt={item.title}
            className="absolute inset-0 h-full w-full object-cover"
            fallback={placeholder}
          />
        ) : (
          placeholder
        )}
        <div className="card-scrim pointer-events-none absolute inset-0" />
        <div className="pointer-events-none absolute left-2 top-2 flex gap-1.5">
          <span className="rounded-pill border border-line14 bg-[rgba(11,10,15,0.6)] px-2.5 py-[3px] text-[11px] font-semibold text-fg backdrop-blur-[4px]">
            {item.category}
          </span>
          {item.juice ? <span className="badge-juice px-2.5 py-[3px] text-[11px]">착즙</span> : null}
        </div>
      </div>
      <div className="flex flex-col gap-[3px]">
        <div className="truncate text-sm font-semibold leading-tight text-fg">{item.title}</div>
        <div className="text-xs text-fg50">
          {item.year} · {item.creatorName}
        </div>
        <div className="truncate text-[11px] text-fg40">출연 {leads}</div>
      </div>
    </Link>
  );
}
