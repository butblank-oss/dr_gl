"use client";

type Props = {
  title: string;
  description?: string;
  confirmLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

/** 파괴적 동작 재확인 — 브라우저 confirm() 대신 쓰는 자체 확인 모달. */
export function ConfirmDialog({
  title,
  description,
  confirmLabel = "삭제",
  danger = true,
  onConfirm,
  onCancel,
}: Props) {
  return (
    <div
      className="fixed inset-0 z-110 flex items-center justify-center bg-[rgba(0,0,0,0.6)] p-10"
      onClick={onCancel}
      role="presentation"
    >
      <div
        className="flex w-full max-w-[380px] flex-col gap-3 rounded-2xl border border-line10 bg-modal p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-base font-bold">{title}</div>
        {description ? <div className="text-[13px] leading-relaxed text-fg60">{description}</div> : null}
        <div className="mt-2 flex justify-end gap-2.5">
          <button type="button" onClick={onCancel} className="btn-ghost px-4 py-2.5 text-[13px]">
            취소
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={
              danger
                ? "cursor-pointer rounded-[10px] border-none bg-[linear-gradient(135deg,#E5486B,#C93356)] px-4 py-2.5 text-[13px] font-bold text-white"
                : "btn-grad px-4 py-2.5 text-[13px]"
            }
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
