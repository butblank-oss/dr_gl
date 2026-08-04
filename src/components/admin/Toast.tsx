"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type ToastState = { message: string; tone: "ok" | "error" } | null;

/** 저장·삭제 결과를 알리는 간단한 토스트. 실서버 연동이라 실패 알림이 꼭 필요하다. */
export function useToast() {
  const [toast, setToast] = useState<ToastState>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback((message: string, tone: "ok" | "error" = "ok") => {
    setToast({ message, tone });
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(null), 3200);
  }, []);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  return { toast, show };
}

export function Toast({ toast }: { toast: ToastState }) {
  if (!toast) return null;
  return (
    <div
      className={`fixed bottom-8 left-1/2 z-120 -translate-x-1/2 rounded-xl border px-5 py-3 text-[13px] font-semibold shadow-[0_12px_24px_rgba(0,0,0,0.5)] ${
        toast.tone === "error"
          ? "border-danger-line bg-[#2a1119] text-danger"
          : "border-accent-line bg-[#1a1626] text-accent"
      }`}
      role="status"
    >
      {toast.message}
    </div>
  );
}
