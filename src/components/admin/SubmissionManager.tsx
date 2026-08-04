"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  ContentModal,
  makeSubmissionDraft,
  type ContentDraft,
} from "@/components/admin/ContentModal";
import { Toast, useToast } from "@/components/admin/Toast";
import { ApiError, api } from "@/lib/client-api";
import { SUBMISSION_FILTER_LABELS, SUBMISSION_STATUS_TEXT } from "@/lib/types";
import type { SubmissionDTO } from "@/lib/types";

const STATUS_STYLE: Record<string, string> = {
  pending: "rounded-pill bg-danger-soft px-[9px] py-[3px] text-[10px] font-bold text-danger",
  approved: "rounded-pill bg-accent-soft px-[9px] py-[3px] text-[10px] font-bold text-accent",
  rejected: "rounded-pill bg-surface6 px-[9px] py-[3px] text-[10px] font-semibold text-fg40",
};

export function SubmissionManager({
  initialSubmissions,
  categories,
}: {
  initialSubmissions: SubmissionDTO[];
  categories: string[];
}) {
  const router = useRouter();
  const [submissions, setSubmissions] = useState(initialSubmissions);
  const [filter, setFilter] = useState<string>("대기중");
  const [draft, setDraft] = useState<ContentDraft | null>(null);
  const { toast, show } = useToast();

  const reload = async () => {
    const data = await api<{ submissions: SubmissionDTO[] }>("/api/submissions");
    setSubmissions(data.submissions);
    router.refresh(); // 사이드바의 대기 건수 배지를 갱신
  };

  const reject = async (submission: SubmissionDTO) => {
    try {
      await api(`/api/submissions/${submission.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: "rejected" }),
      });
      await reload();
      show(`"${submission.title}" 제보를 반려했어요.`);
    } catch (e) {
      show(e instanceof ApiError ? e.message : "반려하지 못했어요.", "error");
    }
  };

  const filtered = submissions.filter((submission) => {
    if (filter === "전체") return true;
    return SUBMISSION_STATUS_TEXT[submission.status] === filter;
  });

  return (
    <>
      <h1 className="text-2xl font-extrabold">제보 검토</h1>

      <div className="flex gap-2">
        {SUBMISSION_FILTER_LABELS.map((label) => (
          <button
            key={label}
            type="button"
            onClick={() => setFilter(label)}
            className={`chip !px-[15px] !py-2 !text-xs ${filter === label ? "chip-on" : "chip-off"}`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="overflow-hidden rounded-[14px] border border-line8 bg-panel">
        {filtered.map((submission) => (
          <div key={submission.id} className="flex flex-col gap-2 border-b border-line6 px-[18px] py-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-bold">{submission.title}</span>
                <span className="rounded-pill bg-surface6 px-[9px] py-[3px] text-[11px] font-semibold text-fg55">
                  {submission.category} · {submission.country}
                </span>
                {submission.juice ? (
                  <span className="badge-juice px-2 py-[3px] text-[10px]">착즙</span>
                ) : null}
                <span className={STATUS_STYLE[submission.status]}>
                  {SUBMISSION_STATUS_TEXT[submission.status]}
                </span>
              </div>
              {submission.status === "pending" ? (
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => setDraft(makeSubmissionDraft(submission, categories))}
                    className="btn-grad px-3.5 py-[7px] text-xs"
                  >
                    검토 · 발행
                  </button>
                  <button
                    type="button"
                    onClick={() => reject(submission)}
                    className="cursor-pointer rounded-lg border border-line12 bg-surface4 px-3.5 py-[7px] text-xs text-fg"
                  >
                    반려
                  </button>
                </div>
              ) : null}
            </div>

            <div className="text-[13px] text-fg55">{submission.note || "코멘트 없음"}</div>

            <div className="flex flex-wrap gap-4 text-xs text-fg40">
              <a href={submission.url} target="_blank" rel="noreferrer noopener" className="break-all">
                {submission.url}
              </a>
              <span>연락처: {submission.contact || "없음"}</span>
            </div>
          </div>
        ))}

        {filtered.length === 0 ? (
          <div className="py-15 text-center text-[13px] text-fg35">해당하는 제보가 없어요.</div>
        ) : null}
      </div>

      {draft ? (
        <ContentModal
          draft={draft}
          categories={categories}
          onClose={() => setDraft(null)}
          onSaved={async () => {
            setDraft(null);
            await reload();
            show("콘텐츠를 발행하고 제보를 승인 처리했어요.");
          }}
        />
      ) : null}

      <Toast toast={toast} />
    </>
  );
}
