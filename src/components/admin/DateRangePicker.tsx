"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = {
  /** 탭 등 유지해야 할 값이 담긴 주소 (예: /admin/analytics?tab=content) */
  baseHref: string;
  from: string;
  to: string;
  /** 직접 고른 기간을 보고 있는지 */
  active: boolean;
};

/** 오늘 날짜 (사이트 기준 시간대) — 미래는 고를 수 없게 막는 데 쓴다 */
function todayInSeoul(): string {
  return new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

/** 기간을 직접 골라 보는 입력. 빠른 선택(7·28·90일)으로 부족할 때 쓴다. */
export function DateRangePicker({ baseHref, from, to, active }: Props) {
  const router = useRouter();
  const today = todayInSeoul();
  const [start, setStart] = useState(from);
  const [end, setEnd] = useState(to);

  const apply = () => {
    if (!start || !end) return;
    // 거꾸로 골랐으면 알아서 바꿔준다.
    const [a, b] = start <= end ? [start, end] : [end, start];
    router.push(`${baseHref}&from=${a}&to=${b}`);
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <input
        type="date"
        value={start}
        max={today}
        onChange={(e) => setStart(e.target.value)}
        aria-label="시작일"
        className="field h-9 w-[148px] flex-none px-2.5 text-xs"
      />
      <span className="text-xs text-fg35">~</span>
      <input
        type="date"
        value={end}
        max={today}
        onChange={(e) => setEnd(e.target.value)}
        aria-label="종료일"
        className="field h-9 w-[148px] flex-none px-2.5 text-xs"
      />
      <button
        type="button"
        onClick={apply}
        className={`chip !px-[13px] !py-2 !text-xs ${active ? "chip-on" : "chip-off"}`}
      >
        기간 적용
      </button>
    </div>
  );
}
