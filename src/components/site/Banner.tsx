import { ImageWithFallback } from "@/components/ImageWithFallback";
import type { ContentDTO } from "@/lib/types";

const emptyBackdrop = (
  <div className="banner-empty absolute inset-0 flex items-center justify-center">
    <div className="text-[13px] font-semibold uppercase tracking-[2px] text-fg22">포스터 준비중</div>
  </div>
);

/**
 * 히어로 / 상세 상단의 배경.
 * - 가로형 배경 이미지가 따로 올라와 있으면 그대로 꽉 채운다.
 * - 세로 포스터만 있으면 그걸 늘려 쓰지 않고 **크게 흐린 배경**으로만 깔고,
 *   실제 포스터는 앞쪽에 원래 비율로 보여준다(PosterCard).
 *   세로 이미지를 초광폭 배너에 object-cover 하면 얼굴 일부만 남는다.
 */
export function BannerBackdrop({ item }: { item: ContentDTO }) {
  if (!item.poster) return emptyBackdrop;

  if (item.backdropUrl) {
    return (
      <ImageWithFallback
        src={item.backdropUrl}
        alt={`${item.title} 배경 이미지`}
        className="absolute inset-0 h-full w-full object-cover"
        fallback={emptyBackdrop}
      />
    );
  }

  if (item.posterUrl) {
    return (
      <ImageWithFallback
        src={item.posterUrl}
        alt=""
        className="absolute inset-0 h-full w-full scale-110 object-cover blur-2xl saturate-150"
        fallback={emptyBackdrop}
      />
    );
  }

  return emptyBackdrop;
}

/**
 * 배너 앞쪽에 원래 비율(2:3)로 놓이는 포스터. 이미지가 없으면 아무것도 그리지 않는다.
 * 홈 히어로는 좁은 화면에서 줄거리·버튼에 자리를 내주려고 포스터를 숨긴다(hideOnMobile).
 */
export function PosterCard({ item, hideOnMobile = false }: { item: ContentDTO; hideOnMobile?: boolean }) {
  if (!item.poster || !item.posterUrl) return null;
  return (
    <div
      className={`aspect-2/3 w-[88px] flex-none overflow-hidden rounded-xl border border-line12 bg-tile shadow-[0_12px_32px_rgba(0,0,0,0.6)] sm:w-[120px] md:w-[150px] ${
        hideOnMobile ? "hidden sm:block" : ""
      }`}
    >
      <ImageWithFallback
        src={item.posterUrl}
        alt={`${item.title} 포스터`}
        className="h-full w-full object-cover"
        fallback={<div className="h-full w-full bg-tile" />}
      />
    </div>
  );
}
