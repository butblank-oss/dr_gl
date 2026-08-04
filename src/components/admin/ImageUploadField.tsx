"use client";

import { useRef, useState } from "react";
import { SpinnerIcon } from "@/components/icons";
import { ImageWithFallback } from "@/components/ImageWithFallback";
import { ApiError, api } from "@/lib/client-api";

const EMPTY_SLOT = (
  <div className="absolute inset-0 flex items-center justify-center border border-dashed border-line20 text-[11px] text-fg30">
    이미지 없음
  </div>
);

type Props = {
  label: string;
  hint?: string;
  kind: "poster" | "backdrop";
  value: string | null;
  onChange: (url: string | null) => void;
  width?: number;
  height?: number;
};

/**
 * 실제 파일 업로드 필드 — /api/uploads 로 올리고 돌려받은 URL을 콘텐츠에 저장한다.
 * (프로토타입의 <image-slot> sidecar 방식을 대체하는 지점)
 */
export function ImageUploadField({
  label,
  hint,
  kind,
  value,
  onChange,
  width = 160,
  height = 120,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  const upload = async (file: File) => {
    setPending(true);
    setError("");
    try {
      const body = new FormData();
      body.append("file", file);
      body.append("kind", kind);
      const data = await api<{ url: string }>("/api/uploads", { method: "POST", body });
      onChange(data.url);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "업로드에 실패했어요.");
    } finally {
      setPending(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="flex flex-col gap-[7px]">
      <label className="text-xs font-semibold text-fg70">{label}</label>
      {hint ? <span className="text-[11px] text-fg40">{hint}</span> : null}
      <div className="flex items-start gap-3">
        <div
          className="relative overflow-hidden rounded-[10px] bg-tile"
          style={{ width, height }}
        >
          {value ? (
            <ImageWithFallback
              src={value}
              alt={label}
              className="absolute inset-0 h-full w-full object-cover"
              fallback={EMPTY_SLOT}
            />
          ) : (
            EMPTY_SLOT
          )}
          {pending ? (
            <div className="absolute inset-0 flex items-center justify-center bg-[rgba(0,0,0,0.55)] text-fg">
              <SpinnerIcon />
            </div>
          ) : null}
        </div>
        <div className="flex flex-col gap-2">
          <input
            ref={inputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif,image/avif"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) upload(file);
            }}
          />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={pending}
            className="cursor-pointer rounded-lg border border-line12 bg-surface4 px-3.5 py-2 text-xs text-fg"
          >
            이미지 선택
          </button>
          {value ? (
            <button
              type="button"
              onClick={() => onChange(null)}
              className="cursor-pointer rounded-lg border border-danger-line bg-danger-soft8 px-3.5 py-2 text-xs text-danger"
            >
              이미지 제거
            </button>
          ) : null}
          <span className="text-[11px] text-fg30">JPG · PNG · WEBP, 최대 5MB</span>
        </div>
      </div>
      {error ? <div className="text-xs text-danger">{error}</div> : null}
    </div>
  );
}
