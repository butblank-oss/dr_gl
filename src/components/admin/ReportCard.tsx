"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { SpinnerIcon } from "@/components/icons";
import { ApiError, api } from "@/lib/client-api";
import { REPORT_KINDS, REPORT_LABELS, type ReportKind } from "@/lib/report-shared";

type Props = {
  kind: ReportKind;
  /** 지금 보고 있는 탭 — 그 탭에 해당하는 해석만 보여준다 */
  lines: string[];
  periodStart: string | null;
  periodEnd: string | null;
  createdAt: string | null;
  /** 탭·기간이 담긴 주소. 여기에 report= 만 덧붙여 종류를 바꾼다. */
  baseHref: string;
  canRefresh: boolean;
};

/**
 * 자동 생성된 리포트를 탭 위에 붙인다.
 * 표를 읽고 해석하는 일을 매번 반복하지 않도록, 무엇이 변했고 무엇을 하면 되는지를 문장으로 둔다.
 */
export function ReportCard({
  kind,
  lines,
  periodStart,
  periodEnd,
  createdAt,
  baseHref,
  canRefresh,
}: Props) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  const refresh = async () => {
    setPending(true);
    setError("");
    try {
      await api("/api/reports", { method: "POST", body: JSON.stringify({ kind }) });
      router.refresh();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "리포트를 만들지 못했어요.");
    } finally {
      setPending(false);
    }
  };

  const period =
    periodStart && periodEnd
      ? periodStart === periodEnd
        ? periodStart
        : `${periodStart} ~ ${periodEnd}`
      : null;

  return (
    <section className="flex flex-col gap-3 rounded-[14px] border border-accent-line bg-accent-soft8 px-5 py-[18px]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-baseline gap-2">
          <span className="text-sm font-bold text-accent">리포트</span>
          {period ? <span className="text-[11px] text-fg45">{period}</span> : null}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            {REPORT_KINDS.map((entry) => (
              <Link
                key={entry}
                href={`${baseHref}&report=${entry}`}
                className={`chip !px-[11px] !py-1.5 !text-[11px] ${entry === kind ? "chip-on" : "chip-off"}`}
              >
                {REPORT_LABELS[entry]}
              </Link>
            ))}
          </div>
          {canRefresh ? (
            <button
              type="button"
              onClick={refresh}
              disabled={pending}
              className="cursor-pointer rounded-lg border border-line12 bg-surface4 px-3 py-1.5 text-[11px] text-fg60 disabled:opacity-50"
            >
              {pending ? <SpinnerIcon /> : "지금 다시 만들기"}
            </button>
          ) : null}
        </div>
      </div>

      {error ? <div className="text-[13px] text-danger">{error}</div> : null}

      {lines.length > 0 ? (
        <ul className="flex list-none flex-col gap-2 pl-0">
          {lines.map((line, index) => (
            <li key={index} className="flex gap-2.5 text-[13px] leading-relaxed text-fg75">
              <span className="flex-none text-accent">·</span>
              <span>{line}</span>
            </li>
          ))}
        </ul>
      ) : period ? (
        // 리포트는 있는데 이 탭에서 짚을 게 없었던 경우 — "리포트가 없다"와 구분한다.
        <div className="text-[13px] leading-relaxed text-fg50">
          이 기간에는 이 항목에서 특별히 짚을 내용이 없었어요. 방문이 쌓이면 자동으로 채워집니다.
        </div>
      ) : (
        <div className="text-[13px] leading-relaxed text-fg50">
          아직 만들어진 리포트가 없어요. 매일 오전 10시에 자동으로 만들어지고,
          {canRefresh ? " 위의 “지금 다시 만들기”로 바로 받아볼 수도 있어요." : " 슈퍼관리자가 즉시 생성할 수도 있어요."}
        </div>
      )}

      {createdAt ? (
        <div className="text-[11px] text-fg30">
          {new Date(createdAt).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })} 기준
        </div>
      ) : null}
    </section>
  );
}
