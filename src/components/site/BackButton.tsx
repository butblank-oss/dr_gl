"use client";

import { useRouter } from "next/navigation";

export function BackButton() {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={() => router.back()}
      className="cursor-pointer rounded-[9px] border border-line12 bg-surface4 px-4 py-[9px] text-[13px] text-fg75"
    >
      ← 돌아가기
    </button>
  );
}
