"use client";

import { useEffect, useState } from "react";
import { SpinnerIcon } from "@/components/icons";
import { formatDate } from "@/lib/format";
import type { CommentDTO } from "@/lib/types";

type Props = { itemId: number; initialComments: CommentDTO[] };

/**
 * 한줄평 — 로그인 없이 누구나 남길 수 있고, 5개를 넘으면 처음 5개만 보이고 더보기로 펼친다.
 * 콘텐츠가 바뀌면(다른 상세로 이동) 펼침 상태는 초기화된다.
 */
export function CommentSection({ itemId, initialComments }: Props) {
  const [comments, setComments] = useState(initialComments);
  const [draft, setDraft] = useState("");
  const [showAll, setShowAll] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setComments(initialComments);
    setShowAll(false);
    setDraft("");
    setError("");
  }, [itemId, initialComments]);

  const submit = async () => {
    const text = draft.trim();
    if (!text || pending) return;
    setPending(true);
    setError("");
    try {
      const res = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId, text }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "한줄평을 남기지 못했어요.");
        return;
      }
      setComments((prev) => [...prev, data.comment as CommentDTO]);
      setDraft("");
    } catch {
      setError("네트워크 오류로 한줄평을 남기지 못했어요.");
    } finally {
      setPending(false);
    }
  };

  const displayed = showAll ? comments : comments.slice(0, 5);
  const hasMoreToggle = comments.length > 5;

  return (
    <div>
      <div className="mb-2.5 text-base font-bold">한줄평</div>
      <div className="mb-3.5 flex gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") submit();
          }}
          placeholder="한줄평을 남겨보세요"
          maxLength={300}
          aria-label="한줄평 입력"
          className="field h-11 flex-1 px-3.5 text-[13px]"
        />
        <button
          type="button"
          onClick={submit}
          disabled={pending || !draft.trim()}
          className="btn-grad h-11 whitespace-nowrap px-[18px] text-[13px]"
        >
          {pending ? <SpinnerIcon /> : "남기기"}
        </button>
      </div>

      {error ? <div className="mb-3 text-[13px] text-danger">{error}</div> : null}

      {comments.length > 0 ? (
        <>
          <div className="flex flex-col">
            {displayed.map((comment) => (
              <div key={comment.id} className="flex items-baseline gap-3 border-b border-line6 py-[11px]">
                <span className="flex-none text-[11px] text-fg32">{formatDate(comment.createdAt)}</span>
                <span className="text-sm leading-normal text-fg80">{comment.text}</span>
              </div>
            ))}
          </div>
          {hasMoreToggle ? (
            <button
              type="button"
              onClick={() => setShowAll((v) => !v)}
              className="btn-ghost mt-3 px-[18px] py-2.5 text-[13px] text-fg75"
            >
              {showAll ? "접기" : `더보기 (${comments.length - 5})`}
            </button>
          ) : null}
        </>
      ) : (
        <div className="text-[13px] text-fg35">아직 한줄평이 없어요. 첫 한줄평을 남겨보세요.</div>
      )}
    </div>
  );
}
