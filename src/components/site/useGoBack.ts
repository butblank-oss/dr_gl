"use client";

import { useRouter } from "next/navigation";
import { useCallback } from "react";
import { hasInAppHistory } from "@/components/site/NavTracker";

/**
 * 사이트 안으로만 돌아가는 뒤로가기.
 * 공유 링크로 바로 들어온 경우엔 뒤로 가면 사이트 밖으로 나가버리므로 홈으로 보낸다.
 */
export function useGoBack() {
  const router = useRouter();
  return useCallback(() => {
    if (hasInAppHistory()) router.back();
    else router.push("/");
  }, [router]);
}
