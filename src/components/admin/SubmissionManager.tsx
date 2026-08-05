"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  ContentModal,
  makeSubmissionDraft,
  type ContentDraft,
} from "@/components/admin/ContentModal";
import { RejectDialog } from "@/components/admin/RejectDialog";
import { Toast, useToast } from "@/components/admin/Toast";
import { ApiError, api } from "@/lib/client-api";
import { formatDateTime } from "@/lib/format";
import {
  REJECT_REASON_LABELS,
  SUBMISSION_FILTER_LABELS,
  SUBMISSION_STATUS_TEXT,
} from "@/lib/types";
import type { RejectReasonCode, SubmissionDTO } from "@/lib/types";

/** 제보 내용을 항목별로 빠짐없이 보여준다. 값이 없으면 없다고 명시한다. */
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-2 text-xs leading-relaxed">
      <span className="w-[68px] flex-none text-fg40">{label}</span>
      <span className="min-w-0 flex-1 text-fg72">{children}</span>
    </div>
  );
}

const Empty = ({ text = "없음" }: { text?: string }) => <span className="text-fg35">{text}</span>;

const STATUS_STYLE: Record<string, string> = {
  pending: "rounded-pill bg-danger-soft px-[9px] py-[3px] text-[10px] font-bold text-danger",
  approved: "rounded-pill bg-accent-soft px-[9px] py-[3px] text-[10px] font-bold text-accent",
  rejected: "rounded-pill bg-surface6 px-[9px] py-[3px] text-[10px] font-semibold text-fg40",
};

/** 제목이 같은 기존 작품 — 서버에서 대조해 내려준다 */
export type DuplicateMatch = { id: number; title: string; category: string; year: number };

