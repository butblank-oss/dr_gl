"use client";

import { useEffect, useState } from "react";
import { EVENTS, track } from "@/lib/analytics";

/** 공유 링크에 붙이는 표시 — 이 링크로 들어온 방문을 유입 경로에서 구분할 수 있게 한다. */
const SHARE_SOURCE = "drgl_share";

type Props = {
  /** 공유할 사이트 내 주소 (예: /content/12) */
  path: string;
  /** 무엇을 공유했는지 구분할 이름 (예: 작품 제목) */
  title: string;
  /** 어느 작품인지 — 작품별 공유 수를 세는 데 쓴다 */
  contentId?: number;
  /** 유입 경로에서 묶어 볼 이름 (예: content_12) */
  campaign: string;
  className?: string;
};

/**
 * 공유 버튼.
 *
 * 주소창에서 직접 복사한 건 브라우저 영역이라 추적할 방법이 없다. 대신 이 버튼을 통하면
 * 내보낸 횟수와, 그 링크로 실제 들어온 방문까지 함께 셀 수 있다.
 * 휴대폰에서는 기본 공유창(카카오톡·메시지 등)을 열고, PC에서는 링크를 복사한다.
 */
export function ShareButton({ path, title, contentId, campaign, className }: Props) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timer);
  }, [copied]);

  const share = async () => {
    const url = new URL(path, window.location.origin);
    url.searchParams.set("utm_source", SHARE_SOURCE);
    url.searchParams.set("utm_medium", "link");
    url.searchParams.set("utm_campaign", campaign);
    const shareUrl = url.toString();

    const record = (method: string) =>
      track(EVENTS.share, {
        content_id: contentId,
        content_title: title,
        label: method,
        nav_source: "공유 버튼",
      });

    // 휴대폰: 기본 공유창을 띄운다.
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title: `${title} · Dr. GL`, url: shareUrl });
        record("기본 공유창");
        return;
      } catch {
        // 사용자가 공유창을 닫은 경우 — 복사로 넘어가지 않고 그대로 끝낸다.
        return;
      }
    }

    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      record("링크 복사");
    } catch {
      // 클립보드가 막힌 환경에서는 주소만 띄워 직접 복사하게 한다.
      window.prompt("아래 주소를 복사해 공유하세요", shareUrl);
      record("직접 복사");
    }
  };

  return (
    <button
      type="button"
      onClick={share}
      aria-label={`${title} 공유하기`}
      className={className ?? "btn-grad gap-1.5 px-[18px] py-2.5 text-[13px]"}
    >
      <ShareIcon />
      {copied ? "링크를 복사했어요" : "공유하기"}
    </button>
  );
}

function ShareIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M4 12v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7" />
      <path d="M16 6l-4-4-4 4" />
      <path d="M12 2v13" />
    </svg>
  );
}
