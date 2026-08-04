"use client";

import { useRouter } from "next/navigation";
import { hasInAppHistory } from "@/components/site/NavTracker";

export function BackButton() {
  const router = useRouter();

  const goBack = () => {
    // 공유 링크로 이 페이지에 바로 들어온 경우엔 뒤로 가면 사이트 밖으로 나가버린다.
    // 그럴 땐 홈으로 보낸다.
    if (hasInAppHistory()) router.back();
    else router.push("/");
  };

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
