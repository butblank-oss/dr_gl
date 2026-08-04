"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

const KEY = "drgl_nav_depth";

/** 이 탭에서 사이트 안을 몇 번 이동했는지 기록한다. (뒤로가기가 사이트 밖으로 나가는 걸 막는 용도) */
export function NavTracker() {
  const pathname = usePathname();

  useEffect(() => {
    try {
      const depth = Number(sessionStorage.getItem(KEY) ?? "0");
      sessionStorage.setItem(KEY, String(depth + 1));
    } catch {
      // 시크릿 모드 등에서 sessionStorage 가 막혀 있어도 동작에 지장은 없다.
    }
  }, [pathname]);

  return null;
}

/** 사이트 안에서 한 번이라도 이동해 왔는지 — true 면 뒤로가기가 사이트 안으로 돌아간다. */
export function hasInAppHistory(): boolean {
  try {
    return Number(sessionStorage.getItem(KEY) ?? "0") > 1;
  } catch {
    return false;
  }
}
