"use client";

import { useState } from "react";
import { REJECT_REASONS, type RejectReasonCode } from "@/lib/types";

type Props = {
  title: string;
  pending?: boolean;
  onConfirm: (reason: RejectReasonCode, note: string) => void;
  onCancel: () => void;
};

/**
 * 반려 사유를 고르게 하는 모달.
 * 사유 없이 반려하면 나중에 "왜 반려했더라"를 알 길이 없어서, 선택을 건너뛸 수 없게 했다.
 */
export function RejectDialog({ title, pending = false, onConfirm, onCancel }: Props) {
  const [reason, setReason] = useState<RejectReasonCode | null>(null);
  const [note, setNote] = useState("");

  const needsNote = reason === "other";
  const ready = reason !== null && (!needsNote || note.trim().length > 0);

  return (
    // 바깥을 눌러도 닫히지 않는다 — 사유를 적다가 실수로 눌러 날리는 일을 막는다.
    <div className="fixed inset-0 z-110 flex items-center justify-center bg-[rgba(0,0,0,0.6)] p-4 md:p-10">
      <div className="flex max-h-full w-full max-w-[440px] flex-col gap-3 overflow-y-auto rounded-2xl border border-line10 bg-modal p-6">
        <div className="text-base font-bold">제보 반려</div>
        <div className="text-[13px] leading-relaxed text-fg60">
          <span className="font-semibold text-fg75">&quot;{title}&quot;</span> 제보를 반려합니다. 왜
          반려하는지 골라주세요.
        </div>

        <div className="mt-1 flex flex-col gap-1.5">
          {REJECT_REASONS.map((item) => {
            const on = reason === item.code;
            return (
              <button
                key={item.code}
                type="button"
                onClick={() => setReason(item.code)}
                className={`flex cursor-pointer flex-col gap-0.5 rounded-[10px] border px-3.5 py-2.5 text-left ${
                  on
                    ? "border-accent-line bg-accent-soft12"
                    : "border-line8 bg-surface3 hover:bg-surface6"
                }`}
              >
                <span className={`text-[13px] font-bold ${on ? "text-accent" : "text-fg"}`}>
                  {item.label}
                </span>
                <span className="text-[11px] leading-relaxed text-fg45">{item.desc}</span>
              </button>
            );
          })}
        </div>

        <label className="flex flex-col gap-[7px]">
          <span className="text-xs font-semibold text-fg70">
            메모 {needsNote ? <span className="text-danger">(필수)</span> : "(선택)"}
          </span>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={300}
            rows={2}
            placeholder={
              needsNote ? "반려 사유를 적어주세요." : "덧붙일 내용이 있으면 적어두세요. (최대 300자)"
            }
            className="w-full resize-y rounded-lg border border-line12 bg-surface4 px-3 py-2 text-[13px] text-fg placeholder:text-fg30"
          />
        </label>

        <div className="mt-1 flex justify-end gap-2.5">
          <button
            type="button"
            onClick={onCancel}
            disabled={pending}
            className="btn-ghost px-4 py-2.5 text-[13px] disabled:opacity-50"
          >
            취소
          </button>
          <button
            type="button"
            onClick={() => reason && onConfirm(reason, note.trim())}
            disabled={!ready || pending}
            className="cursor-pointer rounded-[10px] border-none bg-[linear-gradient(135deg,#E5486B,#C93356)] px-4 py-2.5 text-[13px] font-bold text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            {pending ? "반려하는 중…" : "반려하기"}
          </button>
        </div>
      </div>
    </div>
  );
}
