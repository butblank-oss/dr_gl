"use client";

import { useEffect } from "react";
import { EVENTS, track } from "@/lib/analytics";

/**
 * 검색 결과가 그려진 뒤에 검색 이벤트를 남긴다.
 * 헤더 입력·추천 태그·주소 직접 입력 등 어떤 경로로 들어와도 한 번만 기록되고,
 * "검색은 했는데 결과가 0건"인 검색어까지 같이 남아 큐레이션에 쓸 수 있다.
 */
export function SearchTracker({ query, results }: { query: string; results: number }) {
  useEffect(() => {
    if (!query) return;
    track(EVENTS.search, { search_term: query, results });
  }, [query, results]);

  return null;
}
