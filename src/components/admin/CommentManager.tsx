"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { Toast, useToast } from "@/components/admin/Toast";
import { ApiError, api } from "@/lib/client-api";
import { formatDateTime } from "@/lib/format";
import { COMMENT_FILTER_LABELS } from "@/lib/types";
import type { AdminCommentDTO } from "@/lib/types";

export function CommentManager({ initialComments }: { initialComments: AdminCommentDTO[] }) {
  const router = useRouter();
  const [comments, setComments] = useState(initialComments);
  const [filter, setFilter] = useState<string>("전체");
  const [deleting, setDeleting] = useState<AdminCommentDTO | null>(null);
  const { toast, show } = useToast();

  const reload = async () => {
    const data = await api<{ comments: AdminCommentDTO[] }>("/api/comments?filter=전체");
    setComments(data.comments);
    router.refresh();
  };

  const toggle = async (comment: AdminCommentDTO) => {
    const next = comment.status === "visible" ? "hidden" : "visible";
    try {
      await api(`/api/comments/${comment.id}`, { method: "PATCH", body: JSON.stringify({ status: next }) });
      await reload();
      show(next === "hidden" ? "한줄평을 숨겼어요. 사이트에서 바로 사라져요." : "한줄평을 다시 노출했어요.");
    } catch (e) {
      show(e instanceof ApiError ? e.message : "상태를 바꾸지 못했어요.", "error");
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    const target = deleting;
    setDeleting(null);
    try {
      await api(`/api/comments/${target.id}`, { method: "DELETE" });
      await reload();
      show("한줄평을 삭제했어요.");
    } catch (e) {
      show(e instanceof ApiError ? e.message : "삭제하지 못했어요.", "error");
    }
  };

  const filtered = comments.filter((comment) => {
    if (filter === "전체") return true;
    return filter === "노출중" ? comment.status === "visible" : comment.status === "hidden";
  });

  return (
    <>
      <h1 className="text-2xl font-extrabold">한줄평 검수</h1>

      <div className="flex gap-2">
        {COMMENT_FILTER_LABELS.map((label) => (
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
        {filtered.map((comment) => (
          <div
            key={comment.id}
            className="flex items-center justify-between gap-3 border-b border-line6 px-[18px] py-3.5"
          >
            <div className="flex min-w-0 flex-col gap-1">
              {/* 클릭하면 사이트의 해당 콘텐츠 상세가 새 탭으로 열린다. */}
              <a
                href={`/content/${comment.itemId}`}
                target="_blank"
                rel="noreferrer noopener"
                className="w-fit text-[11px] text-accent"
              >
                {comment.itemTitle} · 사이트에서 보기 ↗
              </a>
              <span className="truncate text-sm text-fg">{comment.text}</span>
              <span className="text-[11px] text-fg30">{formatDateTime(comment.createdAt)}</span>
            </div>

            <div className="flex flex-none items-center gap-2">
              <span
                className={
                  comment.status === "visible"
                    ? "whitespace-nowrap rounded-pill bg-accent-soft px-[9px] py-[3px] text-[10px] font-bold text-accent"
                    : "whitespace-nowrap rounded-pill bg-surface6 px-[9px] py-[3px] text-[10px] font-semibold text-fg40"
                }
              >
                {comment.status === "visible" ? "노출중" : "숨김"}
              </span>
              <button
                type="button"
                onClick={() => toggle(comment)}
                className="cursor-pointer whitespace-nowrap rounded-lg border border-line12 bg-surface4 px-[11px] py-1.5 text-xs text-fg"
              >
                {comment.status === "visible" ? "숨기기" : "노출하기"}
              </button>
              <button
                type="button"
                onClick={() => setDeleting(comment)}
                className="btn-danger px-[11px] py-1.5 text-xs"
              >
                삭제
              </button>
            </div>
          </div>
        ))}

        {filtered.length === 0 ? (
          <div className="py-15 text-center text-[13px] text-fg35">해당하는 한줄평이 없어요.</div>
        ) : null}
      </div>

      {deleting ? (
        <ConfirmDialog
          title="한줄평을 삭제할까요?"
          description="영구 삭제되며 되돌릴 수 없어요."
          onConfirm={confirmDelete}
          onCancel={() => setDeleting(null)}
        />
      ) : null}

      <Toast toast={toast} />
    </>
  );
}
