"use client";

import Script from "next/script";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";
import { EVENTS, GA_ID, ensureGtag, track } from "@/lib/analytics";

const SCROLL_MARKS = [25, 50, 75, 100] as const;

/**
 * GA4 스크립트 로딩 + 화면 전환 추적 + 체류 시간 + 스크롤 깊이.
 *
 * - NEXT_PUBLIC_GA_ID 가 없으면 스크립트를 아예 넣지 않는다(쿠키도 생기지 않음).
 * - App Router는 화면을 바꿔도 페이지가 새로 뜨지 않으므로 page_view를 직접 보낸다.
 */
export function Analytics() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const enteredAt = useRef<number>(Date.now());
  const sentMarks = useRef<Set<number>>(new Set());
  const currentPath = useRef<string>("");

  const url = searchParams.toString() ? `${pathname}?${searchParams}` : pathname;

  // 화면이 바뀔 때마다: 이전 화면의 체류 시간을 보내고, 새 화면의 page_view를 보낸다.
  useEffect(() => {
    const previous = currentPath.current;
    if (previous && previous !== url) {
      const seconds = Math.round((Date.now() - enteredAt.current) / 1000);
      if (seconds > 0) {
        track(EVENTS.pageEngagement, { page_path: previous, seconds });
      }
    }

    currentPath.current = url;
    enteredAt.current = Date.now();
    sentMarks.current = new Set();

    track("page_view", {
      page_path: url,
      page_location: window.location.href,
      page_title: document.title,
    });
  }, [url]);

  // 탭을 닫거나 숨길 때도 체류 시간을 남긴다.
  useEffect(() => {
    const flush = () => {
      const seconds = Math.round((Date.now() - enteredAt.current) / 1000);
      if (seconds > 0) {
        track(EVENTS.pageEngagement, { page_path: currentPath.current, seconds });
        enteredAt.current = Date.now();
      }
    };
    const onVisibility = () => {
      if (document.visibilityState === "hidden") flush();
      else enteredAt.current = Date.now();
    };

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", flush);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", flush);
    };
  }, []);

  // 스크롤 깊이 — 어디까지 읽었는지
  useEffect(() => {
    const onScroll = () => {
      const doc = document.documentElement;
      const scrollable = doc.scrollHeight - window.innerHeight;
      if (scrollable <= 0) return;
      const percent = ((window.scrollY / scrollable) * 100);

      for (const mark of SCROLL_MARKS) {
        if (percent >= mark && !sentMarks.current.has(mark)) {
          sentMarks.current.add(mark);
          track(EVENTS.scrollDepth, { page_path: currentPath.current, percent: mark });
        }
      }
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (!GA_ID) return null;

  // 대기열(js·config)은 ensureGtag 가 만들고, 여기서는 실제 GA 스크립트만 불러온다.
  return (
    <Script
      src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
      strategy="afterInteractive"
      onReady={ensureGtag}
    />
  );
}
