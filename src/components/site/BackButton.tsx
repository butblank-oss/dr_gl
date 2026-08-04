"use client";

import { usePathname } from "next/navigation";
import { useGoBack } from "@/components/site/useGoBack";
import { EVENTS, track } from "@/lib/analytics";

export function BackButton() {
  const goBack = useGoBack();
  const pathname = usePathname();

  return (
    <button
      type="button"
      onClick={() => {
        track(EVENTS.nav, { label: "돌아가기", from: pathname });
        goBack();
      }}
      className="cursor-pointer rounded-[9px] border border-line12 bg-surface4 px-4 py-[9px] text-[13px] text-fg75"
    >
      ← 돌아가기
    </button>
  );
}
