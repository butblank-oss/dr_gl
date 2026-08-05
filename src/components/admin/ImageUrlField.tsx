"use client";

import { ImageWithFallback } from "@/components/ImageWithFallback";
import { isAllowedImageUrl } from "@/lib/validation";

const EMPTY_SLOT = (
  <div className="absolute inset-0 flex items-center justify-center border border-dashed border-line20 text-[11px] text-fg30">
    이미지 없음
  </div>
);

type Props = {
  label: string;
  hint?: string;
  value: string | null;
  onChange: (url: string | null) => void;
  width?: number;
  height?: number;
};

/**
 * 포스터·배경 이미지 주소 입력 필드.
 * 이미지를 내려받아 우리 서버에 다시 올리는 대신 원본 주소를 그대로 참조한다 —
 * 복제본을 만들지 않는 편이 저작권 위험이 낮다.
 */
export function ImageUrlField({ label, hint, value, onChange, width = 160, height = 120 }: Props) {
  const current = value ?? "";
  const invalid = current.trim() !== "" && !isAllowedImageUrl(current);

  return (
    <div className="flex flex-col gap-[7px]">
      <label className="text-xs font-semibold text-fg70">{label}</label>
      {hint ? <span className="text-[11px] text-fg40">{hint}</span> : null}
      <div className="flex items-start gap-3">
        <div className="relative shrink-0 overflow-hidden rounded-[10px] bg-tile" style={{ width, height }}>
          {current.trim() && !invalid ? (
            <ImageWithFallback
              src={current.trim()}
              alt={label}
              className="absolute inset-0 h-full w-full object-cover"
              fallback={EMPTY_SLOT}
            />
          ) : (
            EMPTY_SLOT
          )}
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <input
            type="url"
            inputMode="url"
            placeholder="https://image.tmdb.org/t/p/w500/..."
            value={current}
            onChange={(e) => onChange(e.target.value.trim() || null)}
            className="w-full rounded-lg border border-line12 bg-surface4 px-3 py-2 font-mono text-xs text-fg placeholder:text-fg30"
          />
          <div className="flex items-center gap-2">
            {current ? (
              <button
                type="button"
                onClick={() => onChange(null)}
                className="cursor-pointer rounded-lg border border-danger-line bg-danger-soft8 px-3.5 py-2 text-xs text-danger"
              >
                주소 지우기
              </button>
            ) : null}
            {current.trim() && !invalid ? (
              <a
                href={current.trim()}
                target="_blank"
                rel="noreferrer noopener"
                className="cursor-pointer rounded-lg border border-line12 bg-surface4 px-3.5 py-2 text-xs text-fg70"
              >
                원본 열기
              </a>
            ) : null}
          </div>
          {invalid ? (
            <span className="text-[11px] text-danger">https:// 로 시작하는 이미지 주소만 넣을 수 있어요.</span>
          ) : (
            <span className="text-[11px] text-fg30">
              이미지 주소만 붙여넣을 수 있어요. 파일 업로드는 지원하지 않습니다.
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
