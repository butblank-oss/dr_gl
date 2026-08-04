"use client";

import { useEffect, useState } from "react";

type Props = {
  src: string;
  alt: string;
  className?: string;
  /** 이미지를 불러오지 못했을 때 대신 보여줄 내용 ("포스터 준비중" 타일 등) */
  fallback: React.ReactNode;
};

/** 스토리지에서 사라졌거나 깨진 이미지를 빈 상태로 우아하게 대체한다. */
export function ImageWithFallback({ src, alt, className, fallback }: Props) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [src]);

  if (failed) return <>{fallback}</>;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} className={className} onError={() => setFailed(true)} />
  );
}