export function SubmissionManager({
  initialSubmissions,
  initialDuplicates,
  categories,
}: {
  initialSubmissions: SubmissionDTO[];
  initialDuplicates: Record<number, DuplicateMatch[]>;
  categories: string[];
}) {
  const router = useRouter();
  const [submissions, setSubmissions] = useState(initialSubmissions);
  const [duplicates, setDuplicates] = useState(initialDuplicates);
  const [filter, setFilter] = useState<string>("대기중");
  const [draft, setDraft] = useState<ContentDraft | null>(null);
  const [merging, setMerging] = useState<number | null>(null);
  const [rejecting, setRejecting] = useState<SubmissionDTO | null>(null);
  const [rejectPending, setRejectPending] = useState(false);
  const { toast, show } = useToast();

  const reload = async () => {
    const data = await api<{
      submissions: SubmissionDTO[];
      duplicates: Record<number, DuplicateMatch[]>;
    }>("/api/submissions");
    setSubmissions(data.submissions);
    setDuplicates(data.duplicates ?? {});
    router.refresh(); // 사이드바의 대기 건수 배지를 갱신
  };

  /** 새 콘텐츠를 만들지 않고, 제보된 시청처만 기존 작품에 더한다. */
  const merge = async (submission: SubmissionDTO, match: DuplicateMatch) => {
    setMerging(submission.id);
    try {
      const data = await api<{ added: boolean }>(`/api/submissions/${submission.id}/merge`, {
        method: "POST",
        body: JSON.stringify({ contentId: match.id }),
      });
      await reload();
      show(
        data.added
          ? `"${match.title}"에 시청처를 추가하고 제보를 승인했어요.`
          : `이미 등록된 링크라 추가하지 않고 제보만 승인 처리했어요.`,
      );
    } catch (e) {
      show(e instanceof ApiError ? e.message : "합치지 못했어요.", "error");
    } finally {
      setMerging(null);
    }
  };

  const reject = async (submission: SubmissionDTO, reason: RejectReasonCode, note: string) => {
    setRejectPending(true);
    try {
      await api(`/api/submissions/${submission.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: "rejected", rejectReason: reason, rejectNote: note }),
      });
      setRejecting(null);
      await reload();
      show(`"${submission.title}" 제보를 반려했어요. (${REJECT_REASON_LABELS[reason]})`);
    } catch (e) {
      show(e instanceof ApiError ? e.message : "반려하지 못했어요.", "error");
    } finally {
      setRejectPending(false);
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
                <span className={STATUS_STYLE[submission.status]}>
                  {SUBMISSION_STATUS_TEXT[submission.status]}
                </span>
                {submission.status === "rejected" && submission.rejectReason ? (
                  <span className="rounded-pill border border-line12 bg-surface6 px-[9px] py-[3px] text-[10px] font-semibold text-fg55">
                    {REJECT_REASON_LABELS[submission.rejectReason] ?? submission.rejectReason}
                  </span>
                ) : null}
                {(duplicates[submission.id]?.length ?? 0) > 0 ? (
                  <span className="rounded-pill bg-[rgba(255,176,32,0.16)] px-[9px] py-[3px] text-[10px] font-bold text-[#ffb020]">
                    이미 등록된 작품
                  </span>
                ) : null}
                <span className="text-[11px] text-fg30">{formatDateTime(submission.createdAt)}</span>
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
                    onClick={() => setRejecting(submission)}
                    className="cursor-pointer rounded-lg border border-line12 bg-surface4 px-3.5 py-[7px] text-xs text-fg"
                  >
                    반려
                  </button>
                </div>
              ) : null}
            </div>

            {/* 같은 제목의 작품이 이미 있으면, 새로 만들지 말고 링크만 합치는 길을 먼저 준다 */}
            {submission.status === "pending" && duplicates[submission.id]?.length ? (
              <div className="flex flex-col gap-2 rounded-[10px] border border-[rgba(255,176,32,0.3)] bg-[rgba(255,176,32,0.07)] px-3.5 py-3">
                <div className="text-xs font-bold text-[#ffb020]">
                  같은 제목의 작품이 이미 등록돼 있어요
                </div>
                {duplicates[submission.id].map((match) => (
                  <div key={match.id} className="flex flex-wrap items-center gap-2 text-xs">
                    <a
                      href={`/content/${match.id}`}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="text-accent"
                    >
                      {match.title} · {match.category} {match.year} ↗
                    </a>
                    <button
                      type="button"
                      disabled={merging === submission.id}
                      onClick={() => merge(submission, match)}
                      className="cursor-pointer rounded-lg border border-line12 bg-surface4 px-3 py-[6px] text-[11px] font-semibold text-fg disabled:opacity-50"
                    >
                      이 작품에 시청처만 추가하고 승인
                    </button>
                  </div>
                ))}
                <div className="text-[11px] leading-relaxed text-fg45">
                  제보된 링크가 새 감상처면 위 버튼으로 기존 작품에 더하세요. 전혀 다른 작품이면
                  그대로 &quot;검토 · 발행&quot;으로 새로 등록하시면 됩니다.
                </div>
              </div>
            ) : null}

            {/* 제보자가 입력한 값을 하나도 빠뜨리지 않고 보여준다 */}
            <div className="grid grid-cols-1 gap-x-8 gap-y-1.5 rounded-[10px] border border-line6 bg-surface3 px-3.5 py-3 lg:grid-cols-2">
              <Field label="형식">
                {submission.category ? (
                  <span className="rounded-pill bg-surface6 px-2 py-[2px] font-semibold text-fg70">
                    {submission.category}
                  </span>
                ) : (
                  <Empty text="선택 안 함" />
                )}
              </Field>
              <Field label="국가">{submission.country || <Empty />}</Field>
              <Field label="착즙">
                {submission.juice ? (
                  <span className="badge-juice px-2 py-[2px] text-[10px]">착즙 작품</span>
                ) : (
                  <span className="text-fg55">아니오</span>
                )}
              </Field>
              <Field label="플랫폼">{submission.platform || <Empty text="입력 안 함" />}</Field>
              <Field label="링크">
                {submission.url ? (
                  <a
                    href={submission.url}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="break-all text-accent"
                  >
                    {submission.url}
                  </a>
                ) : (
                  <Empty />
                )}
              </Field>
              <Field label="연락처">{submission.contact || <Empty />}</Field>
              <div className="lg:col-span-2">
                <Field label="코멘트">{submission.note || <Empty text="코멘트 없음" />}</Field>
              </div>
              {submission.status === "rejected" && submission.rejectReason ? (
                <div className="lg:col-span-2">
                  <Field label="반려 사유">
                    <span className="font-semibold text-fg70">
                      {REJECT_REASON_LABELS[submission.rejectReason] ?? submission.rejectReason}
                    </span>
                    {submission.rejectNote ? (
                      <span className="text-fg55"> — {submission.rejectNote}</span>
                    ) : null}
                  </Field>
                </div>
              ) : null}
              {submission.contentId ? (
                <div className="lg:col-span-2">
                  <Field label="발행 결과">
                    <a
                      href={`/content/${submission.contentId}`}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="text-accent"
                    >
                      콘텐츠 #{submission.contentId} · 사이트에서 보기 ↗
                    </a>
                  </Field>
                </div>
              ) : null}
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

      {rejecting ? (
        <RejectDialog
          title={rejecting.title}
          pending={rejectPending}
          onConfirm={(reason, note) => reject(rejecting, reason, note)}
          onCancel={() => setRejecting(null)}
        />
      ) : null}

      <Toast toast={toast} />
    </>
  );
}
