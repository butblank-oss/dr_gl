import { ImageWithFallback } from "@/components/ImageWithFallback";
import type { ContentDTO } from "@/lib/types";

const placeholder = (
  <div className="banner-empty absolute inset-0 flex items-center justify-center">
    <div className="text-[13px] font-semibold uppercase tracking-[2px] text-fg22">포스터 준비중</div>
  </div>
);

/** 홈 히어로 / 상세 상단의 배경 배너 이미지 (없으면 "포스터 준비중" 타일) */
export function BannerBackdrop({ item }: { item: ContentDTO }) {
  const image = item.poster ? (item.backdropUrl ?? item.posterUrl) : null;
  if (!image) return placeholder;

  return (
    <ImageWithFallback
      src={image}
      alt={`${item.title} 배경 이미지`}
      className="absolute inset-0 h-full w-full object-cover"
      fallback={placeholder}
    />
  );
}
