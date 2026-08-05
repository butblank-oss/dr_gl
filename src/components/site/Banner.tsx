import { ImageWithFallback } from "@/components/ImageWithFallback";
import type { ContentDTO } from "@/lib/types";

const emptyBackdrop = (
  <div className="banner-empty absolute inset-0 flex items-center justify-center">
    <div className="text-[13px] font-semibold uppercase tracking-[2px] text-fg22">포스터 준비중</div>
  </div>
);

/** 오른쪽에 놓이는 큰 포스터가 왼쪽·오른쪽 끝으로 스며들며 사라지게 하는 마스크 */
const FADE_MASK = "linear-gradient(90deg, transparent 0%, rgba(0,0,0,0.45) 26%, #000 62%, #000 90%, transparent 100%)";

/**
 * 히어로 / 상세 상단의 배경.
 * - 가로형 배경 이미지가 따로 올라와 있으면 그대로 꽉 채운다. (넷플릭스처럼 포스터와 배경은 별개 이미지다)
 * - 세로 포스터만 있으면 두 겹으로 쌓는다.
 *   ① 흐리게 깐 포스터 — 화면을 채우는 색과 분위기
 *   ② 오른쪽에 원래 비율 그대로 크게 놓은 포스터 — 가장자리를 서서히 지워 배경에 녹인다
 *   세로 이미지를 초광폭 배너에 그냥 object-cover 하면 얼굴 일부만 남기 때문에 이렇게 나눈다.
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
      <>
        <ImageWithFallback
          src={item.posterUrl}
          alt=""
          className="absolute inset-0 h-full w-full scale-125 object-cover object-top opacity-70 blur-[36px] saturate-125"
          fallback={emptyBackdrop}
        />
        {/* 좁은 화면에서는 글자를 가리므로 내보내지 않는다 */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 right-0 hidden aspect-2/3 sm:block"
          style={{ maskImage: FADE_MASK, WebkitMaskImage: FADE_MASK }}
        >
          <ImageWithFallback
            src={item.posterUrl}
            alt=""
            className="h-full w-full object-cover object-top opacity-90"
            fallback={<span />}
          />
        </div>
      </>
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
