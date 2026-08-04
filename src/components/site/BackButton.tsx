"use client";

import { useGoBack } from "@/components/site/useGoBack";

export function BackButton() {
  const goBack = useGoBack();

  return (
    <button
      type="button"
      onClick={goBack}
      className="cursor-pointer rounded-[9px] border border-line12 bg-surface4 px-4 py-[9px] text-[13px] text-fg75"
    >
      ← 돌아가기
    </button>
  );
}
